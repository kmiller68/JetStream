// TODO: Hopefullly don't need this.
// const { fetchFile } = FFmpegUtil;
// const { FFmpeg } = FFmpegWASM;
// let ffmpeg = null;

// const transcode = async ({ target: { files } }) => {
// const message = document.getElementById('message');
// if (ffmpeg === null) {
//     ffmpeg = new FFmpeg();
//     ffmpeg.on("log", ({ message }) => {
//     console.log(message);
//     })
//     ffmpeg.on("progress", ({ progress, time }) => {
//     message.innerHTML = `${progress * 100} %, time: ${time / 1000000} s`;
//     });
//     await ffmpeg.load({
//     coreURL: "/assets/core-mt/package/dist/umd/ffmpeg-core.js",
//     });
// }
// const { name } = files[0];
// await ffmpeg.writeFile(name, await fetchFile(files[0]));
// message.innerHTML = 'Start transcoding';
// console.time('exec');
// await ffmpeg.exec(['-i', name,  'output.mp4']);
// console.timeEnd('exec');
// message.innerHTML = 'Complete transcoding';
// const data = await ffmpeg.readFile('output.mp4');

// const video = document.getElementById('output-video');
// video.src = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
// }
// const elm = document.getElementById('uploader');
// elm.addEventListener('change', transcode);

const { FFmpeg } = FFmpegWASM;

// class MyURL extends URL {
//     constructor(a, b) {
//         debugger;
//         super(a, b);
//     }
// }
// globalThis.URL = MyURL;

// class MyWorker extends Worker {
//     constructor() {
//         debugger;
//         super(...arguments);
//     }
// }
// globalThis.Worker = MyWorker;

const verbose = false;
class Benchmark {
    ffmpeg;
    lastRunOutput;

    async runIteration() {
        if (!this.ffmpeg) {
            this.ffmpeg = new FFmpeg();
            this.ffmpeg.on("log", ({ type, message }) => {
                if (verbose)
                    console.log(`${type}:  ${message}`);
            });

            this.ffmpeg.on("progress", ({ progress, time }) => {
                if (verbose)
                    console.log(`${progress * 100} %, time: ${time / 1000000} s`);
            });

            try {
                debugger;
                let blobs = {
                    classWorkerURL,
                    coreURL,
                    wasmURL,
                };
                if (typeof workerURL !== "undefined")
                    blobs.workerURL = workerURL;
                await this.ffmpeg.load(blobs);
            } catch (e) {
                console.log(e);
                console.log(e.stack);
                throw e;
            }
            // TODO: Why does the writeFile fail below if this loaded check isn't here???
            if (!this.ffmpeg.loaded)
                throw new Error(this.ffmpeg);
        }

        debugger;
        let file = await getBinary(inVideoURL);

        // TODO: Should this be in the init file?

        const inFileName = "input.webm";
        const outFileName = "output.mp4";
        console.log("writing file", inFileName);
        let errno = await this.ffmpeg.writeFile(inFileName, file);
        console.log("transcoding");
        // '-crf', '30', // Constant Rate Factor (0-63, lower = better quality, 15-35 recommended)
        let exitStatus;
        try {
            exitStatus = await this.ffmpeg.exec([
                '-i', inFileName,
                '-an', // Disable audio (input has none)
                // // "-fflags", "+genpts",
                // // "-preset", "ultrafast",
                // "-c:v", "libvpx",
                // "-c:a", "libopus",
                "-crf", "28",
                outFileName
            ]);
        } catch (e) {
            console.log(e);
            console.log(e.stack);
            debugger;
            throw e;
        }
        console.log("transcoded: ", exitStatus);

        this.lastRunOutput = await this.ffmpeg.readFile(outFileName);

        if (globalThis.addVideoElement) {
            let outerDocument = window.parent.parent.document;
            let videoElement = outerDocument.createElement('video');
            videoElement.src = URL.createObjectURL(new Blob([this.lastRunOutput], { type: 'video/mp4' }));;
            videoElement.controls = true;
            videoElement.width = 640;
            videoElement.height = 360;

            let statusElement = outerDocument.getElementsByClassName("summary")[0];
            statusElement.appendChild(videoElement);
        }

        await this.ffmpeg.deleteFile(inFileName);
        await this.ffmpeg.deleteFile(outFileName);
    }
};