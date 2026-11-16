import { compareVersions, parseVersion, pickUpdate, tidyNotes } from "../game/updater";

test("version comparison", () => {
  expect(parseVersion("v1.5")).toEqual([1, 5, 0]);
  expect(parseVersion("1.2.1")).toEqual([1, 2, 1]);
  expect(compareVersions("v1.5", "1.4.0")).toBeGreaterThan(0);
  expect(compareVersions("v1.5", "1.5.0")).toBe(0);
  expect(compareVersions("1.10", "1.9.9")).toBeGreaterThan(0);
  expect(compareVersions("v1.2.1", "1.3")).toBeLessThan(0);
  expect(compareVersions("garbage", "1.0")).toBeLessThan(0);
});

test("picks a newer release and its APK, ignores older, draft and malformed ones", () => {
  const release = { tag_name: "v1.6", body: "## What's new\n- **Faster** bids\n- [Docs](http://x)\n", assets: [{ name: "notes.txt" }, { name: "skelp.apk", size: 31000000, browser_download_url: "https://github.com/shankumar7/skelp/releases/download/v1.6/skelp.apk" }] };
  expect(pickUpdate(release, "1.5.0")).toEqual({ version: "1.6", notes: "What's new\n• Faster bids\n• Docs", url: release.assets[1].browser_download_url, size: 31000000, page: "https://github.com/shankumar7/skelp/releases/latest" });
  expect(pickUpdate(release, "1.6.0")).toBeNull();
  expect(pickUpdate({ ...release, draft: true }, "1.5.0")).toBeNull();
  expect(pickUpdate(null, "1.5.0")).toBeNull();
  expect(pickUpdate({ tag_name: 5 }, "1.5.0")).toBeNull();
  // an APK link that is not on this repository is never used
  const odd = pickUpdate({ tag_name: "v2.0", assets: [{ name: "x.apk", browser_download_url: "https://evil.example/x.apk" }] }, "1.5.0");
  expect(odd?.url).toBe("https://github.com/shankumar7/skelp/releases/latest/download/skelp.apk");
  expect(tidyNotes("a\n\n\n\nb")).toBe("a\n\nb");
});
