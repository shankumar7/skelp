/**
 * End-to-end LAN test: a host and several clients talking over real TCP sockets
 * (Node's `net` has the same API as react-native-tcp-socket, and goes through the same wrapper).
 */
import net from "net";
import { PRESETS, State } from "../game/engine";
import { getPlayer } from "../game/players";
import { ClientSession, HostSession, looksLikeState, makeJoinLink, parseJoinLink, probe, resolveCode, scan, candidates, Session } from "../game/net/session";
import { decode, encode } from "../game/net/protocol";
import { makeTransport } from "../game/net/transport";

const transport = makeTransport(net);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(cond: () => boolean, what: string, ms = 5000) {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timed out waiting for " + what);
    await sleep(20);
  }
}
const st = (s: Session) => s.getState() as State;

let open: Session[] = [];
afterEach(() => { open.forEach((s) => s.leave()); open = []; });
async function hostArena() {
  const host = new HostSession({ id: "host", name: "Shan", avatar: "trophy" }, "SHAN'S ARENA");
  await host.serve(transport, 0); // any free port
  open.push(host);
  return host;
}
function join(host: HostSession, id: string, name: string) {
  const c = new ClientSession(transport, "127.0.0.1", { id, name, avatar: "flash" }, host.port);
  open.push(c);
  return c;
}

test("protocol encoding is ASCII-safe and round-trips", () => {
  const line = encode({ t: "hello", v: 1, id: "a", name: "शान ₹ 😀", avatar: "x" });
  expect(/^[\x00-\x7e]+$/.test(line)).toBe(true);
  expect(decode<any>(line).name).toBe("शान ₹ 😀");
  expect(decode("not json")).toBeNull();
});

test("arena codes and scan candidates", () => {
  expect(resolveCode("#42", "192.168.43.7")).toBe("192.168.43.42");
  expect(resolveCode("10.0.0.5", null)).toBe("10.0.0.5");
  expect(resolveCode("42", null)).toBeNull();
  expect(resolveCode("abc", "192.168.1.2")).toBeNull();
  expect(resolveCode("999.1.1.1", null)).toBeNull();
  const c = candidates("192.168.43.7");
  expect(c[0]).toBe("192.168.43.1"); // hotspot owner first
  expect(c).not.toContain("192.168.43.7");
  expect(c).toHaveLength(253);
  expect(candidates(null)).toContain("192.168.43.1");
});

test("discovery finds a hosted arena and ignores empty addresses", async () => {
  const host = await hostArena();
  expect(await probe(transport, "127.0.0.1", host.port)).toMatchObject({ arena: "SHAN'S ARENA", teams: 1, phase: "lobby" });
  const found: string[] = [];
  await scan(transport, null, (a) => found.push(a.host), host.port, ["127.0.0.1"]).done;
  expect(found).toEqual(["127.0.0.1"]);
  const none: string[] = [];
  await scan(transport, null, (a) => none.push(a.host), 1, ["127.0.0.1", "127.0.0.2"]).done; // nothing listens on port 1
  expect(none).toEqual([]);
  host.leave();
  await sleep(50);
  expect(await probe(transport, "127.0.0.1", host.port)).toBeNull();
});

