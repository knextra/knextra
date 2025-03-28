import { resolve, join } from "node:path";
import { format } from "node:util";

import fsx from "fs-extra";
import glob from "fast-glob";
import crc from "crc/crc32";
import { esbuild, renderToFile } from "@knextra/stdlib";

import template from "./templates/knexfile.hbs";

type MigrationsSourceFile = {
  importPath: string;
  name: string;
  const: string;
};

type MigrationsSourceRenderContext = {
  importPathmap: {
    connectFile: string;
  };
  files: Array<MigrationsSourceFile>;
};

const KNEXFILE_FORMAT = "knexfile%s.js";

export default async ({
  root,
  connectFile,
  migrationsDir,
  outDir = ".",
  transient,
  envfile,
}: {
  // absolute path
  root: string;
  // relative to root
  connectFile: string;
  // relative to root
  migrationsDir: string;
  // relative to root
  outDir?: string | undefined;
  transient?: boolean | undefined;
  envfile?: string | undefined;
}): Promise<string> => {
  const matches = await glob("**/*.ts", {
    cwd: resolve(root, migrationsDir),
    onlyFiles: true,
    absolute: false,
  });

  const files: Array<MigrationsSourceFile> = [];

  for (const path of matches) {
    const name = path.replace(/\.([^.]+)$/, "");
    files.push({
      importPath: resolve(root, migrationsDir, name),
      name,
      const: ["$", name.replace(/\W/g, "_"), crc(path)].join("_"),
    });
  }

  const knexfile = resolve(root, `knexfile.${new Date().getTime()}.ts`);

  await renderToFile<MigrationsSourceRenderContext>(knexfile, template, {
    files: files.sort((a, b) => a.name.localeCompare(b.name)),
    importPathmap: {
      connectFile: resolve(root, connectFile.replace(/\.([^.]+)$/, "")),
    },
  });

  const outfile = resolve(
    root,
    join(
      outDir,
      format(KNEXFILE_FORMAT, transient ? `.${new Date().getTime()}` : ""),
    ),
  );

  try {
    await esbuild(
      {
        entryPoints: [knexfile],
        outfile,
        logLevel: "error",
      },
      { envfile },
    );
  } finally {
    await fsx.unlink(knexfile);
  }

  return outfile;
};
