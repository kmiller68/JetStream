#!/bin/bash

set -e

rm -rf src/ build/

echo "Built on" > build.log
date --rfc-3339=seconds >> build.log
echo "" >> build.log

echo "Toolchain versions" >> build.log
emcc --version | head -n1 >> build.log
echo wasm-strip >> build.log
wasm-strip --version >> build.log
echo "" >> build.log

echo "Getting sources from" >> build.log
SQLITE_SRC_URL="https://sqlite.org/2024/sqlite-src-3470000.zip"
echo "$SQLITE_SRC_URL" >> build.log
SQLITE_SRC_FILE="$(basename $SQLITE_SRC_URL)"
curl -o "$SQLITE_SRC_FILE" $SQLITE_SRC_URL
unzip "$SQLITE_SRC_FILE"
mv sqlite-src*/ src/
echo "" >> build.log

echo "Building" >> build.log
pushd src
./configure
cd ext/wasm
make dist |& tee -a build.log
popd

mkdir -p build/{common,jswasm}
cp src/ext/wasm/jswasm/speedtest1.{js,wasm} build/jswasm/
# The next ones are just needed for the browser build.
cp src/ext/wasm/speedtest1.html build/
cp src/ext/wasm/common/{emscripten.css,SqliteTestUtil.js,testing.css} build/common/
