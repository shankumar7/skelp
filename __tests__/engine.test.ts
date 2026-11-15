import { BotBrain } from "../game/bots";
import { Action, bidBlocker, buildQueue, createState, mulberry32, nextBid, overseasCount, PRESETS, reduce, squadPower, standings, State } from "../game/engine";
import { formatMoney, increment } from "../game/money";
import { getPlayer, PLAYERS } from "../game/players";

const run = (s: State, ...actions: Action[]) => actions.reduce(reduce, s);
function lobby(n = 3, mode: keyof typeof PRESETS = "QUICK"): State {
  let s = createState("TEST", "t1");
  for (let i = 1; i <= n; i++) s = reduce(s, { type: "join", id: `t${i}`, name: `Team ${i}`, avatar: "flash" });
  return reduce(s, { type: "config", config: PRESETS[mode] });
}
const started = (n = 3, mode: keyof typeof PRESETS = "QUICK") => reduce(lobby(n, mode), { type: "start", seed: 42 });

describe("money", () => {
  test("formats lakhs and crores", () => {
    expect(formatMoney(30)).toBe("₹30 L");
    expect(formatMoney(100)).toBe("₹1 Cr");
    expect(formatMoney(1525)).toBe("₹15.25 Cr");
    expect(formatMoney(250)).toBe("₹2.5 Cr");
  });
  test("increments grow with price", () => {
    expect([30, 95, 100, 190, 200, 480, 500, 2000].map(increment)).toEqual([5, 5, 10, 10, 20, 20, 25, 25]);
  });
});

describe("player data", () => {
  test("is well formed", () => {
    expect(PLAYERS.length).toBeGreaterThan(120);
    expect(new Set(PLAYERS.map((p) => p.id)).size).toBe(PLAYERS.length);
    expect(new Set(PLAYERS.map((p) => p.key)).size).toBe(PLAYERS.length);
    for (const p of PLAYERS) {
      expect(["BAT", "BOWL", "AR", "WK"]).toContain(p.role);
      expect(p.base % 5).toBe(0);
      expect(p.overseas).toBe(p.country !== "IND");
      expect(p.rating).toBeGreaterThanOrEqual(60);
    }
  });
});

describe("lobby", () => {
  test("joins, dedupes names, caps at 10 teams", () => {
    let s = createState("A", "h");
    for (let i = 0; i < 12; i++) s = reduce(s, { type: "join", id: `x${i}`, name: "Sam", avatar: "a" });
    expect(s.teams).toHaveLength(10);
    expect(new Set(s.teams.map((t) => t.name)).size).toBe(10);
    expect(new Set(s.teams.map((t) => t.color)).size).toBe(10);
  });
  test("cannot start alone; leaving the lobby removes the team", () => {
    let s = lobby(1);
    expect(reduce(s, { type: "start", seed: 1 }).phase).toBe("lobby");
    s = lobby(2);
    s = reduce(s, { type: "leave", id: "t2" });
    expect(s.teams).toHaveLength(1);
  });
  test("host cannot be kicked", () => {
    const s = lobby(2);
    expect(reduce(s, { type: "kick", id: "t1" }).teams).toHaveLength(2);
    expect(reduce(s, { type: "kick", id: "t2" }).teams).toHaveLength(1);
  });
  test("queue is deterministic per seed, unique, marquee first", () => {
    const q = buildQueue(40, 7);
    expect(q).toEqual(buildQueue(40, 7));
    expect(q).not.toEqual(buildQueue(40, 8));
    expect(new Set(q).size).toBe(q.length);
    expect(q.length).toBe(40);
    const firstNonMarquee = q.findIndex((id) => getPlayer(id).rating < 90);
    expect(q.slice(firstNonMarquee).every((id) => getPlayer(id).rating < 90)).toBe(true);
    expect(buildQueue(999, 1).length).toBe(PLAYERS.length);
  });
});

