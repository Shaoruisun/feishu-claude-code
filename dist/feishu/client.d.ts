import * as lark from '@larksuiteoapi/node-sdk';
import type { PluginConfig } from '../types.js';
/** 获取飞书 API 客户端单例 */
export declare function getClient(config: PluginConfig): lark.Client;
/** 创建 WebSocket 客户端 */
export declare function createWSClient(config: PluginConfig): lark.WSClient;
//# sourceMappingURL=client.d.ts.map