# TOOLS.md - 本地笔记

Skills 定义工具_如何_工作。这个文件用于_你的_具体信息——也就是你配置里独有的内容。

## API Key 配置

### 阿里云百炼 API

- **普通百炼 API Key（MCP 调用）：** `sk-32c79eb638574359872ce7e35c5ef67f`
  - 用途：调用 MCP 工具（web_search、code_interpreter 等）
  - 接口：https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions

- **Coding Plan API Key（常规对话/代码）：** `sk-sp-8ebd39fd2f474efc8736edd5d7fc35f3`
  - 用途：日常对话、代码生成、常规 API 调用

**使用规则：**
- 常规对话和代码 → 使用 Coding Plan API Key
- 调用 MCP 工具 → 使用普通百炼 API Key

---

## 这里写什么

例如：

- 摄像头名称和位置
- SSH 主机和别名
- 偏好的 TTS 声音
- 音箱/房间名称
- 设备昵称
- 任何与环境相关的内容

## 示例

```markdown
### 摄像头

- living-room → 主区域，180° 广角
- front-door → 入口，运动触发

### SSH

- home-server → 192.168.1.100，用户：admin

### TTS

- 偏好声音："Nova"（温暖，略带英式口音）
- 默认音箱：厨房 HomePod
```

## 为什么要分开？

Skills 是共享的。你的配置属于你自己。把它们分开意味着你可以在不丢失笔记的情况下更新 skills，也能在不泄露你的基础设施信息的情况下共享 skills。

---

添加任何能帮助你完成工作的内容。这是你的速查表。
