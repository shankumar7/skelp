/** An in-memory stand-in for Firebase Realtime Database: one shared tree, many signed-in "phones". */
import { Db } from "../game/net/online";

type Cb = { path: string; kind: "value" | "added" | "removed"; cb: (...a: any[]) => void };

export class FakeStore {
  tree: any = {};
  cbs = new Set<Cb>();
  seq = 0;
  /** bytes "downloaded" by listeners, to keep an eye on data use */
  delivered = 0;
  read(path: string): any {
    let node = this.tree;
    for (const part of path.split("/")) { if (node == null || typeof node !== "object") return null; node = node[part]; }
    return node === undefined ? null : node;
  }
  private children(path: string): Record<string, any> {
    const v = this.read(path);
    return v && typeof v === "object" ? v : {};
  }
  write(path: string, value: any) {
    const watchers = [...this.cbs];
    const before = new Map(watchers.map((w) => [w, w.kind === "value" ? JSON.stringify(this.read(w.path)) : Object.keys(this.children(w.path))]));
    const parts = path.split("/");
    if (value === null || value === undefined) {
      // delete, pruning parents that become empty (as the real database does)
      const stack: any[] = [this.tree];
      for (const part of parts.slice(0, -1)) { const next = stack[stack.length - 1]?.[part]; if (next == null) break; stack.push(next); }
      if (stack.length === parts.length) {
        delete stack[stack.length - 1][parts[parts.length - 1]];
        for (let i = stack.length - 1; i > 0; i--) if (Object.keys(stack[i]).length === 0) delete stack[i - 1][parts[i - 1]];
      }
    } else {
      let node = this.tree;
      for (const part of parts.slice(0, -1)) node = node[part] && typeof node[part] === "object" ? node[part] : (node[part] = {});
      node[parts[parts.length - 1]] = JSON.parse(JSON.stringify(value));
    }
    for (const w of watchers) {
      if (!this.cbs.has(w)) continue;
      if (w.kind === "value") {
        const now = JSON.stringify(this.read(w.path));
        if (now !== before.get(w)) { this.delivered += now.length; w.cb(this.read(w.path)); }
      } else {
        const was = before.get(w) as string[];
        const now = Object.keys(this.children(w.path));
        if (w.kind === "added") for (const k of now) if (!was.includes(k)) { this.delivered += JSON.stringify(this.read(`${w.path}/${k}`)).length; w.cb(k, this.read(`${w.path}/${k}`)); }
        if (w.kind === "removed") for (const k of was) if (!now.includes(k)) w.cb(k);
      }
    }
  }
}

export class FakeDb implements Db {
  private drops = new Set<string>();
  online = true;
  constructor(private store: FakeStore, readonly uid: string) {}
  private later<T>(fn: () => T): Promise<T> {
    return new Promise((resolve, reject) => setTimeout(() => (this.online ? resolve(fn()) : reject(new Error("offline"))), 1));
  }
  get(path: string) { return this.later(() => this.store.read(path)); }
  set(path: string, value: any) { return this.later(() => this.store.write(path, value)); }
  remove(path: string) { return this.later(() => this.store.write(path, null)); }
  push(path: string, value: any) { const key = this.newKey(); setTimeout(() => { if (this.online) this.store.write(`${path}/${key}`, value); }, 1); }
  newKey() { return "k" + String(++this.store.seq).padStart(8, "0"); }
  private listen(path: string, kind: Cb["kind"], cb: (...a: any[]) => void) {
    const entry: Cb = { path, kind, cb: (...a) => { if (this.online) cb(...a); } };
    this.store.cbs.add(entry);
    return () => { this.store.cbs.delete(entry); };
  }
  onValue(path: string, cb: (v: any) => void) {
    const off = this.listen(path, "value", cb);
    setTimeout(() => { if (this.online && this.store.cbs.size) cb(this.store.read(path)); }, 1);
    return off;
  }
  onChildAdded(path: string, cb: (key: string, v: any) => void) {
    const off = this.listen(path, "added", cb);
    const existing = this.store.read(path);
    if (existing && typeof existing === "object") for (const k of Object.keys(existing)) setTimeout(() => cb(k, existing[k]), 1);
    return off;
  }
  onChildRemoved(path: string, cb: (key: string) => void) { return this.listen(path, "removed", cb); }
  removeOnDisconnect(path: string) { this.drops.add(path); }
  cancelOnDisconnect(path: string) { this.drops.delete(path); }
  /** This phone loses the internet: the server runs its on-disconnect clean-up. */
  dropOffline() {
    this.online = false;
    for (const path of this.drops) this.store.write(path, null);
    this.drops.clear();
  }
}
