import { Test, TestingModule } from '@nestjs/testing';
import { LogoController } from './logo.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { createMockPrismaService } from '../../test/helpers';

describe('LogoController', () => {
  let controller: LogoController;
  let prisma: any;
  let storage: {
    getFilePath: jest.Mock;
  };

  const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    storage = {
      getFilePath: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogoController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    controller = module.get<LogoController>(LogoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns 404 if tenant has no logoUrl', async () => {
    prisma.tenant.findFirst.mockResolvedValueOnce({ logoUrl: null });
    const res = mockResponse();

    await controller.getLogo('tenant-1', res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.end).toHaveBeenCalled();
  });

  it('redirects when logoUrl is an external HTTP/HTTPS URL from SSO', async () => {
    prisma.tenant.findFirst.mockResolvedValueOnce({
      logoUrl: 'https://sso.example.com/uploads/companies/ntk.png',
    });
    const res = mockResponse();

    await controller.getLogo('tenant-1', res);

    expect(res.redirect).toHaveBeenCalledWith(
      'https://sso.example.com/uploads/companies/ntk.png',
    );
    expect(storage.getFilePath).not.toHaveBeenCalled();
  });

  it('returns 404 when local file cannot be found by storage service', async () => {
    prisma.tenant.findFirst.mockResolvedValueOnce({
      logoUrl: 'uploads/companies/local.png',
    });
    storage.getFilePath.mockRejectedValueOnce(new Error('File not found'));
    const res = mockResponse();

    await controller.getLogo('tenant-1', res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.end).toHaveBeenCalled();
  });
});
