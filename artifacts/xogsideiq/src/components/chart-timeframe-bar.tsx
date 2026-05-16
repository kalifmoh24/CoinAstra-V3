import React from "react";
import { ActionButton } from "@/components/action-button";

type ChartTimeframeBarProps<TMode extends string, TTf extends string | number> = {
  modes?: { id: TMode; label: string }[];
  activeMode?: TMode;
  onModeChange?: (m: TMode) => void;
  timeframes: { label: string; value: TTf }[];
  activeTf?: TTf;
  onTfChange?: (tf: TTf) => void;
  /** @deprecated use activeTf + onTfChange */
  activeDays?: number;
  /** @deprecated use activeTf + onTfChange */
  onDaysChange?: (d: number) => void;
};

/** Responsive chart controls with accessible touch targets. */
export function ChartTimeframeBar<TMode extends string, TTf extends string | number>({
  modes,
  activeMode,
  onModeChange,
  timeframes,
  activeTf,
  onTfChange,
  activeDays,
  onDaysChange,
}: ChartTimeframeBarProps<TMode, TTf>) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end min-w-0">
      {modes && onModeChange && activeMode != null && (
        <div className="flex rounded-xl overflow-hidden ca-scroll-x max-w-full" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
          {modes.map((m) => (
            <ActionButton
              key={m.id}
              variant={activeMode === m.id ? "primary" : "ghost"}
              size="sm"
              onClick={() => onModeChange(m.id)}
              className="!rounded-none shrink-0"
            >
              {m.label}
            </ActionButton>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1 ca-scroll-x">
        {timeframes.map((tf) => {
          const active =
            activeTf !== undefined ? activeTf === tf.value : activeDays !== undefined && tf.value === activeDays;
          const pick = () => {
            if (onTfChange) onTfChange(tf.value);
            else if (onDaysChange && typeof tf.value === "number") onDaysChange(tf.value);
          };
          return (
            <ActionButton
              key={String(tf.label)}
              variant={active ? "primary" : "ghost"}
              size="sm"
              onClick={pick}
              className="shrink-0"
            >
              {tf.label}
            </ActionButton>
          );
        })}
      </div>
    </div>
  );
}