test("three phones: join, start, bid against each other, everyone sees the same state", async () => {
  const host = await hostArena();
  const a = join(host, "phone-a", "Aryan");
  const b = join(host, "phone-b", "Anika");
  await until(() => st(host).teams.length === 3 && a.getStatus() === "live" && b.getStatus() === "live", "clients to join");
  expect(st(a).teams.map((t) => t.owner)).toEqual(["Shan", "Aryan", "Anika"]);
  expect(st(a).teams.map((t) => t.name)).toEqual(["CSK", "MI", "RCB"]);

  host.setConfig(PRESETS.QUICK);
  await until(() => st(b)?.config.mode === "QUICK", "config sync");
  a.start(); // clients cannot start the auction
  await sleep(100);
  expect(st(host).phase).toBe("lobby");
  host.start();
  await until(() => st(a).phase === "auction" && st(b).phase === "auction", "auction start");

  const lot = st(host).lot!;
  const base = getPlayer(lot.pid).base;
  a.bid(base);
  await until(() => st(b).lot!.bidder === "phone-a", "bid from A to reach B");
  b.bid(base + 5 > base ? st(b).lot!.bid + 50 : 0); // jump bid
  await until(() => st(a).lot!.bidder === "phone-b", "bid from B to reach A");
  expect(st(host).lot!.bid).toBe(base + 50);
  // A and the host pass -> B wins without waiting for the clock
  a.pass();
  host.pass();
  await until(() => st(a).lot!.status === "sold", "hammer");
  await until(() => st(b).teams[2].squad.length === 1, "squad sync");
  expect(st(b).teams[2]).toMatchObject({ purse: PRESETS.QUICK.purse - base - 50, squad: [{ pid: lot.pid, price: base + 50 }] });
  expect(st(a)).toEqual(st(host));
});

test("clients cannot act for other teams or send host commands", async () => {
  const host = await hostArena();
  const a = join(host, "phone-a", "Aryan");
  await until(() => a.getStatus() === "live", "join");
  host.start();
  await until(() => st(a).phase === "auction", "start");
  const raw = await transport.connect("127.0.0.1", host.port);
  raw.write(encode({ t: "act", a: { type: "bid", id: "host", amount: 5000 } })); // not logged in
  raw.write(encode({ t: "hello", v: 1, id: "host", name: "Fake", avatar: "x" })); // impersonating the host
  raw.write("garbage that is not json");
  (a as any).send({ type: "bid", id: "host", amount: getPlayer(st(a).lot!.pid).base }); // spoofed id
  (a as any).send({ type: "end" });
  await until(() => st(host).lot!.bidder !== null, "bid to land");
  expect(st(host).lot!.bidder).toBe("phone-a"); // counted as A's own bid
  expect(st(host).phase).toBe("auction");
  raw.close();
});

test("late joiners and full arenas are turned away with a reason", async () => {
  const host = await hostArena();
  host.addBot();
  host.start();
  const late = join(host, "late", "Late") as ClientSession;
  await until(() => late.getStatus() === "closed", "rejection");
  expect(late.error).toMatch(/already started/i);
});

test("a dropped phone is marked offline and can rejoin with its squad", async () => {
  const host = await hostArena();
  const a = join(host, "phone-a", "Aryan");
  await until(() => a.getStatus() === "live", "join");
  host.addBot();
  host.start();
  await until(() => st(a)?.phase === "auction", "start");
  a.leave();
  await until(() => st(host).teams[1].connected === false, "host to notice the drop");
  const again = join(host, "phone-a", "Aryan");
  await until(() => again.getStatus() === "live" && st(host).teams[1].connected, "rejoin");
  expect(st(again).phase).toBe("auction");
  expect(st(host).teams).toHaveLength(3);
});

test("client auto-reconnects when the connection breaks", async () => {
  const host = await hostArena();
  const a = join(host, "phone-a", "Aryan");
  await until(() => a.getStatus() === "live", "join");
  (a as any).sock.close(); // simulate a Wi-Fi blip
  await until(() => a.getStatus() === "reconnecting", "client to notice");
  await until(() => a.getStatus() === "live", "reconnect", 8000);
  expect(st(host).teams[1].connected).toBe(true);
});

test("host closing the arena tells everyone", async () => {
  const host = await hostArena();
  const a = join(host, "phone-a", "Aryan") as ClientSession;
  await until(() => a.getStatus() === "live", "join");
  host.leave();
  await until(() => a.getStatus() === "closed", "client close");
  expect(a.error).toMatch(/host closed/i);
});

test("connecting to nothing fails with a helpful message", async () => {
  const c = new ClientSession(transport, "127.0.0.1", { id: "x", name: "X", avatar: "x" }, 1);
  open.push(c);
  await until(() => c.getStatus() === "closed", "failure", 9000);
  expect(c.error).toMatch(/same Wi-Fi/);
}, 12000);

