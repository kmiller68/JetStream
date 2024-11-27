// Copyright 2023 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const inJetStreamRunner = typeof globalThis.benchmarkTime !== "undefined";
if (!inJetStreamRunner) {
  load("polyfills.js");

  // Exports `sqlite3InitModule()` and contains the main code.
  load("build/jswasm/speedtest1.js");

  // Load Wasm binary from disk.
  globalThis.Module = { wasmBinary: read("build/jswasm/speedtest1.wasm", "binary") };
}

// Heavily simplified from inline JavaScript in `speedtest1.html`.
function runTests(sqlite3Module) {
  const wasm = sqlite3Module.wasm;
  // Required for `scopedAllocMainArgv()`.
  wasm.scopedAllocPush();
  // This should match the browser version at `speedtest1.html`.
  let argv = [
    "--singlethread",
    //"--nomutex",
    //"--nosync",
    //"--memdb", // note that memdb trumps the filename arg
    "--nomemstat",
    "--big-transactions" /*important for tests 410 and 510!*/,
    "--size", "20", // To speedup, default is 100 (and takes about 4s).
  ];
  print("Calling main with argv:\n ", argv);
  wasm.xCall("wasm_main", argv.length, wasm.scopedAllocMainArgv(argv));
  wasm.scopedAllocPop();
}

async function doRun() {
  let start = benchmarkTime();
  // FIXME: Why is the OPFS warning not intercepted by the JetStream runner?
  const sqliteModule = await sqlite3InitModule(Module);
  reportCompileTime(benchmarkTime() - start);

  start = benchmarkTime();
  runTests(sqliteModule);
  reportRunTime(benchmarkTime() - start)
}
if (!inJetStreamRunner) {
  sqlite3InitModule(Module).then(runTests);
}
