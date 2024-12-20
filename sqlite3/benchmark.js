// Copyright 2024 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const inJetStreamRunner = typeof globalThis.benchmarkTime !== "undefined";
if (!inJetStreamRunner) {
  load("polyfills.js");

  // Exports `sqlite3InitModule()` and contains the main code.
  load("build/jswasm/speedtest1.js");

  // Load Wasm binary from disk.
  globalThis.Module = {
    wasmBinary: read("build/jswasm/speedtest1.wasm", "binary"),
  };
}

// Make sure we never initialize OPFS by removing one of it's APIs (see
// `installOpfsVfs` in the generated JavaScript code of sqlite).
// We never want to use it anyway (see VFS config below) and this way we don't
// waste cycles on the browser runner to initialize it.
delete globalThis.FileSystemHandle;

// Simplified from inline JavaScript in `speedtest1.html`.
function runTests(sqlite3Module) {
  // Configure the VFS to use.
  // Don't use OPFS, WASMFS (which is on top of OPFS), or kvvfs, since they all
  // use persistent browser storage (localStorage or OPFS), which is not
  // available in JavaScript shells.
  // Also don't use memfs, since that crashes with a NULL function pointer.
  // Instead, make the default VFS explicit.
  const capi = sqlite3Module.capi
  console.log("Available SQLite VFS:", capi.sqlite3_js_vfs_list());
  const vfs = "unix";
  console.log("Using VFS:", vfs);
  const pVfs = capi.sqlite3_vfs_find(vfs);
  if (!pVfs) {
    console.error("Error: Unknown VFS:", vfs);
    return;
  }

  // These arguments should match the upstream browser runner `speedtest1.html`.
  let argv = [
    "speedtest1",
    "--singlethread",
    //"--nomutex",
    //"--nosync",
    //"--memdb", // note that memdb trumps the filename arg
    "--nomemstat",
    "--big-transactions" /*important for tests 410 and 510!*/,
    "--size", "20", // To speedup, default is 100 (and takes about 4s).
    "--vfs", vfs, // See VFS comment above.
  ];

  console.log("Calling main with argv:", argv);
  const wasm = sqlite3Module.wasm;
  wasm.scopedAllocPush();  // Required for `scopedAllocMainArgv()`.
  wasm.xCall("wasm_main", argv.length, wasm.scopedAllocMainArgv(argv));
  wasm.scopedAllocPop();
}

async function doRun() {
  let start = benchmarkTime();
  const sqliteModule = await sqlite3InitModule(Module);
  reportCompileTime(benchmarkTime() - start);

  start = benchmarkTime();
  runTests(sqliteModule);
  reportRunTime(benchmarkTime() - start);
}
if (!inJetStreamRunner) {
  sqlite3InitModule(Module).then(runTests);
}
