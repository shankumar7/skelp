// react-native-tcp-socket runs every connect() on a fixed pool of 2 threads. Skelp! probes a whole
// subnet to find the host, so two slow probes would stall every other connection (including the
// real one). Give it a proper pool. Runs after every install; safe to run repeatedly.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'node_modules', 'react-native-tcp-socket', 'android', 'src', 'main', 'java', 'com', 'asterinet', 'react', 'tcpsocket', 'TcpSocketModule.java');
if (!fs.existsSync(file)) { console.log('patch-tcp-socket: library not installed, skipping'); process.exit(0); }
const src = fs.readFileSync(file, 'utf8');
const patched = src.replace(/private static final int N_THREADS = \d+;/, 'private static final int N_THREADS = 48;');
if (!/N_THREADS = 48;/.test(patched)) { console.error('patch-tcp-socket: could not find N_THREADS — the library changed, review this patch'); process.exit(1); }
if (patched !== src) fs.writeFileSync(file, patched);
console.log('patch-tcp-socket: connection thread pool = 48');
