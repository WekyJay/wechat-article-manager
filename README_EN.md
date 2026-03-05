# WeChat Article Manager

<p align="center">
  <strong>WeChat Official Account Article Management Platform</strong><br>
  One-click publish from Markdown to WeChat Official Account
</p>

<p align="center">
  <a href="https://github.com/WekyJay/wechat-article-manager/blob/main/README.md">中文</a> |
  <a href="#features">Features</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="#commands">Commands</a>
</p>

---

## Features

- 🚀 **One-click Publish**: Publish from Markdown files directly to WeChat Official Account
- 🖼️ **Automatic Image Processing**: Auto-upload local images to WeChat Material Library
- 📝 **Draft Management**: Create, view, and delete drafts
- 📤 **Material Management**: Upload images and get permanent URLs
- 🎨 **Custom Styles**: Support custom CSS styling
- 💻 **CLI Tool**: Complete command-line interface
- 🤖 **OpenClaw Integration**: Support direct AI assistant operations

## Installation

### Global Installation

```bash
npm install -g wechat-article-manager
```

### Local Installation

```bash
npm install wechat-article-manager
```

## Quick Start

### 1. Configure WeChat Account

```bash
# Initialize configuration
wam-cli config init

# Or set manually
wam-cli config set appId YOUR_APP_ID
wam-cli config set appSecret YOUR_APP_SECRET
```

### 2. Write Markdown Article

```markdown
---
title: My Article Title
author: Author Name
digest: Article summary description
cover: ./cover-image.jpg
---

# Article Title

Content supports **bold**, *italic*, ~~strikethrough~~ and more.

## Image Example

![Local Image](./local-image.png)

## Code Block

```javascript
console.log('Hello WeChat!');
```

## Table

| Col1 | Col2 |
|------|------|
| A    | B    |
```

### 3. Create Draft

```bash
wam-cli draft create ./my-article.md --cover ./cover.jpg
```

### 4. Publish Article

```bash
# Publish draft
wam-cli publish submit MEDIA_ID

# Or publish Markdown directly
wam-cli publish md ./my-article.md --cover ./cover.jpg --wait
```

## Commands

### Configuration

```bash
wam-cli config init              # Initialize configuration
wam-cli config show              # Show current configuration
wam-cli config set <key> <val>   # Set configuration
```

### Material

```bash
wam-cli material upload <file>          # Upload image
wam-cli material list                   # List materials
wam-cli material list -t image -c 10    # List 10 images
```

### Draft

```bash
wam-cli draft create <file>             # Create draft from Markdown
wam-cli draft create <file> --cover <img>  # With cover image
wam-cli draft list                      # List drafts
wam-cli draft get <media-id>            # Get draft details
wam-cli draft delete <media-id>         # Delete draft
```

### Publish

```bash
wam-cli publish submit <media-id>       # Submit draft for publish
wam-cli publish submit <media-id> --wait  # Wait for completion
wam-cli publish md <file>               # Publish Markdown directly
wam-cli publish list                    # List published articles
wam-cli publish status <publish-id>     # Check publish status
```

## OpenClaw Skill Commands

In OpenClaw:

```
/wechat-init                    # Initialize config
/wechat-upload <image-path>     # Upload image
/wechat-draft-create <md-file>  # Create draft
/wechat-draft-list              # List drafts
/wechat-publish <draft-id>      # Publish draft
/wechat-publish-md <md-file>    # One-click publish
```

## API Usage

```typescript
import { WeChatFormatter, MaterialAPI, DraftAPI, PublishAPI } from 'wechat-article-manager';

// Initialize
const formatter = new WeChatFormatter(materialAPI, draftAPI);

// Process Markdown
const result = await formatter.process('./article.md', true);
console.log('Draft created:', result.draftResponse?.media_id);
```

## Configuration

Config file location: `config/wechat.config.json`

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
  "defaultAuthor": "Default Author"
}
```

## Prerequisites

1. **WeChat Official Account**: Requires verified Service Account
2. **IP Whitelist**: Configure server IP in WeChat MP Platform
3. **API Permissions**: Ensure you have material, draft, and publish permissions

## Notes

- Image size limit: 10MB
- Article length: No explicit limit, recommended to be reasonable
- AccessToken validity: 7200 seconds (auto-refresh)
- Publish API restrictions: Some account types restricted after July 2025

## Project Structure

```
wechat-article-manager/
├── src/
│   ├── core/           # Core utilities (config, logger, cache)
│   ├── wechat/         # WeChat API wrappers
│   │   ├── auth/       # AccessToken management
│   │   ├── api/        # API implementations
│   │   └── types/      # TypeScript types
│   ├── markdown/       # Markdown processing
│   └── cli/            # CLI tools
├── bin/                # CLI entry
└── config/             # Config files
```

## Development

```bash
# Clone project
git clone https://github.com/WekyJay/wechat-article-manager.git
cd wechat-article-manager

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Development mode
npm run dev
```

## Contributing

Issues and Pull Requests are welcome!

## License

[MIT](LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/WekyJay">WekyJay</a>
</p>
