import ora, { type Options } from "ora";

import { halt } from ".";

export const withSpinner = async <T>(
  textOrOpts: string | Options,
  fn: () => Promise<T>,
) => {
  const opts =
    typeof textOrOpts === "string"
      ? { text: `${textOrOpts}  ` }
      : { ...textOrOpts, text: `${textOrOpts.text}  ` };

  const spinner = ora({ spinner: "dots2", ...opts }).start();

  let data: T;

  try {
    data = await fn();
    spinner.succeed();
    // biome-ignore lint:
  } catch (error: any) {
    spinner.fail();
    return halt(1, error);
  }

  return data;
};
