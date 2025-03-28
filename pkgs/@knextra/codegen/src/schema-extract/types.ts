export type ImportedType = {
  import: string;
  from: string;
  isArray?: boolean;
  isNullable?: boolean;
};

export type CustomType = string | ImportedType;

export type CustomTypes = Record<
  string,
  CustomType | Record<string, CustomType>
>;

export type NominatorContext = {
  schema: string;
  defaultNominator: (name: string) => string;
};

export type FilterContext = {
  schema: string;
};

export type TableNominator = (
  name: string,
  context: NominatorContext,
) => string;

export type TableFilter = (name: string, context: FilterContext) => boolean;

export type EnumNominator = (name: string, context: NominatorContext) => string;
export type EnumFilter = (name: string, context: FilterContext) => boolean;

export type ViewNominator = (name: string, context: NominatorContext) => string;
export type ViewFilter = (name: string, context: FilterContext) => boolean;

export type ModelNominator = (
  name: string,
  context: NominatorContext,
) => string;

export type EnumDeclaration = {
  schema: string;
  name: string;
  hashedName: string;
  declaredName: string;
  values: Array<string | number>;
  enumSuffix: string;
  enumValues: Array<{ key: string; val: string | number }>;
};

export type ColumnDeclaration = {
  type: string;
  kind: "base" | "range" | "domain" | "composite" | "enum";
  name: string;
  isPrimaryKey?: boolean | undefined;
  isIdentity: boolean;
  isNullable: boolean;
  isArray: boolean;
  isGenerated: boolean;
  isRegular: boolean;
  defaultValue: unknown;
  declaredType: string;
  importedType?: (ImportedType & { alias: string }) | undefined;
  comments: Array<string>;
  enumDeclaration?: EnumDeclaration | undefined;
  isOptionalOnInsert: boolean;
  isOptionalOnUpdate: boolean;
};

export type TableDeclaration = {
  schema: string;
  name: string;
  fullName: string;
  modelName: string;
  moduleName: string;
  primaryKey?: string | undefined;
  declaredName: string;
  recordName: string;
  insertName: string;
  updateName: string;
  queryBuilder: string;
  columns: Array<ColumnDeclaration>;
  regularColumns: Array<ColumnDeclaration>;
};

export type ViewDeclaration = {
  schema: string;
  name: string;
  fullName: string;
  modelName: string;
  moduleName: string;
  primaryKey?: string | undefined;
  declaredName: string;
  recordName: string;
  queryBuilder: string;
  columns: Array<ColumnDeclaration>;
};

export type ExtractedSchema = {
  schemas: Array<string>;
  tables: Array<TableDeclaration>;
  enums: Array<EnumDeclaration>;
  views: Array<ViewDeclaration>;
};
