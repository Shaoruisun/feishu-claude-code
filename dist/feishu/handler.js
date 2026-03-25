"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageHandler = void 0;
const parser_js_1 = require("./parser.js");
const sender_js_1 = require("./sender.js");
const file_transfer_js_1 = require("./file-transfer.js");
const logger_js_1 = require("../logger.js");
const path = __importStar(require("path"));
/**
 * MessageHandler 是核心处理类：
 *   1. 接收飞书事件 → 解析消息
 *   2. 权限检查
 *   3. 路由到 Claude 会话
 *   4. 将 Claude 流式输出实时回写到飞书卡片
 */
class MessageHandler {
    constructor(config, sessions) {
        this.config = config;
        this.sessions = sessions;
    }
    /** 飞书 im.message.receive_v1 事件入口 */
    async handle(eventData) {
        const msg = (0, parser_js_1.parseMessageEvent)(eventData);
        if (!msg) {
            logger_js_1.logger.debug('Ignored unparseable event');
            return;
        }
        logger_js_1.logger.info('Received message', {
            chatType: msg.chatType,
            chatId: msg.chatId,
            sender: msg.senderId,
            type: msg.messageType,
            mention: msg.mentionBot,
        });
        // 权限过滤
        if (!this.isAllowed(msg)) {
            logger_js_1.logger.debug('Message filtered by permission policy', {
                chatId: msg.chatId,
                senderId: msg.senderId,
            });
            return;
        }
        // 群聊中需要 @机器人
        if (msg.chatType === 'group' && this.config.bot.requireMention && !msg.mentionBot) {
            logger_js_1.logger.debug('Group message without mention, ignored');
            return;
        }
        const isFileMessage = ['image', 'file', 'audio', 'media'].includes(msg.messageType);
        const isTextMessage = ['text', 'post'].includes(msg.messageType);
        if (!isTextMessage && !isFileMessage) {
            logger_js_1.logger.debug('Unsupported message type', { type: msg.messageType });
            return;
        }
        // 构建发送给 Claude 的 prompt
        let prompt = isTextMessage ? (0, parser_js_1.stripBotMention)(msg.content) : '';
        // 如果携带文件附件，先下载到工作目录，再追加文件信息到 prompt
        if (isFileMessage && msg.fileAttachments?.length) {
            await this.processPrompt(msg, prompt || '请处理我发送的文件。', true);
            return;
        }
        if (!prompt)
            return;
        await this.processPrompt(msg, prompt, false);
    }
    // ──────────────────────────────────────────────────────────
    async processPrompt(msg, prompt, hasFiles) {
        const { session, process: claudeProc } = this.sessions.getOrCreate(msg.chatId, msg.senderId);
        // 防止并发：同一会话正在处理中
        if (session.processing) {
            logger_js_1.logger.warn('Session busy, dropping message', { sessionId: session.sessionId });
            return;
        }
        session.processing = true;
        const startTime = Date.now();
        // 若携带文件附件，先下载到工作目录，将路径追加到 prompt
        if (hasFiles && msg.fileAttachments?.length) {
            const downloadedPaths = [];
            for (const att of msg.fileAttachments) {
                try {
                    const localPath = await (0, file_transfer_js_1.downloadMessageFile)(this.config, msg.messageId, att.fileKey, att.fileType, session.workdir, att.fileName);
                    downloadedPaths.push(localPath);
                    logger_js_1.logger.info('Attachment downloaded', { fileKey: att.fileKey, localPath });
                }
                catch (err) {
                    logger_js_1.logger.warn('Failed to download attachment', { fileKey: att.fileKey, err });
                }
            }
            if (downloadedPaths.length > 0) {
                const fileList = downloadedPaths
                    .map((p) => `- ${path.relative(session.workdir, p)} (${p})`)
                    .join('\n');
                prompt = prompt
                    ? `${prompt}\n\n用户同时发送了以下文件（已保存到工作目录）：\n${fileList}`
                    : `用户发送了以下文件（已保存到工作目录）：\n${fileList}`;
            }
        }
        // 发送初始"思考中"卡片
        let cardMessageId = null;
        try {
            const initialCard = (0, sender_js_1.buildCard)('', 'thinking', { workdir: session.workdir });
            cardMessageId = await (0, sender_js_1.sendCard)(this.config, msg.chatId, initialCard, msg.messageId);
        }
        catch (err) {
            logger_js_1.logger.error('Failed to send initial card', { err });
            session.processing = false;
            return;
        }
        // 流式累积输出文本
        let accumulated = '';
        let lastUpdateTime = 0;
        const interval = this.config.bot.streamingInterval;
        const throttledUpdate = async (text, final) => {
            const now = Date.now();
            if (!final && now - lastUpdateTime < interval)
                return;
            lastUpdateTime = now;
            const status = final ? 'done' : 'streaming';
            const card = (0, sender_js_1.buildCard)(text, status, {
                workdir: session.workdir,
                duration: final ? Date.now() - startTime : undefined,
            });
            if (cardMessageId) {
                await (0, sender_js_1.updateCard)(this.config, cardMessageId, card);
            }
        };
        try {
            // 若子进程未在运行，重新启动
            if (!claudeProc.isRunning) {
                claudeProc.start();
            }
            // 发送消息并流式读取响应
            for await (const event of claudeProc.sendMessage(prompt)) {
                // stream_event 是 --include-partial-messages 模式下的增量包装
                // 内部 content_block_delta 才是真正的文本增量，用 += 累积
                if (event.type === 'stream_event') {
                    const inner = event.event;
                    if (inner?.type === 'content_block_delta' && inner.delta?.type === 'text_delta') {
                        accumulated += inner.delta.text ?? '';
                        await throttledUpdate(accumulated, false);
                    }
                }
                if (event.type === 'result') {
                    // result.result 是最终规范文本，始终以它为准
                    if (event.result)
                        accumulated = event.result;
                    break;
                }
                if (event.type === 'error') {
                    const errMsg = event.error ?? 'Unknown error from Claude';
                    const errCard = (0, sender_js_1.buildCard)(`**Error:** ${errMsg}`, 'error', {
                        workdir: session.workdir,
                    });
                    if (cardMessageId) {
                        await (0, sender_js_1.updateCard)(this.config, cardMessageId, errCard);
                    }
                    logger_js_1.logger.error('Claude error event', { error: errMsg });
                    return;
                }
            }
            // 最终更新
            await throttledUpdate(accumulated || '_（无输出）_', true);
            logger_js_1.logger.info('Response complete', {
                sessionId: session.sessionId,
                duration: Date.now() - startTime,
                length: accumulated.length,
            });
            // 扫描 Claude 输出中的文件发送指令 [[SEND_FILE:/path/to/file]]
            await this.sendOutputFiles(accumulated, msg.chatId, msg.messageId);
        }
        catch (err) {
            logger_js_1.logger.error('Error during Claude processing', { err });
            const errCard = (0, sender_js_1.buildCard)(`**系统错误：** ${err.message}`, 'error', { workdir: session.workdir });
            if (cardMessageId) {
                await (0, sender_js_1.updateCard)(this.config, cardMessageId, errCard).catch(() => { });
            }
        }
        finally {
            session.processing = false;
        }
    }
    isAllowed(msg) {
        const { allowedGroupIds, allowedUserIds } = this.config.bot;
        if (msg.chatType === 'group') {
            if (allowedGroupIds.length > 0 && !allowedGroupIds.includes(msg.chatId)) {
                return false;
            }
        }
        if (allowedUserIds.length > 0 && !allowedUserIds.includes(msg.senderId)) {
            return false;
        }
        return true;
    }
    /**
     * 扫描 Claude 输出，查找 [[SEND_FILE:/path/to/file]] 标记，
     * 上传对应文件并发送到飞书。
     */
    async sendOutputFiles(text, chatId, replyMessageId) {
        const pattern = /\[\[SEND_FILE:([^\]]+)\]\]/g;
        let match;
        const sent = new Set();
        while ((match = pattern.exec(text)) !== null) {
            const filePath = match[1].trim();
            if (sent.has(filePath))
                continue;
            sent.add(filePath);
            try {
                const { type, key, msgType } = await (0, file_transfer_js_1.uploadAuto)(this.config, filePath);
                if (type === 'image') {
                    await (0, sender_js_1.sendImage)(this.config, chatId, key, replyMessageId);
                }
                else {
                    // msgType 在 type==='file' 分支下只可能是 'file' | 'audio'
                    await (0, sender_js_1.sendFile)(this.config, chatId, key, replyMessageId, msgType);
                }
                logger_js_1.logger.info('Output file sent to Feishu', { filePath, type, key });
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to send output file', { filePath, err });
            }
        }
    }
}
exports.MessageHandler = MessageHandler;
/** 从 assistant 事件（全量快照）中提取文本，备用 */
function extractText(event) {
    if (event.type !== 'assistant' || !event.message?.content)
        return '';
    const content = event.message.content;
    if (typeof content === 'string')
        return content;
    if (Array.isArray(content)) {
        return content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
    }
    return '';
}
// 避免 TS unused warning
void extractText;
//# sourceMappingURL=handler.js.map