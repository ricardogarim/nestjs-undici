# NestJS-Undici

High-performance HTTP module for NestJS using Undici

[![npm version](https://img.shields.io/npm/v/nestjs-undici.svg)](https://www.npmjs.com/package/nestjs-undici)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/ricardogarim/nestjs-undici/actions/workflows/ci.yml/badge.svg)](https://github.com/ricardogarim/nestjs-undici/actions)
[![Coverage Status](https://coveralls.io/repos/github/ricardogarim/nestjs-undici/badge.svg?branch=main)](https://coveralls.io/github/ricardogarim/nestjs-undici?branch=main)

## Features

- Built on [Undici](https://github.com/nodejs/undici), the fastest Node.js HTTP client
- Advanced connection pooling with HTTP/1.1 pipelining
- Seamless NestJS integration
- Request/response interceptors
- RxJS Observable support
- Native stream support
- TypeScript support

## Installation

```bash
npm install @ricardogarim/nestjs-undici
```

## Quick Start

### Basic Setup

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@ricardogarim/nestjs-undici';

@Module({
  imports: [
    HttpModule.register({
      baseURL: 'https://api.example.com',
      timeout: 5000,
    }),
  ],
})
export class AppModule {}
```

### Making Requests

```typescript
import { Injectable } from '@nestjs/common';
import { HttpService } from '@ricardogarim/nestjs-undici';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UserService {
  constructor(private readonly httpService: HttpService) {}

  async getUser(id: number) {
    const response = await firstValueFrom(
      this.httpService.get(`/users/${id}`)
    );
    return response.data;
  }

  async createUser(userData: any) {
    const response = await firstValueFrom(
      this.httpService.post('/users', userData)
    );
    return response.data;
  }
}
```

## Configuration

### Module Configuration

```typescript
HttpModule.register({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'User-Agent': 'My-App/1.0',
  },
  connections: 50,
  pipelining: 10,
  keepAliveTimeout: 60000,
  keepAliveMaxTimeout: 600000,
  connectTimeout: 10000,
  bodyTimeout: 30000,
  headersTimeout: 30000,
});
```

### Async Configuration

```typescript
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get('API_URL'),
        timeout: configService.get('API_TIMEOUT'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Global Module

```typescript
@Module({
  imports: [
    HttpModule.forRoot({
      baseURL: 'https://api.example.com',
    }),
  ],
})
export class AppModule {}
```

## Interceptors

### Request Interceptor

```typescript
class AuthInterceptor implements RequestInterceptor {
  async onRequest(config: RequestConfig) {
    const token = await getAuthToken();
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
    return config;
  }
}
```

### Response Interceptor

```typescript
class LoggingInterceptor implements ResponseInterceptor {
  async onResponse(response: HttpResponse) {
    console.log(`Response: ${response.status}`);
    return response;
  }

  async onError(error: Error) {
    console.error(`Error: ${error.message}`);
  }
}
```

### Using Interceptors

```typescript
HttpModule.register({
  interceptors: {
    request: [new AuthInterceptor()],
    response: [new LoggingInterceptor()],
  },
});
```

## Streaming

```typescript
// Download file
async downloadFile(url: string) {
  const response = await firstValueFrom(
    this.httpService.get(url, { responseType: 'stream' })
  );
  
  const writeStream = fs.createWriteStream('./download.pdf');
  response.data.pipe(writeStream);
}

// Upload file
async uploadFile(filePath: string) {
  const stream = fs.createReadStream(filePath);
  const response = await firstValueFrom(
    this.httpService.post('/upload', stream, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    })
  );
  return response.data;
}
```

## Performance

Benchmarks comparing NestJS-Undici with @nestjs/axios:

| Operation | NestJS-Undici | @nestjs/axios | Improvement |
|-----------|---------------|---------------|-------------|
| Sequential requests (100) | 450ms | 1,820ms | 4x faster |
| Parallel requests (100) | 120ms | 980ms | 8x faster |
| Keep-alive connections | 95ms | 450ms | 4.7x faster |
| Memory usage | 45MB | 128MB | 65% less |

## Migration from @nestjs/axios

```typescript
// Before (@nestjs/axios)
import { HttpModule } from '@nestjs/axios';

// After (@ricardogarim/nestjs-undici)
import { HttpModule } from '@ricardogarim/nestjs-undici';
```

The API is largely compatible with these differences:
- Response interceptors receive the full response object
- Better TypeScript types
- Additional configuration options for connection pooling
- Native stream support

## Testing

### Mocking HttpService

```typescript
import { Test } from '@nestjs/testing';
import { HttpService } from '@ricardogarim/nestjs-undici';
import { of } from 'rxjs';

const module = await Test.createTestingModule({
  providers: [
    UserService,
    {
      provide: HttpService,
      useValue: {
        get: jest.fn(() => of({ 
          data: { id: 1, name: 'Test' }, 
          status: 200 
        })),
      },
    },
  ],
}).compile();
```

## API Reference

### HttpService Methods

- `request<T>(config: RequestConfig): Observable<HttpResponse<T>>`
- `get<T>(url: string, config?: RequestConfig): Observable<HttpResponse<T>>`
- `post<T>(url: string, data?: any, config?: RequestConfig): Observable<HttpResponse<T>>`
- `put<T>(url: string, data?: any, config?: RequestConfig): Observable<HttpResponse<T>>`
- `patch<T>(url: string, data?: any, config?: RequestConfig): Observable<HttpResponse<T>>`
- `delete<T>(url: string, config?: RequestConfig): Observable<HttpResponse<T>>`
- `head<T>(url: string, config?: RequestConfig): Observable<HttpResponse<T>>`

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| baseURL | string | - | Base URL for requests |
| timeout | number | - | Request timeout in ms |
| headers | object | {} | Default headers |
| connections | number | 10 | Max connections per origin |
| pipelining | number | 10 | Max pipelined requests |
| keepAliveTimeout | number | 4000 | Keep-alive timeout |
| connectTimeout | number | 10000 | Connection timeout |
| bodyTimeout | number | 30000 | Body read timeout |
| headersTimeout | number | 30000 | Headers read timeout |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.