# 更新签名密钥（永不换钥）

- `easydone-updater.key.pub`：公钥，须与 `src-tauri/tauri.conf.json` → `plugins.updater.pubkey` **完全一致**。
- `easydone-updater.key`：私钥（已 gitignore），发版时由 `publish-update.mjs` 使用。
- `signing-key.lock.json`：锁定公钥（入 Git）；发版前会校验 lock / tauri.conf / `.pub` 三者一致。

**禁止**使用 `signer generate -f` 覆盖已有私钥。换钥会导致已安装同事自动更新失败（`different key`），需全员手动重装。

仅**首次**无私钥时：

```bash
npm run signing:init
```

按提示将 `.pub` 写入 `tauri.conf.json`，再运行：

```bash
npm run signing:check
```

日常发版前也会自动执行 `signing:check`（构建 / 发布 / 发版 GUI）。
