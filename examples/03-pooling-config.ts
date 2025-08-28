import { Module, Controller, Get, Injectable, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { HttpModule, HttpService } from '../src';
import { Agent } from 'undici';
import { firstValueFrom } from 'rxjs';

// Service with pool monitoring
@Injectable()
class PooledApiService {
  private readonly logger = new Logger('PooledApiService');
  
  constructor(private readonly httpService: HttpService) {
    // Monitor pool statistics
    setInterval(() => {
      const stats = this.httpService.getPoolStats();
      this.logger.debug(`Pool Stats: ${JSON.stringify(stats)}`);
    }, 5000);
  }

  async makeParallelRequests(count: number) {
    const requests = [];
    
    for (let i = 1; i <= count; i++) {
      requests.push(
        firstValueFrom(
          this.httpService.get(`/users/${i}`)
        )
      );
    }
    
    const start = Date.now();
    const results = await Promise.all(requests);
    const duration = Date.now() - start;
    
    this.logger.log(`Completed ${count} parallel requests in ${duration}ms`);
    
    return {
      count,
      duration,
      stats: this.httpService.getPoolStats(),
      results: results.map(r => ({ id: r.data.id, name: r.data.name }))
    };
  }

  async makeSequentialRequests(count: number) {
    const results = [];
    const start = Date.now();
    
    for (let i = 1; i <= count; i++) {
      const response = await firstValueFrom(
        this.httpService.get(`/users/${i}`)
      );
      results.push({ id: response.data.id, name: response.data.name });
    }
    
    const duration = Date.now() - start;
    
    this.logger.log(`Completed ${count} sequential requests in ${duration}ms`);
    
    return {
      count,
      duration,
      stats: this.httpService.getPoolStats(),
      results
    };
  }

  async testPipelining() {
    // Pipelining allows multiple requests on the same connection
    const requests = [];
    
    // Make multiple requests to the same host
    for (let i = 1; i <= 20; i++) {
      requests.push(
        firstValueFrom(
          this.httpService.get(`/posts/${i}`)
        )
      );
    }
    
    const start = Date.now();
    await Promise.all(requests);
    const duration = Date.now() - start;
    
    return {
      message: 'Pipelining test completed',
      requestCount: 20,
      duration,
      stats: this.httpService.getPoolStats()
    };
  }

  getPoolStatistics() {
    return this.httpService.getPoolStats();
  }
}

// Controller
@Controller('pool')
class PoolController {
  constructor(private readonly apiService: PooledApiService) {}

  @Get('parallel')
  makeParallelRequests() {
    return this.apiService.makeParallelRequests(10);
  }

  @Get('sequential')
  makeSequentialRequests() {
    return this.apiService.makeSequentialRequests(10);
  }

  @Get('pipelining')
  testPipelining() {
    return this.apiService.testPipelining();
  }

  @Get('stats')
  getStats() {
    return this.apiService.getPoolStatistics();
  }
}

// Module with optimized pooling configuration
@Module({
  imports: [
    HttpModule.register({
      baseURL: 'https://jsonplaceholder.typicode.com',
      
      // Connection pooling configuration
      connections: 50,              // Max concurrent connections per origin
      pipelining: 10,               // Max pipelined requests per connection
      
      // Keep-alive configuration
      keepAliveTimeout: 60000,      // Keep connection alive for 60 seconds
      keepAliveMaxTimeout: 600000,  // Max lifetime of 10 minutes
      
      // Timeout configuration
      connectTimeout: 10000,        // 10 seconds to establish connection
      bodyTimeout: 30000,           // 30 seconds to receive body
      headersTimeout: 30000,        // 30 seconds to receive headers
      
      timeout: 60000,               // Overall request timeout
    })
  ],
  controllers: [PoolController],
  providers: [PooledApiService],
})
class PoolingModule {}

// Module with custom Agent for advanced control
@Module({
  imports: [
    HttpModule.register({
      baseURL: 'https://jsonplaceholder.typicode.com',
      
      // Use custom Agent with specific configuration
      agent: new Agent({
        // Factory function for creating connections
        factory: (origin, opts) => {
          console.log(`Creating connection to ${origin}`);
          return undefined; // Use default factory
        },
        
        // Advanced connection limits
        connections: 100,
        
        // HTTP/1.1 pipelining
        pipelining: 20,
        
        // Keep-alive settings
        keepAliveTimeout: 4000,
        keepAliveMaxTimeout: 600000,
        keepAliveTimeoutThreshold: 1000,
        
        // Connection settings
        connect: {
          timeout: 10000,
          // TLS/SSL options can go here
          rejectUnauthorized: true,
        },
        
        // Max header size
        maxHeaderSize: 16384,
        
        // Body timeouts
        bodyTimeout: 30000,
        headersTimeout: 30000,
        
        // Max response size (0 = unlimited)
        maxResponseSize: 0,
      })
    })
  ],
  controllers: [PoolController],
  providers: [PooledApiService],
})
class AdvancedPoolingModule {}

// Bootstrap
async function bootstrap() {
  const app = await NestFactory.create(PoolingModule);
  await app.listen(3002);
  
  console.log('Pooling configuration example running on http://localhost:3002');
  console.log('');
  console.log('Endpoints:');
  console.log('  GET http://localhost:3002/pool/parallel   - Test parallel requests');
  console.log('  GET http://localhost:3002/pool/sequential - Test sequential requests');
  console.log('  GET http://localhost:3002/pool/pipelining - Test HTTP pipelining');
  console.log('  GET http://localhost:3002/pool/stats      - View pool statistics');
  console.log('');
  console.log('Compare the performance difference between parallel and sequential!');
}

if (require.main === module) {
  bootstrap();
}

export { PoolingModule, AdvancedPoolingModule, PooledApiService };