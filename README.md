# feishu-claude-code
A channel from Feishu to commute with Claude Code
# feishu-claude-code

通过飞书/Lark 远程与 **Claude Code** 交互的桥接服务。无需公网地址，基于飞书 WebSocket 长连接，在飞书中直接调用 Claude Code 的全部能力（读写文件、执行命令、分析代码等）。

---

## 工作原理

```
飞书用户发消息（文本 / 图片 / 文件 / 音频 / 视频）
      │
      ▼
飞书 WebSocket 长连接（无需公网 IP）
      │
      ▼
消息解析 → 附件下载 → 权限检查 → 路由会话
      │
      ▼
Claude Code 子进程（每个会话独立，支持多轮对话）
      │
      ▼
流式输出 → 飞书卡片实时更新
      │
      ▼（若输出含 [[SEND_FILE:/path]]）
上传文件/图片 → 飞书消息发送
```

---

## 功能

| 特性 | 说明 |
|------|------|
| WebSocket 长连接 | 无需公网 IP 或域名 |
| 多轮对话 | 每个聊天保持独立的 Claude 会话上下文 |
| 流式输出 | 通过飞书卡片实时展示 Claude 的输出过程 |
| 权限自动批准 | 远程无终端场景下自动跳过权限确认弹窗 |
| 访问控制 | 支持群聊白名单、用户白名单、@机器人限制 |
| 会话隔离 | 按聊天或按用户独立隔离 Claude 进程 |
| 自动回收 | 空闲会话超时自动销毁，释放系统资源 |
| 接收附件 | 自动下载图片/文件/音频/视频到工作目录供 Claude 处理 |
| 发送文件 | Claude 输出中用 `[[SEND_FILE:/path]]` 标记，自动上传并发送 |

---

## 安装

### 前置条件

目标机器需要：

| 软件 | 版本 | 验证命令 |
|------|------|----------|
| Node.js | ≥ 18 | `node --version` |
| Claude Code | 任意 | `claude --version` |

Claude Code 需提前完成登录（执行 `claude` 后能正常对话）。

### 方式一：打包安装（推荐，无需网络账号）


```bash
tar -xzf feishu-claude-code.tar.gz
cd feishu-claude-code
npm install --omit=dev
cp .env.example .env
nano .env          # 填入凭证（见配置说明）
npm start
```

### 方式二：Git 仓库

```bash
git clone https://github.com/Shaoruisun/feishu-claude-code/
cd feishu-claude-code
npm install
npm run build
cp .env.example .env && nano .env
npm start
```

---

## 配置飞书应用

