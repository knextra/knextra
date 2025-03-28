import { resolve } from "node:path";

import fsx from "fs-extra";
import prompts from "prompts";
import colors from "kleur";

import connectFileTpl from "./templates/knextra.connect.ts.hbs";
import codegenFileTpl from "./templates/knextra.codegen.ts.hbs";

export const initConnectFile = async (root: string, file: string) => {
  return withConfirm(
    file, //
    () => fsx.outputFile(resolve(root, file), connectFileTpl),
  );
};

export const initCodegenFile = async (root: string, file: string) => {
  return withConfirm(
    file, //
    () => fsx.outputFile(resolve(root, file), codegenFileTpl),
  );
};

const withConfirm = async (file: string, fn: () => Promise<void>) => {
  console.log(colors.blue(`! ${file} file does not exists`));
  const input = await prompts({
    type: "toggle",
    name: "value",
    message: "Should it be created with default values?",
    initial: true,
    active: "yes",
    inactive: "no",
  });
  if (input.value) {
    await fn();
    console.log(colors.green(`\n  ◈ Created ${file} file`));
    console.log("  ➜ Consider editing it and rerun last action");
  }
  return input.value;
};
