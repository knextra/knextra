#!/usr/bin/env -S node --enable-source-maps --no-warnings=ExperimentalWarning

import { parseArgs } from "node:util";

import { defaults, halt } from "@knextra/stdlib";

import run from "./";

const usage = [
  "[ Generic Options ]",
  `knextra-codegen -c | --config ...     : Custom config file (default ${defaults.codegenFile})`,
  `knextra-codegen -e | --env-file ...   : Custom env file (default ${defaults.envFile})`,
  "",
  "[ Modus Operandi ]",
  "knextra-codegen                       : Run generators",
  "knextra-codegen -h | --help           : Print this message and exit",
];

const options = {
  config: {
    type: "string",
    short: "c",
  },
  "env-file": {
    type: "string",
    short: "e",
  },
  help: {
    type: "boolean",
    short: "h",
  },
} as const;

try {
  const { values } = parseArgs({ options });
  values.help ? printUsage() : await run(values);
  // biome-ignore lint:
} catch (error: any) {
  halt(1, error);
}

function printUsage() {
  for (const line of usage) {
    console.log(line);
  }
}
