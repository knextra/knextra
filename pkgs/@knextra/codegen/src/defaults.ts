import { defaults } from "@knextra/stdlib";

import {
  defaultTableNominator,
  defaultEnumNominator,
  defaultViewNominator,
  defaultModelNominator,
} from "./nominators";

import type { Config } from "./types";

const defaultConfig: Required<Omit<Config, "baseDir" | "libDir">> = {
  appPrefix: "@",
  connectFile: defaults.connectFile,
  libSubdir: undefined,
  schemas: [],
  defaultSchema: "public",
  customTypes: {},
  recordSuffix: "T",
  insertSuffix: "I",
  updateSuffix: "U",
  enumSuffix: "E",
  viewSuffix: "V",
  queryBuilderSuffix: "Q",
  tableNominator: defaultTableNominator,
  tableFilter: () => true,
  enumNominator: defaultEnumNominator,
  enumFilter: () => true,
  viewNominator: defaultViewNominator,
  viewFilter: () => true,
  modelNominator: defaultModelNominator,
};

export default defaultConfig;
