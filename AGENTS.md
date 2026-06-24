# easydone — Agent 指引

本地 Tauri 工具：Excel 道具/任务表、GMT 发信、GTOP 配置上传、发送模板与筛选。

## 持久约定（自动加载）

项目 Rules 位于 [`.cursor/rules/`](.cursor/rules/)：

| 文件 | 作用 |
|------|------|
| `easydone-project.mdc` | 栈、命令、工作区路径、改动原则 |
| `easydone-git.mdc` | Commit / PR 规范 |
| `easydone-typescript.mdc` | TS/React 目录与测试（编辑 `src/**` 时） |
| `easydone-gmt.mdc` | GMT 载荷、分支环境（编辑 GMT 相关文件时） |

## Skills（相关任务时阅读）

| Skill | 路径 | 用途 |
|-------|------|------|
| GMT 发信 | [`.cursor/skills/easydone-gmt-send/SKILL.md`](.cursor/skills/easydone-gmt-send/SKILL.md) | 改发道具/全服邮件、磨损耐久、分支环境 |
| 功能开发 | [`.cursor/skills/easydone-dev-workflow/SKILL.md`](.cursor/skills/easydone-dev-workflow/SKILL.md) | 表格筛选/置顶/排序、GTOP 上传、勾选缓存 |

## 快速命令

```bash
npm.cmd test
npm.cmd run build
npm.cmd run tauri dev
```

人类使用说明见 [docs/使用说明.md](docs/使用说明.md)、[README.md](README.md)。
