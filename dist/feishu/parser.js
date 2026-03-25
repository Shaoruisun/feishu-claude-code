"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMessageEvent = parseMessageEvent;
exports.stripBotMention = stripBotMention;
const logger_js_1 = require("../logger.js");
/**
 * 解析飞书 im.message.receive_v1 事件，提取标准化的消息对象。
 */
function parseMessageEvent(event) {
    try {
        const msg = event['message'];
        const sender = event['sender'];
        if (!msg || !sender)
            return null;
        const messageId = msg['message_id'];
        const chatId = msg['chat_id'];
        const chatType = msg['chat_type'];
        const messageType = msg['message_type'];
        const senderId = sender['sender_id']?.['open_id'] ?? '';
        if (!messageId || !chatId || !senderId)
            return null;
        const content = extractContent(msg);
        const fileAttachments = extractFileAttachments(msg);
        // 文件类消息内容可以为空（仅携带附件），文本消息必须有内容
        if (!content && (!fileAttachments || fileAttachments.length === 0))
            return null;
        const mentionList = msg['mentions'] ?? [];
        const mentionBot = mentionList.some((m) => m['key']?.startsWith('@_user') || m['name'] === 'bot');
        return {
            messageId,
            chatId,
            chatType,
            senderId,
            senderName: extractSenderName(sender),
            content: content ?? '',
            messageType,
            rootId: msg['root_id'],
            parentId: msg['parent_id'],
            mentionBot,
            fileAttachments: fileAttachments.length > 0 ? fileAttachments : undefined,
        };
    }
    catch (err) {
        logger_js_1.logger.warn('Failed to parse message event', { err, event });
        return null;
    }
}
function extractContent(msg) {
    const messageType = msg['message_type'];
    const rawContent = msg['content'];
    if (!rawContent)
        return null;
    try {
        const body = JSON.parse(rawContent);
        switch (messageType) {
            case 'text':
                return body['text']?.trim() ?? null;
            case 'post': {
                // 富文本：提取所有 text 节点
                const content = body['content'];
                const parts = [];
                for (const line of content ?? []) {
                    for (const el of line ?? []) {
                        if (el['tag'] === 'text')
                            parts.push(el['text']);
                        if (el['tag'] === 'at')
                            parts.push(`@${el['user_name'] ?? el['user_id']}`);
                    }
                }
                return parts.join('').trim() || null;
            }
            default:
                return null;
        }
    }
    catch {
        return rawContent.trim() || null;
    }
}
/** 从飞书消息中提取文件附件信息（image/file/audio/media 类型） */
function extractFileAttachments(msg) {
    const messageType = msg['message_type'];
    const rawContent = msg['content'];
    if (!rawContent)
        return [];
    try {
        const body = JSON.parse(rawContent);
        switch (messageType) {
            case 'image': {
                const imageKey = body['image_key'];
                if (!imageKey)
                    return [];
                return [{ fileKey: imageKey, fileType: 'image' }];
            }
            case 'file': {
                const fileKey = body['file_key'];
                if (!fileKey)
                    return [];
                return [{
                        fileKey,
                        fileType: 'file',
                        fileName: body['file_name'],
                        fileSize: body['file_size'] ? Number(body['file_size']) : undefined,
                    }];
            }
            case 'audio': {
                const fileKey = body['file_key'];
                if (!fileKey)
                    return [];
                return [{ fileKey, fileType: 'audio' }];
            }
            case 'media': {
                const fileKey = body['file_key'];
                if (!fileKey)
                    return [];
                return [{
                        fileKey,
                        fileType: 'media',
                        fileName: body['file_name'],
                    }];
            }
            default:
                return [];
        }
    }
    catch {
        return [];
    }
}
function extractSenderName(sender) {
    return sender['sender_id']?.['open_id'] ?? 'unknown';
}
/**
 * 去除消息中的 @机器人 提及前缀，以及多余空白。
 */
function stripBotMention(text) {
    // 飞书 @机器人 格式：<at user_id="ou_xxx">名字</at> 或 @名字 前缀
    return text
        .replace(/@\S+\s*/g, '')
        .replace(/<at[^>]*>.*?<\/at>/g, '')
        .trim();
}
//# sourceMappingURL=parser.js.map