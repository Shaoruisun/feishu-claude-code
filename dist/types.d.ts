/** 飞书文件附件（图片/文件/音频/视频） */
export interface FileAttachment {
    fileKey: string;
    fileType: 'image' | 'file' | 'audio' | 'media';
    fileName?: string;
    fileSize?: number;
}
/** 飞书消息类型 */
export interface FeishuMessage {
    messageId: string;
    chatId: string;
    chatType: 'p2p' | 'group';
    senderId: string;
    senderName: string;
    content: string;
    messageType: string;
    rootId?: string;
    parentId?: string;
    mentionBot: boolean;
    /** 文件附件（仅 image/file/audio/media 类型消息携带） */
    fileAttachments?: FileAttachment[];
}
/** Claude 流式输出事件 */
export interface ClaudeStreamEvent {
    type: 'system' | 'user' | 'assistant' | 'result' | 'stream_event' | 'tool_use' | 'tool_result' | 'error';
    subtype?: string;
    message?: {
        role: string;
        content: string | ClaudeContentBlock[];
        model?: string;
        usage?: {
            input_tokens: number;
            output_tokens: number;
        };
    };
    result?: string;
    is_error?: boolean;
    error?: string;
    event?: {
        type: string;
        index?: number;
        delta?: {
            type: string;
            text?: string;
        };
        content_block?: {
            type: string;
            text?: string;
        };
        message?: Record<string, unknown>;
    };
    index?: number;
    delta?: {
        type: string;
        text?: string;
    };
    content_block?: ClaudeContentBlock;
}
export interface ClaudeContentBlock {
    type: 'text' | 'tool_use' | 'tool_result';
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
    content?: string | ClaudeContentBlock[];
}
/** 飞书卡片消息 */
export interface FeishuCard {
    config?: {
        wide_screen_mode?: boolean;
        enable_forward?: boolean;
    };
    header?: {
        title: {
            tag: 'plain_text';
            content: string;
        };
        template?: string;
    };
    elements: FeishuCardElement[];
}
export interface FeishuCardElement {
    tag: string;
    content?: string;
    text?: {
        tag: string;
        content: string;
    };
    actions?: FeishuCardAction[];
    [key: string]: unknown;
}
export interface FeishuCardAction {
    tag: string;
    text: {
        tag: string;
        content: string;
    };
    type?: string;
    value?: Record<string, string>;
}
/** 会话状态 */
export interface Session {
    sessionId: string;
    chatId: string;
    senderId: string;
    workdir: string;
    createdAt: number;
    lastActiveAt: number;
    processing: boolean;
}
/** 插件配置 */
export interface PluginConfig {
    feishu: {
        appId: string;
        appSecret: string;
        domain: 'feishu' | 'lark' | string;
        verificationToken?: string;
        encryptKey?: string;
        webhookPort?: number;
        webhookPath?: string;
    };
    claude: {
        bin: string;
        defaultWorkdir: string;
        extraArgs?: string[];
        systemPrompt?: string;
        sessionTimeout: number;
        maxSessions: number;
        permissionMode: 'bypassPermissions' | 'acceptEdits' | 'default';
    };
    bot: {
        requireMention: boolean;
        allowedGroupIds: string[];
        allowedUserIds: string[];
        streamingInterval: number;
        maxMessageLength: number;
        sessionScope: 'chat' | 'user';
    };
}
//# sourceMappingURL=types.d.ts.map