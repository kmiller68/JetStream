#! /usr/bin/env node
/* eslint-disable-next-line  no-unused-vars */
import serve from "./server.mjs";
import { Builder, Capabilities } from "selenium-webdriver";
import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";

const optionDefinitions = [
    { name: "browser", type: String, description: "Set the browser to test, choices are [safari, firefox, chrome]. By default the $BROWSER env variable is used." },
    { name: "port", type: Number, defaultValue: 8010, description: "Set the test-server port, The default value is 8010." },
    { name: "help", alias: "h", description: "Print this help text." },
];

function printHelp(message = "") {
    const usage = commandLineUsage([
        {
            header: "Run all tests",
        },
        {
            header: "Options",
            optionList: optionDefinitions,
        },
    ]);
    if (!message) {
        console.log(usage);
        process.exit(0);
    } else {
        console.error(message);
        console.error();
        console.error(usage);
        process.exit(1);
    }
}

const options = commandLineArgs(optionDefinitions);

if ("help" in options)
    printHelp();

const BROWSER = options?.browser;
if (!BROWSER)
    printHelp("No browser specified, use $BROWSER or --browser");

let capabilities;
switch (BROWSER) {
    case "safari":
        capabilities = Capabilities.safari();
        break;

    case "firefox": {
        capabilities = Capabilities.firefox();
        break;
    }
    case "chrome": {
        capabilities = Capabilities.chrome();
        break;
    }
    case "edge": {
        capabilities = Capabilities.edge();
        break;
    }
    default: {
        printHelp(`Invalid browser "${BROWSER}", choices are: "safari", "firefox", "chrome", "edge"`);
    }
}

process.on("unhandledRejection", (err) => {
    console.error(err);
    process.exit(1);
});
process.once("uncaughtException", (err) => {
    console.error(err);
    process.exit(1);
});

const PORT = options.port;
const server = await serve(PORT);

async function testEnd2End() {
    const driver = await new Builder().withCapabilities(capabilities).build();
    let results;
    try {
        console.log("Preparing JetStream");
        await driver.get(`http://localhost:${PORT}/index.html?worstCaseCount=2&iterationCount=3`);
        await driver.executeAsyncScript((callback) => {
            globalThis.addEventListener("JetStreamReady", () => callback());
            // We might not get a chance to install the on-ready listener, thus
            // we also check if the runner is ready synchronously.
            if (globalThis?.JetStream?.isReady)
                callback()
        });
        results = await benchmarkResults(driver);
        // FIXME: validate results;
    } finally {
        console.log("\nTests complete!");
        driver.quit();
        server.close();
    }
}

async function benchmarkResults(driver) {
    console.log("Starting JetStream");
    await driver.manage().setTimeouts({ script: 60_000 });
    await driver.executeScript(() => {
        globalThis.JetStreamDone = false;
        globalThis.JetStreamResults = [];
        globalThis.addEventListener("JetStreamDone", event => {
            globalThis.JetStreamDone = true;
        });
        globalThis.addEventListener("JetStreamBenchmarkDone", event =>  {
            globalThis.JetStreamResults.push(event.detail);
        });
        JetStream.start();
    });
    await new Promise(resolve => pollIncrementalResults(driver, resolve));
    const resultString = await driver.executeScript(() => {
        return JSON.stringify(JetStream.resultsObject());
    });
    return  JSON.parse(resultString);
}

const UPDATE_INTERVAL = 250;
async function pollIncrementalResults(driver, resolve) {
    const intervalId = setInterval(async function logResult()  {
        const {done, results} = await driver.executeAsyncScript((callback) => {
            callback({
                done: globalThis.JetStreamDone,
                results: JSON.stringify(globalThis.JetStreamResults.splice(0, Infinity))
        });
        });
        JSON.parse(results).forEach(logIncrementalResult);
        if (done) {
            clearInterval(intervalId);
            resolve()
        }
    }, UPDATE_INTERVAL)
}

function logIncrementalResult(benchmarkResult) {
    console.log(benchmarkResult.name, benchmarkResult.results)
}

setImmediate(testEnd2End);
