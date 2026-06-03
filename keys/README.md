# 更新签名密钥

- `easydone-updater.key.pub`：公钥，已写入 `src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey`。
- `easydone-updater.key`：私钥（已 gitignore），发版时由 `publish-update.mjs` 使用。

重新生成（会覆盖）：

```bash
npm run tauri signer generate -- --ci -w keys/easydone-updater.key -f
```

生成后需将 `.pub` 文件内容同步到 `tauri.conf.json`。
