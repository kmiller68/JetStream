// Copyright 2025 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Polyfills that Transformers.js / the ONNX runtime needs in JavaScript shells.

class URL {
  href;
  constructor(url, base) {
    // DEBUG
    // console.log('URL', url, base);
    this.href = url;
  }
}
globalThis.URL = URL;

let preload;
globalThis.fetch = async function(url) {
  // DEBUG
  // console.log('fetch', url);
  if (!preload[url]) {
    throw new Error('Unexpected fetch: ' + url);
  }
  return {
    ok: true,
    arrayBuffer: function() {
      return preload[url];
    },
  };
};

// Provide instantiateStreaming API, otherwise initializing ONNX runtime's
// 'wasm' backend fails.
// TODO: We can instead provide a Wasm module as an ArrayBuffer directly, once
// `env.backends.onnx.wasm.wasmBinary` is supported by Transformers.js.
// See https://github.com/microsoft/onnxruntime/pull/21534
globalThis.WebAssembly.instantiateStreaming = async function(m,i) {
  // DEBUG
  // console.log('instantiateStreaming',m,i);
  return WebAssembly.instantiate(m.arrayBuffer(),i);
};

// JetStream benchmark harness. Reuse for two different Transformers.js tasks.
// Assumes `preloadFiles(module)`, `initPipeline(pipelineFromTransformersJs)`,
// and `doTask(initializedPipeline, inputArrayBuffer)` is in the global scope.

class Benchmark {
  transformersJsModule;
  pipeline;
  inputFile;

  async init() {
    // The generated JavaScript code from dart2wasm is an ES module, which we
    // can only load with a dynamic import (since this file is not a module.)
    // TODO: Support ES6 modules in the driver instead of this one-off solution.
    // This probably requires a new `Benchmark` field called `modules` that
    // is a map from module variable name (which will hold the resulting module
    // namespace object) to relative module URL, which is resolved in the
    // `preRunnerCode`, similar to this code here.
    if (isInBrowser) {
      // In browsers, relative imports don't work since we are not in a module.
      // (`import.meta.url` is not defined.)
      this.transformersJsModule = await import(location.origin + "/transformersjs/build/transformers.js");
    } else {
      // In shells, relative imports require different paths, so try with and
      // without the "./" prefix (e.g., JSC requires it).
      try {
        this.transformersJsModule = await import("transformersjs/build/transformers.js");
      } catch {
        this.transformersJsModule = await import("./transformersjs/build/transformers.js");
      }
    }

    preload = preloadFiles(Module);

    if (Module.inputFile) {
      this.inputFile = Module.inputFile.buffer;
    }
  }

  async runIteration() {
    if (!this.pipeline) {
      // TODO: Profile startup only: What is taking so much time here?
      let { env, pipeline } = this.transformersJsModule;
    
      env.localModelPath = 'build/models/';
      env.allowRemoteModels = false;
    
      // Single-threaded only for now, since we cannot spawn workers in shells.
      // TODO: Implement sufficiently powerful workers in shells (or provide
      // polyfills).
      env.backends.onnx.wasm.numThreads = 1;

      // Either specify path prefix, but this loads the JSEP build by default.
      // env.backends.onnx.wasm.wasmPaths = 'build/lib/onnxruntime-web/';
      // So instead, give the ONNX runtime files directly:
      env.backends.onnx.wasm.wasmPaths = {
        mjs: './lib/onnxruntime-web/ort-wasm-simd-threaded.mjs',
        wasm: 'ort-wasm-simd-threaded.wasm',
      };
      // Finally, this would be our preferred option: Giving the Wasm binary
      // directly, such that we don't have to intercept `instantiateStreaming`,
      // but see above.
      // env.backends.onnx.wasm.wasmBinary = ...

      this.pipeline = await initPipeline(pipeline);
    }
    
    await doTask(this.pipeline, this.inputFile);
  }
}
