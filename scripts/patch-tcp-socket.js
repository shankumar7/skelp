// Patches react-native-tcp-socket's Android module. Runs after every install; every edit is idempotent.
//
// 1. Thread pool: every connect() runs on a fixed pool of 2 threads. Skelp! probes a whole subnet to
//    find the host, so two slow probes would stall every other connection. Give it a proper pool.
// 2. Crash fix: when a connect() failed before the socket was registered (for example "Interface wifi
//    unreachable" on a phone that is not on Wi-Fi), a later destroy()/write() for that id threw
//    IllegalArgumentException on a background thread and killed the app. Unknown ids are now ignored.
// 3. Thread leak: every connect() with an `interface` option started a ScheduledThreadPoolExecutor
//    that was never shut down, leaving one idle thread behind per connection attempt.
// 4. No process-wide binding: with `interface: "wifi"` the library also called bindProcessToNetwork,
//    which sent ALL of the app's traffic over Wi-Fi from then on. On a hotspot without internet that
//    cut off Firebase. The game socket itself is still bound to Wi-Fi (network.bindSocket).
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'node_modules', 'react-native-tcp-socket', 'android', 'src', 'main', 'java', 'com', 'asterinet', 'react', 'tcpsocket', 'TcpSocketModule.java');
if (!fs.existsSync(file)) { console.log('patch-tcp-socket: library not installed, skipping'); process.exit(0); }
let src = fs.readFileSync(file, 'utf8');
const HELPER = '    // skelp-patched\n    @Nullable\n    private TcpSocketClient findClient(final int id) {\n        final TcpSocket socket = socketMap.get(id);\n        return socket instanceof TcpSocketClient ? (TcpSocketClient) socket : null;\n    }\n\n';

const edits = [
  ['private static final int N_THREADS = 2;', 'private static final int N_THREADS = 48;'],
  ['        TcpSocketClient socketClient = getTcpClient(cId);\n        byte[] data = Base64.decode(base64String, Base64.NO_WRAP);',
   '        final TcpSocketClient socketClient = findClient(cId);\n        if (socketClient == null) return;\n        byte[] data = Base64.decode(base64String, Base64.NO_WRAP);'],
  ['                TcpSocketClient socketClient = getTcpClient(cId);\n                socketClient.destroy();',
   '                final TcpSocketClient socketClient = findClient(cId);\n                if (socketClient != null) socketClient.destroy();'],
  ['                TcpSocketServer socketServer = getTcpServer(cId);\n                socketServer.close();\n                socketMap.remove(cId);',
   '                final TcpSocket s = socketMap.get(cId);\n                if (s instanceof TcpSocketServer) {\n                    try { ((TcpSocketServer) s).close(); } catch (Exception ignored) { }\n                }\n                socketMap.remove(cId);'],
  ['final TcpSocketClient client = getTcpClient(cId);\n        try {\n            client.setNoDelay(noDelay);',
   'final TcpSocketClient client = findClient(cId);\n        if (client == null) return;\n        try {\n            client.setNoDelay(noDelay);'],
  ['final TcpSocketClient client = getTcpClient(cId);\n        try {\n            client.setKeepAlive(',
   'final TcpSocketClient client = findClient(cId);\n        if (client == null) return;\n        try {\n            client.setKeepAlive('],
  ['        TcpSocketClient client = getTcpClient(cId);\n        client.pause();', '        final TcpSocketClient client = findClient(cId);\n        if (client != null) client.pause();'],
  ['        TcpSocketClient client = getTcpClient(cId);\n        client.resume();', '        final TcpSocketClient client = findClient(cId);\n        if (client != null) client.resume();'],
  ['        awaitingNetwork.await();\n    }', '        awaitingNetwork.await();\n        exec.shutdownNow();\n    }'],
  ['    private TcpSocketClient getTcpClient(final int id) {', HELPER + '    private TcpSocketClient getTcpClient(final int id) {'],
];
let changed = 0;
for (const [from, to] of edits) {
  if (src.includes(to)) continue;                       // already applied
  if (!src.includes(from)) {
    console.error('patch-tcp-socket: cannot apply an edit — the library changed, review this patch:\n' + from.slice(0, 160));
    process.exit(1);
  }
  src = src.replace(from, to);
  changed++;
}
// 4: drop every process-wide binding (there are several call sites); the per-socket bind stays
const before = src;
src = src.replace(/^(\s*)cm\.bindProcessToNetwork\((\w+)\);/gm, '$1// skelp: no process-wide binding ($2 is bound per socket instead)');
if (src !== before) changed++;
if (/cm\.bindProcessToNetwork\(/.test(src)) { console.error('patch-tcp-socket: a bindProcessToNetwork call is left'); process.exit(1); }
if (changed) fs.writeFileSync(file, src);
console.log(changed ? `patch-tcp-socket: applied ${changed} change(s)` : 'patch-tcp-socket: already up to date');
