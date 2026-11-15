// Patches react-native-tcp-socket's Android module. Runs after every install; safe to run repeatedly.
//
// 1. Thread pool: every connect() runs on a fixed pool of 2 threads. Skelp! probes a whole subnet to
//    find the host, so two slow probes would stall every other connection. Give it a proper pool.
// 2. Crash fix: when a connect() fails before the socket is registered (for example "Interface wifi
//    unreachable" on a phone that is not on Wi-Fi), a later destroy()/write() for that id threw
//    IllegalArgumentException on a background thread and killed the app. Unknown ids are now ignored.
// 3. Thread leak: every connect() with an `interface` option started a ScheduledThreadPoolExecutor
//    that was never shut down, leaving one idle thread behind per connection attempt.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'node_modules', 'react-native-tcp-socket', 'android', 'src', 'main', 'java', 'com', 'asterinet', 'react', 'tcpsocket', 'TcpSocketModule.java');
if (!fs.existsSync(file)) { console.log('patch-tcp-socket: library not installed, skipping'); process.exit(0); }
let src = fs.readFileSync(file, 'utf8');
const MARK = '// skelp-patched v2';
if (src.includes(MARK)) { console.log('patch-tcp-socket: already patched'); process.exit(0); }

const edits = [
  [/private static final int N_THREADS = \d+;/, 'private static final int N_THREADS = 48;'],
  // write(): ignore writes to sockets that no longer exist
  ['        TcpSocketClient socketClient = getTcpClient(cId);\n        byte[] data = Base64.decode(base64String, Base64.NO_WRAP);',
   '        final TcpSocketClient socketClient = findClient(cId);\n        if (socketClient == null) return;\n        byte[] data = Base64.decode(base64String, Base64.NO_WRAP);'],
  // end() / destroy(): closing an unknown id is a no-op
  ['                TcpSocketClient socketClient = getTcpClient(cId);\n                socketClient.destroy();',
   '                final TcpSocketClient socketClient = findClient(cId);\n                if (socketClient != null) socketClient.destroy();'],
  // close() on a server
  ['                TcpSocketServer socketServer = getTcpServer(cId);\n                socketServer.close();\n                socketMap.remove(cId);',
   '                final TcpSocket s = socketMap.get(cId);\n                if (s instanceof TcpSocketServer) {\n                    try { ((TcpSocketServer) s).close(); } catch (Exception ignored) { }\n                }\n                socketMap.remove(cId);'],
  // setNoDelay / setKeepAlive (two occurrences)
  [/final TcpSocketClient client = getTcpClient\(cId\);\n        try \{/g, 'final TcpSocketClient client = findClient(cId);\n        if (client == null) return;\n        try {'],
  ['        TcpSocketClient client = getTcpClient(cId);\n        client.pause();', '        final TcpSocketClient client = findClient(cId);\n        if (client != null) client.pause();'],
  ['        TcpSocketClient client = getTcpClient(cId);\n        client.resume();', '        final TcpSocketClient client = findClient(cId);\n        if (client != null) client.resume();'],
  // stop the per-call scheduler once the network lookup is done
  ['        awaitingNetwork.await();\n    }', '        awaitingNetwork.await();\n        exec.shutdownNow();\n    }'],
  // helper
  ['    private TcpSocketClient getTcpClient(final int id) {',
   `    ${MARK}\n    @Nullable\n    private TcpSocketClient findClient(final int id) {\n        final TcpSocket socket = socketMap.get(id);\n        return socket instanceof TcpSocketClient ? (TcpSocketClient) socket : null;\n    }\n\n    private TcpSocketClient getTcpClient(final int id) {`],
];
for (const [from, to] of edits) {
  const next = src.replace(from, to);
  if (next === src && !(typeof from !== 'string' && String(to).includes('48'))) {
    console.error('patch-tcp-socket: could not apply an edit — the library changed, review this patch:\n', String(from).slice(0, 120));
    process.exit(1);
  }
  src = next;
}
fs.writeFileSync(file, src);
console.log('patch-tcp-socket: applied (thread pool 48, unknown socket ids ignored, scheduler leak fixed)');
