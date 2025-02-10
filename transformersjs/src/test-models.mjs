// Copyright 2025 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// The actual shell-runnable benchmark that is integrated with the JetStream
// driver lives in `../benchmark.js`.
// This is setup as an NPM project, so we can test the model in the environment
// it is supposed to work in (node or a full browser) and download the
// Transformers.js dist build and the model data.
// The `build.sh` script copies files over from `node_modules/` to `../build/`.

import { env, pipeline } from '@huggingface/transformers';

env.cacheDir = 'build/models/'
env.localModelPath = 'build/models/'
// Uncomment the following line, if you want to make sure it runs without
// internet connection.
// env.allowRemoteModels = false;

// The following lines are mostly for documentation, and useful when porting
// this over to run in shells. In Node.js, Transformers.js actually uses a
// native binding to a native CPU inference library, i.e., NOT Wasm.
// env.backends.onnx.wasm.numThreads = 1;
// env.backends.onnx.wasm.wasmPaths = {
//   mjs: 'ort-wasm-simd-threaded.jsep.mjs',
//   wasm: 'ort-wasm-simd-threaded.jsep.wasm',
// };
// TODO: Specifying the ONNX runtime Wasm binary directly (so that it can come
// from some cache, for example) is not yet implemented in Transformers.js, 
// see https://github.com/microsoft/onnxruntime/pull/21534
// env.backends.onnx.wasm.wasmBinary = read('path/to/ort-wasm-simd-threaded.wasm', 'binary');

// End-to-end task 1: Sentiment analysis, so NLP.

let start = performance.now();
let pipe = await pipeline(
  'sentiment-analysis',
  'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
  // Use quantized models for smaller model weights.
  { dtype: 'uint8' },
);
console.log('preparing pipeline took ' + (performance.now() - start) + ' ms.');

const inputs = [
  'I love transformers!',
  'Benchmarking is hard.',
];
for (let i = 0; i < 50; ++i) {
  start = performance.now();
  const outputs = await pipe(inputs);
  if (outputs.length !== inputs.length) {
    throw new Error('Expected output to be an array matching the inputs, but got:', outputs);
  }
  for (let j = 0; j < inputs.length; ++j) {
    console.log(`${inputs[j]} -> ${outputs[j].label} @ ${outputs[j].score}`);
  }
  console.log('task took ' + (performance.now() - start) + ' ms.');
}

// End-to-end task 2: Speech recognition.
// Based on the example https://huggingface.co/Xenova/whisper-tiny.en
// Convert audio inputs first with `convert-audio.mjs`.

import { readFileSync } from "fs";

start = performance.now();
pipe = await pipeline(
  'automatic-speech-recognition',
  'Xenova/whisper-tiny.en',
  // FIXME: The non-quantized model is faster!?
  { dtype: 'q8' }
)
console.log('preparing pipeline took ' + (performance.now() - start) + ' ms.');

const audioFiles = [
  readFileSync('build/inputs/jfk.raw').buffer,
  // readFileSync('build/inputs/ted_60_16k.raw').buffer,
];
for (let i = 0; i < 5; ++i) {
  for (const audioFile of audioFiles) {
    start = performance.now();
    const audioData = new Float32Array(audioFile);
    console.log('audio processing took ' + (performance.now() - start) + ' ms.');
  
    start = performance.now();
    const output = await pipe(audioData, {chunk_length_s: 10});
    console.log(output.text.trim());
    console.log('task took ' + (performance.now() - start) + ' ms.');
  }
}
