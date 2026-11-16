/** Online play end to end: a host and players talking through the (fake) realtime database. */
import { PRESETS, State } from "../game/engine";
import { lookupOnline, makeOnlineTransport, normaliseCode, ONLINE_CODE, randomCode } from "../game/net/online";
import { ClientSession, HostSession, makeJoinLink, ONLINE_TIMING, parseJoinLink, Session } from "../game/net/session";
import { FakeDb, FakeStore } from "../test-utils/fakeDb";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(cond: () => boolean, what: string, ms = 6000) {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timed out waiting for " + what);
    await sleep(20);
  }
}
const st = (s: Session) => s.getState() as State;
let open: Session[] = [];
afterEach(() => { open.forEach((s) => s.leave()); open = []; });

async function hostArena(store: FakeStore) {
  const host = new HostSession({ id: "host", name: "Shan", avatar: "trophy" }, "SHAN'S ARENA");
  const code = await host.serveOnline(new FakeDb(store, "uid-host"));
  open.push(host);
  return { host, code };
}
function join(store: FakeStore, code: string, id: string, name: string) {
  const db = new FakeDb(store, "uid-" + id);
  const c = new ClientSession(makeOnlineTransport(db, code), code, { id, name, avatar: "flash" }, 0, true);
  open.push(c);
  return { c, db };
}

test("arena codes and invite links", () => {
  for (let i = 0; i < 50; i++) expect(randomCode()).toMatch(ONLINE_CODE);
  expect(normaliseCode(" k7m-2qx ")).toBe("K7M2QX");
  expect(normaliseCode("#abc234")).toBe("ABC234");
  expect(normaliseCode("42")).toBeNull();
  expect(normaliseCode("192.168.1.5")).toBeNull();
  expect(makeJoinLink("10.0.0.2", 47474, "K7M2QX")).toBe("skelp://join?o=K7M2QX");
  expect(parseJoinLink("skelp://join?o=k7m2qx")).toEqual({ host: null, port: 47474, online: "K7M2QX" });
  expect(parseJoinLink("skelp://join?o=nope")).toBeNull();
  expect(parseJoinLink("skelp://join?h=10.0.0.2&p=47474")).toEqual({ host: "10.0.0.2", port: 47474 });
});

test("players anywhere: look up the code, join, bid, and everyone sees the same state", async () => {
  const store = new FakeStore();
  const { host, code } = await hostArena(store);
  expect(host.online).toBe(code);
  expect(await lookupOnline(new FakeDb(store, "uid-x"), code)).toMatchObject({ ok: true, info: { arena: "SHAN'S ARENA", teams: 1, phase: "lobby", host: code } });
  expect(await lookupOnline(new FakeDb(store, "uid-x"), "ZZZZZZ")).toMatchObject({ ok: false });

  const { c: a } = join(store, code, "phone-a", "Aryan");
  const { c: b } = join(store, code, "phone-b", "Anika");
  await until(() => st(host).teams.length === 3 && a.getStatus() === "live" && b.getStatus() === "live", "players to join");
  expect(st(b).teams.map((t) => t.name)).toEqual(["Shan", "Aryan", "Anika"]);
  await until(() => store.read(`arenas/${code}/info`).teams === 3, "public card to update");

  a.setTeam({ name: "Tigers" });
  host.setConfig({ ...PRESETS.QUICK, timer: 2 });
  a.start(); // players cannot start
  await until(() => st(b).config.mode === "QUICK" && st(b).teams[1].name === "Tigers", "config and team sync");
  expect(st(host).phase).toBe("lobby");
  host.start();
  await until(() => st(a).phase === "auction" && st(b).phase === "auction", "auction to start");

  const lot = st(a).lot!;
  a.bid(lot.bid);
  await until(() => st(b).lot?.bidder === "phone-a", "bid to reach the other player");
  b.bid(lot.bid + 50);
  await until(() => st(host).lot?.bidder === "phone-b" && st(a).lot?.bid === lot.bid + 50, "jump bid");
  a.pass(); host.pass();
  await until(() => st(a).lot?.status === "sold" || st(a).lot?.pid !== lot.pid, "hammer");
  expect(st(host).teams[2].squad).toEqual([{ pid: lot.pid, price: lot.bid + 50 }]);

  // reactions reach everyone
  const seen: string[] = [];
  b.onReaction((id, e) => seen.push(id + e));
  a.react("🔥");
  await until(() => seen.includes("phone-a🔥"), "reaction");

  // messages are deleted once read: nothing piles up in the database
  await sleep(100);
  const conns = store.read(`arenas/${code}/c`);
  for (const id of Object.keys(conns)) expect(Object.keys(conns[id])).toEqual(["meta"]);
});

test("a player who drops off the internet is marked offline, and gets their team back on return", async () => {
  const store = new FakeStore();
  const { host, code } = await hostArena(store);
  const { c: a, db } = join(store, code, "phone-a", "Aryan");
  await until(() => st(host).teams.length === 2, "join");
  host.setConfig(PRESETS.QUICK);
  host.start();
  await until(() => st(a)?.phase === "auction", "auction");
  db.dropOffline();
  await until(() => st(host).teams[1].connected === false, "host to notice");
  a.leave();
  const { c: again } = join(store, code, "phone-a", "Aryan");
  await until(() => again.getStatus() === "live" && st(host).teams[1].connected === true, "rejoin");
  expect(st(host).teams).toHaveLength(2);
  // a stranger cannot walk into a running auction
  const { c: late } = join(store, code, "phone-z", "Late");
  await until(() => late.getStatus() === "closed", "late joiner to be refused");
  expect((late as ClientSession).error).toBe("Auction already started");
});

test("closing the arena tells every player and leaves nothing behind", async () => {
  const store = new FakeStore();
  const { host, code } = await hostArena(store);
  const { c: a } = join(store, code, "phone-a", "Aryan");
  await until(() => a.getStatus() === "live", "join");
  host.leave();
  await until(() => a.getStatus() === "closed", "player to be told");
  expect((a as ClientSession).error).toBe("The host closed the arena");
  await sleep(50);
  expect(store.read("arenas")).toBeNull();
  // a wrong code is refused with a clear message instead of retrying forever
  const { c: lost } = join(store, "QQQQQQ", "phone-q", "Lost");
  await until(() => lost.getStatus() === "closed", "refusal");
  expect((lost as ClientSession).error).toMatch(/No arena has this code/);
});

test("data use stays small: full updates go out on changes and every few seconds, not every tick", async () => {
  expect(ONLINE_TIMING.syncMs).toBeGreaterThanOrEqual(3000);
  const store = new FakeStore();
  const { host, code } = await hostArena(store);
  join(store, code, "phone-a", "Aryan");
  await until(() => st(host).teams.length === 2, "join");
  host.setConfig(PRESETS.QUICK);
  host.start();
  await sleep(200);
  const before = store.delivered;
  await sleep(2500); // nobody bids: at most one periodic update in this window
  const perSecond = (store.delivered - before) / 2.5;
  expect(perSecond).toBeLessThan(6000);
});
