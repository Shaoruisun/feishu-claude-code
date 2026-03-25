"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
const process_js_1 = require("./process.js");
const logger_js_1 = require("../logger.js");
/**
 * SessionManager 管理每个聊天/用户的 Claude 会话生命周期。
 *
 * 每个会话对应一个持久化的 claude 子进程，支持多轮对话。
 * 超时后自动清理；超过最大并发数时，淘汰最久未活跃的会话。
 */
class SessionManager {
    constructor(config) {
        this.sessions = new Map();
        this.config = config;
    }
    /** 根据消息信息获取或创建会话 */
    getOrCreate(chatId, senderId) {
        const key = this.makeKey(chatId, senderId);
        const existing = this.sessions.get(key);
        if (existing) {
            this.touch(key, existing);
            return { session: existing.session, process: existing.process };
        }
        return this.create(key, chatId, senderId);
    }
    /** 获取会话（不创建） */
    get(chatId, senderId) {
        const key = this.makeKey(chatId, senderId);
        return this.sessions.get(key);
    }
    /** 删除会话（销毁子进程） */
    destroy(chatId, senderId) {
        const key = this.makeKey(chatId, senderId);
        const entry = this.sessions.get(key);
        if (!entry)
            return;
        clearTimeout(entry.timer);
        entry.process.stop();
        this.sessions.delete(key);
        logger_js_1.logger.info('Session destroyed', { key });
    }
    /** 销毁所有会话 */
    destroyAll() {
        for (const [key, entry] of this.sessions) {
            clearTimeout(entry.timer);
            entry.process.stop();
            logger_js_1.logger.info('Session destroyed on shutdown', { key });
        }
        this.sessions.clear();
    }
    get size() {
        return this.sessions.size;
    }
    // ──────────────────────────────────────────────────────────
    makeKey(chatId, senderId) {
        if (this.config.bot.sessionScope === 'user') {
            return `user:${senderId}`;
        }
        return `chat:${chatId}`;
    }
    create(key, chatId, senderId) {
        // 超过最大并发时淘汰最旧的
        if (this.sessions.size >= this.config.claude.maxSessions) {
            this.evictOldest();
        }
        const workdir = this.resolveWorkdir(chatId, senderId);
        const claudeProc = new process_js_1.ClaudeProcess(this.config.claude.bin, workdir, this.config.claude.extraArgs, this.config.claude.permissionMode, this.config.claude.systemPrompt);
        claudeProc.start();
        const session = {
            sessionId: key,
            chatId,
            senderId,
            workdir,
            createdAt: Date.now(),
            lastActiveAt: Date.now(),
            processing: false,
        };
        const timer = this.scheduleTimeout(key);
        this.sessions.set(key, { session, process: claudeProc, timer });
        logger_js_1.logger.info('Session created', { key, workdir });
        return { session, process: claudeProc };
    }
    touch(key, entry) {
        entry.session.lastActiveAt = Date.now();
        clearTimeout(entry.timer);
        entry.timer = this.scheduleTimeout(key);
    }
    scheduleTimeout(key) {
        return setTimeout(() => {
            const entry = this.sessions.get(key);
            if (!entry)
                return;
            logger_js_1.logger.info('Session timed out', { key });
            entry.process.stop();
            this.sessions.delete(key);
        }, this.config.claude.sessionTimeout);
    }
    evictOldest() {
        let oldest = null;
        for (const entry of this.sessions.entries()) {
            if (!oldest || entry[1].session.lastActiveAt < oldest[1].session.lastActiveAt) {
                oldest = entry;
            }
        }
        if (oldest) {
            clearTimeout(oldest[1].timer);
            oldest[1].process.stop();
            this.sessions.delete(oldest[0]);
            logger_js_1.logger.info('Session evicted (oldest)', { key: oldest[0] });
        }
    }
    resolveWorkdir(_chatId, _senderId) {
        // 可根据 chatId/senderId 映射不同工作目录；当前统一使用默认目录
        return this.config.claude.defaultWorkdir;
    }
}
exports.SessionManager = SessionManager;
//# sourceMappingURL=session.js.map