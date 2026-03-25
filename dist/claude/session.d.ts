import type { PluginConfig, Session } from '../types.js';
import { ClaudeProcess } from './process.js';
interface SessionEntry {
    session: Session;
    process: ClaudeProcess;
    timer: NodeJS.Timeout;
}
/**
 * SessionManager 管理每个聊天/用户的 Claude 会话生命周期。
 *
 * 每个会话对应一个持久化的 claude 子进程，支持多轮对话。
 * 超时后自动清理；超过最大并发数时，淘汰最久未活跃的会话。
 */
export declare class SessionManager {
    private sessions;
    private readonly config;
    constructor(config: PluginConfig);
    /** 根据消息信息获取或创建会话 */
    getOrCreate(chatId: string, senderId: string): {
        session: Session;
        process: ClaudeProcess;
    };
    /** 获取会话（不创建） */
    get(chatId: string, senderId: string): SessionEntry | undefined;
    /** 删除会话（销毁子进程） */
    destroy(chatId: string, senderId: string): void;
    /** 销毁所有会话 */
    destroyAll(): void;
    get size(): number;
    private makeKey;
    private create;
    private touch;
    private scheduleTimeout;
    private evictOldest;
    private resolveWorkdir;
}
export {};
//# sourceMappingURL=session.d.ts.map