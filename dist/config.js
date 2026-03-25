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
exports.loadConfig = loadConfig;
exports.validateConfig = validateConfig;
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
function getEnv(key, fallback) {
    const val = process.env[key] ?? fallback;
    if (val === undefined) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return val;
}
function getEnvOptional(key, fallback) {
    return process.env[key] ?? fallback;
}
/** 默认系统提示：告知 Claude 如何通过飞书发送文件 */
const DEFAULT_SYSTEM_PROMPT = `你正在通过飞书机器人与用户对话。

【发送文件给用户】
当用户需要你提供文件时，先将文件写入磁盘，然后在回复中加入以下标记（可放在任意位置）：
  [[SEND_FILE:/文件的绝对路径]]

系统会自动检测该标记，将文件上传并通过飞书发送给用户，无需额外操作。

规则：
- 图片（jpg/jpeg/png/gif/webp/bmp/ico/tiff）→ 飞书图片消息，用户可直接预览
- opus/ogg 音频 → 飞书语音消息，用户可直接播放
- 其他文件（pdf/doc/xls/zip 等）→ 飞书文件消息，用户可下载
- 可同时发送多个文件，每个用独立的 [[SEND_FILE:...]] 标记
- 文件大小限制：图片 ≤ 10MB，其他文件 ≤ 30MB

示例：
  我已生成报告，正在发送给你。[[SEND_FILE:/home/user/workspace/report.pdf]]

【接收用户发送的文件】
用户发送的图片或文件已自动下载到工作目录，路径会在消息中告知，可直接读取处理。`;
function loadConfig() {
    // 优先尝试加载 config.json
    const configFile = process.env.CONFIG_FILE ?? 'config.json';
    if (fs.existsSync(configFile)) {
        const raw = fs.readFileSync(configFile, 'utf-8');
        const parsed = JSON.parse(raw);
        return mergeWithEnv(parsed);
    }
    // 纯环境变量模式
    return buildFromEnv();
}
function buildFromEnv() {
    return {
        feishu: {
            appId: getEnv('FEISHU_APP_ID'),
            appSecret: getEnv('FEISHU_APP_SECRET'),
            domain: getEnvOptional('FEISHU_DOMAIN', 'feishu'),
            verificationToken: getEnvOptional('FEISHU_VERIFICATION_TOKEN'),
            encryptKey: getEnvOptional('FEISHU_ENCRYPT_KEY'),
            webhookPort: parseInt(getEnvOptional('FEISHU_WEBHOOK_PORT', '3000') ?? '3000'),
            webhookPath: getEnvOptional('FEISHU_WEBHOOK_PATH', '/feishu/events'),
        },
        claude: {
            bin: getEnvOptional('CLAUDE_BIN', 'claude') ?? 'claude',
            defaultWorkdir: getEnvOptional('CLAUDE_WORKDIR', process.cwd()) ?? process.cwd(),
            sessionTimeout: parseInt(getEnvOptional('CLAUDE_SESSION_TIMEOUT', '1800000') ?? '1800000'),
            maxSessions: parseInt(getEnvOptional('CLAUDE_MAX_SESSIONS', '50') ?? '50'),
            permissionMode: getEnvOptional('CLAUDE_PERMISSION_MODE', 'bypassPermissions'),
            systemPrompt: getEnvOptional('CLAUDE_SYSTEM_PROMPT', DEFAULT_SYSTEM_PROMPT),
        },
        bot: {
            requireMention: getEnvOptional('BOT_REQUIRE_MENTION', 'true') === 'true',
            allowedGroupIds: (getEnvOptional('BOT_ALLOWED_GROUP_IDS', '') ?? '')
                .split(',').map(s => s.trim()).filter(Boolean),
            allowedUserIds: (getEnvOptional('BOT_ALLOWED_USER_IDS', '') ?? '')
                .split(',').map(s => s.trim()).filter(Boolean),
            streamingInterval: parseInt(getEnvOptional('BOT_STREAMING_INTERVAL', '800') ?? '800'),
            maxMessageLength: parseInt(getEnvOptional('BOT_MAX_MESSAGE_LENGTH', '4000') ?? '4000'),
            sessionScope: getEnvOptional('BOT_SESSION_SCOPE', 'chat'),
        },
    };
}
function mergeWithEnv(parsed) {
    const defaults = buildFromEnv().claude;
    return {
        feishu: {
            appId: process.env['FEISHU_APP_ID'] ?? parsed.feishu?.appId ?? '',
            appSecret: process.env['FEISHU_APP_SECRET'] ?? parsed.feishu?.appSecret ?? '',
            domain: process.env['FEISHU_DOMAIN'] ?? parsed.feishu?.domain ?? 'feishu',
            verificationToken: process.env['FEISHU_VERIFICATION_TOKEN'] ?? parsed.feishu?.verificationToken,
            encryptKey: process.env['FEISHU_ENCRYPT_KEY'] ?? parsed.feishu?.encryptKey,
            webhookPort: parsed.feishu?.webhookPort ?? 3000,
            webhookPath: parsed.feishu?.webhookPath ?? '/feishu/events',
        },
        claude: {
            bin: process.env['CLAUDE_BIN'] ?? parsed.claude?.bin ?? 'claude',
            defaultWorkdir: process.env['CLAUDE_WORKDIR'] ?? parsed.claude?.defaultWorkdir ?? process.cwd(),
            extraArgs: parsed.claude?.extraArgs,
            sessionTimeout: parsed.claude?.sessionTimeout ?? defaults.sessionTimeout,
            maxSessions: parsed.claude?.maxSessions ?? defaults.maxSessions,
            permissionMode: process.env['CLAUDE_PERMISSION_MODE'] ?? parsed.claude?.permissionMode ?? 'bypassPermissions',
            systemPrompt: process.env['CLAUDE_SYSTEM_PROMPT'] ?? parsed.claude?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
        },
        bot: {
            requireMention: parsed.bot?.requireMention ?? true,
            allowedGroupIds: parsed.bot?.allowedGroupIds ?? [],
            allowedUserIds: parsed.bot?.allowedUserIds ?? [],
            streamingInterval: parsed.bot?.streamingInterval ?? 800,
            maxMessageLength: parsed.bot?.maxMessageLength ?? 4000,
            sessionScope: parsed.bot?.sessionScope ?? 'chat',
        },
    };
}
function validateConfig(config) {
    if (!config.feishu.appId)
        throw new Error('feishu.appId is required');
    if (!config.feishu.appSecret)
        throw new Error('feishu.appSecret is required');
}
//# sourceMappingURL=config.js.map