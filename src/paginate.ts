import { PrismaClient } from "@prisma/client";
import { omit } from "./util";

interface PaginationIterable<T> {
  [Symbol.asyncIterator](): {
    lastCursor: unknown | null;
    next(): Promise<IteratorResult<T>>;
  };
}

interface PaginationArgs<CursorField> {
  cursorField?: CursorField;
  pageSize: number;
}

type OmitNonDelegates<T> = T extends `$${infer U}` ? never : T; // non-delegates start with a $
type DelegateNames = OmitNonDelegates<keyof PrismaClient>;

export const paginate =
  <DelegateName extends DelegateNames, CursorField extends string>(
    client: PrismaClient,
    delegateName: DelegateName,
    defaultCursorField: CursorField
  ) =>
  <Page extends unknown[]>(
    args: PaginationArgs<CursorField>
  ): PaginationIterable<Page> => {
    const cursorField = args.cursorField ?? defaultCursorField;
    const pageSize = args.pageSize;
    const findManyArgs = omit(args, ['cursorField', 'pageSize']);

    return {
      [Symbol.asyncIterator]() {
        return {
          lastCursor: null,
          async next() {
            let cursorArgs = {};
            if (this.lastCursor) {
              cursorArgs = {
                cursor: { [cursorField]: this.lastCursor },
                skip: 1,
              };
            }

            const delegate = client[delegateName];
            // @ts-expect-error: the findMany implementations are not overlapping, so we can't just call it with an arbitrary argument
            const page: Page = await delegate.findMany({
              ...findManyArgs,
              ...cursorArgs,
              take: pageSize,
            });

            if (page.length === 0) {
              return { done: true, value: null };
            }

            this.lastCursor = (page[page.length - 1] as any)[cursorField];
            return { done: false, value: page };
          },
        };
      },
    };
  };
