// Copyright 2025 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// End-to-end task 2: Speech recognition.
// Based on the example https://huggingface.co/Xenova/whisper-tiny.en
// Convert audio inputs first with `convert-audio.mjs`.

globalThis.preloadFiles = function(Module) {
  return {
    "ort-wasm-simd-threaded.wasm": Module.wasmBinary,
    "build/models/Xenova/whisper-tiny.en/onnx/encoder_model_quantized.onnx": Module.modelEncoderWeights,
    "build/models/Xenova/whisper-tiny.en/onnx/decoder_model_merged_quantized.onnx": Module.modelDecoderWeights,
    "build/models/Xenova/whisper-tiny.en/config.json": Module.modelConfig,
    "build/models/Xenova/whisper-tiny.en/tokenizer.json": Module.modelTokenizer,
    "build/models/Xenova/whisper-tiny.en/tokenizer_config.json": Module.modelTokenizerConfig,
    "build/models/Xenova/whisper-tiny.en/preprocessor_config.json": Module.modelPreprocessorConfig,
    "build/models/Xenova/whisper-tiny.en/generation_config.json": Module.modelGenerationConfig,
  };
}

globalThis.initPipeline = async function(pipeline) {
  return await pipeline(
    'automatic-speech-recognition',
    'Xenova/whisper-tiny.en',
    // Use quantized model because of smaller weights.
    { dtype: 'q8' }
  );
}

globalThis.doTask = async function(pipeline, inputFileBuffer) {
  const input = new Float32Array(inputFileBuffer);
  const output = await pipeline(input, { chunk_length_s: 10 });
  print(output.text.trim());
}
