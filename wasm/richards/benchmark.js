// Copyright 2025 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function scheduleIter() {
  return Module._scheduleIter();
}

class Benchmark {
  async runIteration() {
    if (!Module._main)
      await setupModule(Module);

    Module._setup();
    while (scheduleIter()) {}
  }

  validate() {
    if (Module._getQpktcount() !== 2326410 || Module._getHoldcount() !== 930563)
      throw new Error("Bad richards result!");
  }
}
