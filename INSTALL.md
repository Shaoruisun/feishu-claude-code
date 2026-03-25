# 安装说明

## 目录

- [前置要求](#前置要求)
- [获取项目](#获取项目)
- [配置飞书应用](#配置飞书应用)
- [配置服务](#配置服务)
- [启动服务](#启动服务)
- [设置开机自启（可选）](#设置开机自启可选)
- [验证是否正常工作](#验证是否正常工作)
- [配置参数说明](#配置参数说明)
- [常见问题](#常见问题)

---

## 前置要求

在目标机器上确认以下软件已安装：

| 软件 | 最低版本 | 检查命令 | 安装地址 |
|------|----------|----------|----------|
| Node.js | 18.0.0 | `node --version` | https://nodejs.org |
| npm | 8.0.0 | `npm --version` | 随 Node.js 附带 |
| Claude Code | 任意 | `claude --version` | https://code.claude.com |

> **注意：** Claude Code 需要提前完成登录（`claude` 命令可正常使用）。

---

## 获取项目

### 方式一：从源机器复制（推荐）

在 **源机器**（已有项目的机器）执行：

```bash
cd /home/sun
tar -czf feishu-claude-code.tar.gz feishu-claude-code/
scp feishu-claude-code.tar.gz 用户名@目标机器IP:/home/用户名/
```

在 **目标机器** 执行：

```bash
cd ~
tar -xzf feishu-claude-code.tar.gz
cd feishu-claude-code
npm install --omit=dev   # 仅安装运行时依赖，跳过 TypeScript 编译工具
```

> 如果源机器打包时已包含 `dist/` 目录，目标机器无需重新编译，直接 `npm start` 即可。

### 方式二：Git 仓库（需编译）

```bash
git clone https://github.com/Shaoruisun/feishu-claude-code
cd feishu-claude-code
npm install
npm run build
```

---

## 配置飞书应用

在 [飞书开放平台](https://open.feishu.cn) 完成以下操作（**每台机器共用同一个飞书应用，只需配置一次**）：

### 第一步：创建自建应用

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

## 配置服务

在项目目录下创建 `.env` 文件：

```bash
cd feishu-claude-code
cp .env.example .env
nano .env   # 或使用任意编辑器
```

填写以下内容（**必填项**用 `*` 标注）：

```bash
# * 飞书应用凭证
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 飞书域名：国内版填 feishu，国际版填 lark
FEISHU_DOMAIN=feishu

# Claude Code 工作目录（Claude 可以读写此目录下的文件，附件也会下载到此处）
CLAUDE_WORKDIR=/home/用户名/claude_workspace

# 群聊中是否需要 @机器人 才响应（true/false）
BOT_REQUIRE_MENTION=true
```

> 完整配置项说明见文末 [配置参数说明](#配置参数说明)。

---

## 启动服务

### 直接启动

```bash
cd feishu-claude-code
npm start
```

启动成功后会看到：

```
[INFO] Claude CLI found {"version":"2.x.x (Claude Code)"}
[INFO] feishu-claude-code starting ...
[INFO] ✅ Feishu WebSocket connected. Listening for messages…
```

### 后台运行（使用 nohup）

```bash
nohup npm start > ~/feishu-claude-code.log 2>&1 &
echo "PID: $!"

# 查看日志
tail -f ~/feishu-claude-code.log

# 停止服务
pkill -f "node dist/index.js"
```

---

## 设置开机自启（可选）

### Linux（systemd）

```bash
sudo tee /etc/systemd/system/feishu-claude-code.service << EOF
[Unit]
Description=Feishu Claude Code Bridge
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)
EnvironmentFile=$(pwd)/.env
ExecStart=$(which node) $(pwd)/dist/index.js
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 启用并启动
sudo systemctl daemon-reload
sudo systemctl enable feishu-claude-code
sudo systemctl start feishu-claude-code

# 查看状态和日志
sudo systemctl status feishu-claude-code
sudo journalctl -u feishu-claude-code -f
```



## 验证是否正常工作

**1. 确认服务在运行**

```bash
ps aux | grep "node dist/index" | grep -v grep
```

**2. 在飞书中测试文本对话**

- **私聊**：直接给机器人发送任意消息
- **群聊**：将机器人加入群聊后，发送 `@机器人 你好`

预期响应：机器人先发出「⏳ Claude Code 思考中…」卡片，随后实时更新，完成后变为绿色「✅ Claude Code」。

**3. 测试发送附件**

向机器人私聊发送一张图片，并附上文字说明：

```
[发送任意图片]
描述一下这张图片的内容
```

预期：机器人能识别图片并回复描述。若附件下载成功，日志中会出现 `File downloaded from message`。

**4. 测试文件输出**

发送以下消息：

```
在工作目录创建一个 hello.txt，写入"Hello from Claude"，然后输出 [[SEND_FILE:/填写你的CLAUDE_WORKDIR/hello.txt]]
```

预期：机器人会先创建文件，随后将文件作为飞书文件消息发送过来。

---

## 配置参数说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `FEISHU_APP_ID` | — | **必填** 飞书应用 ID |
| `FEISHU_APP_SECRET` | — | **必填** 飞书应用密钥 |
| `FEISHU_DOMAIN` | `feishu` | `feishu` 国内版 / `lark` 国际版 |
| `CLAUDE_BIN` | `claude` | claude 可执行文件路径 |
| `CLAUDE_WORKDIR` | 当前目录 | Claude 工作目录（附件下载目录 / 可读写范围） |
| `CLAUDE_PERMISSION_MODE` | `bypassPermissions` | 权限模式：`bypassPermissions` / `acceptEdits` / `default` |
| `CLAUDE_SESSION_TIMEOUT` | `1800000` | 会话空闲超时，单位毫秒（默认 30 分钟） |
| `CLAUDE_MAX_SESSIONS` | `50` | 最大并发会话数 |
| `BOT_REQUIRE_MENTION` | `true` | 群聊是否需要 @机器人 |
| `BOT_ALLOWED_GROUP_IDS` | 空（不限） | 允许的群聊 ID，逗号分隔 |
| `BOT_ALLOWED_USER_IDS` | 空（不限） | 允许的用户 open_id，逗号分隔 |
| `BOT_STREAMING_INTERVAL` | `800` | 卡片更新节流间隔，单位毫秒 |
| `BOT_MAX_MESSAGE_LENGTH` | `4000` | 单条消息最大字符数 |
| `BOT_SESSION_SCOPE` | `chat` | `chat` 群组共享会话 / `user` 用户独立会话 |
| `LOG_LEVEL` | `info` | 日志级别：`error` / `warn` / `info` / `debug` |

---

## 常见问题

**Q：启动报错 `Claude CLI not found`**

确保 `claude` 命令在 PATH 中可用：
```bash
which claude          # 查看路径
claude --version      # 验证可用
```
若路径不在 PATH 中，在 `.env` 中设置完整路径：
```bash
CLAUDE_BIN=/usr/local/bin/claude
```

**Q：消息发出去但机器人没反应**

1. 检查飞书应用是否已订阅 `im.message.receive_v1` 事件，连接方式为「长连接」
2. 群聊中确认是否已 @机器人（`BOT_REQUIRE_MENTION=true` 时必须）
3. 查看服务日志确认是否有报错：`tail -f ~/feishu-claude-code.log`

**Q：卡片能发出去但内容一直是「等待输出…」**

通常是 claude 子进程启动失败，查看 debug 日志：
```bash
LOG_LEVEL=debug npm start
```

**Q：发送图片/文件后 Claude 说没有收到**

1. 确认飞书应用已申请 `im:resource` 权限并重新发布
2. 查看日志确认是否出现 `File downloaded from message` 或下载报错
3. 确认 `CLAUDE_WORKDIR` 目录存在且服务用户有写入权限：
   ```bash
   mkdir -p /你设置的/CLAUDE_WORKDIR
   ls -ld /你设置的/CLAUDE_WORKDIR
   ```

**Q：用 `[[SEND_FILE:...]]` 标记文件，飞书没有收到**

1. 确认文件路径正确且文件已实际生成（Claude 需先创建文件再标记）
2. 图片文件需是 jpg/png/gif/webp/bmp/ico/tiff 之一，其他格式走文件消息
3. 文件大小限制：图片 ≤ 10MB，普通文件 ≤ 30MB
4. 开启 debug 日志查看上传日志：`LOG_LEVEL=debug npm start`

**Q：opus 音频文件发送后在飞书无法播放**

确认使用的是最新版本，旧版本存在 `msg_type` 错误（opus 文件错误地用了 `file` 类型而非 `audio`）。更新后重新 `npm run build` 并重启服务。

**Q：如何限制只有特定用户可以使用**

在 `.env` 中添加用户白名单（open_id 可在飞书开发者后台查询，或查看服务日志中的 `sender` 字段）：
```bash
BOT_ALLOWED_USER_IDS=ou_xxxxxxxx,ou_yyyyyyyy
```

**Q：多台机器能否使用同一个飞书应用**

可以。飞书 WebSocket 长连接支持多个客户端同时连接同一个应用，消息会随机分发给其中一个客户端。若需要指定路由，建议每台机器使用独立的飞书应用。
