// Copyright 2025 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Some polyfills that the Transformers.js/ONNX runtime glue code needs in shells.

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
// Option A: Fake instantiateStreaming (not available in d8 as to take streaming instantiation path).
globalThis.WebAssembly.instantiateStreaming = async function(m,i) {
  // DEBUG
  // console.log('instantiateStreaming',m,i);
  return WebAssembly.instantiate(m.arrayBuffer(),i);
};

class Benchmark {
  transformersJsModule;
  pipeline;

  async init() {
    // FIXME: Make compatible with other shells.
    const pathPrefix = './transformersjs/';

    this.transformersJsModule = await import(pathPrefix + 'build/transformers.js');
    preload = {
      "ort-wasm-simd-threaded.wasm": Module.wasmBinary,
      "build/models/Xenova/distilbert-base-uncased-finetuned-sst-2-english/onnx/model_uint8.onnx": Module.modelWeights,
      "build/models/Xenova/distilbert-base-uncased-finetuned-sst-2-english/config.json": Module.modelConfig,
      "build/models/Xenova/distilbert-base-uncased-finetuned-sst-2-english/tokenizer.json": Module.modelTokenizer,
      "build/models/Xenova/distilbert-base-uncased-finetuned-sst-2-english/tokenizer_config.json": Module.modelTokenizerConfig,
    }
  }

  async runIteration() {
    if (!this.pipeline) {
      // TODO: Profile startup only: What is taking so much time here?
      let { env, pipeline } = this.transformersJsModule;
    
      env.localModelPath = 'build/models/';
      env.allowRemoteModels = false;
    
      env.backends.onnx.wasm.numThreads = 1;
      env.backends.onnx.wasm.wasmPaths = 'build/onnxruntime-web/';

      env.backends.onnx.wasm.wasmPaths = {
        // FIXME: Make compatible with other shells.
        mjs: 'ort-wasm-simd-threaded.mjs',
        wasm: 'ort-wasm-simd-threaded.wasm',
      };

      this.pipeline = await pipeline(
        'sentiment-analysis',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
        // Use quantized models for smaller model weights.
        { dtype: 'uint8' }
      );
    }
    
    const inputs = [
      'I love transformers!',
      'Benchmarking is hard.',
    ];
    const outputs = await this.pipeline(inputs);
    if (outputs.length !== inputs.length) {
      throw new Error('Expected output to be an array matching the inputs, but got:', outputs);
    }
    for (let j = 0; j < inputs.length; ++j) {
      print(`${inputs[j]} -> ${outputs[j].label} @ ${outputs[j].score}`);
    }
  }
}

// TODO old code, integrate whisper example.
// (async () => {
//   let { env, pipeline } = await import('./build/transformers.js');
//   console.log('loading transformers.js took ' + (performance.now() - start) + ' ms.');

//   env.localModelPath = 'build/models/'
//   env.allowRemoteModels = false;

//   env.backends.onnx.wasm.numThreads = 1;

//   env.backends.onnx.wasm.wasmPaths = {
//     mjs: 'ort-wasm-simd-threaded.mjs',
//     wasm: 'build/ort-wasm-simd-threaded.wasm',
//   };
//   // Option B: Directly provide binary, which is threaded through ort.wasm.mjs to the Emscripten-generated .mjs file.
//   // FIXME not yet implemented in Transformers.js, see https://github.com/microsoft/onnxruntime/pull/21534
//   // env.backends.onnx.wasm.wasmBinary = read('./transformers-3/node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm', 'binary');
//   // console.log(env.backends.onnx.wasm.wasmBinary.constructor, env.backends.onnx.wasm.wasmBinary.byteLength);


//   // End-to-end task 1: Sentiment analysis, so NLP.

//   start = performance.now();
//   let pipe = await pipeline(
//     'sentiment-analysis',
//     'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
//     // Use quantized models for smaller model weights.
//     { dtype: 'uint8' }
//   );
//   console.log('preparing pipeline took ' + (performance.now() - start) + ' ms.');
  
//   const inputs = [
//     'I love transformers!',
//     'Benchmarking is hard.',
//   ];
//   for (let i = 0; i < 100; ++i) {
//     start = performance.now();
//     const outputs = await pipe(inputs);
//     if (outputs.length !== inputs.length) {
//       throw new Error('Expected output to be an array matching the inputs, but got:', outputs);
//     }
//     for (let j = 0; j < inputs.length; ++j) {
//       console.log(`${inputs[j]} -> ${outputs[j].label} @ ${outputs[j].score}`);
//     }
//     console.log('task took ' + (performance.now() - start) + ' ms.');
//   }
  

//   // End-to-end task 2: Speech recognition.
//   // Based on the example https://huggingface.co/Xenova/whisper-tiny.en
//   // Convert audio inputs first with `convert-audio.mjs`.

//   // start = performance.now();
//   // pipe = await pipeline(
//   //   'automatic-speech-recognition',
//   //   'Xenova/whisper-tiny.en',
//   //   // FIXME: The non-quantized model is faster!?
//   //   { dtype: 'q8' }
//   // )
//   // console.log('preparing pipeline took ' + (performance.now() - start) + ' ms.');

//   // const audioFiles = [
//   //   read('build/jfk.raw', 'binary'),
//   //   // readFileSync('build/ted_60_16k.raw').buffer,
//   // ];
//   // for (let i = 0; i < 20; ++i) {
//   //   for (const audioFile of audioFiles) {
//   //     start = performance.now();
//   //     const audioData = new Float32Array(audioFile);
//   //     console.log('audio processing took ' + (performance.now() - start) + ' ms.');
    
//   //     start = performance.now();
//   //     const output = await pipe(audioData, {chunk_length_s: 10});
//   //     console.log(output.text.trim());
//   //     console.log('task took ' + (performance.now() - start) + ' ms.');
//   //   }
//   // }

// })();
