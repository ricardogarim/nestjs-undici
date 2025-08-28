import { Module, Controller, Get, Injectable, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { HttpModule, HttpService } from '../src';
import { RequestInterceptor, ResponseInterceptor } from '../src/interfaces/http-module.interface';
import { firstValueFrom } from 'rxjs';

// Logging Interceptor
class LoggingInterceptor implements RequestInterceptor, ResponseInterceptor {
  private readonly logger = new Logger('HttpClient');

  async onRequest(request: any) {
    const timestamp = Date.now();
    this.logger.log(`[${timestamp}] Request: ${request.method || 'GET'} ${request.url}`);
    this.logger.debug(`Headers: ${JSON.stringify(request.headers)}`);
    if (request.data) {
      this.logger.debug(`Body: ${JSON.stringify(request.data)}`);
    }
    
    // Add request ID for tracing
    request.headers = {
      ...request.headers,
      'X-Request-Id': `req-${timestamp}`
    };
    
    return request;
  }

  async onResponse(response: any) {
    this.logger.log(`Response: ${response.status} ${response.statusText}`);
    this.logger.debug(`Headers: ${JSON.stringify(response.headers)}`);
    return response;
  }

  async onError(error: Error) {
    this.logger.error(`Request failed: ${error.message}`, error.stack);
  }
}

// Data Transformer Interceptor
class TransformInterceptor implements ResponseInterceptor {
  async onResponse(response: any) {
    // Transform the response data
    if (response.data && Array.isArray(response.data)) {
      response.data = {
        items: response.data,
        count: response.data.length,
        timestamp: new Date().toISOString()
      };
    } else if (response.data) {
      response.data = {
        result: response.data,
        timestamp: new Date().toISOString()
      };
    }
    
    // Add custom metadata
    response.metadata = {
      processedAt: Date.now(),
      version: '1.0.0'
    };
    
    return response;
  }
}

// Auth Interceptor
class AuthInterceptor implements RequestInterceptor {
  private token: string = 'secret-token-12345';
  
  async onRequest(request: any) {
    // Add authentication header
    request.headers = {
      ...request.headers,
      'Authorization': `Bearer ${this.token}`
    };
    
    return request;
  }
}

// Retry Interceptor
class RetryInterceptor implements ResponseInterceptor {
  private readonly logger = new Logger('RetryInterceptor');
  private retryCount = 3;
  private retryDelay = 1000;
  
  async onError(error: any) {
    this.logger.warn(`Request failed, considering retry: ${error.message}`);
    // In real implementation, you would implement retry logic here
    // This is simplified for demonstration
  }
  
  async onResponse(response: any) {
    // Check if response needs retry (e.g., 503 Service Unavailable)
    if (response.status >= 500) {
      this.logger.warn(`Server error ${response.status}, may need retry`);
    }
    return response;
  }
}

// Caching Interceptor
class CachingInterceptor implements RequestInterceptor, ResponseInterceptor {
  private cache = new Map<string, any>();
  private readonly logger = new Logger('CachingInterceptor');
  
  async onRequest(request: any) {
    const cacheKey = `${request.method}:${request.url}`;
    
    // Check cache for GET requests
    if (request.method === 'GET' && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      this.logger.log(`Cache hit for ${cacheKey}`);
      
      // Return cached response (would need proper implementation)
      // throw { cached: true, data: cached };
    }
    
    return request;
  }
  
  async onResponse(response: any) {
    const cacheKey = `${response.request?.method || 'GET'}:${response.request?.url}`;
    
    // Cache successful GET responses
    if (response.status === 200 && response.request?.method === 'GET') {
      this.cache.set(cacheKey, response);
      this.logger.log(`Cached response for ${cacheKey}`);
    }
    
    return response;
  }
}

// Service using interceptors
@Injectable()
class ApiService {
  constructor(private readonly httpService: HttpService) {}

  async getUsers() {
    const response = await firstValueFrom(
      this.httpService.get('/users')
    );
    return response;
  }

  async getUser(id: number) {
    const response = await firstValueFrom(
      this.httpService.get(`/users/${id}`)
    );
    return response;
  }

  async createUser(userData: any) {
    const response = await firstValueFrom(
      this.httpService.post('/users', userData)
    );
    return response;
  }
}

// Controller
@Controller('api')
class ApiController {
  constructor(private readonly apiService: ApiService) {}

  @Get('users')
  async getUsers() {
    const response = await this.apiService.getUsers();
    return {
      data: response.data,
      metadata: (response as any).metadata,
      headers: response.headers
    };
  }

  @Get('user')
  async getUser() {
    const response = await this.apiService.getUser(1);
    return {
      data: response.data,
      metadata: (response as any).metadata
    };
  }
}

// Module with interceptors configuration
@Module({
  imports: [
    HttpModule.register({
      baseURL: 'https://jsonplaceholder.typicode.com',
      timeout: 10000,
      interceptors: {
        request: [
          new LoggingInterceptor(),
          new AuthInterceptor(),
          new CachingInterceptor()
        ],
        response: [
          new LoggingInterceptor(),
          new TransformInterceptor(),
          new RetryInterceptor(),
          new CachingInterceptor()
        ]
      }
    })
  ],
  controllers: [ApiController],
  providers: [ApiService],
})
class InterceptorModule {}

// Bootstrap
async function bootstrap() {
  const app = await NestFactory.create(InterceptorModule);
  
  // Enable detailed logging
  app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);
  
  await app.listen(3001);
  console.log('Interceptor example running on http://localhost:3001');
  console.log('Try: GET http://localhost:3001/api/users');
  console.log('     GET http://localhost:3001/api/user');
  console.log('');
  console.log('Watch the console for interceptor logs!');
}

if (require.main === module) {
  bootstrap();
}

export { InterceptorModule, LoggingInterceptor, TransformInterceptor, AuthInterceptor };