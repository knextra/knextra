import crc from "crc/crc32";

import { defaultEnumNominator } from "@/nominators";
import type { ResolvedConfig } from "@/types";
import type { EnumDeclaration } from "../types";

export function enumsMapper(config: ResolvedConfig, schema: string) {
  const { enumFilter, enumNominator, enumSuffix } = config;

  return (entry: {
    name: string;
    values: Array<string>;
  }): Array<EnumDeclaration> => {
    const { name } = entry;

    if (!enumFilter(name, { schema })) {
      return [];
    }

    const declaredName = enumNominator(name, {
      schema,
      defaultNominator: defaultEnumNominator,
    });

    const values = entry.values.map((e) => {
      return Number.isFinite(+e) ? Number(e) : JSON.stringify(e);
    });

    return [
      {
        schema,
        name,
        declaredName,
        values,
        enumSuffix,
        enumValues: values.map((e) => {
          return {
            key: typeof e === "number" ? JSON.stringify(`_${e}`) : e,
            val: e,
          };
        }),
        hashedName: [
          declaredName,
          crc(schema + declaredName + JSON.stringify(values)),
        ].join(""),
      },
    ];
  };
}
