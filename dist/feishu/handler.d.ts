import type { PluginConfig } from '../types.js';
import { SessionManager } from '../claude/session.js';
/**
 * MessageHandler 是核心处理类：
 *   1. 接收飞书事件 → 解析消息
 *   2. 权限检查
 *   3. 路由到 Claude 会话
 *   4. 将 Claude 流式输出实时回写到飞书卡片
 */
export declare class MessageHandler {
    private readonly config;
    private readonly sessions;
    constructor(config: PluginConfig, sessions: SessionManager);
    /** 飞书 im.message.receive_v1 事件入口 */
    handle(eventData: Record<string, unknown>): Promise<void>;
    private processPrompt;
    private isAllowed;
    /**
     * 扫描 Claude 输出，查找 [[SEND_FILE:/path/to/file]] 标记，
     * 上传对应文件并发送到飞书。
     */
    private sendOutputFiles;
}
//# sourceMappingURL=handler.d.ts.map