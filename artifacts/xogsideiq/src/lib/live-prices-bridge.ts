/**
 * Future: swap implementation for WebSocket-backed live prices without changing UI hooks.
 * TradingView charts already stream from their datafeed; this bridge is for the app’s price
 * ribbons/lists once a WS feed is chosen.
 */
export type LivePriceListener = (ids: string[]) => void;

export interface LivePricesBridge {
  /** Subscribe to live tick events (no-op today). */
  subscribe(listener: LivePriceListener): () => void;
  /** Hint which ids the UI cares about (for future WS topic routing). */
  setDesiredIds(ids: readonly string[]): void;
}

class NoopLivePricesBridge implements LivePricesBridge {
  subscribe(_listener: LivePriceListener): () => void {
    return () => {};
  }
  setDesiredIds(_ids: readonly string[]): void {}
}

let instance: LivePricesBridge = new NoopLivePricesBridge();

export function getLivePricesBridge(): LivePricesBridge {
  return instance;
}

/** Test / future WS wiring */
export function setLivePricesBridge(b: LivePricesBridge): void {
  instance = b;
}
