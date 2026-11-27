import { validate } from './env.validation';

describe('env.validation SSO', () => {
  const base = {
    DATABASE_URL: 'postgresql://x',
    JWT_SECRET: '1234567890123456',
  };

  it('allows missing SSO vars in development', () => {
    expect(() => validate({ ...base, NODE_ENV: 'development' })).not.toThrow();
  });

  it('requires SSO_API_BASE_URL and SSO_SERVICE_API_KEY in production', () => {
    expect(() =>
      validate({ ...base, NODE_ENV: 'production' }),
    ).toThrow(/SSO_API_BASE_URL|SSO_SERVICE_API_KEY/);
  });

  it('rejects SSO_SERVICE_API_KEY shorter than 32 in production', () => {
    expect(() =>
      validate({
        ...base,
        NODE_ENV: 'production',
        SSO_API_BASE_URL: 'http://sso.local',
        SSO_SERVICE_API_KEY: 'too-short',
      }),
    ).toThrow();
  });

  it('does not require local-auth or oauth client vars', () => {
    const validated = validate({ ...base, NODE_ENV: 'development' });
    expect(validated).not.toHaveProperty('SSO_OAUTH_CLIENT_ID');
    expect(validated).not.toHaveProperty('SSO_USER_CONTEXT_CACHE_TTL_SEC');
  });
});