describe("bidding", () => {
  test("opening bid is the base price, then increments", () => {
    let s = started();
    const base = getPlayer(s.lot!.pid).base;
    expect(nextBid(s.lot!)).toBe(base);
    s = reduce(s, { type: "bid", id: "t1", amount: base });
    expect(s.lot!.bidder).toBe("t1");
    expect(nextBid(s.lot!)).toBe(base + increment(base));
  });
  test("rejects low bids, self-outbidding and bids over purse", () => {
    let s = started();
    const base = getPlayer(s.lot!.pid).base;
    expect(reduce(s, { type: "bid", id: "t1", amount: base - 5 })).toBe(s);
    expect(reduce(s, { type: "bid", id: "nobody", amount: base })).toBe(s);
    expect(reduce(s, { type: "bid", id: "t1", amount: 999999 })).toBe(s);
    expect(reduce(s, { type: "bid", id: "t1", amount: base + 0.5 })).toBe(s);
    s = reduce(s, { type: "bid", id: "t1", amount: base });
    expect(bidBlocker(s, "t1")).toMatch(/highest/);
    expect(reduce(s, { type: "bid", id: "t1", amount: base + 100 })).toBe(s);
  });
  test("a bid resets the clock; expiry sells to the highest bidder", () => {
    let s = started();
    const pid = s.lot!.pid;
    const base = getPlayer(pid).base;
    s = run(s, { type: "tick", dt: 5000 }, { type: "bid", id: "t2", amount: base });
    expect(s.lot!.remainMs).toBe(s.config.timer * 1000);
    s = reduce(s, { type: "tick", dt: s.config.timer * 1000 });
    expect(s.lot!.status).toBe("sold");
    const t2 = s.teams.find((t) => t.id === "t2")!;
    expect(t2.squad).toEqual([{ pid, price: base }]);
    expect(t2.purse).toBe(s.config.purse - base);
    // after the SOLD pause the next player comes up
    s = reduce(s, { type: "tick", dt: 5000 });
    expect(s.lot!.status).toBe("open");
    expect(s.lot!.pid).not.toBe(pid);
    expect(s.pos).toBe(1);
  });
  test("no bids -> unsold", () => {
    let s = started();
    const pid = s.lot!.pid;
    s = reduce(s, { type: "tick", dt: 60000 });
    expect(s.lot!.status).toBe("unsold");
    expect(s.unsold).toContain(pid);
  });
  test("everyone else passing sells immediately; all passing = unsold immediately", () => {
    let s = started();
    const base = getPlayer(s.lot!.pid).base;
    s = run(s, { type: "bid", id: "t1", amount: base }, { type: "pass", id: "t2" });
    expect(s.lot!.status).toBe("open");
    s = reduce(s, { type: "pass", id: "t3" });
    expect(s.lot!.status).toBe("sold");
    s = reduce(s, { type: "tick", dt: 5000 });
    s = run(s, { type: "pass", id: "t1" }, { type: "pass", id: "t2" }, { type: "pass", id: "t3" });
    expect(s.lot!.status).toBe("unsold");
  });
  test("passed teams cannot come back on the same lot", () => {
    let s = started();
    s = reduce(s, { type: "pass", id: "t2" });
    expect(bidBlocker(s, "t2")).toMatch(/passed/);
  });
  test("pause freezes clock and bids", () => {
    let s = reduce(started(), { type: "pause", on: true });
    const before = s.lot!.remainMs;
    s = reduce(s, { type: "tick", dt: 3000 });
    expect(s.lot!.remainMs).toBe(before);
    expect(reduce(s, { type: "bid", id: "t1", amount: nextBid(s.lot!) })).toBe(s);
    s = reduce(s, { type: "pause", on: false });
    expect(reduce(s, { type: "tick", dt: 1000 }).lot!.remainMs).toBe(before - 1000);
  });
  test("a disconnected sole rival lets the hammer fall", () => {
    let s = started(2);
    const base = getPlayer(s.lot!.pid).base;
    s = run(s, { type: "bid", id: "t1", amount: base }, { type: "leave", id: "t2" });
    expect(s.lot!.status).toBe("sold");
    expect(s.teams.find((t) => t.id === "t2")!.connected).toBe(false);
    // and they can come back mid-auction with their team intact
    s = reduce(s, { type: "join", id: "t2", name: "Changed", avatar: "x" });
    expect(s.teams.find((t) => t.id === "t2")).toMatchObject({ connected: true, name: "Team 2" });
  });
  test("newcomers cannot join once the auction started", () => {
    const s = started();
    expect(reduce(s, { type: "join", id: "late", name: "Late", avatar: "x" }).teams).toHaveLength(3);
  });
});

/** Play a whole auction with bots only, checking invariants at every step. */
function simulate(mode: keyof typeof PRESETS, teams: number, seed: number): State {
  let s = createState("SIM", "b1");
  for (let i = 1; i <= teams; i++) s = reduce(s, { type: "join", id: `b${i}`, name: `Bot ${i}`, avatar: "x", isBot: true });
  s = run(s, { type: "config", config: PRESETS[mode] }, { type: "start", seed });
  const brain = new BotBrain(mulberry32(seed));
  let guard = 0;
  while (s.phase === "auction") {
    if (++guard > 500000) throw new Error("auction did not finish");
    s = reduce(s, { type: "tick", dt: 200 });
    for (const a of brain.step(s, 200)) s = reduce(s, a);
    for (const t of s.teams) {
      if (t.purse < 0) throw new Error("negative purse");
      if (t.squad.length > s.config.squadMax) throw new Error("squad overflow");
      if (overseasCount(t) > s.config.overseasMax) throw new Error("overseas overflow");
    }
  }
  return s;
}

describe("full auctions with bots", () => {
  test.each([["QUICK", 2, 1], ["QUICK", 6, 2], ["CLASSIC", 4, 3], ["MEGA", 10, 4], ["MEGA", 3, 5]] as const)("%s with %i teams finishes cleanly", (mode, teams, seed) => {
    const s = simulate(mode, teams, seed);
    expect(s.phase).toBe("done");
    const owned = s.teams.flatMap((t) => t.squad.map((e) => e.pid));
    expect(new Set(owned).size).toBe(owned.length); // nobody is sold twice
    for (const t of s.teams) {
      expect(t.purse + t.squad.reduce((n, e) => n + e.price, 0)).toBe(s.config.purse); // money is conserved
      for (const e of t.squad) expect(e.price).toBeGreaterThanOrEqual(getPlayer(e.pid).base);
    }
    expect(owned.length).toBeGreaterThan(teams * 3); // bots actually buy players
    // every player in the pool ended up either sold or unsold exactly once
    const seen = [...owned, ...s.unsold];
    expect(new Set(seen).size).toBe(seen.length);
    const table = standings(s);
    expect(squadPower(table[0])).toBeGreaterThanOrEqual(squadPower(table[table.length - 1]));
  });
  test("unsold players return for one accelerated round", () => {
    let s = started(2);
    const total = s.queue.length;
    // nobody bids on anything in round 1
    while (s.round === 1 && s.phase === "auction") s = reduce(s, { type: "tick", dt: 60000 });
    expect(s.phase).toBe("auction");
    expect(s.round).toBe(2);
    expect(s.queue.length).toBe(total);
    while (s.phase === "auction") s = reduce(s, { type: "tick", dt: 60000 });
    expect(s.phase).toBe("done");
    expect(s.unsold.length).toBe(total);
  });
  test("host can end early", () => {
    expect(reduce(started(), { type: "end" }).phase).toBe("done");
  });
});
