import { Prisma } from '@prisma/client';

describe('Employee.email', () => {
  it('is optional on the Prisma model', () => {
    const field = Prisma.dmmf.datamodel.models
      .find((model) => model.name === 'Employee')
      ?.fields.find((item) => item.name === 'email');

    expect(field?.isRequired).toBe(false);
  });
});
