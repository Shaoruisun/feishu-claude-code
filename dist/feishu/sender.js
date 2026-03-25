"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCard = buildCard;
exports.sendCard = sendCard;
exports.updateCard = updateCard;
exports.sendText = sendText;
exports.sendFile = sendFile;
exports.sendImage = sendImage;
const client_js_1 = require("./client.js");
const logger_js_1 = require("../logger.js");
/**
 * 构造飞书流式输出卡片。
 *
 * 使用 Markdown 元素展示 Claude 输出，header 颜色指示状态：
 *   蓝色  → 处理中
 *   绿色  → 完成
 *   红色  → 出错
 */
function buildCard(content, status, meta) {
    const headerMap = {
        thinking: { title: '⏳ Claude Code 思考中…', color: 'blue' },
        streaming: { title: '⚡ Claude Code 输出中…', color: 'turquoise' },
        done: { title: '✅ Claude Code', color: 'green' },
        error: { title: '❌ Claude Code 出错', color: 'red' },
    };
    const { title, color } = headerMap[status];
    const elements = [];
    if (content) {
        elements.push({ tag: 'markdown', content: truncate(content, 4000) });
    }
    else {
        elements.push({ tag: 'markdown', content: '_等待输出…_' });
    }
    // 底部元数据栏
    const metaParts = [];
    if (meta?.workdir)
        metaParts.push(`📂 \`${meta.workdir}\``);
    if (meta?.duration !== undefined)
        metaParts.push(`⏱ ${(meta.duration / 1000).toFixed(1)}s`);
    if (metaParts.length > 0) {
        elements.push({ tag: 'hr' });
        elements.push({ tag: 'markdown', content: metaParts.join('  |  ') });
    }
    return {
        config: { wide_screen_mode: true, enable_forward: true },
        header: {
            title: { tag: 'plain_text', content: title },
            template: color,
        },
        elements,
    };
}
/** 发送卡片消息，返回 message_id */
async function sendCard(config, chatId, card, replyMessageId) {
    const client = (0, client_js_1.getClient)(config);
    const msgContent = JSON.stringify({
        type: 'template',
        data: {
            template_id: undefined, // 使用内联卡片，不需要模板 ID
        },
    });
    // 使用内联卡片格式
    const cardJson = JSON.stringify(card);
    try {
        let resp;
        if (replyMessageId) {
            resp = await client.im.message.reply({
                path: { message_id: replyMessageId },
                data: {
                    content: cardJson,
                    msg_type: 'interactive',
                },
            });
        }
        else {
            resp = await client.im.message.create({
                params: { receive_id_type: 'chat_id' },
                data: {
                    receive_id: chatId,
                    content: cardJson,
                    msg_type: 'interactive',
                },
            });
        }
        const messageId = resp.data?.message_id ?? '';
        logger_js_1.logger.debug('Card sent', { messageId, chatId });
        return messageId;
    }
    catch (err) {
        logger_js_1.logger.error('Failed to send card', { err });
        throw err;
    }
}
/** 更新已有卡片内容 */
async function updateCard(config, messageId, card) {
    const client = (0, client_js_1.getClient)(config);
    const cardJson = JSON.stringify(card);
    try {
        await client.im.message.patch({
            path: { message_id: messageId },
            data: { content: cardJson },
        });
        logger_js_1.logger.debug('Card updated', { messageId });
    }
    catch (err) {
        logger_js_1.logger.warn('Failed to update card', { messageId, err });
        // 更新失败不抛出，继续累积内容等待下次更新
    }
}
/** 发送纯文本消息 */
async function sendText(config, chatId, text, replyMessageId) {
    const client = (0, client_js_1.getClient)(config);
    const content = JSON.stringify({ text: truncate(text, 4000) });
    try {
        let resp;
        if (replyMessageId) {
            resp = await client.im.message.reply({
                path: { message_id: replyMessageId },
                data: { content, msg_type: 'text' },
            });
        }
        else {
            resp = await client.im.message.create({
                params: { receive_id_type: 'chat_id' },
                data: { receive_id: chatId, content, msg_type: 'text' },
            });
        }
        return resp.data?.message_id ?? '';
    }
    catch (err) {
        logger_js_1.logger.error('Failed to send text', { err });
        throw err;
    }
}
function truncate(text, maxLen) {
    if (text.length <= maxLen)
        return text;
    return text.slice(0, maxLen - 3) + '…';
}
/** 发送文件消息（需先用 uploadFile 获取 file_key） */
async function sendFile(config, chatId, fileKey, replyMessageId, msgType = 'file') {
    const client = (0, client_js_1.getClient)(config);
    const content = JSON.stringify({ file_key: fileKey });
    try {
        let resp;
        if (replyMessageId) {
            resp = await client.im.message.reply({
                path: { message_id: replyMessageId },
                data: { content, msg_type: msgType },
            });
        }
        else {
            resp = await client.im.message.create({
                params: { receive_id_type: 'chat_id' },
                data: { receive_id: chatId, content, msg_type: msgType },
            });
        }
        const messageId = resp.data?.message_id ?? '';
        logger_js_1.logger.debug('File message sent', { messageId, chatId, msgType });
        return messageId;
    }
    catch (err) {
        logger_js_1.logger.error('Failed to send file message', { err });
        throw err;
    }
}
/** 发送图片消息（需先用 uploadImage 获取 image_key） */
async function sendImage(config, chatId, imageKey, replyMessageId) {
    const client = (0, client_js_1.getClient)(config);
    const content = JSON.stringify({ image_key: imageKey });
    try {
        let resp;
        if (replyMessageId) {
            resp = await client.im.message.reply({
                path: { message_id: replyMessageId },
                data: { content, msg_type: 'image' },
            });
        }
        else {
            resp = await client.im.message.create({
                params: { receive_id_type: 'chat_id' },
                data: { receive_id: chatId, content, msg_type: 'image' },
            });
        }
        const messageId = resp.data?.message_id ?? '';
        logger_js_1.logger.debug('Image message sent', { messageId, chatId });
        return messageId;
    }
    catch (err) {
        logger_js_1.logger.error('Failed to send image message', { err });
        throw err;
    }
}
//# sourceMappingURL=sender.js.map