/**
 * Wire updater UI into App.tsx without editing Chinese strings in-place.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(root, "src", "App.tsx");
let src = fs.readFileSync(appPath, "utf8");

const importBlock = `import { SettingsUpdateSection } from "./SettingsUpdateSection.tsx";
import { UpdateAvailableModal } from "./UpdateAvailableModal.tsx";
import { useAppUpdater } from "./useAppUpdater.ts";
`;

if (!src.includes('from "./useAppUpdater.ts"')) {
  const anchor = 'import { buildSendItemsFromSelection';
  if (!src.includes(anchor)) {
    console.error("apply-update-integration: anchor import not found");
    process.exit(1);
  }
  src = src.replace(anchor, importBlock + anchor);
}

if (!src.includes("useAppUpdater(")) {
  const hookAnchor = "const { entries: operationLogEntries, logOp, clearLog } = useOperationLog();";
  const hookInsert = `${hookAnchor}
  const appUpdater = useAppUpdater({ checkOnMount: true });`;
  if (!src.includes(hookAnchor)) {
    console.error("apply-update-integration: hook anchor not found");
    process.exit(1);
  }
  src = src.replace(hookAnchor, hookInsert);
}

if (!src.includes("<SettingsUpdateSection")) {
  const settingsAnchor = "<SidebarColorSettings";
  const settingsInsert = `<SettingsUpdateSection
            configured={appUpdater.configured}
            checking={appUpdater.checking}
            statusMessage={appUpdater.statusMessage}
            onCheck={() => void appUpdater.runCheck(false)}
          />
          ${settingsAnchor}`;
  if (!src.includes(settingsAnchor)) {
    console.error("apply-update-integration: settings anchor not found");
    process.exit(1);
  }
  src = src.replace(settingsAnchor, settingsInsert);
}

if (!src.includes("<UpdateAvailableModal")) {
  const modalAnchor = "{settingsOpen ? <SettingsModal /> : null}";
  const modalInsert = `{appUpdater.offer ? (
        <UpdateAvailableModal offer={appUpdater.offer} onDismiss={appUpdater.dismiss} />
      ) : null}
      ${modalAnchor}`;
  if (!src.includes(modalAnchor)) {
    console.error("apply-update-integration: modal anchor not found");
    process.exit(1);
  }
  src = src.replace(modalAnchor, modalInsert);
}

fs.writeFileSync(appPath, src, "utf8");
console.log("apply-update-integration: OK");
