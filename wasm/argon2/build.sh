#!/usr/bin/env bash


#!/bin/bash

set -euo pipefail

rm -rf build/

touch build.log
BUILD_LOG="$(realpath build.log)"
echo "Built on $(date -u '+%Y-%m-%dT%H:%M:%SZ')" | tee "$BUILD_LOG"

echo "Toolchain versions" | tee -a "$BUILD_LOG"
emcc --version | head -n1 | tee -a "$BUILD_LOG"

# FIXME: Redownload the source if argon2 ever has source updates. At the time of writing it was last changed 5 years ago so this is probably not a high priority.
SOURCES=(
    argon2/src/blake2/blake2b.c

    argon2/src/argon2.c
    argon2/src/core.c
    argon2/src/encoding.c
    argon2/src/thread.c

    argon2/src/opt.c
)

SIMD_FLAGS=(
    -msimd128
    -msse2
)

echo "Building..." | tee -a "$BUILD_LOG"
mkdir build/
emcc -o build/argon2.js \
    -s WASM=1 -O2 \
    ${SIMD_FLAGS[@]} \
    -g1 --emit-symbol-map \
    -DARGON2_NO_THREADS \
    -s MODULARIZE=1 -s EXPORT_NAME=setupModule -s EXPORTED_RUNTIME_METHODS=stringToNewUTF8,UTF8ToString -s EXPORTED_FUNCTIONS=_argon2_hash,_argon2_verify,_argon2_encodedlen,_argon2_error_message,_malloc,_free,_strlen \
    -Iargon2/include \
    ${SOURCES[@]} | tee -a "$BUILD_LOG"

echo "Building done" | tee -a "$BUILD_LOG"
ls -lth build/

# set -e
# set -o pipefail

# # Log emcc version
# EMCC_SDK_PATH="/path/to/emsdk"
# EMCC_PATH="$EMCC_SDK_PATH/upstream/emscripten/emcc"
# $EMCC_PATH --version > emcc_version.txt

# # Build start
# rm -rf dist
# mkdir dist

# ./clean-cmake.sh
# EMCC_SDK_PATH=$EMCC_SDK_PATH ARGON_JS_BUILD_BUILD_WITH_SIMD=1 ./build-wasm.sh
# mv dist/argon2.wasm ../argon2-simd.wasm

# ./clean-cmake.sh
# EMCC_SDK_PATH=$EMCC_SDK_PATH ARGON_JS_BUILD_BUILD_WITH_SIMD=0 ./build-wasm.sh
# mv dist/argon2.wasm ../argon2.wasm

# ./clean-cmake.sh
# rm -rf dist
# # Build end

# echo Done
