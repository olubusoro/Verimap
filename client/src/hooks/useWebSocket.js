/**
 * client/src/hooks/useWebSocket.js
 * ---------------------------------
 * Custom React hook that manages a persistent WebSocket connection to the
 * VeriMap Express server.
 *
 * - Auto-connects on mount, auto-reconnects on close (3-second backoff)
 * - Parses JSON messages in the form { event, data }
 * - Exposes `lastMessage` and `isConnected` to consuming components
 * - Cleans up (close socket) on component unmount
 */

import { useState, useEffect, useRef, useCallback } from "react";

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `ws://${window.location.hostname}:5000`;

const RECONNECT_DELAY_MS = 3000;

/**
 * @param {(event: string, data: any) => void} onMessage
 *   Callback invoked whenever a typed WS message arrives.
 */
export function useWebSocket(onMessage) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const mountedRef = useRef(true);
  const onMessageRef = useRef(onMessage);

  // Keep the callback ref up-to-date without re-creating the socket
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log("[WS] Connected to VeriMap server");
        setIsConnected(true);
        // Clear any pending reconnect timer
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const { event: evtName, data } = JSON.parse(event.data);
          onMessageRef.current?.(evtName, data);
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        console.log(`[WS] Disconnected — retrying in ${RECONNECT_DELAY_MS}ms`);
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      ws.onerror = (err) => {
        console.warn("[WS] Error:", err);
        ws.close();
      };
    } catch (err) {
      console.warn("[WS] Could not connect:", err);
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { isConnected };
}
