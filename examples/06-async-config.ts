import { Module, Controller, Get, Injectable, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { HttpModule, HttpService, HttpModuleOptionsFactory } from '../src';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Agent } from 'undici';

// Configuration service
@Injectable()
class ApiConfigService implements HttpModuleOptionsFactory {
  constructor(private configService: ConfigService) {}

  async createHttpOptions() {
    // Could load from database, external service, etc.
    const apiUrl = this.configService.get<string>('API_URL');
    const apiTimeout = this.configService.get<number>('API_TIMEOUT');
    const apiKey = this.configService.get<string>('API_KEY');
    
    return {
      baseURL: apiUrl || 'https://jsonplaceholder.typicode.com',
      timeout: apiTimeout || 10000,
      headers: {
        'X-API-Key': apiKey || 'default-key',
        'User-Agent': 'NestJS-Undici-Client'
      },
      connections: 20,
      pipelining: 10
    };
  }
}

// Dynamic configuration based on environment
@Injectable()
class EnvironmentConfigService implements HttpModuleOptionsFactory {
  private readonly logger = new Logger('EnvironmentConfigService');
  
  async createHttpOptions() {
    const env = process.env.NODE_ENV || 'development';
    this.logger.log(`Configuring HTTP client for ${env} environment`);
    
    switch (env) {
      case 'production':
        return {
          baseURL: 'https://api.production.com',
          timeout: 30000,
          connections: 100,
          pipelining: 20,
          keepAliveTimeout: 60000,
          interceptors: {
            request: [{
              onRequest: async (config) => {
                // Add production headers
                config.headers = {
                  ...config.headers,
                  'X-Environment': 'production'
                };
                return config;
              }
            }]
          }
        };
      
      case 'staging':
        return {
          baseURL: 'https://api.staging.com',
          timeout: 20000,
          connections: 50,
          pipelining: 10,
          keepAliveTimeout: 30000
        };
      
      default: // development
        return {
          baseURL: 'https://jsonplaceholder.typicode.com',
          timeout: 10000,
          connections: 10,
          pipelining: 5,
          keepAliveTimeout: 10000,
          interceptors: {
            request: [{
              onRequest: async (config) => {
                this.logger.debug(`DEV Request: ${config.method} ${config.url}`);
                return config;
              }
            }]
          }
        };
    }
  }
}

// Multi-tenant configuration
@Injectable()
class TenantConfigService implements HttpModuleOptionsFactory {
  private tenantConfigs = new Map([
    ['tenant-a', {
      baseURL: 'https://api.tenant-a.com',
      headers: { 'X-Tenant-ID': 'tenant-a' }
    }],
    ['tenant-b', {
      baseURL: 'https://api.tenant-b.com',
      headers: { 'X-Tenant-ID': 'tenant-b' }
    }]
  ]);
  
  async createHttpOptions() {
    // In real app, get tenant from request context
    const tenantId = process.env.TENANT_ID || 'default';
    const config = this.tenantConfigs.get(tenantId) || {
      baseURL: 'https://jsonplaceholder.typicode.com',
      headers: {}
    };
    
    return {
      ...config,
      timeout: 15000,
      connections: 30
    };
  }
}

// Load balancing configuration
@Injectable()
class LoadBalancedConfigService implements HttpModuleOptionsFactory {
  private servers = [
    'https://api1.example.com',
    'https://api2.example.com',
    'https://api3.example.com'
  ];
  private currentIndex = 0;
  
  async createHttpOptions() {
    // Round-robin load balancing
    const baseURL = this.servers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.servers.length;
    
    // Create custom agent with specific settings per server
    const agent = new Agent({
      connections: 50,
      pipelining: 10,
      connect: {
        timeout: 5000,
        // Could add TLS settings per server
      }
    });
    
    return {
      baseURL,
      agent,
      timeout: 20000
    };
  }
}

// Service using the configured HTTP module
@Injectable()
class ApiService {
  constructor(private readonly httpService: HttpService) {}

  async getData() {
    const response = await firstValueFrom(
      this.httpService.get('/users')
    );
    return response.data;
  }
}

// Controller
@Controller('config')
class ConfigController {
  constructor(private readonly apiService: ApiService) {}

  @Get('data')
  getData() {
    return this.apiService.getData();
  }
}

// Module with async configuration using useClass
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useClass: ApiConfigService,
      inject: [ConfigService]
    })
  ],
  controllers: [ConfigController],
  providers: [ApiService, ApiConfigService],
})
class AsyncConfigModule {}

// Module with async configuration using useFactory
@Module({
  imports: [
    ConfigModule.forRoot(),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get('API_URL', 'https://jsonplaceholder.typicode.com'),
        timeout: configService.get('API_TIMEOUT', 10000),
        headers: {
          'Authorization': `Bearer ${configService.get('API_TOKEN', '')}`
        },
        connections: 25,
        pipelining: 10
      }),
      inject: [ConfigService],
    })
  ],
  controllers: [ConfigController],
  providers: [ApiService],
})
class FactoryConfigModule {}

// Module with existing provider
@Module({
  imports: [
    HttpModule.registerAsync({
      useExisting: EnvironmentConfigService,
    })
  ],
  controllers: [ConfigController],
  providers: [ApiService, EnvironmentConfigService],
})
class ExistingProviderModule {}

// Module with multiple HTTP clients
@Module({
  imports: [
    // Primary API client
    HttpModule.register({
      baseURL: 'https://jsonplaceholder.typicode.com',
      timeout: 10000
    }),
    
    // Secondary API client with different config
    HttpModule.registerAsync({
      useFactory: () => ({
        baseURL: 'https://api.github.com',
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 20000
      })
    }),
  ],
  controllers: [ConfigController],
  providers: [ApiService],
})
class MultiClientModule {}

// Bootstrap
async function bootstrap() {
  const app = await NestFactory.create(AsyncConfigModule);
  await app.listen(3005);
  
  console.log('Async configuration example running on http://localhost:3005');
  console.log('');
  console.log('Endpoints:');
  console.log('  GET http://localhost:3005/config/data - Get data with async config');
  console.log('');
  console.log('Configuration options demonstrated:');
  console.log('  - useClass: ApiConfigService');
  console.log('  - useFactory: Direct factory function');
  console.log('  - useExisting: EnvironmentConfigService');
  console.log('  - Multi-tenant configuration');
  console.log('  - Load balancing configuration');
  console.log('  - Multiple HTTP clients in one module');
}

if (require.main === module) {
  bootstrap();
}

export { 
  AsyncConfigModule, 
  FactoryConfigModule, 
  ApiConfigService,
  EnvironmentConfigService,
  TenantConfigService,
  LoadBalancedConfigService
};