import { splitDisplayName } from './split-display-name';

describe('splitDisplayName', () => {
  it('uses lastName "-" when name is a single word', () => {
    expect(splitDisplayName('Budi')).toEqual({ firstName: 'Budi', lastName: '-' });
  });

  it('splits two-word name into firstName and lastName', () => {
    expect(splitDisplayName('Budi Santoso')).toEqual({
      firstName: 'Budi',
      lastName: 'Santoso',
    });
  });

  it('joins remaining words as lastName', () => {
    expect(splitDisplayName('Budi A Santoso')).toEqual({
      firstName: 'Budi',
      lastName: 'A Santoso',
    });
  });

  it('uses "-" for both parts when name is empty or null', () => {
    expect(splitDisplayName(null)).toEqual({ firstName: '-', lastName: '-' });
    expect(splitDisplayName('')).toEqual({ firstName: '-', lastName: '-' });
    expect(splitDisplayName('   ')).toEqual({ firstName: '-', lastName: '-' });
  });
});
