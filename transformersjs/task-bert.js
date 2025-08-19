// Copyright 2025 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// End-to-end task 1: Sentiment analysis, so NLP.

globalThis.initPipeline = async function(pipeline) {
  return await pipeline(
    'sentiment-analysis',
    'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
    // Use quantized models for smaller model weights.
    { dtype: 'uint8', device: 'wasm' }
  );
}

globalThis.doTask = async function(pipeline) {
  const inputs = [
    'I love transformers!',
    'Benchmarking is hard.',
  ];
  const outputs = await pipeline(inputs);
  if (outputs.length !== inputs.length) {
    throw new Error('Expected output to be an array matching the inputs, but got:', outputs);
  }
  for (let j = 0; j < inputs.length; ++j) {
    console.log(`${inputs[j]} -> ${outputs[j].label} @ ${outputs[j].score}`);
  }
}
