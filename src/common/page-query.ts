export type PageQuery = { page: number; pageSize: number; skip: number };

export function parsePageQuery(input?: { page?: string; pageSize?: string }): PageQuery {
  const pageNumber = Number(input?.page);
  const sizeNumber = Number(input?.pageSize);
  const page = Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber : 1;
  let pageSize = 40;
  if (Number.isInteger(sizeNumber) && sizeNumber >= 1) {
    pageSize = Math.min(sizeNumber, 100);
  }
  return { page, pageSize, skip: (page - 1) * pageSize };
}
