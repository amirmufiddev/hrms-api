import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateEmployeeDto } from './employee.dto';

describe('UpdateEmployeeDto', () => {
  it('allows designationId null', async () => {
    const dto = plainToInstance(UpdateEmployeeDto, { designationId: null });
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'designationId')).toHaveLength(0);
  });
});
