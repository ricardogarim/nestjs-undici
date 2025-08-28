import { Module, Controller, Get, Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { HttpModule, HttpService } from '../src';
import { firstValueFrom, catchError, retry, timeout, of, throwError } from 'rxjs';
import { delay, map, retryWhen, scan, tap } from 'rxjs/operators';

// Custom error class
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Error handling service
@Injectable()
class ErrorHandlingService {
  private readonly logger = new Logger('ErrorHandlingService');
  
  constructor(private readonly httpService: HttpService) {}

  // Handle 404 errors
  async handleNotFound() {
    try {
      const response = await firstValueFrom(
        this.httpService.get('/users/9999')
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Request failed: ${error.message}`);
      
      // Check Undici error codes
      if (error.code === 'UND_ERR_RESPONSE_STATUS_CODE') {
        throw new HttpException(
          'User not found',
          HttpStatus.NOT_FOUND
        );
      }
      
      throw error;
    }
  }

  // Handle timeout errors
  async handleTimeout() {
    try {
      const response = await firstValueFrom(
        this.httpService.get('/delay/10', {
          timeout: 1000 // 1 second timeout
        }).pipe(
          timeout(1000),
          catchError(error => {
            this.logger.error(`Timeout error: ${error.message}`);
            return throwError(() => new HttpException(
              'Request timeout',
              HttpStatus.REQUEST_TIMEOUT
            ));
          })
        )
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Retry with exponential backoff
  async retryWithBackoff() {
    const maxRetries = 3;
    const baseDelay = 1000;
    
    return firstValueFrom(
      this.httpService.get('/users/1').pipe(
        retryWhen(errors =>
          errors.pipe(
            scan((retryCount, error) => {
              if (retryCount >= maxRetries) {
                throw error;
              }
              this.logger.warn(`Retry attempt ${retryCount + 1}`);
              return retryCount + 1;
            }, 0),
            delay(baseDelay),
            tap(retryCount => {
              const delayTime = baseDelay * Math.pow(2, retryCount);
              this.logger.log(`Retrying after ${delayTime}ms`);
            })
          )
        ),
        catchError(error => {
          this.logger.error(`All retries failed: ${error.message}`);
          return throwError(() => new HttpException(
            'Service temporarily unavailable',
            HttpStatus.SERVICE_UNAVAILABLE
          ));
        })
      )
    );
  }

  // Handle network errors
  async handleNetworkError() {
    try {
      // Try to connect to a non-existent server
      const response = await firstValueFrom(
        this.httpService.request({
          url: 'http://localhost:99999/api',
          timeout: 5000
        })
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Network error: ${error.message}`);
      
      // Check for various Undici error codes
      switch (error.code) {
        case 'ECONNREFUSED':
          throw new HttpException(
            'Connection refused - service unavailable',
            HttpStatus.SERVICE_UNAVAILABLE
          );
        
        case 'ENOTFOUND':
          throw new HttpException(
            'DNS lookup failed',
            HttpStatus.BAD_GATEWAY
          );
        
        case 'UND_ERR_CONNECT_TIMEOUT':
          throw new HttpException(
            'Connection timeout',
            HttpStatus.GATEWAY_TIMEOUT
          );
        
        case 'UND_ERR_SOCKET':
          throw new HttpException(
            'Socket error',
            HttpStatus.BAD_GATEWAY
          );
        
        default:
          throw new HttpException(
            error.message || 'Unknown error occurred',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
      }
    }
  }

  // Circuit breaker pattern
  async circuitBreaker() {
    const circuitState = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED' // CLOSED, OPEN, HALF_OPEN
    };
    
    const threshold = 3;
    const timeout = 60000; // 1 minute
    
    const makeRequest = async () => {
      // Check circuit state
      if (circuitState.state === 'OPEN') {
        const now = Date.now();
        if (now - circuitState.lastFailureTime > timeout) {
          circuitState.state = 'HALF_OPEN';
          this.logger.log('Circuit breaker: HALF_OPEN');
        } else {
          throw new HttpException(
            'Circuit breaker is OPEN',
            HttpStatus.SERVICE_UNAVAILABLE
          );
        }
      }
      
      try {
        const response = await firstValueFrom(
          this.httpService.get('/users/1')
        );
        
        // Reset on success
        if (circuitState.state === 'HALF_OPEN') {
          circuitState.state = 'CLOSED';
          circuitState.failures = 0;
          this.logger.log('Circuit breaker: CLOSED');
        }
        
        return response.data;
      } catch (error) {
        circuitState.failures++;
        circuitState.lastFailureTime = Date.now();
        
        if (circuitState.failures >= threshold) {
          circuitState.state = 'OPEN';
          this.logger.error('Circuit breaker: OPEN');
        }
        
        throw error;
      }
    };
    
    return makeRequest();
  }

  // Fallback pattern
  async withFallback() {
    return firstValueFrom(
      this.httpService.get('/users/1').pipe(
        catchError(error => {
          this.logger.warn(`Primary request failed, using fallback: ${error.message}`);
          
          // Return fallback data
          return of({
            data: {
              id: 0,
              name: 'Fallback User',
              email: 'fallback@example.com'
            },
            status: 200,
            statusText: 'OK (Fallback)',
            headers: {}
          });
        })
      )
    );
  }

  // Validate response
  async validateResponse() {
    const response = await firstValueFrom(
      this.httpService.get('/users/1').pipe(
        map(response => {
          // Validate response structure
          if (!response.data || !response.data.id) {
            throw new ApiError(
              'Invalid response structure',
              HttpStatus.UNPROCESSABLE_ENTITY,
              response.data
            );
          }
          
          // Validate status code
          if (response.status < 200 || response.status >= 300) {
            throw new ApiError(
              `Unexpected status code: ${response.status}`,
              response.status,
              response.data
            );
          }
          
          return response;
        }),
        catchError(error => {
          if (error instanceof ApiError) {
            throw new HttpException(error.message, error.statusCode);
          }
          throw error;
        })
      )
    );
    
    return response.data;
  }
}

// Controller
@Controller('errors')
class ErrorController {
  constructor(private readonly errorService: ErrorHandlingService) {}

  @Get('not-found')
  handleNotFound() {
    return this.errorService.handleNotFound();
  }

  @Get('timeout')
  handleTimeout() {
    return this.errorService.handleTimeout();
  }

  @Get('retry')
  retryWithBackoff() {
    return this.errorService.retryWithBackoff();
  }

  @Get('network')
  handleNetworkError() {
    return this.errorService.handleNetworkError();
  }

  @Get('circuit-breaker')
  circuitBreaker() {
    return this.errorService.circuitBreaker();
  }

  @Get('fallback')
  withFallback() {
    return this.errorService.withFallback();
  }

  @Get('validate')
  validateResponse() {
    return this.errorService.validateResponse();
  }
}

// Global error interceptor
class GlobalErrorInterceptor {
  private readonly logger = new Logger('GlobalErrorInterceptor');
  
  async onError(error: any) {
    this.logger.error(`Global error handler: ${error.message}`, error.stack);
    
    // Log error details
    if (error.code) {
      this.logger.error(`Error code: ${error.code}`);
    }
    if (error.statusCode) {
      this.logger.error(`Status code: ${error.statusCode}`);
    }
    
    // Could send to monitoring service here
  }
}

// Module
@Module({
  imports: [
    HttpModule.register({
      baseURL: 'https://jsonplaceholder.typicode.com',
      timeout: 10000,
      interceptors: {
        response: [new GlobalErrorInterceptor()]
      }
    })
  ],
  controllers: [ErrorController],
  providers: [ErrorHandlingService],
})
class ErrorHandlingModule {}

// Bootstrap
async function bootstrap() {
  const app = await NestFactory.create(ErrorHandlingModule);
  
  // Global exception filter
  app.useGlobalFilters({
    catch(exception: any, host: any) {
      const response = host.switchToHttp().getResponse();
      const status = exception.status || 500;
      
      response.status(status).json({
        statusCode: status,
        message: exception.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  await app.listen(3003);
  
  console.log('Error handling example running on http://localhost:3003');
  console.log('');
  console.log('Endpoints:');
  console.log('  GET http://localhost:3003/errors/not-found      - Handle 404 errors');
  console.log('  GET http://localhost:3003/errors/timeout        - Handle timeout errors');
  console.log('  GET http://localhost:3003/errors/retry          - Retry with backoff');
  console.log('  GET http://localhost:3003/errors/network        - Handle network errors');
  console.log('  GET http://localhost:3003/errors/circuit-breaker - Circuit breaker pattern');
  console.log('  GET http://localhost:3003/errors/fallback       - Fallback pattern');
  console.log('  GET http://localhost:3003/errors/validate       - Response validation');
}

if (require.main === module) {
  bootstrap();
}

export { ErrorHandlingModule, ErrorHandlingService, ApiError };