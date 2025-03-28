import {
  cursorSavePosition,
  cursorRestorePosition,
  eraseEndLine,
} from "ansi-escapes";

import colors from "kleur";
import type { Knex } from "knex";

export default (
  knex: Knex,
  opts?:
    | { migrationName?: string | undefined; rollbackAll?: boolean | undefined }
    | undefined,
) => {
  const upToDateMsg = colors.bold().green("\n\t◈ Already up to date ✨");
  const atTheBaseMsg = colors.green("\n\t◈ Already at the base migration ✨");

  async function batchRun(migrations: Array<string>, runner: "up" | "down") {
    process.stdout.write("\n");
    for (const name of migrations) {
      process.stdout.write(`  ${colors.cyan("➜")} ${name} ... `);
      process.stdout.write(cursorSavePosition);

      const stdoutWrite = process.stdout.write;
      const stderrWrite = process.stderr.write;

      const output: Array<string | Uint8Array> = [];

      process.stdout.write = process.stderr.write = (str) => {
        output.push(str);
        return true;
      };

      let status: [number, Array<string>] | undefined;
      let error: Error | undefined;

      try {
        status = await knex.migrate[runner]({ name });
        // biome-ignore lint:
      } catch (e: any) {
        error = e;
      } finally {
        process.stdout.write = stdoutWrite;
        process.stderr.write = stderrWrite;
      }

      process.stdout.write(cursorRestorePosition + eraseEndLine);

      if (error) {
        console.log(colors.red("✘ Failed"));
        console.error(error);
        return false;
      }

      if (status) {
        console.log(`${colors.green("Done")} ✨ [ batch #${status[0]} ]`);
        for (const line of output) {
          process.stdout.write(line);
        }
      }

      process.stdout.write("\n");
    }

    return true;
  }

  const up = async () => {
    const [batchNo, log] = await knex.migrate.up({
      ...(opts?.migrationName ? { name: opts.migrationName } : {}),
    });

    if (log.length) {
      console.log(`Batch ${batchNo} ran ${log.length} migrations`, log);
      return true;
    }

    console.log(upToDateMsg);
    return false;
  };

  const down = async () => {
    const [batchNo, log] = await knex.migrate.down({
      ...(opts?.migrationName ? { name: opts?.migrationName } : {}),
    });

    if (log.length) {
      console.log(`Batch ${batchNo} rolled back ${log.length} migrations`, log);
      return true;
    }

    console.log(atTheBaseMsg);
    return false;
  };

  const latest = async () => {
    const [batchNo, log] = await knex.migrate.latest();

    if (log.length) {
      console.log(`Batch ${batchNo} run: ${log.length} migrations`, log);
      return true;
    }

    console.log(upToDateMsg);
    return false;
  };

  const rollback = async () => {
    const [batchNo, log] = await knex.migrate.rollback(
      undefined,
      opts?.rollbackAll,
    );

    if (log.length) {
      console.log(`Batch ${batchNo} rolled back ${log.length} migrations`, log);
      return true;
    }

    console.log(atTheBaseMsg);
    return false;
  };

  const list = async () => {
    // biome-ignore format:
    const [completed, pending]: [
      c: Array<{ name: string }>,
      p: Array<string>
    ] = await knex.migrate.list();

    console.log(
      colors.bold().green(`\n[ Completed migrations: ${completed.length} ]`),
    );

    for (const { name } of completed) {
      console.log(`  ➜ ${name}`);
    }

    console.log(colors.magenta(`\n[ Pending migrations: ${pending.length} ]`));

    for (const name of pending) {
      console.log(`  ➜ ${name}`);
    }

    return false;
  };

  const unlock = async () => {
    await knex.migrate.forceFreeMigrationsLock();
    console.log(
      `\n\t${colors.green("◈")} Succesfully unlocked the migrations lock table ✨`,
    );
    return false;
  };

  const version = async () => {
    const version = await knex.migrate.currentVersion();
    console.log(`\n\t◈ Current Version: ${colors.cyan(version)}`);
    return false;
  };

  return { up, down, latest, rollback, list, unlock, version, batchRun };
};
