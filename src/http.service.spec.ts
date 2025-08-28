import { Test, TestingModule } from '@nestjs/testing';
import { Agent } from 'undici';
import { of, throwError } from 'rxjs';
import { HttpService } from './http.service';
import { HTTP_MODULE_OPTIONS } from './http.constants';
import { HttpModuleOptions } from './interfaces/http-module.interface';

// Mock undici
jest.mock('undici', () => ({
  Agent: jest.fn().mockImplementation(() => ({
    stats: {},
    close: jest.fn(),
  })),
  request: jest.fn(),
}));

describe('HttpService', () => {
  let service: HttpService;
  let mockRequest: jest.Mock;

  beforeEach(async () => {
    mockRequest = require('undici').request as jest.Mock;
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpService,
        {
          provide: HTTP_MODULE_OPTIONS,
          useValue: {
            baseURL: 'https://api.test.com',
            timeout: 5000,
          } as HttpModuleOptions,
        },
      ],
    }).compile();

    service = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET requests', () => {
    it('should make a successful GET request', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          json: jest.fn().mockResolvedValue({ id: 1, name: 'Test' }),
        },
      };

      mockRequest.mockResolvedValue(mockResponse);

      const result = await service.get('/users/1').toPromise();

      expect(result).toBeDefined();
      expect(result?.data).toEqual({ id: 1, name: 'Test' });
      expect(result?.status).toBe(200);
      expect(mockRequest).toHaveBeenCalledWith(
        'https://api.test.com/users/1',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle query parameters', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: {},
        body: {
          json: jest.fn().mockResolvedValue([]),
        },
      };

      mockRequest.mockResolvedValue(mockResponse);

      await service.get('/users', { 
        params: { page: 1, limit: 10 } 
      }).toPromise();

      expect(mockRequest).toHaveBeenCalledWith(
        'https://api.test.com/users?page=1&limit=10',
        expect.any(Object)
      );
    });

    it('should handle request errors', async () => {
      const error = new Error('Network error');
      mockRequest.mockRejectedValue(error);

      await expect(
        service.get('/users').toPromise()
      ).rejects.toThrow('Network error');
    });
  });

  describe('POST requests', () => {
    it('should make a successful POST request with data', async () => {
      const mockResponse = {
        statusCode: 201,
        headers: {},
        body: {
          json: jest.fn().mockResolvedValue({ id: 2, name: 'Created' }),
        },
      };

      mockRequest.mockResolvedValue(mockResponse);

      const postData = { name: 'New User' };
      const result = await service.post('/users', postData).toPromise();

      expect(result?.status).toBe(201);
      expect(result?.data).toEqual({ id: 2, name: 'Created' });
      expect(mockRequest).toHaveBeenCalledWith(
        'https://api.test.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle FormData', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: {},
        body: {
          json: jest.fn().mockResolvedValue({ success: true }),
        },
      };

      mockRequest.mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('file', 'test');

      await service.post('/upload', formData).toPromise();

      expect(mockRequest).toHaveBeenCalledWith(
        'https://api.test.com/upload',
        expect.objectContaining({
          method: 'POST',
          body: formData,
        })
      );
    });
  });

  describe('PUT requests', () => {
    it('should make a successful PUT request', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: {},
        body: {
          json: jest.fn().mockResolvedValue({ id: 1, name: 'Updated' }),
        },
      };

      mockRequest.mockResolvedValue(mockResponse);

      const updateData = { name: 'Updated User' };
      const result = await service.put('/users/1', updateData).toPromise();

      expect(result?.data).toEqual({ id: 1, name: 'Updated' });
      expect(mockRequest).toHaveBeenCalledWith(
        'https://api.test.com/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      );
    });
  });

  describe('DELETE requests', () => {
    it('should make a successful DELETE request', async () => {
      const mockResponse = {
        statusCode: 204,
        headers: {},
        body: {
          json: jest.fn().mockResolvedValue(null),
        },
      };

      mockRequest.mockResolvedValue(mockResponse);

      const result = await service.delete('/users/1').toPromise();

      expect(result?.status).toBe(204);
      expect(mockRequest).toHaveBeenCalledWith(
        'https://api.test.com/users/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('PATCH requests', () => {
    it('should make a successful PATCH request', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: {},
        body: {
          json: jest.fn().mockResolvedValue({ id: 1, name: 'Patched' }),
        },
      };

      mockRequest.mockResolvedValue(mockResponse);

      const patchData = { name: 'Patched User' };
      const result = await service.patch('/users/1', patchData).toPromise();

      expect(result?.data).toEqual({ id: 1, name: 'Patched' });
      expect(mockRequest).toHaveBeenCalledWith(
        'https://api.test.com/users/1',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  describe('Response types', () => {
    it('should handle text response', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: {},
        body: {
          text: jest.fn().mockResolvedValue('Plain text response'),
        },
      };

      mockRequest.mockResolvedValue(mockResponse);

      const result = await service.get('/text', { 
        responseType: 'text' 
      }).toPromise();

      expect(result?.data).toBe('Plain text response');
    });

    it('should handle arraybuffer response', async () => {
      const buffer = new ArrayBuffer(8);
      const mockResponse = {
        statusCode: 200,
        headers: {},
        body: {
          arrayBuffer: jest.fn().mockResolvedValue(buffer),
        },
      };

      mockRequest.mockResolvedValue(mockResponse);

      const result = await service.get('/binary', { 
        responseType: 'arraybuffer' 
      }).toPromise();

      expect(result?.data).toBe(buffer);
    });

    it('should handle stream response', async () => {
      const mockStream = { pipe: jest.fn() };
      const mockResponse = {
        statusCode: 200,
        headers: {},
        body: mockStream,
      };

      mockRequest.mockResolvedValue(mockResponse);

      const result = await service.get('/stream', { 
        responseType: 'stream' 
      }).toPromise();

      expect(result?.data).toBe(mockStream);
    });
  });

  describe('Interceptors', () => {
    it('should apply request interceptors', async () => {
      const requestInterceptor = {
        onRequest: jest.fn().mockImplementation((config) => ({
          ...config,
          headers: { ...config.headers, 'X-Custom': 'Header' },
        })),
      };

      const module = await Test.createTestingModule({
        providers: [
          HttpService,
          {
            provide: HTTP_MODULE_OPTIONS,
            useValue: {
              baseURL: 'https://api.test.com',
              interceptors: {
                request: [requestInterceptor],
              },
            } as HttpModuleOptions,
          },
        ],
      }).compile();

      const interceptedService = module.get<HttpService>(HttpService);

      const mockResponse = {
        statusCode: 200,
        headers: {},
        body: {
          json: jest.fn().mockResolvedValue({}),
        },
      };

      mockRequest.mockResolvedValue(mockResponse);

      await interceptedService.get('/users').toPromise();

      expect(requestInterceptor.onRequest).toHaveBeenCalled();
      expect(mockRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'Header',
          }),
        })
      );
    });

    it('should apply response interceptors', async () => {
      const responseInterceptor = {
        onResponse: jest.fn().mockImplementation((response) => ({
          ...response,
          data: { ...response.data, intercepted: true },
        })),
      };

      const module = await Test.createTestingModule({
        providers: [
          HttpService,
          {
            provide: HTTP_MODULE_OPTIONS,
            useValue: {
              baseURL: 'https://api.test.com',
              interceptors: {
                response: [responseInterceptor],
              },
            } as HttpModuleOptions,
          },
        ],
      }).compile();

      const interceptedService = module.get<HttpService>(HttpService);

      const mockResponse = {
        statusCode: 200,
        headers: {},
        body: {
          json: jest.fn().mockResolvedValue({ original: true }),
        },
      };

      mockRequest.mockResolvedValue(mockResponse);

      const result = await interceptedService.get('/users').toPromise();

      expect(responseInterceptor.onResponse).toHaveBeenCalled();
      expect(result?.data).toEqual({ original: true, intercepted: true });
    });
  });

  describe('Pool management', () => {
    it('should return pool statistics', () => {
      const stats = service.getPoolStats();
      expect(stats).toBeDefined();
    });

    it('should close agent connections', async () => {
      const closeSpy = jest.fn();
      (service as any).agent.close = closeSpy;

      await service.close();
      expect(closeSpy).toHaveBeenCalled();
    });
  });
});