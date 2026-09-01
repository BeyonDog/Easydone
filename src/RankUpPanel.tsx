import { useCallback, useMemo, useRef, useState } from "react";
import type { AppConfig } from "./types.ts";
import type { LogGmtPartial } from "./lib/operationLog.ts";
import {
  computeRankUpgradeDelta,
  type RankLadder,
  type RankLadderStop,
} from "./lib/rankLadder.ts";
import { runRankAddPoints, runRankUpgrade } from "./lib/rankUpRunner.ts";

export type RankUpPanelProps = {
  config: AppConfig;
  ladder: RankLadder | null;
  ladderLoadError: string | null;
  gmtAccountIdDraft: string;
  setGmtAccountIdDraft: (v: string) => void;
  commitGmtAccountIdDraft: () => void;
  ensureGmtLoggedIn: () => Promise<boolean>;
  logGmt: (partial: LogGmtPartial) => void;
};

function clampIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  return Math.max(0, Math.min(len - 1, i));
}

function indexFromPointer(clientX: number, el: HTMLElement, stopCount: number): number {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || stopCount <= 1) return 0;
  const t = (clientX - rect.left) / rect.width;
  return clampIndex(Math.round(t * (stopCount - 1)), stopCount);
}

export function RankUpPanel({
  config,
  ladder,
  ladderLoadError,
  gmtAccountIdDraft,
  setGmtAccountIdDraft,
  commitGmtAccountIdDraft,
  ensureGmtLoggedIn,
  logGmt,
}: RankUpPanelProps) {
  const [scoreDraft, setScoreDraft] = useState("");
  const [lockedScore, setLockedScore] = useState<number | null>(null);
  const [addDeltaDraft, setAddDeltaDraft] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const stops = ladder?.stops ?? [];
  const scoreLocked = lockedScore != null;
  const selected: RankLadderStop | null = stops[selectedIndex] ?? null;

  const previewDelta = useMemo(() => {
    if (lockedScore == null || !selected) return null;
    return computeRankUpgradeDelta(lockedScore, selected.scoreMin);
  }, [lockedScore, selected]);

  const syncSliderToScore = useCallback(
    (n: number) => {
      if (!stops.length) return;
      let best = 0;
      for (let i = 0; i < stops.length; i++) {
        if (stops[i]!.scoreMin <= n) best = i;
      }
      setSelectedIndex(best);
    },
    [stops],
  );

  const lockCurrentScore = useCallback(() => {
    const n = Number(scoreDraft.trim());
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      setLastMessage("请输入非负整数作为当前段位分");
      return;
    }
    setLockedScore(n);
    setLastMessage(null);
    syncSliderToScore(n);
  }, [scoreDraft, syncSliderToScore]);

  const unlockScore = useCallback(() => {
    setLockedScore(null);
    setAddDeltaDraft("");
    setLastMessage(null);
  }, []);

  const setIndexFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || !stops.length || !scoreLocked) return;
      setSelectedIndex(indexFromPointer(clientX, el, stops.length));
    },
    [scoreLocked, stops.length],
  );

  const onTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!scoreLocked || !stops.length) return;
      draggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setIndexFromClientX(e.clientX);
    },
    [scoreLocked, stops.length, setIndexFromClientX],
  );

  const onTrackPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      setIndexFromClientX(e.clientX);
    },
    [setIndexFromClientX],
  );

  const onTrackPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onConfirmAddPoints = useCallback(async () => {
    if (lockedScore == null) {
      setLastMessage("请先确认当前段位分");
      return;
    }
    const addAmount = Number(addDeltaDraft.trim());
    if (!Number.isFinite(addAmount) || !Number.isInteger(addAmount) || addAmount <= 0) {
      setLastMessage("请输入正整数作为要增加的段位分");
      return;
    }
    setSubmitting(true);
    setLastMessage(null);
    try {
      const result = await runRankAddPoints({
        config,
        gmtAccountIdDraft,
        ensureGmtLoggedIn,
        logGmt,
        currentScore: lockedScore,
        addAmount,
      });
      if (result.ok && result.delta != null) {
        const next = lockedScore + result.delta;
        setLockedScore(next);
        setScoreDraft(String(next));
        setAddDeltaDraft("");
        syncSliderToScore(next);
        setLastMessage(`已加分 +${result.delta}，当前分 ${next}`);
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    addDeltaDraft,
    config,
    ensureGmtLoggedIn,
    gmtAccountIdDraft,
    lockedScore,
    logGmt,
    syncSliderToScore,
  ]);

  const onConfirmUpgrade = useCallback(async () => {
    if (lockedScore == null || !selected) {
      setLastMessage("请先确认当前段位分并选择目标段位");
      return;
    }
    setSubmitting(true);
    setLastMessage(null);
    try {
      const delta = computeRankUpgradeDelta(lockedScore, selected.scoreMin);
      const ok = await runRankUpgrade({
        config,
        gmtAccountIdDraft,
        ensureGmtLoggedIn,
        logGmt,
        currentScore: lockedScore,
        target: selected,
      });
      if (ok) {
        const next = lockedScore + delta;
        setLockedScore(next);
        setScoreDraft(String(next));
        syncSliderToScore(next);
        setLastMessage(`已提交：${selected.name}（目标分 ${selected.scoreMin}，delta ${delta}）`);
      }
    } finally {
      setSubmitting(false);
    }
  }, [config, ensureGmtLoggedIn, gmtAccountIdDraft, lockedScore, logGmt, selected, syncSliderToScore]);

  const fillPct =
    stops.length <= 1 ? 0 : (selectedIndex / Math.max(1, stops.length - 1)) * 100;

  return (
    <div className="rank-up-panel">
      <h2 className="rank-up-panel-title">升段位</h2>
      <p className="help">
        先填写并确认当前段位分，可手动输入要增加的段位分，或拖动进度条选择目标大/小段位后确认升级。
        {ladder?.seasonLabel ? ` 当前赛季数据：${ladder.seasonLabel}` : null}
        {ladder?.source === "fallback" ? "（工作区无 Rank 表，使用 S6 内置门槛）" : null}
      </p>
      {ladderLoadError ? <div className="error">{ladderLoadError}</div> : null}

      <div className="field">
        <label>账号 ID</label>
        <input
          className="gmt-input"
          type="text"
          value={gmtAccountIdDraft}
          onChange={(e) => setGmtAccountIdDraft(e.target.value)}
          onBlur={() => commitGmtAccountIdDraft()}
          placeholder="与顶栏同步"
        />
      </div>

      <div className="field rank-up-score-row">
        <label>当前段位分</label>
        <div className="rank-up-score-controls">
          <input
            className="gmt-input"
            type="number"
            min={0}
            step={1}
            disabled={scoreLocked}
            value={scoreDraft}
            onChange={(e) => setScoreDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") lockCurrentScore();
            }}
            placeholder={String(ladder?.initialScore ?? 1)}
          />
          {scoreLocked ? (
            <button type="button" className="btn" onClick={unlockScore}>
              重新填写
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={lockCurrentScore}>
              确认当前分
            </button>
          )}
        </div>
        {scoreLocked ? (
          <p className="help">已锁定当前分 {lockedScore}，可加分或拖动段位条。</p>
        ) : (
          <p className="help">确认当前分后才能加分或拖动段位条。</p>
        )}
      </div>

      {scoreLocked ? (
        <div className="field rank-up-score-row">
          <label>增加段位分</label>
          <div className="rank-up-score-controls">
            <input
              className="gmt-input"
              type="number"
              min={1}
              step={1}
              disabled={submitting}
              value={addDeltaDraft}
              onChange={(e) => setAddDeltaDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onConfirmAddPoints();
              }}
              placeholder="正整数，加到当前分"
            />
            <button
              type="button"
              className="btn primary"
              disabled={submitting || !addDeltaDraft.trim()}
              onClick={() => void onConfirmAddPoints()}
            >
              {submitting ? "提交中…" : "确认加分"}
            </button>
          </div>
          <p className="help">输入要增加的段位分（正整数），将通过 GMT 加到当前段位分。</p>
        </div>
      ) : null}

      <div className={`rank-up-slider${scoreLocked ? "" : " rank-up-slider--disabled"}`}>
        <div className="rank-up-slider-labels" aria-hidden="true">
          {stops
            .filter((s) => s.isMajor)
            .map((s) => (
              <span key={`g-${s.rankGroupId}`}>{s.groupName}</span>
            ))}
        </div>
        <div
          ref={trackRef}
          className="rank-up-slider-track"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, stops.length - 1)}
          aria-valuenow={selectedIndex}
          aria-disabled={!scoreLocked}
          tabIndex={scoreLocked ? 0 : -1}
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
          onPointerUp={onTrackPointerUp}
          onPointerCancel={onTrackPointerUp}
          onKeyDown={(e) => {
            if (!scoreLocked) return;
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              setSelectedIndex((i) => clampIndex(i + 1, stops.length));
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              setSelectedIndex((i) => clampIndex(i - 1, stops.length));
            }
          }}
        >
          <div className="rank-up-slider-fill" style={{ width: `${fillPct}%` }} />
          {stops.map((s, i) => {
            const left = stops.length <= 1 ? 0 : (i / (stops.length - 1)) * 100;
            return (
              <button
                key={s.rankId}
                type="button"
                className={`rank-up-slider-node${s.isMajor ? " rank-up-slider-node--major" : ""}${
                  i === selectedIndex ? " is-selected" : ""
                }`}
                style={{ left: `${left}%` }}
                disabled={!scoreLocked}
                title={`${s.name}（${s.scoreMin}）`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!scoreLocked) return;
                  setSelectedIndex(i);
                }}
              />
            );
          })}
        </div>
      </div>

      {selected ? (
        <div className="rank-up-selection">
          <div>
            <strong>{selected.name}</strong>
            <span className="muted">
              {" "}
              · {selected.groupName} · RankID {selected.rankId}
            </span>
          </div>
          <div className="help">
            目标门槛分 {selected.scoreMin}
            {previewDelta != null
              ? previewDelta > 0
                ? ` · 预计 +${previewDelta}`
                : " · 已达或超过目标"
              : null}
          </div>
        </div>
      ) : null}

      <div className="btn-row">
        <button
          type="button"
          className="btn primary"
          disabled={!scoreLocked || !selected || submitting}
          onClick={() => void onConfirmUpgrade()}
        >
          {submitting ? "提交中…" : "确认升级"}
        </button>
      </div>
      {lastMessage ? <p className="help">{lastMessage}</p> : null}
    </div>
  );
}