test("solo host with bots plays by itself in real time", async () => {
  const host = new HostSession({ id: "me", name: "Solo", avatar: "x" }, "PRACTICE");
  open.push(host);
  host.addBot(); host.addBot(); host.addBot();
  host.setConfig({ ...PRESETS.QUICK, timer: 1 });
  host.start();
  await until(() => st(host).results.length >= 2, "bots to finish a couple of lots", 20000);
  expect(st(host).teams.filter((t) => t.isBot)).toHaveLength(3);
}, 25000);

test("emoji reactions reach every phone, junk and floods are dropped", async () => {
  const host = await hostArena();
  const a = join(host, "phone-a", "Aryan");
  const b = join(host, "phone-b", "Anika");
  await until(() => a.getStatus() === "live" && b.getStatus() === "live", "join");
  const seen: Record<string, string[]> = { host: [], a: [], b: [] };
  host.onReaction((id, e) => seen.host.push(id + e));
  a.onReaction((id, e) => seen.a.push(id + e));
  const offB = b.onReaction((id, e) => seen.b.push(id + e));
  a.react("🔥");
  a.react("👏"); // too soon after the first one
  a.react("<script>"); // not on the list
  await until(() => seen.b.length === 1 && seen.a.length === 1 && seen.host.length === 1, "reaction fan-out");
  host.react("😂");
  await until(() => seen.a.length === 2 && seen.b.length === 2, "host reaction");
  expect(seen.host).toEqual(["phone-a🔥", "host😂"]);
  expect(seen.a).toEqual(seen.host);
  offB();
  await sleep(450);
  a.react("💸");
  await until(() => seen.host.length === 3, "third reaction");
  expect(seen.b).toHaveLength(2); // unsubscribed
});

test("host sanitises what strangers send", async () => {
  const host = await hostArena();
  const raw = await transport.connect("127.0.0.1", host.port);
  raw.write(encode({ t: "hello", v: 1, id: "x".repeat(200), name: "Long id", avatar: "x" }));
  const evil = join(host, "evil", "Mallory");
  (evil as any).me.avatar = "<img src=x onerror=alert(1)>";
  await until(() => st(host).teams.length === 2, "join");
  await sleep(100);
  expect(st(host).teams).toHaveLength(2); // the 200-char id was refused
  // avatar is set at construction, so join a second client with a hostile one
  const c = new ClientSession(transport, "127.0.0.1", { id: "evil2", name: "N".repeat(50), avatar: "../../etc/passwd" }, host.port);
  open.push(c);
  await until(() => st(host).teams.length === 3, "second join");
  const t = st(host).teams[2];
  expect(t.avatar).toBe("person");
  expect(t.owner.length).toBeLessThanOrEqual(16);
  raw.close();
});

test("an oversized message without a newline gets the socket dropped", async () => {
  const host = await hostArena();
  const raw = await transport.connect("127.0.0.1", host.port);
  let closed = false;
  raw.onClose(() => { closed = true; });
  const chunk = "a".repeat(60_000);
  for (let i = 0; i < 12 && !closed; i++) { raw.write(chunk.slice(0, -1)); await sleep(20); } // write() appends a newline; send raw-ish junk
  // lines are short enough to pass, so now send one giant line through the underlying socket
  const big = await new Promise<boolean>((resolve) => {
    const s = net.createConnection({ host: "127.0.0.1", port: host.port }, () => { s.write("b".repeat(700_000)); });
    s.on("close", () => resolve(true));
    s.on("error", () => resolve(true));
    setTimeout(() => resolve(false), 4000);
  });
  expect(big).toBe(true);
  raw.close();
});

