import React, { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_ROW = 52;
const OVERSCAN = 6;

type VirtualCoinListProps<T> = {
  items: T[];
  rowHeight?: number;
  className?: string;
  scrollParentRef?: React.RefObject<HTMLElement | null>;
  renderRow: (item: T, index: number) => React.ReactNode;
  onEndReached?: () => void;
  endThreshold?: number;
};

/** Fixed-height windowed list — smooth scrolling for thousands of rows. */
export function VirtualCoinList<T>({
  items,
  rowHeight = DEFAULT_ROW,
  className,
  scrollParentRef,
  renderRow,
  onEndReached,
  endThreshold = 400,
}: VirtualCoinListProps<T>) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ start: 0, end: 30 });

  const measure = useCallback(() => {
    const scrollEl = scrollParentRef?.current ?? hostRef.current?.parentElement;
    if (!scrollEl) return;
    const top = scrollEl.scrollTop;
    const height = scrollEl.clientHeight || 600;
    const start = Math.max(0, Math.floor(top / rowHeight) - OVERSCAN);
    const visible = Math.ceil(height / rowHeight) + OVERSCAN * 2;
    const end = Math.min(items.length, start + visible);
    setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));

    if (onEndReached) {
      const dist = scrollEl.scrollHeight - top - height;
      if (dist < endThreshold) onEndReached();
    }
  }, [items.length, rowHeight, scrollParentRef, onEndReached, endThreshold]);

  useEffect(() => {
    const scrollEl = scrollParentRef?.current ?? hostRef.current?.parentElement;
    if (!scrollEl) return;
    measure();
    scrollEl.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(scrollEl);
    return () => {
      scrollEl.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure, scrollParentRef]);

  useEffect(() => {
    measure();
  }, [items.length, measure]);

  const totalHeight = items.length * rowHeight;
  const slice = items.slice(range.start, range.end);
  const offsetY = range.start * rowHeight;

  return (
    <div ref={hostRef} className={className} style={{ height: totalHeight, position: "relative" }}>
      <div style={{ transform: `translateY(${offsetY}px)` }}>
        {slice.map((item, i) => (
          <div key={range.start + i} style={{ height: rowHeight }}>
            {renderRow(item, range.start + i)}
          </div>
        ))}
      </div>
    </div>
  );
}
