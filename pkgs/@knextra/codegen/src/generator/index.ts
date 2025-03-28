import { join } from "node:path";

import fsx from "fs-extra";
import { renderToFile } from "@knextra/stdlib";

import type { ResolvedConfig } from "@/types";

import type {
  TableDeclaration,
  ViewDeclaration,
  EnumDeclaration,
  ExtractedSchema,
} from "@/schema-extract/types";

import tableTpl from "./templates/table.hbs";
import tableIndexTpl from "./templates/table/index.hbs";
import tableTypesTpl from "./templates/table/types.hbs";
import tablesTpl from "./templates/tables.hbs";
import enumsTpl from "./templates/enums.hbs";
import typesTpl from "./templates/types.hbs";
import knexDtsTpl from "./templates/knex.d.hbs";
import connectTpl from "./templates/connect.hbs";

const generator = async (
  config: {
    root: string;
  } & Pick<
    ResolvedConfig,
    | "baseDir"
    | "libDir"
    | "libSubdir"
    | "appPrefix"
    | "connectFile"
    | "defaultSchema"
  >,
  schema: ExtractedSchema,
) => {
  const {
    root, //
    baseDir,
    libDir,
    connectFile,
    appPrefix,
    defaultSchema,
  } = config;

  const libSubdir = config.libSubdir || baseDir;

  for (const table of [
    ...schema.tables.map((e) => ({ ...e, isTable: true })),
    ...schema.views,
  ]) {
    const context = {
      table,
      enums: table.columns
        .flatMap((e) => (e.enumDeclaration ? [e.enumDeclaration] : []))
        .reduce((a: Array<EnumDeclaration>, e) => {
          if (!a.some(({ name }) => name === e.name)) {
            a.push(e as EnumDeclaration);
          }
          return a;
        }, []),
      importPathmap: {
        libDir: (config.libSubdir
          ? [appPrefix, libSubdir]
          : [appPrefix, libDir, libSubdir]
        ).join("/"),
      },
    };

    for (const [template, outfile] of [
      [tableIndexTpl, "index.ts"],
      [tableTypesTpl, "types.ts"],
    ]) {
      await renderToFile(
        join(root, libDir, libSubdir, table.schema, table.name, outfile),
        template,
        context,
      );
    }

    await renderToFile(
      join(baseDir, table.schema, `${table.name}.ts`),
      tableTpl,
      context,
      { overwrite: false },
    );
  }

  for (const schemaName of schema.schemas) {
    const entryMapper = (
      e: EnumDeclaration | TableDeclaration | ViewDeclaration,
    ) => {
      return e.schema === schemaName ? [e] : [];
    };

    const enums = schema.enums.flatMap(entryMapper);
    const tables = schema.tables.flatMap(entryMapper);
    const views = schema.views.flatMap(entryMapper);

    for (const [template, outfile] of [
      [tablesTpl, "tables.ts"],
      [enumsTpl, "enums.ts"],
      [typesTpl, "types.ts"],
      [knexDtsTpl, "knex.d.ts"],
    ]) {
      await renderToFile(
        join(root, libDir, libSubdir, schemaName, outfile),
        template,
        {
          enums,
          tables,
          views,
          importPathmap: {
            base: [appPrefix, baseDir].join("/"),
          },
        },
      );
    }

    await fsx.outputJson(
      join(root, libDir, libSubdir, schemaName, "schema.json"),
      { schema: schemaName, enums, tables, views },
      { spaces: 2 },
    );
  }

  for (const [template, outfile] of [
    [`export * from "./{{defaultSchema}}/tables";`, "tables.ts"],
    [`export * from "./{{defaultSchema}}/types";`, "types.ts"],
    [connectTpl, "connect.ts"],
  ]) {
    await renderToFile(join(root, libDir, libSubdir, outfile), template, {
      defaultSchema,
      importPathmap: {
        connectFile: [
          appPrefix, //
          connectFile.replace(/\.ts$/, ""),
        ].join("/"),
      },
    });
  }
};

export default generator;
