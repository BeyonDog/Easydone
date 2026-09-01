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

## 开发流程（Superpowers）

通用过程来自 Cursor 已安装的 [Superpowers](https://github.com/obra/superpowers) 插件（本机 skills：`~/.cursor/plugins/local/superpowers/skills/`）。与上表领域 skills **叠加，不互相替代**：

1. **新功能 / 非琐碎改动**：先 `brainstorming` → `writing-plans`，设计与计划经确认后再实现（`executing-plans` / `subagent-driven-development`）；实现纪律跟 `test-driven-development`
2. **修 bug**：先 `systematic-debugging`，禁止未定位根因就改代码
3. **声称完成前**：跑 `npm.cmd test`，涉及前端构建再 `npm.cmd run build`，涉及 Rust 再 `cargo check`（`src-tauri/`）——对应 `verification-before-completion`
4. **领域细节**（GMT / 表格 / GTOP 等）：仍优先读上方 easydone skills 与 `.cursor/rules/`

优先级：**用户显式指令** > Superpowers 过程 skills > 默认 agent 行为。用户说「不要 TDD」「直接改」时，以用户为准。

## 快速命令

```bash
npm.cmd test
npm.cmd run build
npm.cmd run tauri dev
```

人类使用说明见 [docs/使用说明.md](docs/使用说明.md)、[README.md](README.md)。
