# SKILL.md - WeChat Article Manager

## Metadata

| Property | Value |
|----------|-------|
| **name** | wechat-article-manager |
| **version** | 2.0.0 |
| **author** | WekyJay |
| **description** | 微信公众号文章管理平台 - 支持 Markdown 一键发布到公众号 |

## Commands

### Configuration

| Command | Description | Usage |
|---------|-------------|-------|
| `/wechat-init` | Initialize WeChat configuration | `/wechat-init` |
| `/wechat-config` | View/Set configuration | `/wechat-config [key] [value]` |

### Material Management

| Command | Description | Usage |
|---------|-------------|-------|
| `/wechat-upload` | Upload image to WeChat | `/wechat-upload <image-path>` |

### Draft Management

| Command | Description | Usage |
|---------|-------------|-------|
| `/wechat-draft-create` | Create draft from Markdown | `/wechat-draft-create <md-file> [cover-image]` |
| `/wechat-draft-list` | List all drafts | `/wechat-draft-list [count]` |

### Publishing

| Command | Description | Usage |
|---------|-------------|-------|
| `/wechat-publish` | Publish a draft | `/wechat-publish <media-id>` |
| `/wechat-publish-md` | Publish Markdown directly | `/wechat-publish-md <md-file> [cover-image]` |

## Workflow

```
Markdown File → Parse → Upload Images → Convert HTML → Create Draft → Publish
```

## Configuration

Required environment/config:
- `WECHAT_APP_ID` - WeChat App ID
- `WECHAT_APP_SECRET` - WeChat App Secret

Optional:
- `WECHAT_DEFAULT_AUTHOR` - Default article author

## Markdown Front Matter

```yaml
---
title: Article Title
author: Author Name
digest: Article summary
cover: ./cover-image.jpg
sourceUrl: https://example.com/original
---

Article content here...
```

## Features

- ✅ Markdown to WeChat HTML conversion
- ✅ Automatic image upload
- ✅ Draft management
- ✅ One-click publish
- ✅ CLI tool included

## Dependencies

- Node.js 18+
- WeChat Official Account (Service Account)
- IP whitelist configured in WeChat MP

## License

MIT
