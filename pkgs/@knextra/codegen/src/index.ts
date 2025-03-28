import { resolve } from "node:path";

import type { Knex } from "knex";
import fsx from "fs-extra";
import { merge } from "lodash-es";

import {
  defaults,
  tsImport,
  withSpinner,
  initCodegenFile,
  initConnectFile,
  halt,
} from "@knextra/stdlib";

import type { Config, ResolvedConfig } from "./types";
import type { ExtractedSchema } from "./schema-extract/types";
import pgxt from "./schema-extract/postgres";
import generator from "./generator";
import defaultConfig from "./defaults";

const SUPPORTED_CLIENTS = ["pg", "pgnative", "postgres"];

export * from "./types";

export function defineConfig(config: Config): Config {
  return config;
}

type Options = {
  config?: string | undefined;
  "env-file"?: string | undefined;
  help?: boolean | undefined;
};

export default async (options: Options) => {
  const root = process.cwd();

  // relative to root
  const codegenFile =
    typeof options.config === "string" //
      ? options.config
      : defaults.codegenFile;

  const loadCodegenConfig = async () => {
    const config = await tsImport<Config>(resolve(root, codegenFile), {
      defaultExports: true,
      assertKeys: ["baseDir", "libDir"],
    });
    return merge(defaultConfig, config);
  };

  const loadConnectConfig = async (connectFile: string) => {
    let envfile = options["env-file"]
      ? resolve(root, options["env-file"])
      : undefined;

    if (!envfile) {
      const defaultEnvFile = resolve(root, defaults.envFile);
      if (await fsx.exists(defaultEnvFile)) {
        envfile = defaultEnvFile;
      }
    }

    const { config } = await tsImport<{ config: Knex.Config }>(
      resolve(root, connectFile),
      {
        assertKeys: ["config.connection", "config.client"],
        envfile,
      },
    );

    return config;
  };

  const extractSchema = async (): Promise<ExtractedSchema> => {
    if (!SUPPORTED_CLIENTS.includes(knexConfig.client as string)) {
      throw [
        "At the moment only following clients supported:",
        SUPPORTED_CLIENTS.join(", "),
      ];
    }
    return await pgxt(knexConfig, config);
  };

  if (!(await fsx.exists(resolve(root, codegenFile)))) {
    await initCodegenFile(root, codegenFile);
    return halt();
  }

  const config = await withSpinner<ResolvedConfig>(
    `Loading ${codegenFile}`,
    () => loadCodegenConfig(),
  );

  if (!(await fsx.exists(resolve(root, config.connectFile)))) {
    await initConnectFile(root, config.connectFile);
    return halt();
  }

  const knexConfig = await withSpinner<Knex.Config>(
    `Loading ${config.connectFile}`,
    () => loadConnectConfig(config.connectFile),
  );

  const schema = await withSpinner<ExtractedSchema>(
    "Extracting schema", //
    () => extractSchema(),
  );

  await withSpinner(
    "Generating stuff", //
    () => generator({ ...config, root }, schema),
  );

  halt();
};
