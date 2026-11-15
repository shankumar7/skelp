import { View } from "react-native";
import qrcode from "qrcode-generator";

/** A QR code drawn with plain views (no native code needed). Dark runs in a row are merged into one view. */
export function QrCode({ value, size }: { value: string; size: number }) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  const cell = Math.floor(size / (n + 2)); // one-module quiet zone on each side
  const rows: { x: number; w: number }[][] = [];
  for (let r = 0; r < n; r++) {
    const runs: { x: number; w: number }[] = [];
    let start = -1;
    for (let c = 0; c <= n; c++) {
      const dark = c < n && qr.isDark(r, c);
      if (dark && start < 0) start = c;
      if (!dark && start >= 0) { runs.push({ x: start, w: c - start }); start = -1; }
    }
    rows.push(runs);
  }
  return (
    <View style={{ width: cell * (n + 2), height: cell * (n + 2), backgroundColor: "#FFF", padding: cell }} accessibilityLabel="Arena QR code">
      {rows.map((runs, r) => (
        <View key={r} style={{ height: cell, width: cell * n }}>
          {runs.map((run) => <View key={run.x} style={{ position: "absolute", left: run.x * cell, width: run.w * cell, height: cell, backgroundColor: "#2A2545" }} />)}
        </View>
      ))}
    </View>
  );
}
