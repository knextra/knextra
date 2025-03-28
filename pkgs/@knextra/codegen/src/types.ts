import type {
  CustomTypes,
  EnumFilter,
  EnumNominator,
  ModelNominator,
  TableFilter,
  TableNominator,
  ViewFilter,
  ViewNominator,
} from "./schema-extract/types";

export type Config = {
  baseDir: string;
  libDir: string;
  // by default lib files will be placed into {libDir}/{baseDir}, eg: lib/db
  // and imported like {appPrefix}/{libDir}/{baseDir}, eg: @/lib/db/...
  // if libSubdir given, lib files will be placed into {libDir}/{libSubdir}, eg: lib/[db]
  // and imported like {appPrefix}/{libSubdir}, omitting {libDir}, eg: @/[db]/...
  // for this to work corresponding paths entry should be added to tsconfig.json
  // eg: "@/[db]/*": [ "./lib/[db]/*" ]
  // or even "@/*": [ "./*", "./lib/*" ]
  libSubdir?: string | undefined;
  appPrefix?: string;
  connectFile?: string;
  schemas?: Array<string>;
  defaultSchema?: string;
  customTypes?: CustomTypes;
  recordSuffix?: string;
  insertSuffix?: string;
  updateSuffix?: string;
  enumSuffix?: string;
  viewSuffix?: string;
  queryBuilderSuffix?: string;
  tableNominator?: TableNominator;
  tableFilter?: TableFilter;
  enumNominator?: EnumNominator;
  enumFilter?: EnumFilter;
  viewNominator?: ViewNominator;
  viewFilter?: ViewFilter;
  modelNominator?: ModelNominator;
};

export type ResolvedConfig = Required<Config>;
