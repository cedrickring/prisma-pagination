<h1 align="center">
Prisma Pagination
</h1>

## About

This [Prisma Generator](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#generator) adds polyfills for async-iterable-cursor-based pagination with a simple `.paginate()` method on each prisma delegate. This is a usual opt-in polyfill, so no original/generated prisma files will be touched.

Usage is as easy as:

```ts
const prisma = new PrismaClient();

async function printAllPosts() {
  for await (const posts of prisma.post.paginate({ cursorField: 'id', pageSize: 50, include: { author: true } })) {
    posts.forEach((post) => {
      console.log(post.id, post.author.email);
    });
  }
}
```

## Installation

1. Install `@prismaext/pagination` with either `yarn` or `npm` (or some other package manager)

   e.g. `npm install @prismaext/pagination` or `yarn add @prismaext/pagination`

2. Add a generator block to your `schema.prisma` like:
   ```prisma
   generator pagination {
      provider = "pagination-generator"
   }
   ```
3. Run `prisma generate`
4. Add `import '@prismaext/pagination';` to the top of the file where your `PrismaClient` is being initialized.

After importing the definitions from `@prismaext/pagination`, all prisma delegates will have additional `paginate` methods. To align with the other apis, the method only allows a single argument of the type:

```ts
export type ${Model}PaginateArgs = {
   /**
    * Select specific fields to fetch from the ${Model}
    *
    **/
   select?: ${Model}Select | null
   /**
    * Choose, which related nodes to fetch as well.
    *
    **/
   include?: ${Model}Include | null
   /**
    * Filter, which ${Model}s to fetch.
    *
    **/
   where?: ${Model}WhereInput
   /**
    * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
    *
    * Determine the order of ${Model}s to fetch.
    *
    **/
   orderBy?: Enumerable<${Model}OrderByWithRelationInput>
   /**
   * Items to be fetched per ${Model}
   *
   */
   pageSize: number

   distinct?: Enumerable<${Model}ScalarFieldEnum>

   /**
    * The cursor field to be used to paginate through
    *
    * defaults to 'id' or the first unique field present in the model
    *
    */
   cursorField?: 'id' // or some other unique field
}
```

Similar to `prisma-client-js`, this generator allows specifying the `output` path where the generated definitions will be placed in.
