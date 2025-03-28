import { basename } from "node:path";

import crc from "crc/crc32";
import fsx from "fs-extra";
import colors from "kleur";

import { esbuild } from "./esbuild";

export * from "./init-files";
export * from "./render";
export * from "./esbuild";
export * from "./spinner";

export { default as defaults } from "./defaults";

export const tsImport = async <T>(
  // absolute path
  file: string,
  opts?: {
    defaultExports?: boolean;
    assertKeys?: Array<string>;
    // absolute path
    envfile?: string | undefined;
  },
): Promise<T> => {
  const { assertKeys = [], defaultExports, envfile } = opts || {};
  const outfile = `${file}.${crc(file)}-${new Date().getTime()}.js`;

  await esbuild(
    {
      entryPoints: [file],
      outfile,
      sourcemap: false,
      logLevel: "error",
    },
    { envfile },
  );

  let data: T;

  try {
    const exports = await import(outfile);
    data = defaultExports ? exports.default : exports;
  } finally {
    await fsx.unlink(outfile);
  }

  for (const key of assertKeys) {
    if (
      !key.split(".").reduce((a, k) => a?.[k], data as Record<string, never>)
    ) {
      throw [
        "Incomplete config provided",
        `${key} is missing or nullish in ${basename(file)}`,
      ];
    }
  }

  return data;
};

export const halt = (exitCode = 0, error?: string | Array<string> | Error) => {
  const logs: Array<string> = [];

  if (Array.isArray(error)) {
    logs.push(...error);
  } else if (typeof error === "string") {
    logs.push(error);
  } else if (error instanceof Error) {
    console.error(colors.red(error.message));
    console.log(error.stack?.split("\n").slice(1).join("\n"));
  }

  for (const [i, log] of logs.entries()) {
    if (i === 0 && exitCode > 0) {
      console.error(colors.red(`ERROR: ${log}`));
    } else {
      console.log(log);
    }
  }

  process.exit(exitCode);
};