在 [飞书开放平台](https://open.feishu.cn) 完成以下设置（只需配置一次，多台机器共用同一应用）：

## 第一步：创建自建应用

1. 进入「开发者后台」→「创建企业自建应用」
2. 填写应用名称（如 `Claude Code`）和描述
3. 记录「凭证与基础信息」中的 **App ID** 和 **App Secret**


### 第二步：申请权限

点击 “权限管理”，批量导入以下权限：
{
  "scopes": {
    "tenant": [
      "im:message",
      "im:message:send_as_bot",
      "im:message:readonly",
      "im:message.group_at_msg:readonly",
      "im:message.p2p_msg:readonly",
      "im:chat.access_event.bot_p2p_chat:read",
      "im:chat.members:bot_access",
      "im:resource"
    ]
  }
}

| 权限标识 | 用途 |
|----------|------|
| `im:message` | 发送消息（文本、卡片、图片、文件） |
| `im:message:readonly` | 读取消息内容 |
| `im:message.group_at_msg:readonly` | 读取群 @ 消息 |
| `im:resource` | 下载/上传消息中的图片和文件附件 |

> **`im:resource` 是文件收发功能的必要权限。** 若缺少此权限，机器人无法下载用户发送的附件，也无法向飞书上传文件/图片。


### 第三步：开启机器人能力

「应用功能」→「机器人」→ 保存


### 第四步：配置事件订阅

「事件订阅」→ 连接方式选择 **「使用长连接接收事件」**（无需公网 IP）

添加事件：

| 事件 | 说明 |
|------|------|
| `im.message.receive_v1` | 接收消息（文本、图片、文件等所有类型）

### 第五步：发布应用

「版本管理与发布」→ 创建版本 → 申请发布（或在测试环境直接使用）


---

## 配置说明

复制 `.env.example` 为 `.env` 并填写：

```bash
cp .env.example .env
```

### 必填项

| 变量 | 说明 |
|------|------|
| `FEISHU_APP_ID` | 飞书应用 ID，格式 `cli_xxxxxxxxxxxxxxxx` |
| `FEISHU_APP_SECRET` | 飞书应用密钥 |

### 常用配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `FEISHU_DOMAIN` | `feishu` | 国内版填 `feishu`，国际版填 `lark` |
| `CLAUDE_WORKDIR` | 当前目录 | Claude 的工作目录，可读写此目录下的文件 |
| `CLAUDE_PERMISSION_MODE` | `bypassPermissions` | 权限模式（见下方说明） |
| `BOT_REQUIRE_MENTION` | `true` | 群聊是否需要 @机器人 才响应 |
| `BOT_ALLOWED_USER_IDS` | 空（不限） | 允许使用的用户 open_id，逗号分隔 |
| `BOT_ALLOWED_GROUP_IDS` | 空（不限） | 允许的群聊 ID，逗号分隔 |
| `BOT_SESSION_SCOPE` | `chat` | `chat` 群组共享会话 / `user` 用户各自独立 |
| `CLAUDE_SESSION_TIMEOUT` | `1800000` | 会话空闲超时毫秒（默认 30 分钟） |
| `LOG_LEVEL` | `info` | 日志级别：`error` `warn` `info` `debug` |

### 权限模式（CLAUDE_PERMISSION_MODE）

远程使用 Claude Code 时，它执行写文件、运行命令等操作需要确认。此配置控制确认方式：

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `bypassPermissions` | 自动批准所有操作，无需确认 | 受信任的个人机器（推荐） |
| `acceptEdits` | 仅自动批准文件编辑，其他需确认 | 需要部分控制 |
| `default` | 所有操作均需手动确认 | 需要本地终端才能操作，远程不可用 |

> **注意**：`bypassPermissions` 模式下 Claude 可执行任意操作，请通过 `BOT_ALLOWED_USER_IDS` 严格限制可访问的用户。

---

## 启动与运行

### 直接启动

```bash
npm start
```

启动成功输出：
```
[INFO] Claude CLI found {"version":"2.x.x (Claude Code)"}
[INFO] ✅ Feishu WebSocket connected. Listening for messages…
```

### 后台运行

```bash
nohup npm start > ~/feishu-claude-code.log 2>&1 &

# 查看日志
tail -f ~/feishu-claude-code.log

# 停止
pkill -f "node dist/index.js"
```

---

## 使用示例

### 文本对话

**私聊机器人**，直接发送消息：
```
帮我查看 /home/sun/project 目录的结构
```

**群聊中**，需要 @机器人：
```
@Claude Code 分析这段代码有什么问题
@Claude Code 在 /home/sun/workspace 创建一个 hello.py
@Claude Code 执行 git log --oneline -5
```

### 发送附件给 Claude

直接将图片、文件、音频发送给机器人（私聊），或在群聊中 @机器人 并附上文件。Claude 会自动收到下载好的本地路径，可以直接处理：

```
[发送一张截图]
帮我分析这张图里的代码有什么 bug
```

```
[发送一个 data.csv]
@Claude Code 读取这个 CSV 文件，统计一下数据分布
```

支持的附件类型：

| 类型 | 说明 |
|------|------|
| 图片 | jpg / png / gif / webp 等，下载后供 Claude 读取 |
| 文件 | pdf / doc / xls / ppt / txt / zip 等 |
| 音频 | opus / ogg 等 |
| 视频 | mp4 / mov 等 |

### Claude 输出文件到飞书

当 Claude 生成了文件（如报告、代码、图表），可在 prompt 中要求它用 `[[SEND_FILE:路径]]` 标记，服务会自动将文件上传并发送到飞书：

```
帮我分析 sales.csv，生成一份 Markdown 报告，并输出 [[SEND_FILE:/home/sun/workspace/report.md]]
```

- 图片文件（jpg/png/gif/webp/…）→ 以图片消息发送，飞书内可直接预览
- 普通文件（pdf/doc/xls/…）→ 以文件消息发送，可下载
- opus/ogg 音频 → 以语音消息发送，飞书内可直接播放

---

## 项目结构

```
feishu-claude-code/
├── src/
│   ├── index.ts              # 入口：WebSocket 启动，优雅退出
│   ├── config.ts             # 配置加载（.env + config.json）
│   ├── logger.ts             # 日志
│   ├── types.ts              # 类型定义
│   ├── feishu/
│   │   ├── client.ts         # 飞书 SDK 客户端（API + WebSocket）
│   │   ├── handler.ts        # 核心消息处理器（附件下载、文件发送）
│   │   ├── parser.ts         # 飞书消息解析（文本/附件提取）
│   │   ├── sender.ts         # 卡片构建与发送（文本/图片/文件/卡片）
│   │   └── file-transfer.ts  # 文件上传下载（图片走 /im/v1/images，文件走 /im/v1/files）
│   └── claude/
│       ├── process.ts        # Claude CLI 子进程封装
│       └── session.ts        # 多会话生命周期管理
├── dist/                     # 编译产物（TypeScript → JavaScript）
├── .env.example              # 配置模板
├── config.example.json       # JSON 格式配置模板
├── README.md                 # 本文件
└── INSTALL.md                # 详细安装说明
```

---

## 常见问题

**Q：启动报 `Claude CLI not found`**

```bash
which claude          # 确认 claude 在 PATH 中
claude --version      # 确认版本正常
# 若不在 PATH，在 .env 中设置完整路径：
CLAUDE_BIN=/usr/local/bin/claude
```

**Q：消息发出去机器人没有反应**

1. 确认飞书应用已订阅 `im.message.receive_v1` 事件，连接方式为「长连接」
2. 群聊中确认已 @机器人（`BOT_REQUIRE_MENTION=true` 时必须）
3. 查看日志确认消息是否被接收：`tail -f ~/feishu-claude-code.log`

**Q：卡片显示「无输出」**

通常是 Claude 子进程崩溃，开启 debug 日志排查：
```bash
LOG_LEVEL=debug npm start
```

**Q：发送图片/文件给机器人，Claude 说收不到**

1. 确认飞书应用已申请 `im:resource` 权限并已发布
2. 查看日志中是否有 `File downloaded` 或下载报错信息
3. 确认 `CLAUDE_WORKDIR` 目录存在且有写入权限

**Q：Claude 用 `[[SEND_FILE:...]]` 标记文件，但飞书没有收到**

1. 确认文件路径正确且文件实际存在（Claude 必须先生成文件，再标记）
2. 图片文件需是 jpg/png/gif/webp/bmp/ico/tiff 之一，否则会走文件消息
3. 文件大小不超过 30MB（图片不超过 10MB）
4. 查看日志中 `Output file sent to Feishu` 或上传报错信息

**Q：如何只允许特定用户使用**

在 `.env` 中填入用户白名单（open_id 在飞书开发者后台可查）：
```bash
BOT_ALLOWED_USER_IDS=ou_xxxxxxxx,ou_yyyyyyyy
```

**Q：多台机器能否用同一个飞书应用**

可以。飞书长连接支持多客户端同时连接，消息会随机分发给其中一个。若需固定路由，建议每台机器创建独立的飞书应用。

---

## 安全建议

- 通过 `BOT_ALLOWED_USER_IDS` 限制可操作的用户，不要对所有人开放
- 设置 `CLAUDE_WORKDIR` 限制 Claude 的操作范围
- 不要将机器人加入公开群聊
- 定期检查 Claude 的操作日志
