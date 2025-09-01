import { globSync } from 'glob';
import zlib from 'zlib';
import fs from 'fs';

const isNPM = process.env.npm_config_user_agent !== undefined;
const command = isNPM ? 'npm run compress --' : 'node compress.mjs';

const usage = `Usage: ${command} [options] <glob>...

Options:
  -d, --decompress   Decompress files (default: compress).
  -k, --keep         Keep input files after processing (default: delete).`;

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log(usage);
    process.exit(1);
}

const keepInputFiles = args.some(arg => arg === '-k' || arg === '--keep');
const decompressMode = args.some(arg => arg === '-d' || arg === '--decompress');

let globs = args.filter(arg => !arg.startsWith('-'));
if (globs.length === 0) {
    if (decompressMode) {
        const defaultGlob = '**/*.z';
        console.log(`No input glob pattern given, using default: ${defaultGlob}`);
        globs = [defaultGlob];
    } else {
        // To prevent accidental compression, require explicit input file patterns.
        console.log(usage);
        process.exit(1);
    }
}

let files = new Set();
if (globs.length > 0) {
    for (const glob of globs) {
        try {
            const matches = globSync(glob, { nodir: true });
            for (const match of matches) {
                files.add(match);
            }
        } catch (err) {
            console.error(`Error processing glob: ${glob}`, err);
        }
    }
}
files = Array.from(files).sort();
if (files.length === 0) {
    console.log(`No files found to process with the given globs: ${globs.join(', ')}`);
    process.exit(0);
}

function compress(inputData) {
    const compressedData = zlib.deflateSync(inputData, { level: zlib.constants.Z_BEST_COMPRESSION });

    const originalSize = inputData.length;
    const compressedSize = compressedData.length;
    const compressionRatio = (1 - compressedSize / originalSize) * 100;
    console.log(`  Original size:   ${String(originalSize).padStart(8)} bytes`);
    console.log(`  Compressed size: ${String(compressedSize).padStart(8)} bytes`);
    console.log(`  Compression ratio:  ${compressionRatio.toFixed(2).padStart(8)}%`);

    return compressedData;
}

function decompress(inputData) {
    const decompressedData = zlib.inflateSync(inputData);

    const compressedSize = inputData.length;
    const decompressedSize = decompressedData.length;
    const expansionRatio = (decompressedSize / compressedSize - 1) * 100;
    console.log(`  Compressed size:   ${String(compressedSize).padStart(8)} bytes`);
    console.log(`  Decompressed size: ${String(decompressedSize).padStart(8)} bytes`);
    console.log(`  Expansion ratio:      ${expansionRatio.toFixed(2).padStart(8)}%`);

    return decompressedData;
}

const verb = decompressMode ? 'decompress' : 'compress';
console.log(`Found ${files.length} files to ${verb}...`);

for (const inputFile of files) {
    try {
        console.log(inputFile);

        // Copy the mode over to avoid git status entries after a roundtrip.
        const { mode } = fs.statSync(inputFile);
        const inputData = fs.readFileSync(inputFile);
        const outputData = decompressMode ? decompress(inputData) : compress(inputData);
        let outputFile;
        if (decompressMode) {
            outputFile = inputFile.endsWith('.z') ? inputFile.slice(0, -2) : `${inputFile}.decompressed`;
        } else {
            outputFile = `${inputFile}.z`;
        }
        fs.writeFileSync(outputFile, outputData, { mode });

        if (!keepInputFiles) {
            fs.unlinkSync(inputFile);
            console.log(`  Deleted input file.`);
        }
    } catch (err) {
        console.error(`Error ${verb}ing ${inputFile}:`, err);
    }
}
