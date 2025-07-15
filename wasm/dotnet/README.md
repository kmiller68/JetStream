# .NET on WebAssembly

Tests [.NET on WebAssembly](https://github.com/dotnet/runtime). This benchmark tests operations
on .NET implementation of String, JSON serialization, specifics of .NET exceptions and computation
of a 3D scene using Mono Interpreter & AOT. Source code: [.NET](wasm/dotnet)

## Build instructions

Download .NET SDK 9.0.3xx

- [dotnet-sdk-win-x64.zip](https://aka.ms/dotnet/9.0.3xx/daily/dotnet-sdk-win-x64.zip)
- [dotnet-sdk-linux-x64.tar.gz](https://aka.ms/dotnet/9.0.3xx/daily/dotnet-sdk-linux-x64.tar.gz)

Run `build.sh` script. It will install `wasm-tools` workload & build the benchmark code twice (for Mono interpreter & AOT).

To run the benchmark code on `jsc`, we need to remove the unguarded use of `import.meta.url` in `dotnet.js`.
