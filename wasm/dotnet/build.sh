#! /bin/sh

# Expects to have .NET SDK 9.0.3xx,
# downloadable from using https://aka.ms/dotnet/9.0.3xx/daily/dotnet-sdk-win-x64.zip or https://aka.ms/dotnet/9.0.3xx/daily/dotnet-sdk-linux-x64.tar.gz

dotnet workload install wasm-tools
dotnet publish -o ./build-interp ./src/dotnet/dotnet.csproj
dotnet publish -o ./build-aot ./src/dotnet/dotnet.csproj -p:RunAOTCompilation=true