test("clients ignore malformed states from a broken host", () => {
  const good = { arena: "A", hostId: "h", phase: "lobby", config: { timer: 10 }, teams: [], queue: [1, 2], pos: 0, round: 1, lot: null, unsold: [], results: [], paused: false, sets: [], custom: [], former: {}, offers: {}, picks: {}, retainMs: 0 };
  expect(looksLikeState(good)).toBe(true);
  expect(looksLikeState(null)).toBe(false);
  expect(looksLikeState({ ...good, teams: "nope" })).toBe(false);
  expect(looksLikeState({ ...good, queue: [99999] })).toBe(false);
  expect(looksLikeState({ ...good, lot: { pid: 1 } })).toBe(false);
  expect(looksLikeState({ ...good, teams: [{ id: "a", name: "x", color: "#fff", avatar: "x", purse: 1, squad: [{ pid: -4, price: 1 }] }] })).toBe(false);
});

test("waking from the background reconnects a client immediately and resyncs the host", async () => {
  const host = await hostArena();
  const a = join(host, "phone-a", "Aryan");
  await until(() => a.getStatus() === "live", "join");
  (a as any).sock.close();
  await until(() => a.getStatus() === "reconnecting", "drop");
  a.wake();
  await until(() => a.getStatus() === "live", "instant reconnect", 1200);
  host.wake();
  expect(st(host).teams[1].connected).toBe(true);
});

test("QR join links round-trip and reject anything else", () => {
  expect(parseJoinLink(makeJoinLink("192.168.43.1"))).toEqual({ host: "192.168.43.1", port: 47474 });
  expect(parseJoinLink(makeJoinLink(null))).toEqual({ host: null, port: 47474 }); // hotspot owner: joiners search instead
  expect(parseJoinLink("skelp://join?h=999.1.1.1&p=47474")).toEqual({ host: null, port: 47474 });
  expect(parseJoinLink("skelp://join?h=evil.example.com&p=1")).toEqual({ host: null, port: 47474 });
  expect(parseJoinLink("https://example.com")).toBeNull();
  expect(parseJoinLink("WIFI:S:home;T:WPA;P:secret;;")).toBeNull();
});

test("connect falls back to the next variant only when the interface is unavailable", async () => {
  const host = await hostArena();
  const calls: any[] = [];
  const fake = {
    createServer: net.createServer.bind(net),
    createConnection(opts: any, cb: any) {
      calls.push(opts.interface ?? "plain");
      if (opts.interface === "wifi") {
        const s = new net.Socket();
        setTimeout(() => s.emit("error", new Error("Interface wifi unreachable")), 5);
        return s;
      }
      return net.createConnection(opts, cb);
    },
  };
  const t = makeTransport(fake, [{ interface: "wifi" }, {}]);
  const sock = await t.connect("127.0.0.1", host.port, 1000);
  expect(calls).toEqual(["wifi", "plain"]);
  sock.close();
  // an ordinary failure (nothing listening) must not be retried on another interface
  calls.length = 0;
  const t2 = makeTransport({ ...fake, createConnection: (opts: any, cb: any) => { calls.push(opts.interface ?? "plain"); return net.createConnection({ ...opts, interface: undefined }, cb); } }, [{ interface: "wifi" }, {}]);
  await expect(t2.connect("127.0.0.1", 1, 800)).rejects.toBeTruthy();
  expect(calls).toEqual(["wifi"]);
});

test("team identity, custom players, retentions and RTM travel over the network", async () => {
  const host = await hostArena();
  const a = join(host, "phone-a", "Aryan");
  await until(() => st(host).teams.length === 2 && a.getStatus() === "live", "client to join");
  a.setTeam("CSK"); // the host has it
  a.setTeam("SRH");
  await until(() => st(host).teams[1].name === "SRH", "franchise change");
  expect(st(host).teams.map((t) => t.fr)).toEqual(["CSK", "SRH"]);
  expect(st(host).teams[1]).toMatchObject({ owner: "Aryan", color: "#F26B1D" });
  a.addPlayer({ name: "Cheat", role: "BAT", overseas: false, base: 20, rating: 99 }); // host only
  host.addPlayer({ name: "Gully Star", role: "AR", overseas: false, base: 50, rating: 80 });
  await until(() => st(a).custom.length === 1, "custom player sync");
  expect(st(a).custom[0]).toMatchObject({ name: "Gully Star", id: 10001 });
  expect(getPlayer(10001).name).toBe("Gully Star");

  host.setConfig({ ...PRESETS.QUICK, retain: 1, rtm: 1 });
  host.start();
  await until(() => st(a).phase === "retention", "retention phase");
  const mine = st(a).offers["phone-a"];
  expect(mine.length).toBeGreaterThan(0);
  a.retain([mine[0]]);
  host.retain([]);
  await until(() => st(a).phase === "auction", "auction to start");
  const team = st(a).teams[1];
  expect(team.squad).toEqual([{ pid: mine[0], price: 750, kept: true }]);
  expect(team.purse).toBe(PRESETS.QUICK.purse - 750);
  expect(st(a).queue).not.toContain(mine[0]);
  expect(st(a).teams.every((t) => t.rtm === 1)).toBe(true);
});

