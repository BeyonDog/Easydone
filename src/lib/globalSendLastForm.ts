import type { GlobalSendLastForm } from "../types.ts";

export function defaultGlobalSendLastForm(nowSec = Math.floor(Date.now() / 1000)): GlobalSendLastForm {
  return {
    title: "",
    content: "",
    senderName: "lang",
    startTime: nowSec,
    endTime: nowSec + 86400,
  };
}

export function normalizeGlobalSendLastForm(raw: GlobalSendLastForm | null | undefined): GlobalSendLastForm | null {
  if (raw == null || typeof raw !== "object") return null;
  const start =
    typeof raw.startTime === "number" && Number.isFinite(raw.startTime) ? Math.floor(raw.startTime) : null;
  const end = typeof raw.endTime === "number" && Number.isFinite(raw.endTime) ? Math.floor(raw.endTime) : null;
  if (start === null || end === null) return null;
  return {
    title: typeof raw.title === "string" ? raw.title : "",
    content: typeof raw.content === "string" ? raw.content : "",
    senderName: typeof raw.senderName === "string" && raw.senderName.trim() ? raw.senderName.trim() : "lang",
    startTime: start,
    endTime: end,
  };
}
