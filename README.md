# WeChat Article Manager

<p align="center">
  <strong>微信公众号文章管理平台</strong><br>
  支持 Markdown 一键发布到微信公众号
</p>

<p align="center">
  <a href="https://github.com/WekyJay/wechat-article-manager/blob/main/README_EN.md">English</a> |
  <a href="#功能特性">功能特性</a> |
  <a href="#快速开始">快速开始</a> |
  <a href="#命令参考">命令参考</a>
</p>

---

## 功能特性

- 🚀 **Markdown 一键发布**: 从 Markdown 文件直接发布到微信公众号
- 🖼️ **自动图片处理**: 自动上传本地图片到微信素材库
- 📝 **草稿箱管理**: 创建、查看、删除草稿
- 📤 **素材管理**: 上传图片素材，获取永久 URL
- 🎨 **自定义样式**: 支持自定义 CSS 样式
- 💻 **CLI 工具**: 完整的命令行工具
- 🤖 **OpenClaw 集成**: 支持 AI 助手直接操作

## 安装

### 全局安装

```bash
npm install -g wechat-article-manager
```

### 本地安装

```bash
npm install wechat-article-manager
```

## 快速开始

### 1. 配置微信公众号

```bash
# 初始化配置
wam-cli config init

# 或手动设置
wam-cli config set appId YOUR_APP_ID
wam-cli config set appSecret YOUR_APP_SECRET
```

### 2. 编写 Markdown 文章

```markdown
---
title: 我的文章标题
author: 作者名称
digest: 文章摘要描述
cover: ./cover-image.jpg
---

# 文章标题

正文内容支持 **粗体**、*斜体*、~~删除线~~ 等格式。

## 图片示例

![本地图片](./local-image.png)

## 代码块

```javascript
console.log('Hello WeChat!');
```

## 表格

| 列1 | 列2 |
|-----|-----|
| A   | B   |
```

### 3. 创建草稿

```bash
wam-cli draft create ./my-article.md --cover ./cover.jpg
```

### 4. 发布文章

```bash
# 发布草稿
wam-cli publish submit MEDIA_ID

# 或直接发布 Markdown
wam-cli publish md ./my-article.md --cover ./cover.jpg --wait
```

## 命令参考

### 配置命令

```bash
wam-cli config init              # 初始化配置
wam-cli config show              # 显示当前配置
wam-cli config set <key> <val>   # 设置配置项
```

### 素材命令

```bash
wam-cli material upload <file>          # 上传图片
wam-cli material list                   # 列出素材
wam-cli material list -t image -c 10    # 列出 10 个图片素材
```

### 草稿命令

```bash
wam-cli draft create <file>             # 从 Markdown 创建草稿
wam-cli draft create <file> --cover <img>  # 指定封面图
wam-cli draft list                      # 列出草稿
wam-cli draft get <media-id>            # 查看草稿详情
wam-cli draft delete <media-id>         # 删除草稿
```

### 发布命令

```bash
wam-cli publish submit <media-id>       # 发布草稿
wam-cli publish submit <media-id> --wait  # 等待发布完成
wam-cli publish md <file>               # 直接发布 Markdown
wam-cli publish list                    # 列出已发布文章
wam-cli publish status <publish-id>     # 查询发布状态
```

## OpenClaw Skill 指令

在 OpenClaw 中使用：

```
/wechat-init                    # 初始化配置
/wechat-upload <图片路径>       # 上传图片
/wechat-draft-create <md文件>   # 创建草稿
/wechat-draft-list              # 列出草稿
/wechat-publish <草稿ID>        # 发布草稿
/wechat-publish-md <md文件>     # 一键发布
```

## API 使用

```typescript
import { WeChatFormatter, MaterialAPI, DraftAPI, PublishAPI } from 'wechat-article-manager';

// 初始化
const formatter = new WeChatFormatter(materialAPI, draftAPI);

// 处理 Markdown
const result = await formatter.process('./article.md', true);
console.log('Draft created:', result.draftResponse?.media_id);
```

## 配置说明

配置文件位置：`config/wechat.config.json`

```json
{
  "wechat": {
    "appId": "your-app-id",
    "appSecret": "your-app-secret",
    "baseUrl": "https://api.weixin.qq.com",
    "timeout": 30000,
    "maxRetries": 3
  },
  "logLevel": "info",
  "cacheDir": ".cache",
  "defaultAuthor": "默认作者"
}
```

## 前置要求

1. **微信公众号**: 需要已认证的服务号
2. **IP 白名单**: 在微信公众平台配置服务器 IP
3. **接口权限**: 确保拥有素材管理、草稿箱、发布接口权限

## 注意事项

- 图片大小限制：10MB
- 文章字数限制：无明确限制，建议控制在合理范围
- AccessToken 有效期：7200 秒（自动刷新）
- 发布接口权限：2025年7月起部分账号类型受限

## 项目结构

```
wechat-article-manager/
├── src/
│   ├── core/           # 核心工具（配置、日志、缓存）
│   ├── wechat/         # 微信 API 封装
│   │   ├── auth/       # AccessToken 管理
│   │   ├── api/        # API 实现
│   │   └── types/      # TypeScript 类型
│   ├── markdown/       # Markdown 处理
│   └── cli/            # 命令行工具
├── bin/                # CLI 入口
└── config/             # 配置文件
```

## 开发

```bash
# 克隆项目
git clone https://github.com/WekyJay/wechat-article-manager.git
cd wechat-article-manager

# 安装依赖
npm install

# 编译
npm run build

# 运行测试
npm test

# 开发模式
npm run dev
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

[MIT](LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/WekyJay">WekyJay</a>
</p>
