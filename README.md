# easydone

本地工具：浏览 `Excel\\Item.xlsx`（`Item` 表）与 `Excel\\Mission.xlsx`（`Task` 表），支持列隐藏、行勾选另存为、以及「去 GMT 执行」（打开 GMTool + 剪贴板指令 + 书签说明）。

## 开发

需安装 [Node.js](https://nodejs.org/) 与 [Rust](https://rustup.rs/)。

### Windows：PowerShell 禁止运行脚本（`npm.ps1` 报错）

在 **PowerShell** 里直接输入 `npm` 会执行 `npm.ps1`，可能被 `ExecutionPolicy` 拦截。任选其一：

1. **推荐**：用 **`npm.cmd`** 代替 `npm`，或双击项目里的 **`start-dev.bat`**（已用 `npm.cmd` 调用）。
   ```powershell
   cd D:\AIWorkspace\easydone
   npm.cmd install
   npm.cmd run tauri dev
   ```
2. **当前用户放宽策略**（一次设置，之后仍可用 `npm`）：
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```
3. **不改策略**：在 **cmd.exe**（命令提示符）里执行 `npm`，一般会调用 `npm.cmd`，不触发该错误。

### 常用命令

```bash
cd D:\AIWorkspace\easydone
npm.cmd install
npm.cmd run tauri dev
```

或双击 **`start-dev.bat`** 启动开发环境。

## 首次使用

首次向导中请选择 **Excel 工作区根**（其下须存在 `Excel\Item.xlsx` 与 `Excel\Mission.xlsx`）。

配置保存在系统应用配置目录下的 `config.json`。

## 构建

```bash
npm.cmd run tauri build
```

或双击 **`start-build.bat`**。

详细使用说明见 **[docs/使用说明.md](docs/使用说明.md)**。

## 内网发版（应用内更新）

### 一次性准备

1. **签名密钥**（已生成则跳过）：
   - 仓库已含公钥锁定文件 `keys/signing-key.lock.json` 与 `tauri.conf.json` 中的 `pubkey`（须三者一致：lock、`.pub`、私钥）。
   - 仅**首次**无 `keys/easydone-updater.key` 时运行 `npm run signing:init`（**禁止** `signer generate -f` 覆盖）。
   - 日常发版前运行 `npm run signing:check`，或由发版 GUI / 构建脚本自动校验。
   - **永不换钥**：换钥后旧版客户端无法自动更新，需同事手动安装；easydoneKey 备份是防**丢失**私钥，不能替代「不换钥」策略。

2. **发版配置**：`publish.config.json` 不提交 Git（见 `.gitignore`）。首次发版可任选其一：
   - 启动发版 GUI（`start-publish-gui.bat` / `npm run publish:gui`）时会从 `publish.config.example.json` **自动复制**生成；
   - 或手动：`copy publish.config.example.json publish.config.json`（PowerShell：`Copy-Item publish.config.example.json publish.config.json`），或 `npm run publish:init`。
   - 示例默认产物目录 `Update/`、HTTP 基址 `http://10.21.125.168:8080`；换机器或 IP 时请改 `outputDir` / `publicBaseUrl` 并同步 `.env` 与 `tauri.conf.json`。

3. **HTTP 服务**：内网访问 `http://10.21.125.168:8080/latest.json`。发版机可运行 `npm run verify:update` 检查清单与 8080 是否可用。
   - **推荐（开机自启、后台无窗口）**：双击 **`install-update-autostart.bat`** 一次，之后登录 Windows 会自动启动；日志见 `Update/update-http.log`。取消自启：**`uninstall-update-autostart.bat`**。
   - **手动调试**：双击 **`start-update-server.bat`**（或 `npm run update:serve`），保持窗口打开。

4. **客户端构建**：`.env` 已指向 `http://10.21.125.168:8080/latest.json`，与 `tauri.conf.json` 一致；执行 `npm.cmd run tauri build` 即可。

### 发版（维护者）

1. 确保更新 HTTP 已运行（已装开机自启则跳过；否则双击 **`start-update-server.bat`**）
2. **图形界面**：双击 **`start-publish-gui.bat`**，**保持命令行窗口打开**；服务就绪后会自动打开 http://127.0.0.1:1421/ 。三个按钮**相互独立**：
   - **仅构建**：只 `tauri build`，产物在 `src-tauri/target/release/bundle/nsis/`，**不改版本号、不写入 Update/**，供本机安装测试。
   - **仅发布**：用已有 NSIS 产物复制到 `Update/` 并写 `latest.json`（需先构建成功）；可填写新版本号与更新说明。应用内自动更新须 `src-tauri/tauri.conf.json` 中 `bundle.createUpdaterArtifacts: true`，且构建产生 `.exe.sig`（已配置 `keys/easydone-updater.key`）。`publish.config.json` 中 `requireInstallerSignature: true` 时无 `.sig` 将禁止发布。同事报「缺少 url 或 signature」时：检查 `latest.json` 的 `signature` 非空，并重新带签名构建后发布。
   - **构建并发布**：完整发版流程（构建 → 复制 → 清单 → HTTP 校验）。
   - 网页一直「加载中」或打不开：确认 bat 窗口未关闭；若提示端口占用，结束占用 **1421** 的进程或设置 `PUBLISH_GUI_PORT`。
   - 详细构建日志见 `Update/publish-gui.log`。
3. **代码存档（GitHub）**：同一发版 GUI 页面下方的「代码存档」区，可将**当前源码 + 最新 NSIS 安装包**推送到 [BeyonDog/Easydone](https://github.com/BeyonDog/Easydone) 的 `main` / `second` / `third` 分支（`--force-with-lease`，覆盖该分支远程历史）。
   - 须先执行「仅构建」或「构建并发布」生成 NSIS，再点「保存到 xxx」。
   - 发版机须安装 **Git**；`publish.config.json` 中可配置 `github` 段（见 `publish.config.example.json`）。若 GUI 提示未检测到 Git 但本机已安装，可在 `github.gitPath` 指定 `git.exe` 完整路径，或依赖脚本自动探测 `%LOCALAPPDATA%\\Programs\\Git` 等常见目录。HTTPS 推送可设置环境变量 `GITHUB_TOKEN` 或 `github.token`（勿提交仓库）。
   - 安装包副本写入 `ReleaseArtifacts/<分支>/` 并随源码一并提交；各槽位上次保存时间与项目大小记录在本地 `Update/repo-saves.json`（不提交 Git）。
4. **发版凭据备份（easydoneKey）**：发版 GUI 最下方「发版凭据备份」区，一键将 `keys/easydone-updater.key`、`publish.config.json`、`publish.config.example.json` 推送到 [BeyonDog/easydoneKey](https://github.com/BeyonDog/easydoneKey)（默认分支 `main`，可在 `publish.config.json` 的 `keyBackup` 段修改远程地址）。
   - 推送认证与代码存档相同：`GITHUB_TOKEN` 或 `publish.config.json` → `github.token`（HTTPS）。
   - 上次成功时间记录在本地 `Update/key-backup.json`（不提交 Git）。
   - **安全警告**：该仓库若为 **Public**，任何人可克隆并拿到签名私钥与配置，进而伪造带签名的更新包。仅建议在可接受风险时使用；长期请将仓库改为 **Private**，并优先用离线加密备份私钥。
   - **换机恢复**：`git clone https://github.com/BeyonDog/easydoneKey.git`，将 `easydone-updater.key` 拷到 `keys/`，将两个 `publish.config*.json` 拷到项目根，再安装 Node/Rust/Git 即可发版（内网 Update HTTP 仍需单独配置）。
   - 命令行：`node scripts/backup-key-repo.mjs`
- **命令行**：
  - `node scripts/publish-update.mjs --build-only` — 仅构建
  - `node scripts/publish-update.mjs --publish-only [--version V] [--notes "..."]` — 仅发布
  - `npm.cmd run publish -- --notes "修复某某问题"` — 构建并发布（等同默认）
  - `node scripts/git-save-branch.mjs --branch second` — 代码存档到 GitHub `second` 分支（需已构建 NSIS）

### 客户端

已安装版本启动时会**静默**检查更新（失败不弹 Toast，避免骚扰）。顶栏右侧显示 **当前版本号**，可点 **检查更新** 手动检查；**设置 → 应用更新** 中也可查看本机版本与更新清单地址（可点击链接在浏览器验证是否为 JSON）。发现新版本后弹窗显示版本、大小与说明，**立即更新** 将下载安装并重启。用户数据仍在应用配置目录的 `config.json`，不受覆盖。

### 同事收不到更新？

| 现象 | 处理 |
|------|------|
| 浏览器打不开 `http://10.21.125.168:8080/latest.json` | 发版机开 `start-update-server` / 开机自启；防火墙放行 **8080** |
| 能打开 JSON，app 显示已是最新 | 发版时**提高版本号**；同事版本须 **低于** `latest.json` 的 `version` |
| 提示「无法读取内网更新清单」或 `Could not fetch a valid release JSON` | `Update/` 中尚无 `latest.json` 或更新 HTTP 未运行；发版机执行「构建并发布」后确认浏览器能打开 JSON |
| 发版机本机提示「无法连接」但浏览器能开 8080 | 需安装含 **Rust 预检** 的新客户端（`tauri build` 后重装）；并运行 `npm run verify:update` |
| 设置/顶栏检查更新报错 | 看中文报错；确认 `start-update-server.bat` 与发版产物 |
| 发版 GUI 报「发布校验失败」 | 按日志修 HTTP 或 `Update/` 内文件缺失问题后重新发版 |
| 自动更新报 `different key` | 客户端公钥与发版私钥不一致；用弹窗手动安装链接或内网安装包重装一版；勿无计划 `signer generate -f` |
| 凭据备份 push 失败 | 配置 `GITHUB_TOKEN` / `github.token`；确认对 easydoneKey 有写权限；日志见 `Update/publish-gui.log` |
| 发版报「禁止换钥」/ signing-guard 失败 | 恢复 `tauri.conf` 的 `pubkey` 与 `keys/signing-key.lock.json`、`easydone-updater.key.pub` 一致；勿改 lock；确认真私钥未丢 |
