import { EventEmitter } from 'events';
import type { ClaudeStreamEvent } from '../types.js';
export type ClaudeEventCallback = (event: ClaudeStreamEvent) => void;
/**
 * ClaudeProcess 封装了一个持久化的 claude CLI 子进程。
 *
 * 通信协议：
 *   stdin  → JSON Lines，每行一个 {type:"user", message:{role:"user", content:"..."}}
 *   stdout ← JSON Lines，每行一个流式事件 {type:"assistant"|"result"|"tool_use"|...}
 *
 * 使用 --input-format stream-json --output-format stream-json 模式
 * 以实现多轮对话 + 流式输出。
 */
export declare class ClaudeProcess extends EventEmitter {
    private proc;
    private stdoutBuffer;
    private running;
    private readonly bin;
    private readonly workdir;
    private readonly extraArgs;
    private readonly permissionMode;
    private readonly systemPrompt;
    constructor(bin: string, workdir: string, extraArgs?: string[], permissionMode?: 'bypassPermissions' | 'acceptEdits' | 'default', systemPrompt?: string);
    /** 启动子进程 */
    start(): void;
    /**
     * 发送用户消息，返回 AsyncGenerator 用于消费流式事件。
     *
     * 修复：先注册事件监听，再写 stdin，避免快速响应时的竞态条件。
     */
    sendMessage(content: string): AsyncGenerator<ClaudeStreamEvent>;
    /** 解析 stdout 缓冲区，逐行 emit 事件 */
    private flushBuffer;
    /** 根据 permissionMode 生成对应的 CLI 参数 */
    private buildPermissionArgs;
    /** 优雅停止子进程 */
    stop(): void;
    get isRunning(): boolean;
}
//# sourceMappingURL=process.d.ts.map