import schemaExtractor from "extract-pg-schema";
import type { Knex } from "knex";

import type { ResolvedConfig } from "@/types";

import defaultConfig from "@/defaults";

import { enumsMapper } from "./enums";
import { tablesMapper } from "./tables";
import { viewsMapper } from "./views";

import type {
  EnumDeclaration,
  ExtractedSchema,
  TableDeclaration,
  ViewDeclaration,
} from "../types";

export * from "@/types";

export { defaultConfig as config };

export default async (
  knexConfig: Knex.Config,
  config: ResolvedConfig,
): Promise<ExtractedSchema> => {
  const extractedSchemas = await schemaExtractor.extractSchemas(
    knexConfig.connection as string,
    {
      ...(config.schemas?.length ? { schemas: config.schemas } : {}),
    },
  );

  const flatSchemas = Object.values(extractedSchemas);

  const schemas: Array<string> = Object.keys(extractedSchemas);
  const tables: Array<TableDeclaration> = [];
  const enums: Array<EnumDeclaration> = [];
  const views: Array<ViewDeclaration> = [];

  // iterate all schemas for enums before mapping tables/views
  for (const schema of flatSchemas) {
    enums.push(...schema.enums.flatMap(enumsMapper(config, schema.name)));
  }

  for (const schema of flatSchemas) {
    tables.push(
      ...schema.tables.flatMap(tablesMapper(config, schema.name, enums)),
    );

    views.push(
      ...schema.views.flatMap(viewsMapper(config, schema.name, enums)),
    );

    views.push(
      ...schema.materializedViews.flatMap(
        viewsMapper(config, schema.name, enums),
      ),
    );
  }

  return {
    schemas: schemas.sort((a, b) => a.localeCompare(b)),
    tables: tables.sort((a, b) => a.name.localeCompare(b.name)),
    enums: enums.sort((a, b) => a.name.localeCompare(b.name)),
    views: views.sort((a, b) => a.name.localeCompare(b.name)),
  };
};
