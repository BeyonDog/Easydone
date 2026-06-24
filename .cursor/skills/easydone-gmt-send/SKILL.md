---
name: easydone-gmt-send
description: Implements and debugs easydone GMT item mail and global mail (reward_items, wear_value, durability, branch env). Use when changing GMT send, init_wear_value, additional_info, AdminSendMail, global mail, gmtEnvId, branch environment dropdown, or sendTemplate flows.
---

# easydone GMT 发信

## 何时使用

- 改 GMT 发道具、全服邮件、模板发送、批量发送
- 武器/防具磨损（0–100）或钥匙/绷带/甲修耐久
- 分支环境下拉、双 rct01、DoesNotExist 等 GMT 错误

## 数据流

```
gmtApi.contract.ts  →  sendTemplate.ts  →  App.tsx（状态 + 入口）
        ↓                      ↓
gmtApi.contract.test.ts   types.ts + main.rs SendTemplateItem
```

## 工作流

1. **读契约**：`src/lib/gmtApi.contract.ts` + `gmtApi.contract.test.ts`
2. **改构建**：`defaultRewardItem` / `buildAdminSendMailExecBody` / `buildAdminSendGlobalMailExecBody`
3. **改业务**：`sendTemplate.ts`（`buildSendItemsFromSelection`、`toGmtRewardItems`、`execAdminSendMailItems`）
4. **改 UI 状态**：`App.tsx` 中 `itemLineWear`、`itemLineDurability`、`wearRowOverride`、`durabilityRowOverride`、`defaultWearValue`；逻辑见 `itemWearValue.ts`
5. **对齐类型**：`types.ts` `SendTemplateItem`；`src-tauri/src/main.rs` serde 字段
6. **环境**：`branchEnvDisplay.ts`（展示）、`healGmtEnvConfig.ts`（配置修复）、`gmtEnvSelection.ts`（id 校验）
7. **验证**：`npm test` → `npm run build`；动 Rust 则 `cargo check`

## 载荷速查

| 类型 | additional_info | init_params |
|------|-----------------|-------------|
| 武器/防具 | wear_value | init_wear_value（单发）/ initWearValue（全服） |
| 钥匙/绷带/甲修 | durability | 无耐久 init 字段 |

## 发送路径清单（改一需查全）

- 表格右键 / 一键发送 / 批量 / 发送已勾选
- 模板保存与打开、全服发送弹窗
- `viewSelectionCache` 恢复勾选时的 wear/durability 快照

## 常见错误

- `ItemInitParams` 无 `init_durability` → 耐久只写 `additional_info.durability`
- `DoesNotExist` → 检查 `gmtEnvId` 请求头与 `param.env` name 是否匹配当前环境
- 双 rct01 标签反了 → 用 `protocol` 消歧，勿仅按 id 排序猜测
