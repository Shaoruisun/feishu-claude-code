import type { PluginConfig, FeishuCard } from '../types.js';
/**
 * 构造飞书流式输出卡片。
 *
 * 使用 Markdown 元素展示 Claude 输出，header 颜色指示状态：
 *   蓝色  → 处理中
 *   绿色  → 完成
 *   红色  → 出错
 */
export declare function buildCard(content: string, status: 'thinking' | 'streaming' | 'done' | 'error', meta?: {
    workdir?: string;
    duration?: number;
}): FeishuCard;
/** 发送卡片消息，返回 message_id */
export declare function sendCard(config: PluginConfig, chatId: string, card: FeishuCard, replyMessageId?: string): Promise<string>;
/** 更新已有卡片内容 */
export declare function updateCard(config: PluginConfig, messageId: string, card: FeishuCard): Promise<void>;
/** 发送纯文本消息 */
export declare function sendText(config: PluginConfig, chatId: string, text: string, replyMessageId?: string): Promise<string>;
/** 发送文件消息（需先用 uploadFile 获取 file_key） */
export declare function sendFile(config: PluginConfig, chatId: string, fileKey: string, replyMessageId?: string, msgType?: 'file' | 'audio'): Promise<string>;
/** 发送图片消息（需先用 uploadImage 获取 image_key） */
export declare function sendImage(config: PluginConfig, chatId: string, imageKey: string, replyMessageId?: string): Promise<string>;
//# sourceMappingURL=sender.d.ts.map