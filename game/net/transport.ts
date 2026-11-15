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
    if (buf.length > 4_000_000) { buf = ""; raw.destroy(); return; }
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

export function makeTransport(net: any): Transport {
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
    connect(host, port, timeoutMs = 3000) {
      return new Promise((resolve, reject) => {
        let done = false;
        let raw: any;
        const timer = setTimeout(() => {
          if (done) return;
          done = true;
          try { raw?.destroy(); } catch {}
          reject(new Error("timeout"));
        }, timeoutMs);
        try {
          raw = net.createConnection({ host, port }, () => {
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
          reject(e instanceof Error ? e : new Error(String(e)));
        });
      });
    },
  };
}
