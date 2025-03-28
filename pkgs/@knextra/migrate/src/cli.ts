#!/usr/bin/env -S node --enable-source-maps --no-warnings=ExperimentalWarning

import { resolve } from "node:path";
import { parseArgs } from "node:util";

import fsx from "fs-extra";
import colors from "kleur";
import initKnex, { type Knex } from "knex";
import codegen from "@knextra/codegen";
import { defaults, tsImport, halt, initConnectFile } from "@knextra/stdlib";

import generateKnexfile from "./migrations/knexfile";
import generateMigration from "./migrations/generate";
import selectMigrations from "./migrations/select";
import migrateFactory from "./migrations/run";

const usage = [
  colors.magenta("\n\tBasically a wrapper around Knex migrate API"),
  "",
  colors.blue("[ Generic Options ]"),
  `db-migrate -c | --connect ...    : Custom connect file (default ${defaults.connectFile})`,
  `db-migrate -e | --env-file ...   : Custom env file (default ${defaults.envFile})`,
  "",
  colors.blue("[ Modus Operandi ]"),
  "db-migrate generate              : Generate a new migration file, interactively",
  "db-migrate up [name]             : Run the next (or the specified migration)",
  "                                   that has not yet been run",
  "db-migrate up -s | --select      : Run selected migrations up",
  "                                   that was already run",
  "db-migrate down [name]           : Undo the last (or the specified migration)",
  "                                   that was already run",
  "db-migrate down -s | --select    : Run selected migrations down",
  "db-migrate latest                : Run all migrations that have not yet been run",
  "db-migrate rollback [-a | --all] : Rollback the last batch of migrations performed",
  "                                   or --all completed",
  "db-migrate list                  : List all migrations files with status",
  "db-migrate unlock                : Forcibly unlocks the migrations lock table",
  "db-migrate version               : View the current version for the migration",
  "db-migrate build [-d | --dir]    : Build a production-ready knexfile.js",
  "                                   save it to ./ (or to --dir if provided)",
  "db-migrate -h | --help           : Print this message and exit",
  "",
  colors.blue("[ Hooks ]"),
  "db-migrate -g | --codegen ...    : If -g option used with one of up/down/latest/rollback action,",
  "                                   codegen will run after action successfully complete.",
  `                                   (make sure you have ${defaults.codegenFile} file)`,
  "",
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
  select: {
    type: "boolean",
    short: "s",
  },
  dir: {
    type: "string",
    short: "d",
  },
  all: {
    type: "boolean",
    short: "a",
  },
  help: {
    type: "boolean",
    short: "h",
  },
  codegen: {
    type: "boolean",
    short: "g",
  },
} as const;

try {
  const { values, positionals } = parseArgs({
    options,
    allowPositionals: true,
  });

  values.help || !positionals.length
    ? printUsage()
    : await run(values, positionals);

  // biome-ignore lint:
} catch (error: any) {
  halt(1, error);
}

async function run(
  parsedOptions: {
    config?: string;
    "env-file"?: string;
    dir?: string;
    select?: boolean;
    all?: boolean;
    help?: boolean;
    codegen?: boolean;
  },
  positionals: Array<string>,
) {
  const root = process.cwd();

  // relative to root
  const connectFile =
    typeof parsedOptions.config === "string"
      ? parsedOptions.config
      : defaults.connectFile;

  let envfile = parsedOptions["env-file"]
    ? resolve(root, parsedOptions["env-file"])
    : undefined;

  if (!envfile) {
    const defaultEnvFile = resolve(root, defaults.envFile);
    if (await fsx.exists(defaultEnvFile)) {
      envfile = defaultEnvFile;
    }
  }

  if (!(await fsx.exists(resolve(root, connectFile)))) {
    await initConnectFile(root, connectFile);
    return halt();
  }

  const { config } = await tsImport<{ config: Knex.Config }>(
    resolve(root, connectFile),
    {
      assertKeys: ["config.connection", "config.client"],
      envfile,
    },
  );

  const { directory: migrationsDir = defaults.migrationsDir } = {
    ...config.migrations,
  } as Omit<Knex.MigratorConfig, "directory"> & {
    directory: string;
  };

  // for some reason, migrations.directory can be an array.
  if (Array.isArray(migrationsDir)) {
    return halt(1, [
      "migrations.directory expected to be a string, array provided instead",
    ]);
  }

  const migrateTask = positionals[0] as
    | keyof Omit<ReturnType<typeof migrateFactory>, "batchRun">
    | "generate"
    | "build";

  if (migrateTask === "generate") {
    await generateMigration(config, { root, migrationsDir });
    return;
  }

  if (migrateTask === "build") {
    const knexfile = await generateKnexfile({
      root,
      connectFile,
      migrationsDir,
      outDir: parsedOptions.dir,
    });
    console.log(
      `\n\t◈ ${colors.magenta(knexfile.replace(root, "."))} ready to use in production ✨`,
    );
    return;
  }

  let knex: Knex | undefined;

  const knexfile = await generateKnexfile({
    root,
    connectFile,
    migrationsDir,
    transient: true,
    envfile,
  });

  try {
    const knexConfig = await import([knexfile, new Date().getTime()].join("?"));
    knex = initKnex(knexConfig);
  } finally {
    await fsx.unlink(knexfile);
  }

  const { batchRun, ...migrateTasks } = migrateFactory(knex, {
    migrationName: positionals[1],
    rollbackAll: parsedOptions.all,
  });

  if (!migrateTasks[migrateTask]) {
    throw [
      `Unknown migrate task: ${migrateTask}`,
      `Use one of: ${Object.keys(migrateTasks).join(" | ")}`,
    ];
  }

  let somethingRan = false;

  try {
    if (parsedOptions.select) {
      const [completed, pending]: [
        c: Array<{ name: string }>,
        p: Array<string>,
      ] = await knex.migrate.list();

      if (migrateTask === "up") {
        if (pending.length) {
          somethingRan = await batchRun(await selectMigrations(pending), "up");
        } else {
          console.log(colors.magenta("\n\t◈ No pending migrations ✨"));
        }
      } else if (migrateTask === "down") {
        if (completed.length) {
          somethingRan = await batchRun(
            await selectMigrations(completed.map((e) => e.name).reverse()),
            "down",
          );
        } else {
          console.log(colors.magenta("\n\t◈ No completed migrations yet"));
        }
      } else {
        throw new Error("--select only works with up/down tasks");
      }
    } else {
      somethingRan = await migrateTasks[migrateTask]();
    }
  } finally {
    knex.destroy();
  }

  if (parsedOptions.codegen && somethingRan) {
    await codegen({ "env-file": parsedOptions["env-file"] });
  }
}

function printUsage() {
  for (const line of usage) {
    console.log(line);
  }
}
