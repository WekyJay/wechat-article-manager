#!/usr/bin/env node
/**
 * WAM CLI - WeChat Article Manager CLI
 */

import { program } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Import commands
import { initConfig, showConfig, setConfig } from './commands/config.cmd';
import { uploadImage, listMaterials } from './commands/material.cmd';
import { createDraft, listDrafts, getDraft, deleteDraft } from './commands/draft.cmd';
import { publishDraft, publishMarkdown, listPublished, getPublishStatus } from './commands/publish.cmd';

// Read package.json
const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

program
  .name('wam-cli')
  .description('WeChat Article Manager - 微信公众号文章管理工具')
  .version(packageJson.version, '-v, --version');

// Config commands
program
  .command('config')
  .description('Manage configuration 管理配置')
  .addCommand(
    program.createCommand('init')
      .description('Initialize configuration 初始化配置')
      .action(initConfig)
  )
  .addCommand(
    program.createCommand('show')
      .description('Show current configuration 显示当前配置')
      .action(showConfig)
  )
  .addCommand(
    program.createCommand('set')
      .description('Set configuration value 设置配置项')
      .argument('<key>', 'Configuration key (appId, appSecret)')
      .argument('<value>', 'Configuration value')
      .action(setConfig)
  );

// Material commands
program
  .command('material')
  .alias('m')
  .description('Manage materials 管理素材')
  .addCommand(
    program.createCommand('upload')
      .alias('up')
      .description('Upload image material 上传图片素材')
      .argument('<file>', 'Image file path 图片文件路径')
      .option('-t, --type <type>', 'Upload type: url|material', 'url')
      .action(uploadImage)
  )
  .addCommand(
    program.createCommand('list')
      .alias('ls')
      .description('List materials 列出素材')
      .option('-t, --type <type>', 'Material type: image|video|voice|news', 'image')
      .option('-o, --offset <offset>', 'Offset', '0')
      .option('-c, --count <count>', 'Count (1-20)', '20')
      .action(listMaterials)
  );

// Draft commands
program
  .command('draft')
  .alias('d')
  .description('Manage drafts 管理草稿')
  .addCommand(
    program.createCommand('create')
      .alias('c')
      .description('Create draft from markdown 从 Markdown 创建草稿')
      .argument('<file>', 'Markdown file path Markdown 文件路径')
      .option('--cover <cover>', 'Cover image path 封面图片路径')
      .action(createDraft)
  )
  .addCommand(
    program.createCommand('list')
      .alias('ls')
      .description('List drafts 列出草稿')
      .option('-o, --offset <offset>', 'Offset', '0')
      .option('-c, --count <count>', 'Count (1-20)', '20')
      .action(listDrafts)
  )
  .addCommand(
    program.createCommand('get')
      .alias('g')
      .description('Get draft details 获取草稿详情')
      .argument('<mediaId>', 'Draft media ID 草稿素材 ID')
      .action(getDraft)
  )
  .addCommand(
    program.createCommand('delete')
      .alias('del')
      .description('Delete draft 删除草稿')
      .argument('<mediaId>', 'Draft media ID 草稿素材 ID')
      .action(deleteDraft)
  );

// Publish commands
program
  .command('publish')
  .alias('p')
  .description('Publish articles 发布文章')
  .addCommand(
    program.createCommand('submit')
      .alias('s')
      .description('Submit draft for publishing 提交草稿发布')
      .argument('<mediaId>', 'Draft media ID 草稿素材 ID')
      .option('-w, --wait', 'Wait for publish to complete 等待发布完成')
      .action(publishDraft)
  )
  .addCommand(
    program.createCommand('md')
      .description('Publish markdown directly 直接发布 Markdown')
      .argument('<file>', 'Markdown file path Markdown 文件路径')
      .option('--cover <cover>', 'Cover image path 封面图片路径')
      .option('-w, --wait', 'Wait for publish to complete 等待发布完成')
      .action(publishMarkdown)
  )
  .addCommand(
    program.createCommand('list')
      .alias('ls')
      .description('List published articles 列出已发布文章')
      .option('-o, --offset <offset>', 'Offset', '0')
      .option('-c, --count <count>', 'Count (1-20)', '20')
      .action(listPublished)
  )
  .addCommand(
    program.createCommand('status')
      .alias('st')
      .description('Check publish status 查询发布状态')
      .argument('<publishId>', 'Publish ID 发布任务 ID')
      .action(getPublishStatus)
  );

// Error handling
program.on('command:*', () => {
  console.error(chalk.red('Invalid command: %s'), program.args.join(' '));
  console.log(chalk.yellow('See --help for a list of available commands.'));
  process.exit(1);
});

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
