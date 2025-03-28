import { resolve, join } from "node:path";
import { format } from "node:util";
import { readdir } from "node:fs/promises";

import knex, { type Knex } from "knex";
import { SchemaInspector } from "knex-schema-inspector";
import { renderToFile } from "@knextra/stdlib";
import { format as datetimeFormat } from "date-fns";
import fsx from "fs-extra";
import prompts from "prompts";
import colors from "kleur";

import createTableTpl from "./templates/createTable.hbs";
import alterTableTpl from "./templates/alterTable.hbs";
import dropTableTpl from "./templates/dropTable.hbs";
import genericTpl from "./templates/generic.hbs";

export default async (
  config: Knex.Config,
  {
    root,
    migrationsDir,
  }: {
    // absolute path
    root: string;
    // relative to root
    migrationsDir: string;
  },
): Promise<void> => {
  const knexInstance = knex(config);
  const inspector = SchemaInspector(knexInstance);

  const subdirs: Array<string> = [];

  await fsx.ensureDir(resolve(root, migrationsDir));

  for (const entry of await readdir(resolve(root, migrationsDir), {
    withFileTypes: true,
  })) {
    if (entry.isDirectory()) {
      subdirs.push(entry.name);
    }
  }

  try {
    const tables = await inspector
      .tables()
      .then((a) => a.map((title) => ({ title })));

    // biome-ignore lint:
    function onState(this: any) {
      if (this.aborted) {
        knexInstance.destroy();
        process.nextTick(() => process.exit(1));
      }
    }

    const input = await prompts([
      {
        name: "template",
        type: "select",
        message: "Migration Template",
        choices: [
          {
            title: "Create Table",
            value: {
              file: "create_table_%s",
              template: createTableTpl,
              action: "create",
            },
          },
          {
            title: "Alter Table",
            value: {
              file: "alter_table_%s",
              template: alterTableTpl,
              action: "alter",
            },
          },
          {
            title: "Drop Table",
            value: {
              file: "drop_table_%s",
              template: dropTableTpl,
              action: "drop",
            },
          },
          {
            title: "Generic Migration",
            value: { file: "%s", template: genericTpl, action: "generic" },
          },
        ] satisfies Array<{
          title: string;
          value: {
            file: string;
            template: string;
            action: "create" | "alter" | "drop" | "generic";
          };
        }>,
        onState,
      },

      {
        name: "table",
        // @ts-expect-error
        clearFirst: true,
        type: (_, { template }) => {
          return template.action === "create" ? "text" : "autocomplete";
        },
        message(_, { template }) {
          return template.action === "generic"
            ? "Table Name (optional)"
            : "Table Name";
        },
        choices(_, { template }) {
          return template.action === "generic"
            ? [{ title: "[ None ]" }, ...tables]
            : tables;
        },
        onState,
      },

      {
        name: "details",
        type: "text",
        message: "Migration Details",
        initial: "",
        onState,
      },

      {
        name: "name",
        type: "text",
        message: "Migration Name",
        initial(_, { template, table, details }) {
          return formatName(template.file, [
            table.replace("[ None ]", ""),
            details,
          ]);
        },
        validate(value) {
          return value?.trim().length ? true : "Please insert Migration Name";
        },
        onState,
      },

      {
        name: "subdir",
        // @ts-expect-error
        clearFirst: true,
        type() {
          return subdirs.length ? "autocomplete" : "text";
        },
        message: "Subdir (optional)",
        choices() {
          return [
            { title: "[ None ]" },
            ...subdirs
              .sort((a, b) => b.localeCompare(a))
              .map((title) => ({ title })),
          ];
        },
        onState,
      },
    ]);

    const name = [
      datetimeFormat(new Date(), "yyyyMMddHHmmss"),
      input.name,
    ].join("_");

    const table = input.table.replace("[ None ]", "");

    // relative to root
    const outfile = join(
      migrationsDir,
      input.subdir?.replace("[ None ]", "") || "",
      `${name}.ts`,
    );

    await renderToFile(resolve(root, outfile), input.template.template, {
      table,
    });

    console.log(`${colors.green("➜")} ${outfile} ✨`);
  } finally {
    knexInstance.destroy();
  }
};

function formatName(name: string, chunks: Array<string>) {
  return format(
    name,
    chunks
      .flatMap((e) => {
        const s = e?.trim?.();
        return s ? [s.replace(/\W/g, "_")] : [];
      })
      .join("_")
      .replace(/^_|_$/, ""),
  );
}
