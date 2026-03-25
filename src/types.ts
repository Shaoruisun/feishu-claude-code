// ============================================================
// 类型定义
// ============================================================

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
  type:
    | 'system'
    | 'user'
    | 'assistant'
    | 'result'
    | 'stream_event'   // --include-partial-messages 模式下的增量事件包装
    | 'tool_use'
    | 'tool_result'
    | 'error';
  subtype?: string;
  // assistant 事件：完整消息快照
  message?: {
    role: string;
    content: string | ClaudeContentBlock[];
    model?: string;
    usage?: { input_tokens: number; output_tokens: number };
  };
  // result 事件：最终规范文本
  result?: string;
  is_error?: boolean;
  error?: string;
  // stream_event 包装：内部为真正的 Anthropic API 流式事件
  event?: {
    type: string;               // message_start / content_block_delta / message_stop 等
    index?: number;
    delta?: { type: string; text?: string };
    content_block?: { type: string; text?: string };
    message?: Record<string, unknown>;
  };
  // 旧式直接 delta（保留兼容）
  index?: number;
  delta?: { type: string; text?: string };
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
    title: { tag: 'plain_text'; content: string };
    template?: string;
  };
  elements: FeishuCardElement[];
}

export interface FeishuCardElement {
  tag: string;
  content?: string;
  text?: { tag: string; content: string };
  actions?: FeishuCardAction[];
  [key: string]: unknown;
}

export interface FeishuCardAction {
  tag: string;
  text: { tag: string; content: string };
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
    // 仅在 webhook 模式下需要
    webhookPort?: number;
    webhookPath?: string;
  };
  claude: {
    // claude CLI 可执行文件路径，默认为 'claude'
    bin: string;
    // 默认工作目录
    defaultWorkdir: string;
    // 额外 claude 参数
    extraArgs?: string[];
    // 系统提示（注入给每个新会话）
    systemPrompt?: string;
    // 会话超时（毫秒），默认 30 分钟
    sessionTimeout: number;
    // 最大并发会话数
    maxSessions: number;
    // 权限模式：bypassPermissions 自动批准所有操作（适合无人值守的远程场景）
    //           acceptEdits 仅自动批准文件编辑
    //           default 保留交互式确认（需要本地终端）
    permissionMode: 'bypassPermissions' | 'acceptEdits' | 'default';
  };
  bot: {
    // 是否在群聊中需要 @机器人 才响应
    requireMention: boolean;
    // 允许的群聊 ID 列表，为空则允许所有
    allowedGroupIds: string[];
    // 允许的用户 ID 列表，为空则允许所有
    allowedUserIds: string[];
    // 流式卡片更新间隔（毫秒）
    streamingInterval: number;
    // 单条消息最大长度（超出则截断）
    maxMessageLength: number;
    // 会话作用域: 'chat' 按聊天会话, 'user' 按用户独立会话
    sessionScope: 'chat' | 'user';
  };
}
