#!/usr/bin/env node
/**
 * feishu-claude-code
 * ==================
 * 让飞书/Lark 能够远程与 Claude Code 交互的插件服务。
 *
 * 架构：
 *   飞书 WebSocket ──► MessageHandler ──► SessionManager ──► ClaudeProcess (subprocess)
 *                                                        ◄── streaming events
 *   ◄── updateCard (throttled) ──────────────────────────────────────────────────────
 */
export {};
//# sourceMappingURL=index.d.ts.map