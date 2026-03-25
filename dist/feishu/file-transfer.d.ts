import type { PluginConfig } from '../types.js';
/**
 * 从飞书消息中下载附件（图片/文件/音频/视频），保存到指定目录，返回本地文件路径。
 */
export declare function downloadMessageFile(config: PluginConfig, messageId: string, fileKey: string, fileType: 'image' | 'file' | 'audio' | 'media', destDir: string, fileName?: string): Promise<string>;
/**
 * 上传本地文件到飞书，返回 file_key。
 * 支持 pdf/doc/docx/xls/xlsx/ppt/pptx/mp4/opus 及其他通用文件（stream 类型）。
 */
export declare function uploadFile(config: PluginConfig, filePath: string): Promise<string>;
/**
 * 上传本地图片到飞书，返回 image_key。
 * 支持 JPEG/PNG/WEBP/GIF/TIFF/BMP/ICO，不超过 10MB。
 */
export declare function uploadImage(config: PluginConfig, imagePath: string): Promise<string>;
/**
 * 根据文件路径决定是上传图片还是文件，返回 { type, key, msgType }。
 * msgType: 'image' 用于图片消息，'audio' 用于 opus 音频，'file' 用于其他文件。
 */
export declare function uploadAuto(config: PluginConfig, filePath: string): Promise<{
    type: 'image' | 'file';
    key: string;
    msgType: 'image' | 'file' | 'audio';
}>;
//# sourceMappingURL=file-transfer.d.ts.map