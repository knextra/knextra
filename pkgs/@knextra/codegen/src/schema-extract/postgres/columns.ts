import crc from "crc/crc32";

import type {
  MaterializedViewColumn,
  TableColumn,
  ViewColumn,
} from "extract-pg-schema";

import type { ResolvedConfig } from "@/types";
import { defaultTypeMap } from "./default-type-maps";
import type {
  ColumnDeclaration,
  CustomType,
  EnumDeclaration,
  ImportedType,
} from "../types";

export function columnsIterator(
  config: ResolvedConfig,
  schema: string,
  name: string,
  columns:
    | Array<TableColumn>
    | Array<ViewColumn>
    | Array<MaterializedViewColumn>,
  enums: Array<EnumDeclaration>,
): Array<ColumnDeclaration> {
  const columnDeclarations: Array<ColumnDeclaration> = [];

  columnDeclarations.push(
    ...columns.flatMap(columnsMapper(config, schema, name, enums)),
  );

  return columnDeclarations;
}

function columnsMapper(
  config: ResolvedConfig,
  schema: string,
  name: string,
  enums: Array<EnumDeclaration>,
) {
  const { customTypes } = config;
  const fullName = [schema, name].join(".");

  const tableCustomTypes: Record<string, CustomType> =
    typeof customTypes[fullName] === "object"
      ? { ...(customTypes[fullName] as object) }
      : {};

  return (
    entry: TableColumn | ViewColumn | MaterializedViewColumn,
  ): Array<ColumnDeclaration> => {
    const {
      name,
      isPrimaryKey,
      isIdentity,
      defaultValue,
      generated,
      maxLength,
      comment,
      ...column
    } = entry;

    const { fullName: type, kind } = column.type;

    let { isArray, isNullable = false } = column;
    let isGenerated = false;

    let declaredType = "unknown";
    let importedType: ColumnDeclaration["importedType"] | undefined;
    let enumDeclaration: EnumDeclaration | undefined;

    const comments: Array<string> = [];

    // order does matter!
    // - check enums
    // - check default mappings
    // - check customTypes
    // - check tableCustomTypes

    if (kind === "enum") {
      // enum name should be extracted from fullName
      const [schema, name] = type.split(".");

      enumDeclaration = enums.find(
        (e) => e.name === name && e.schema === schema,
      );

      if (enumDeclaration) {
        declaredType = enumDeclaration.hashedName;
      }
    }

    if (defaultTypeMap[type]) {
      declaredType = defaultTypeMap[type];
    }

    for (const customDef of [
      customTypes[type],
      tableCustomTypes[name],
    ] satisfies (CustomType | Record<string, CustomType>)[]) {
      if (!customDef) {
        continue;
      }

      if (typeof customDef === "string") {
        declaredType = customDef as string;
      } else if ((customDef as ImportedType).import) {
        const importDef = customDef as ImportedType;
        importedType = {
          ...importDef,
          alias: [
            importDef.import,
            // using both table name and column name to avoid name collisions
            // ( at the price of importing same type multiple times )
            crc([fullName, name, importDef.from].join(":")),
          ].join(""),
        };
        declaredType = importedType.alias;
        if (importedType.isArray) {
          isArray = true;
        }
        if (importedType.isNullable) {
          isNullable = true;
        }
      }
    }

    if (isArray) {
      declaredType = `Array<${declaredType}>`;
    }

    if (isPrimaryKey) {
      comments.push("PrimaryKey");
    }

    if (defaultValue) {
      comments.push(`Default Value: ${defaultValue}`);
    }

    if (declaredType === "unknown") {
      comments.push(`Unknown Type: ${type}`);
    }

    if (generated !== "NEVER") {
      isGenerated = true;
      comments.push(`Generated: ${generated}`);
      comments.push(`${name}: ${declaredType};`);
    }

    if (comment) {
      comments.push(comment);
    }

    return [
      {
        type,
        kind,
        name,
        isPrimaryKey,
        isIdentity,
        isNullable,
        isArray,
        isGenerated,
        isRegular: isPrimaryKey || isGenerated ? false : true,
        defaultValue,
        declaredType,
        importedType,
        comments,
        enumDeclaration,
        isOptionalOnInsert: isNullable || defaultValue ? true : false,
        isOptionalOnUpdate: true,
      },
    ];
  };
}
