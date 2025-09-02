import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';
import { globSync } from 'glob';
import zlib from 'zlib';
import fs from 'fs';

function parseCommandLineArgs() {
    const optionDefinitions = [
        { name: 'decompress', alias: 'd', type: Boolean, description: 'Decompress files (default: compress).' },
        { name: 'keep', alias: 'k', type: Boolean, description: 'Keep input files after processing (default: delete).' },
        { name: 'help', alias: 'h', type: Boolean, description: 'Print this usage guide.' },
        { name: 'globs', type: String, multiple: true, defaultOption: true, description: 'Glob patterns of files to process.' },
    ];
    const options = commandLineArgs(optionDefinitions);

    const isNPM = process.env.npm_config_user_agent !== undefined;
    const command = isNPM ? 'npm run compress --' : 'node compress.mjs';
    const usage = commandLineUsage([
        {
            header: 'Usage',
            content: `${command} [options] <glob>...`
        },
        {
            header: 'Options',
            optionList: optionDefinitions
        }
    ]);

    if (options.help) {
        console.log(usage);
        process.exit(0);
    }

    if (options.globs === undefined) {
        if (options.decompress) {
            const defaultGlob = '**/*.z';
            console.log(`No input glob pattern given, using default: ${defaultGlob}`);
            options.globs = [defaultGlob];
        } else {
            // For compression, require the user to specify explicit input file patterns.
            console.error('No input glob pattern given.');
            console.log(usage);
            process.exit(1);
        }
    }
    return options;
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

function processFiles(options) {
    let files = [];
    console.assert(options.globs.length > 0);
    for (const glob of options.globs) {
        const matches = globSync(glob, { nodir: true });
        files = files.concat(matches);
    }
    files = Array.from(new Set(files)).sort();

    const verb = options.decompress ? 'decompress' : 'compress';
    console.log(`Found ${files.length} files to ${verb}` + (files.length ? ':' : '.'));

    for (const inputFile of files) {
        try {
            console.log(inputFile);

            // Copy the mode over to avoid git status entries after a roundtrip.
            const { mode } = fs.statSync(inputFile);
            const inputData = fs.readFileSync(inputFile);
            const outputData = options.decompress ? decompress(inputData) : compress(inputData);
            let outputFile;
            if (options.decompress) {
                outputFile = inputFile.endsWith('.z') ? inputFile.slice(0, -2) : `${inputFile}.decompressed`;
            } else {
                outputFile = `${inputFile}.z`;
            }
            fs.writeFileSync(outputFile, outputData, { mode });

            if (!options.keep) {
                fs.unlinkSync(inputFile);
                console.log(`  Deleted input file.`);
            }
        } catch (err) {
            console.error(`Error ${verb}ing ${inputFile}:`, err);
        }
    }
}

const options = parseCommandLineArgs();
processFiles(options);

