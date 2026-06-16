import { useEffect, useRef, useState } from "react";
import type { PriceTick } from "@/types";

const WS_URL =
  import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/api/v1/ws/prices";

type TickMap = Record<string, PriceTick>;

/**
 * Subscribe to the live price WebSocket. Pass `symbols` to filter the stream
 * server-side; omit it to receive every tick. Returns a map of the latest
 * tick per symbol plus connection status.
 */
export function useWebSocket(symbols?: string[]) {
  const [ticks, setTicks] = useState<TickMap>({});
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const symbolsKey = symbols?.join(",") ?? "";

  useEffect(() => {
    let closedByUs = false;
    let retry: ReturnType<typeof setTimeout>;

    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        if (symbols && symbols.length > 0) {
          ws.send(JSON.stringify({ symbols }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const tick = JSON.parse(event.data) as PriceTick;
          setTicks((prev) => ({ ...prev, [tick.symbol]: tick }));
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!closedByUs) retry = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      closedByUs = true;
      clearTimeout(retry);
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  return { ticks, connected };
}
