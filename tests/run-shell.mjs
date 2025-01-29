#! /usr/bin/env node

import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";

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

let shellName;
switch (JS_SHELL) {
    case "javascriptcore":
    case "jsc": {
      shellName = "javascriptcore";
        break;
   }
    case "spidermonkey": {
        shellName = "spidermonkey";
        break;
    }
    case "v8": {
        shellName = "v8";
        break;
    }
    default: {
        printHelp(`Invalid shell "${JS_SHELL}", choices are: "jsc", "spidermonkey" and "v8)`);
    }
}


function testShell() {

}

setImmediate(testShell);