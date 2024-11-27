// Copyright 2023 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Crude polyfills for missing browser APIs in JavaScript shells.

globalThis.console.debug = globalThis.console.warn = globalThis.console.error = globalThis.console.log;

// `TextEncoder` and `TextDecoder`. These are called only a few times with short
// ASCII strings, so this is sufficient and not performance-critical.
class TextEncoder {
  encode(string) {
    return Uint8Array.from(string, (char) => {
      let byte = char.codePointAt(0);
      if (byte > 0x7f)
        throw new Error("TextEncoder polyfill only supports ASCII");
      return byte;
    });
  }
}
class TextDecoder {
  decode(array) {
    for (let byte of array) {
      if (byte > 0x7f)
        throw new Error("TextDecoder polyfill only supports ASCII");
    }
    return String.fromCharCode.apply(null, array);
  }
}

// `crypto.getRandomValues`. This is called only once during setup.
// The implementation is copied from an Emscripten error message proposing this.
globalThis.crypto = {
  getRandomValues: (array) => {
    for (var i = 0; i < array.length; i++) array[i] = (Math.random() * 256) | 0;
  },
};

// Empty `URLSearchParams` has just the same interface as a `Map`.
globalThis.URLSearchParams = Map;

// `self` global object.
globalThis.self = this;
