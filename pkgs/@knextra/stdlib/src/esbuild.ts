import { type BuildOptions, build } from "esbuild";
import fsx from "fs-extra";
import dotenv from "dotenv";

export const esbuild = async (
  buildOptions: BuildOptions,
  extraOptions?: { envfile?: string | undefined },
) => {
  const define: Record<string, string> = {};

  if (extraOptions?.envfile) {
    const env = dotenv.parse(await fsx.readFile(extraOptions?.envfile));
    for (const [key, val] of Object.entries(env)) {
      define[`process.env.${key}`] = JSON.stringify(val);
    }
  }

  return build({
    bundle: true,
    platform: "node",
    target: "node22",
    format: "esm",
    packages: "external",
    sourcemap: "inline",
    logLevel: "info",
    ...buildOptions,
    define: { ...buildOptions.define, ...define },
  });
};
