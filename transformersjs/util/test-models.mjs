// Copyright 2025 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This is set up as an NPM project, so we can test Transformers.js in the
// environment it is supposed to work in (Node.js or a full browser) and
// download the dist build and model data.
// Note that Transformers.js in Node.js actually uses a binding to a native
// implementation of ONNX runtime on either the CPU or CUDA, i.e., NOT Wasm.
// It also runs multi-threaded by default.
// Performance is thus NOT comparable to the Wasm version in shells / browsers.

import { env, pipeline } from '@huggingface/transformers';
import { readFileSync } from 'fs';

env.cacheDir = 'build/models/'
env.localModelPath = 'build/models/'
// Uncomment the following line, if you want to make sure it runs without
// internet connection.
// env.allowRemoteModels = false;

globalThis.print = function(str) { console.log(str); }

{
  console.log('Sentiment analysis / text classification with BERT model.');
  await import('../task-bert.js');

  let start = performance.now();
  let pipe = await initPipeline(pipeline);
  console.log('initPipeline took ' + (performance.now() - start) + ' ms.');

  for (let i = 0; i < 20; ++i) {
    start = performance.now();
    await doTask(pipe);
    console.log('doTask took ' + (performance.now() - start) + ' ms.');
  }
}

{
  console.log('Automatic speech recognition with Whisper model.');
  await import('../task-whisper.js');

  // TODO: We could also transcribe `ted_60_16k.wav`, but that takes quite long...
  const inputAudioBuffer = readFileSync('build/inputs/jfk.raw').buffer;

  let start = performance.now();
  let pipe = await initPipeline(pipeline);
  console.log('initPipeline took ' + (performance.now() - start) + ' ms.');

  for (let i = 0; i < 5; ++i) {
    start = performance.now();
    await doTask(pipe, inputAudioBuffer);
    console.log('doTask took ' + (performance.now() - start) + ' ms.');
  }
}
