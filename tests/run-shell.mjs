#! /usr/bin/env node

import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import { spawnSync } from  "child_process";
import { fileURLToPath } from "url";
import { styleText } from 'node:util';
import * as path from "path";
import * as fs from "fs";
import * as os from 'os';


const optionDefinitions = [
  { name: "shell", type: String, description: "Set the shell to test, choices are [jsc, v8, spidermonkey]." },
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

const JS_SHELL= options?.shell;
if (!JS_SHELL)
  printHelp("No javascript shell specified, use --shell");

const SHELL_NAME = (function() {
  switch (JS_SHELL) {
      case "javascriptcore":
      case "jsc": {
          return "javascriptcore";
    }
      case "spidermonkey": {
          return "spidermonkey";
      }
      case "v8": {
          return "v8";
      }
      default: {
          printHelp(`Invalid shell "${JS_SHELL}", choices are: "jsc", "spidermonkey" and "v8)`);
      }
  }
})();

const FILE_PATH = fileURLToPath(import.meta.url);
const SRC_DIR = path.dirname(path.dirname(FILE_PATH));
const CLI_PATH = path.join(SRC_DIR, "cli.js");

const BASE_CLI_ARGS_WITH_OPTIONS = [CLI_PATH];
if (SHELL_NAME != "spidermonkey")
  BASE_CLI_ARGS_WITH_OPTIONS.push("--");
Object.freeze(BASE_CLI_ARGS_WITH_OPTIONS);

const SPAWN_OPTIONS =  { 
  stdio: ["inherit", "inherit", "inherit"]
};

function log(...args) {
  const text = args.join(" ")
  console.log(styleText("yellow", text))
}

function sh(binary, args) {
  const cmd = `${binary} ${args.join(" ")}`;
  console.log(styleText("cyan", cmd));
  const result = spawnSync(binary, args, SPAWN_OPTIONS);
  if (result.status || result.error) {
    console.error(result.error);
    throw new Error(`Shell CMD failed: ${binary} ${args.join(" ")}`);
  }
}

async function testShell() {
    log(`Installing JavaScript Shell: ${SHELL_NAME}`);
    sh("jsvu", [`--engines=${SHELL_NAME}`]);
    const shellBinary = path.join(os.homedir(), ".jsvu/bin", SHELL_NAME);
    if (!fs.existsSync(shellBinary))
      throw new Error(`Could not find shell binary: ${shellBinary}`);
    log("");
    log(`Installed JavaScript Shell: ${shellBinary}`);
    log("");
    testDefaultRun(shellBinary);
}

function testDefaultRun(shellBinary) {

    log("=".repeat(80))
    log("Run Complete Suite");
    log(".".repeat(80))
    sh(shellBinary, [CLI_PATH])

    log("=".repeat(80))
    log("Run Single Suite");
    log(".".repeat(80))

    const singleTestArgs = [...BASE_CLI_ARGS_WITH_OPTIONS, "proxy-mobx"];
    sh(shellBinary, singleTestArgs);
}

setImmediate(testShell);