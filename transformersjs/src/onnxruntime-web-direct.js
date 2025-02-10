// Based on https://github.com/microsoft/onnxruntime-inference-examples/tree/main/js/importing_onnxruntime-web#conditional-importing
// and https://github.com/microsoft/onnxruntime-inference-examples/tree/main/js/quick-start_onnxruntime-web-bundler
// and https://onnxruntime.ai/docs/get-started/with-javascript/web.html#import
// and https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html#envwasm

class URL {
  href;
  constructor(url, base) {
    console.log('URL', url, base);
    this.href = url;
  }
}
globalThis.URL = URL;

globalThis.fetch = async function(url) {
  console.log('fetch', url);
  let body = read(url, 'binary');
  console.log('fetch completed', url, body.constructor.name, body.byteLength);
  return {
    ok: true,
    arrayBuffer: function() {
      return body;
    },
  };
};
console.log(typeof WebAssembly.instantiate);


// Option A: fake instantiateStreaming (not available in d8 as to take streaming instantiation path).
globalThis.WebAssembly.instantiateStreaming = async function(m,i) {
  console.log('instantiateStreaming',m,i);
  return WebAssembly.instantiate(m.arrayBuffer(),i);
};

(async () => {
  
  const ort = await import('./ort.wasm.mjs');
  console.log(typeof ort, Object.keys(ort));

  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = {
    mjs: 'ort-wasm-simd-threaded.mjs',
    wasm: 'ort-wasm-simd-threaded.wasm',
  };
  // Option B: directly provide binary, which is threaded through ort.wasm.mjs to the Emscripten-generated .mjs file.
  // ort.env.wasm.wasmBinary = read('ort-wasm-simd-threaded.wasm', 'binary');

  const model = read('model.onnx', 'binary');
  const session = await ort.InferenceSession.create(model);

  // prepare inputs. a tensor need its corresponding TypedArray as data
  const dataA = Float32Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const dataB = Float32Array.from([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]);
  const tensorA = new ort.Tensor('float32', dataA, [3, 4]);
  const tensorB = new ort.Tensor('float32', dataB, [4, 3]);

  // prepare feeds. use model input names as keys.
  const feeds = { a: tensorA, b: tensorB };

  // feed inputs and run
  const results = await session.run(feeds);

  // read from results
  const dataC = results.c.data;
  console.log(`data of result tensor 'c': ${dataC}`);

})();
