"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = getClient;
exports.createWSClient = createWSClient;
const lark = __importStar(require("@larksuiteoapi/node-sdk"));
const logger_js_1 = require("../logger.js");
let _client = null;
/** 获取飞书 API 客户端单例 */
function getClient(config) {
    if (_client)
        return _client;
    const domain = resolveDomain(config.feishu.domain);
    _client = new lark.Client({
        appId: config.feishu.appId,
        appSecret: config.feishu.appSecret,
        domain,
        loggerLevel: lark.LoggerLevel.warn,
    });
    logger_js_1.logger.info('Feishu API client created', { appId: config.feishu.appId, domain });
    return _client;
}
/** 创建 WebSocket 客户端 */
function createWSClient(config) {
    return new lark.WSClient({
        appId: config.feishu.appId,
        appSecret: config.feishu.appSecret,
        loggerLevel: lark.LoggerLevel.warn,
    });
}
function resolveDomain(domain) {
    if (domain === 'feishu')
        return lark.Domain.Feishu;
    if (domain === 'lark')
        return lark.Domain.Lark;
    return domain; // 自定义私有部署地址
}
//# sourceMappingURL=client.js.map