test("auctioneer mode: the host has no team and clients do the bidding", async () => {
  const host = new HostSession({ id: "host", name: "Shan", avatar: "trophy" }, "BIG SCREEN", Math.random, true);
  await host.serve(transport, 0);
  open.push(host);
  expect(st(host).teams).toHaveLength(0);
  const a = join(host, "phone-a", "Aryan");
  const b = join(host, "phone-b", "Anika");
  await until(() => st(host).teams.length === 2, "clients to join");
  host.setConfig(PRESETS.QUICK);
  host.start();
  await until(() => st(a)?.phase === "auction" && st(b)?.phase === "auction", "auction to start");
  host.bid(st(host).lot!.bid); // no team: ignored
  expect(st(host).lot!.bidder).toBeNull();
  a.bid(st(a).lot!.bid);
  await until(() => st(host).lot!.bidder === "phone-a", "client bid");
  b.bid(st(b).lot!.bid + 50);
  await until(() => st(host).lot!.bidder === "phone-b", "second bid");
  host.undo();
  await until(() => st(a).lot!.bidder === "phone-a", "undo to reach clients");
  expect(st(a).lot!.history).toHaveLength(1);
});

test("a bid shows on the bidder's phone at once, and the host's answer confirms it", async () => {
  const host = await hostArena();
  const a = join(host, "phone-a", "Aryan");
  await until(() => st(host).teams.length === 2 && a.getStatus() === "live", "client to join");
  host.setConfig(PRESETS.QUICK);
  host.start();
  await until(() => st(a)?.phase === "auction", "auction to start");
  const base = st(a).lot!.bid;
  a.bid(base);
  // no waiting: the prediction is already on screen
  expect(st(a).lot).toMatchObject({ bidder: "phone-a", bid: base, n: 1 });
  await until(() => st(host).lot!.bidder === "phone-a", "host to confirm");
  // a bid the rules do not allow is not predicted
  a.bid(base);
  expect(st(a).lot!.n).toBe(1);
  host.bid(base + 50);
  await until(() => st(a).lot!.bidder === "host", "host bid");
  a.pass();
  expect(st(a).lot!.passed).toContain("phone-a");
  // the phone measures how far away the host is
  expect(host.getLatency()).toBe(0);
  await until(() => a.getLatency() !== null, "latency", 4000);
  expect(a.getLatency()!).toBeLessThan(500);
});

test("when the line goes quiet after a network change, the phone reconnects quickly", async () => {
  const host = await hostArena();
  const a = join(host, "phone-a", "Aryan");
  await until(() => st(host).teams.length === 2 && a.getStatus() === "live", "client to join");
  // the socket is still "open" on the phone but nothing comes back: a dead link
  const sock = (a as any).sock;
  sock.write = () => {};
  (a as any).lastSeen = Date.now();
  const lines: any[] = [];
  const realOnLine = (a as any).onLine.bind(a);
  (a as any).onLine = (s: any, l: string) => { if (s !== sock) realOnLine(s, l); else lines.push(l); };
  a.wake();
  await until(() => (a as any).sock !== sock && a.getStatus() === "live" && (a as any).sock !== null, "reconnect", 6000);
  expect(st(host).teams[1].connected).toBe(true);
});
