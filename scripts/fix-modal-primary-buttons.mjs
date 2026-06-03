/**
 * Fix snapshot/template modal primary buttons mislabeled as 取消.
 * Run: node scripts/fix-modal-primary-buttons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const appPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src/App.tsx");
let s = fs.readFileSync(appPath, "utf8");

const fixes = [
  [
    `onClick={() => void commitSnapshotSave(snapshotNameDraft)}>
                取消
              </button>`,
    `onClick={() => void commitSnapshotSave(snapshotNameDraft)}>
                保存
              </button>`,
    "commitSnapshotSave",
  ],
  [
    `onClick={() => void commitSnapshotRename(snapshotRenameModal.draft)}
              >
                取消
              </button>`,
    `onClick={() => void commitSnapshotRename(snapshotRenameModal.draft)}
              >
                保存
              </button>`,
    "commitSnapshotRename",
  ],
  [
    `                  void removeSnapshot(id);
                }}
              >
                取消
              </button>`,
    `                  void removeSnapshot(id);
                }}
              >
                确认删除
              </button>`,
    "removeSnapshot",
  ],
  [
    `onClick={() => void commitTemplateSave(templateNameDraft)}>
                取消
              </button>`,
    `onClick={() => void commitTemplateSave(templateNameDraft)}>
                保存
              </button>`,
    "commitTemplateSave",
  ],
  [
    `onClick={() => void commitTemplateRename(templateRenameModal.draft)}>
                取消
              </button>`,
    `onClick={() => void commitTemplateRename(templateRenameModal.draft)}>
                保存
              </button>`,
    "commitTemplateRename",
  ],
  [
    `                  void removeSendTemplate(id);
                }}
              >
                取消
              </button>`,
    `                  void removeSendTemplate(id);
                }}
              >
                确认删除
              </button>`,
    "removeSendTemplate",
  ],
];

let applied = 0;
for (const [old, neu, label] of fixes) {
  if (!s.includes(old)) {
    console.error(`MISSING [${label}]`);
    process.exit(1);
  }
  if (s.includes(neu)) {
    console.log(`SKIP (already ok): ${label}`);
    continue;
  }
  s = s.split(old).join(neu);
  applied++;
  console.log(`OK: ${label}`);
}

fs.writeFileSync(appPath, s, "utf8");
const rem = (s.match(/\?\?\?/g) || []).length;
console.log(`Applied: ${applied}, remaining ??? ${rem}`);
if (rem) process.exit(1);
