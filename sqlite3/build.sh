#!/bin/bash

set -e

# Cleanup old files.
rm -rf src/ build/

BUILD_LOG="$(realpath build.log)"

echo "Built on" > "$BUILD_LOG"
date --rfc-3339=seconds >> "$BUILD_LOG"
echo "" >> "$BUILD_LOG"

echo "Toolchain versions" >> "$BUILD_LOG"
emcc --version | head -n1 >> "$BUILD_LOG"
echo -n "wasm-strip " >> "$BUILD_LOG"
wasm-strip --version >> "$BUILD_LOG"
echo "" >> "$BUILD_LOG"

echo "Getting sources from" >> "$BUILD_LOG"
SQLITE_SRC_URL="https://sqlite.org/2024/sqlite-src-3470000.zip"
echo "$SQLITE_SRC_URL" >> "$BUILD_LOG"
SQLITE_SRC_FILE="$(basename $SQLITE_SRC_URL)"
curl -o "$SQLITE_SRC_FILE" $SQLITE_SRC_URL
unzip "$SQLITE_SRC_FILE"
mv sqlite-src*/ src/
echo "" >> "$BUILD_LOG"

echo "Building" >> "$BUILD_LOG"
pushd src
./configure
cd ext/wasm
# FIXME(dlehmann): Paths in logfile could be sensitive.
make dist #|& tee -a "$BUILD_LOG"
popd

mkdir -p build/{common,jswasm}
cp src/ext/wasm/jswasm/speedtest1.{js,wasm} build/jswasm/
# The next ones are just needed for the browser build.
# cp src/ext/wasm/speedtest1.html build/
# cp src/ext/wasm/common/{emscripten.css,SqliteTestUtil.js,testing.css} build/common/

# TODO(dlehmann): Patch sources to lower iteration counts / speed up benchmark.

echo "Done" >> "$BUILD_LOG"
