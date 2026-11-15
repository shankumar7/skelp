import { friendlyError } from "../game/cloudErrors";
import { load, mergeStats, recordAuction, setSignedIn, signInGuest, signOut, Stats } from "../game/storage";
import { saveProfile } from "../game/cloud";

const item = (date: number, rank = 1) => ({ date, arena: "A", rank, teams: 4, power: 300, spent: 500, players: 5 });
const stats = (auctions: number, history: number[]): Stats => ({ auctions, wins: auctions, spent: auctions * 100, history: history.map((d) => item(d)) });

describe("friendly Firebase errors", () => {
  test.each([
    [{ code: "auth/wrong-password" }, /Wrong email or password/],
    [{ code: "auth/invalid-credential" }, /Wrong email or password/],
    [{ code: "auth/email-already-in-use" }, /already exists/],
    [{ code: "auth/weak-password" }, /6 characters/],
    [{ code: "auth/network-request-failed" }, /No internet/],
    [{ code: "auth/too-many-requests" }, /Too many attempts/],
    [{ code: "auth/unknown", message: "[auth/internal-error] CONFIGURATION_NOT_FOUND" }, /not switched on yet/],
    [{ code: "firestore/unavailable", message: "The service is currently unavailable" }, /No internet/],
    [new Error("boom"), /Something went wrong/],
    [null, /Something went wrong/],
  ])("%j", (err, re) => expect(friendlyError(err)).toMatch(re));
});

describe("merging phone and cloud stats", () => {
  test("no cloud copy keeps the phone's stats", () => {
    const local = stats(2, [1, 2]);
    expect(mergeStats(local, null)).toBe(local);
  });
  test("the copy with more auctions wins the counters; history is the union, newest first, max 10", () => {
    const merged = mergeStats(stats(2, [5, 1]), stats(7, [9, 5, 3, 2, 8, 7, 6, 4, 11, 12, 13]));
    expect(merged.auctions).toBe(7);
    expect(merged.history.map((h) => h.date)).toEqual([13, 12, 11, 9, 8, 7, 6, 5, 4, 3]);
  });
  test("malformed cloud data cannot break the phone copy", () => {
    const local = stats(3, [1]);
    const merged = mergeStats(local, { auctions: 1, history: "nope" as any });
    expect(merged.auctions).toBe(3);
    expect(merged.history).toHaveLength(1);
  });
});

describe("local profile storage", () => {
  const profile = { id: "d1", name: "Shan", email: "s@example.com", avatar: "trophy", avatarIdx: 2, guest: false, uid: "u1", verified: false };
  test("signing in merges cloud stats, and finished auctions are backed up", async () => {
    const merged = await setSignedIn(profile, { auctions: 4, wins: 2, spent: 900, history: [item(50)] });
    expect(merged.auctions).toBe(4);
    expect((await load()).current?.uid).toBe("u1");
    (saveProfile as jest.Mock).mockClear();
    const after = await recordAuction(item(60, 1));
    expect(after.auctions).toBe(5);
    expect(saveProfile).toHaveBeenCalledWith("u1", expect.objectContaining({ name: "Shan", stats: { auctions: 5, wins: 3, spent: 1400 } }));
  });
  test("signing out of an account clears its stats from the phone; guests are never backed up", async () => {
    await signOut(true);
    expect((await load()).stats.auctions).toBe(0);
    const g = await signInGuest("Guest123", "flash", 1);
    expect(g).toMatchObject({ guest: true, uid: null });
    (saveProfile as jest.Mock).mockClear();
    await recordAuction(item(70));
    expect(saveProfile).not.toHaveBeenCalled();
  });
});
