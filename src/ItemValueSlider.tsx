import { useState } from "react";

export type ItemValueSliderProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
  compact?: boolean;
  disabled?: boolean;
  rangeHint?: string;
};

function previewFromDraft(
  draft: string | null,
  clamped: number,
  min: number,
  max: number,
): number {
  if (draft === null || draft === "") return clamped;
  if (!/^\d+$/.test(draft)) return clamped;
  return Math.min(max, Math.max(min, Number.parseInt(draft, 10)));
}

export function ItemValueSlider({
  value,
  min,
  max,
  onChange,
  label,
  compact = false,
  disabled = false,
  rangeHint,
}: ItemValueSliderProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamped = Math.min(max, Math.max(min, Math.trunc(value)));
  const previewValue = previewFromDraft(draft, clamped, min, max);
  const hint = rangeHint ?? `${min}–${max}`;
  const showSlider = max > min;
  const ariaLabel = label ?? "数值";

  const commitDraft = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) {
      onChange(clamped);
      setDraft(null);
      return;
    }
    const n = Number.parseInt(trimmed, 10);
    onChange(Math.min(max, Math.max(min, Math.trunc(n))));
    setDraft(null);
  };

  const bump = (sign: 1 | -1) => {
    onChange(Math.min(max, Math.max(min, previewValue + sign)));
    setDraft(null);
  };

  const stepperClass = compact
    ? `row-check-stepper row-check-wear${label ? "" : " row-check-stepper--no-label"}`
    : `item-value-slider-stepper${label ? "" : " item-value-slider-stepper--no-label"}`;

  const labelClass = compact ? "row-check-stepper-label" : "item-value-slider-label";

  return (
    <div
      className={`item-value-slider${compact ? " item-value-slider--compact" : ""}${disabled ? " item-value-slider--disabled" : ""}`}
      title={hint}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className={stepperClass}>
        {label ? <span className={labelClass}>{label}</span> : null}
        <button
          type="button"
          className="item-qty-btn"
          aria-label={`减少${ariaLabel}`}
          disabled={disabled || previewValue <= min}
          onClick={() => bump(-1)}
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          className="item-qty-input item-wear-input"
          value={draft !== null ? draft : String(clamped)}
          disabled={disabled}
          aria-label={`${ariaLabel} ${hint}`}
          onFocus={(e) => {
            setDraft(String(clamped));
            e.currentTarget.select();
          }}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
          onBlur={(e) => commitDraft(draft ?? e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
        <button
          type="button"
          className="item-qty-btn"
          aria-label={`增加${ariaLabel}`}
          disabled={disabled || previewValue >= max}
          onClick={() => bump(1)}
        >
          +
        </button>
      </div>
      {showSlider ? (
        <input
          type="range"
          className="item-value-slider-range"
          min={min}
          max={max}
          step={1}
          value={previewValue}
          disabled={disabled}
          aria-label={`${ariaLabel}滑动条 ${hint}`}
          onChange={(e) => {
            onChange(Number.parseInt(e.target.value, 10));
            setDraft(null);
          }}
        />
      ) : null}
    </div>
  );
}
