#!/usr/bin/env node
"use strict";
/**
 * feishu-claude-code
 * ==================
 * 让飞书/Lark 能够远程与 Claude Code 交互的插件服务。
 *
 * 架构：
 *   飞书 WebSocket ──► MessageHandler ──► SessionManager ──► ClaudeProcess (subprocess)
 *                                                        ◄── streaming events
 *   ◄── updateCard (throttled) ──────────────────────────────────────────────────────
 */
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
const lark = __importStar(require("@larksuiteoapi/node-sdk"));
const config_js_1 = require("./config.js");
const client_js_1 = require("./feishu/client.js");
const handler_js_1 = require("./feishu/handler.js");
const session_js_1 = require("./claude/session.js");
const logger_js_1 = require("./logger.js");
const child_process_1 = require("child_process");
async function main() {
    // 1. 加载并校验配置
    const config = (0, config_js_1.loadConfig)();
    (0, config_js_1.validateConfig)(config);
    // 2. 检查 claude CLI 可用性
    checkClaudeCLI(config.claude.bin);
    logger_js_1.logger.info('feishu-claude-code starting', {
        appId: config.feishu.appId,
        domain: config.feishu.domain,
        workdir: config.claude.defaultWorkdir,
        requireMention: config.bot.requireMention,
        sessionScope: config.bot.sessionScope,
    });
    // 3. 初始化会话管理器
    const sessionManager = new session_js_1.SessionManager(config);
    // 4. 初始化消息处理器
    const handler = new handler_js_1.MessageHandler(config, sessionManager);
    // 5. 创建事件分发器
    const eventDispatcher = new lark.EventDispatcher({
        encryptKey: config.feishu.encryptKey,
        verificationToken: config.feishu.verificationToken,
    }).register({
        'im.message.receive_v1': async (data) => {
            try {
                // @larksuiteoapi/node-sdk 传入 event 字段作为事件数据
                await handler.handle(data);
            }
            catch (err) {
                logger_js_1.logger.error('Unhandled error in message handler', { err });
            }
        },
    });
    // 6. 启动 WebSocket 长连接（无需公网地址）
    const wsClient = (0, client_js_1.createWSClient)(config);
    wsClient.start({
        eventDispatcher,
    });
    logger_js_1.logger.info('✅ Feishu WebSocket connected. Listening for messages…');
    logger_js_1.logger.info('   Sessions will be cleaned up after idle timeout:', {
        timeoutMs: config.claude.sessionTimeout,
    });
    // 7. 优雅退出处理
    const shutdown = (sig) => {
        logger_js_1.logger.info(`Received ${sig}, shutting down…`);
        sessionManager.destroyAll();
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (err) => {
        logger_js_1.logger.error('Uncaught exception', { err });
        sessionManager.destroyAll();
        process.exit(1);
    });
}
function checkClaudeCLI(bin) {
    try {
        const version = (0, child_process_1.execSync)(`${bin} --version`, { encoding: 'utf-8' }).trim();
        logger_js_1.logger.info('Claude CLI found', { version });
    }
    catch {
        logger_js_1.logger.error(`Claude CLI not found: "${bin}". ` +
            'Please install Claude Code: https://code.claude.com');
        process.exit(1);
    }
}
main().catch((err) => {
    logger_js_1.logger.error('Fatal startup error', { err });
    process.exit(1);
});
//# sourceMappingURL=index.js.map