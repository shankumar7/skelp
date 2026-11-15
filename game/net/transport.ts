/**
 * Thin wrapper over a Node-style `net` API. On phones this is backed by
 * react-native-tcp-socket; in tests by Node's own `net` module — same code path.
 */
export interface Sock {
  write(line: string): void;
  onLine(cb: (line: string) => void): void;
  onClose(cb: () => void): void;
  close(): void;
  readonly remote: string;
}
export interface Listener { close(): void; port: number }
export interface Transport {
  listen(port: number, onConn: (s: Sock) => void): Promise<Listener>;
  connect(host: string, port: number, timeoutMs?: number): Promise<Sock>;
}

function wrap(raw: any): Sock {
  let buf = "";
  let closed = false;
  const lineCbs: ((l: string) => void)[] = [];
  const closeCbs: (() => void)[] = [];
  const fireClose = () => {
    if (closed) return;
    closed = true;
    closeCbs.forEach((cb) => cb());
  };
  raw.on("data", (d: any) => {
    buf += typeof d === "string" ? d : d.toString("utf8");
    if (buf.length > 512_000) { buf = ""; raw.destroy(); return; } // nobody legitimately sends half a megabyte without a newline
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (line) lineCbs.forEach((cb) => cb(line));
    }
  });
  raw.on("error", fireClose);
  raw.on("close", fireClose);
  try { raw.setNoDelay?.(true); } catch {}
  return {
    remote: String(raw.remoteAddress ?? ""),
    write(line) {
      if (closed) return;
      try { raw.write(line + "\n"); } catch { fireClose(); }
    },
    onLine(cb) { lineCbs.push(cb); },
    onClose(cb) { if (closed) cb(); else closeCbs.push(cb); },
    close() {
      try { raw.destroy(); } catch {}
      fireClose();
    },
  };
}

/**
 * `variants` are extra connect options tried in order. On Android the first one binds the socket to
 * Wi-Fi: a hotspot has no internet, so the phone would otherwise send our traffic over mobile data
 * and never reach the host. The plain variant is the fallback for a phone that *is* the hotspot.
 */
export function makeTransport(net: any, variants: Record<string, unknown>[] = [{}]): Transport {
  const connectOnce = (host: string, port: number, timeoutMs: number, extra: Record<string, unknown>): Promise<Sock> =>
    new Promise((resolve, reject) => {
      let done = false;
      let raw: any;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        try { raw?.destroy(); } catch {}
        reject(new Error("timeout"));
      }, timeoutMs + 150);
      try {
        // connectTimeout makes the native side give up too, instead of holding a thread for minutes
        raw = net.createConnection({ host, port, connectTimeout: timeoutMs, ...extra }, () => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(sock);
        });
      } catch (e) {
        done = true;
        clearTimeout(timer);
        reject(e);
        return;
      }
      // wrap immediately so no early data is lost
      const sock = wrap(raw);
      raw.on("error", (e: any) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { raw.destroy(); } catch {}
        reject(e instanceof Error ? e : new Error(String(e?.message ?? e)));
      });
    });

  return {
    listen(port, onConn) {
      return new Promise((resolve, reject) => {
        let settled = false;
        const server = net.createServer((raw: any) => onConn(wrap(raw)));
        server.on("error", (e: any) => { if (!settled) { settled = true; reject(e instanceof Error ? e : new Error(String(e))); } });
        server.listen({ port, host: "0.0.0.0", reuseAddress: true }, () => {
          if (settled) return;
          settled = true;
          const actual = server.address?.()?.port ?? port;
          resolve({ port: actual, close: () => { try { server.close(); } catch {} } });
        });
      });
    },
    async connect(host, port, timeoutMs = 3000) {
      let lastError: unknown = new Error("unreachable");
      for (const extra of variants) {
        try {
          return await connectOnce(host, port, timeoutMs, extra);
        } catch (e) {
          lastError = e;
          // only move on to the next variant when this one could not be used at all (no Wi-Fi interface)
          if (!/interface/i.test(String((e as Error)?.message ?? e))) break;
        }
      }
      throw lastError;
    },
  };
}
