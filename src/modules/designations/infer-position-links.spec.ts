import { inferUnparentedPositionLinks } from './infer-position-links';

describe('inferUnparentedPositionLinks', () => {
  const departments = [
    { id: 'div-horeca', parentId: null, classification: 'DIVISION' },
    { id: 'dept-fnb', parentId: 'div-horeca', classification: 'DEPARTMENT' },
    { id: 'div-ops', parentId: null, classification: 'DIVISION' },
    { id: 'dept-facility', parentId: 'div-ops', classification: 'DEPARTMENT' },
  ];

  it('hangs a department position with no line report under the linked department head', () => {
    const links = inferUnparentedPositionLinks(departments, [
      {
        id: 'ceo',
        name: 'CEO',
        code: 'CEO',
        parentId: null,
        departmentId: null,
      },
      {
        id: 'head-fnb',
        name: 'Head of Dept.Food & Beverage',
        code: 'HOR020001',
        parentId: 'div-head',
        departmentId: 'dept-fnb',
      },
      {
        id: 'barista',
        name: 'Barista',
        code: 'BARISTA',
        parentId: null,
        departmentId: 'dept-fnb',
      },
    ]);

    expect(links).toEqual([{ id: 'barista', parentId: 'head-fnb' }]);
  });

  it('builds a department branch under the division head when nobody in the department is linked', () => {
    const links = inferUnparentedPositionLinks(departments, [
      {
        id: 'ops-head',
        name: 'Head of Division Operations',
        code: 'OPE000001',
        parentId: 'gm',
        departmentId: 'div-ops',
      },
      {
        id: 'facility-head',
        name: 'Head of Department Facility Management',
        code: 'HEADOFDEPARTMENTFACI',
        parentId: null,
        departmentId: 'dept-facility',
      },
      {
        id: 'civil',
        name: 'Civil Engineer',
        code: 'CIVILENGINEER',
        parentId: null,
        departmentId: 'dept-facility',
      },
    ]);

    expect(links).toEqual([
      { id: 'facility-head', parentId: 'ops-head' },
      { id: 'civil', parentId: 'facility-head' },
    ]);
  });

  it('leaves a company position with no department as a root', () => {
    const links = inferUnparentedPositionLinks(departments, [
      {
        id: 'ceo',
        name: 'CEO',
        code: 'CEO',
        parentId: null,
        departmentId: null,
      },
    ]);

    expect(links).toEqual([]);
  });
});
