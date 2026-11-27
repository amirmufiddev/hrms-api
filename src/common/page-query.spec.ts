import { parsePageQuery } from './page-query';

describe('parsePageQuery', () => {
  it('memakai halaman 1 dan 40 bila query kosong atau tidak valid', () => {
    expect(parsePageQuery()).toEqual({ page: 1, pageSize: 40, skip: 0 });
    expect(parsePageQuery({ page: '0', pageSize: '0' })).toEqual({ page: 1, pageSize: 40, skip: 0 });
    expect(parsePageQuery({ page: 'x', pageSize: '1.5' })).toEqual({ page: 1, pageSize: 40, skip: 0 });
  });

  it('menjepit pageSize di atas 100 dan menghitung skip', () => {
    expect(parsePageQuery({ page: '3', pageSize: '500' })).toEqual({ page: 3, pageSize: 100, skip: 200 });
    expect(parsePageQuery({ page: '2', pageSize: '40' })).toEqual({ page: 2, pageSize: 40, skip: 40 });
  });
});
