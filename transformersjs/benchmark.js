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


// JetStream benchmark harness.
// Assumes `preloadFiles(module)`, `initPipeline(pipelineFromTransformersJs)`,
// and `doTask(initializedPipeline, inputArrayBuffer)` is in the global scope.

class Benchmark {
  transformersJsModule;
  pipeline;
  inputFile;

  async init() {
    // FIXME: Make compatible with other shells.
    const pathPrefix = './transformersjs/';
    this.transformersJsModule = await import(pathPrefix + 'build/transformers.js');
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
        // FIXME: Make compatible with other shells.
        mjs: 'lib/onnxruntime-web/ort-wasm-simd-threaded.mjs',
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
