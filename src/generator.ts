import {
    DMMF,
    generatorHandler,
    GeneratorManifest,
    GeneratorOptions,
} from "@prisma/generator-helper";
import { indentString } from "./util";
import { promises } from "fs";
import { join } from "path";

const quote = (str: string | undefined) => str === undefined ? '' : `'${str}'`;

function createTypeImports(modelNames: string[]) {
    return `
import type { ${modelNames.join(", ")} } from '@prisma/client'; 
  `.trim();
}

function createPrismaModuleDefinition(contents: string[]) {
    return `
declare module '@prisma/client' {
    namespace Prisma {
${contents.map((content) => indentString(content, 8)).join("\n\n")}
    }
}
  `.trim();
}

function createPaginateArgsDeclaration(
    modelName: string,
    cursorFields: string[],
    hasRelations: boolean
) {
    const includeDefinition = hasRelations
        ? `
/**
 * Choose, which related nodes to fetch as well.
 *
 **/
include?: ${modelName}Include | null`
        : "";

    return `
export type ${modelName}PaginateArgs = {
    /**
     * Select specific fields to fetch from the ${modelName}
     *
     **/
    select?: ${modelName}Select | null
${indentString(includeDefinition, 4)}
    /**
     * Filter, which ${modelName}s to fetch.
     *
     **/
    where?: ${modelName}WhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of ${modelName}s to fetch.
     *
     **/
    orderBy?: Enumerable<${modelName}OrderByWithRelationInput>

    /**
    * Items to be fetched per page 
    * 
    */
    pageSize: number;

    distinct?: Enumerable<${modelName}ScalarFieldEnum>

    /**
     * The cursor field to be used to paginate through
     * 
     * defaults to 'id' or the first unique field present in the model
     * 
     */
    cursorField?: ${cursorFields.map(quote).join(" | ")}
}
`.trim();
}

function createDelegateExtension(modelName: string) {
    return `
export interface ${modelName}Delegate<GlobalRejectSettings> {
  paginate<T extends ${modelName}PaginateArgs>(
    args?: SelectSubset<T, ${modelName}PaginateArgs>
  ): AsyncIterable<CheckSelect<T, Array<${modelName}>, Array<${modelName}GetPayload<T>>>>;
}
  `.trim();
}

function getDefaultCursorFields(models: DMMF.Model[]) {
    return models.reduce((acc, cur) => {
        const idFieldName = cur.fields.find((field) => field.isId)?.name;
        const uniqueFieldName = cur.fields.find((field) => field.isUnique)?.name;
        acc[cur.name] = idFieldName ?? uniqueFieldName;
        return acc;
    }, {} as Record<string, string | undefined>);
}

function createPrismaClientPolyfill(models: DMMF.Model[]) {
    const defaults = getDefaultCursorFields(models);
    return `
const client = require('@prisma/client');
const { paginate } = require('./paginate');

const PrismaClientWithPagination = class PrismaClientWithPagination extends client.PrismaClient {
    hasPagination = true;

    constructor() {
        super();
${indentString(models.map(model => `this[${quote(lowerCase(model.name))}].paginate = paginate(this, ${quote(lowerCase(model.name))}, ${quote(defaults[model.name])});`).join('\n'), 8)}
    }
};
Object.defineProperty(client, "PrismaClient", {
  value: PrismaClientWithPagination,
});

  `.trim();
}

function lowerCase(str: string): string {
    return str.substring(0, 1).toLowerCase() + str.substring(1);
}

async function createImplementation(models: DMMF.Model[], outputDir: string) {
    const result = createPrismaClientPolyfill(models);
    await promises.writeFile(join(outputDir, 'index.js'), result);
}

async function createTypescriptDefinitions(
    models: DMMF.Model[],
    outputDir: string
) {
    const paginateArgsDeclarations = models.map((model) => {
        const cursorFields = model.fields
            .filter((field) => field.isUnique || field.isId)
            .map((field) => field.name);
        const hasRelations = model.fields.some((field) => !!field.relationName);
        return createPaginateArgsDeclaration(model.name, cursorFields, hasRelations);
    });
    const delegateExtensions = models.map((model) =>
        createDelegateExtension(model.name)
    );

    const imports = createTypeImports(models.map((model) => model.name));
    const moduleDefinition = createPrismaModuleDefinition([
        ...paginateArgsDeclarations,
        ...delegateExtensions,
    ]);

    const result = [imports, moduleDefinition].join("\n\n");

    const { mkdir, writeFile } = promises;
    await mkdir(outputDir, { recursive: true });
    await writeFile(join(outputDir, "index.d.ts"), result);
}

generatorHandler({
    onManifest(): GeneratorManifest {
        return {
            prettyName: "Prisma Pagination",
            defaultOutput: "node_modules/@prismaext/pagination/lib",
            requiresGenerators: ["prisma-client-js"],
        };
    },
    async onGenerate(options: GeneratorOptions): Promise<any> {
        const outputDir = options.generator.output?.value!;
        const models = options.dmmf.datamodel.models;

        await createTypescriptDefinitions(models, outputDir);
        await createImplementation(models, outputDir);
    },
});
