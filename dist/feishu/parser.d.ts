import type { FeishuMessage } from '../types.js';
/**
 * 解析飞书 im.message.receive_v1 事件，提取标准化的消息对象。
 */
export declare function parseMessageEvent(event: Record<string, unknown>): FeishuMessage | null;
/**
 * 去除消息中的 @机器人 提及前缀，以及多余空白。
 */
export declare function stripBotMention(text: string): string;
//# sourceMappingURL=parser.d.ts.map