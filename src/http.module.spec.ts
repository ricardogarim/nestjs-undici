import { Test } from '@nestjs/testing';
import { HttpModule } from './http.module';
import { HttpService } from './http.service';
import { HttpModuleOptionsFactory } from './interfaces/http-module.interface';

describe('HttpModule', () => {
  describe('register', () => {
    it('should provide HttpService with static options', async () => {
      const module = await Test.createTestingModule({
        imports: [
          HttpModule.register({
            baseURL: 'https://api.test.com',
            timeout: 5000,
          }),
        ],
      }).compile();

      const httpService = module.get<HttpService>(HttpService);
      expect(httpService).toBeDefined();
      expect(httpService).toBeInstanceOf(HttpService);
    });

    it('should work with empty options', async () => {
      const module = await Test.createTestingModule({
        imports: [HttpModule.register()],
      }).compile();

      const httpService = module.get<HttpService>(HttpService);
      expect(httpService).toBeDefined();
    });
  });

  describe('registerAsync', () => {
    it('should provide HttpService with useFactory', async () => {
      const module = await Test.createTestingModule({
        imports: [
          HttpModule.registerAsync({
            useFactory: () => ({
              baseURL: 'https://api.factory.com',
              timeout: 3000,
            }),
          }),
        ],
      }).compile();

      const httpService = module.get<HttpService>(HttpService);
      expect(httpService).toBeDefined();
      expect(httpService).toBeInstanceOf(HttpService);
    });

    it('should provide HttpService with useClass', async () => {
      class ConfigService implements HttpModuleOptionsFactory {
        createHttpOptions() {
          return {
            baseURL: 'https://api.class.com',
            timeout: 4000,
          };
        }
      }

      const module = await Test.createTestingModule({
        imports: [
          HttpModule.registerAsync({
            useClass: ConfigService,
          }),
        ],
      }).compile();

      const httpService = module.get<HttpService>(HttpService);
      expect(httpService).toBeDefined();
    });

    it('should provide HttpService with useExisting', async () => {
      class ConfigService implements HttpModuleOptionsFactory {
        createHttpOptions() {
          return {
            baseURL: 'https://api.existing.com',
            timeout: 6000,
          };
        }
      }

      const module = await Test.createTestingModule({
        imports: [
          HttpModule.registerAsync({
            useExisting: ConfigService,
          }),
        ],
        providers: [ConfigService],
      }).compile();

      const httpService = module.get<HttpService>(HttpService);
      expect(httpService).toBeDefined();
    });

    it('should handle async factory function', async () => {
      const module = await Test.createTestingModule({
        imports: [
          HttpModule.registerAsync({
            useFactory: async () => {
              await new Promise(resolve => setTimeout(resolve, 10));
              return {
                baseURL: 'https://api.async.com',
                timeout: 7000,
              };
            },
          }),
        ],
      }).compile();

      const httpService = module.get<HttpService>(HttpService);
      expect(httpService).toBeDefined();
    });

    it('should handle dependencies injection', async () => {
      class ConfigService {
        getApiUrl() {
          return 'https://api.injected.com';
        }
      }

      const module = await Test.createTestingModule({
        imports: [
          HttpModule.registerAsync({
            imports: [],
            useFactory: (config: ConfigService) => ({
              baseURL: config.getApiUrl(),
              timeout: 8000,
            }),
            inject: [ConfigService],
          }),
        ],
        providers: [ConfigService],
      }).compile();

      const httpService = module.get<HttpService>(HttpService);
      expect(httpService).toBeDefined();
    });

    it('should handle extra providers', async () => {
      class ExtraService {
        getData() {
          return 'extra';
        }
      }

      const module = await Test.createTestingModule({
        imports: [
          HttpModule.registerAsync({
            useFactory: () => ({
              baseURL: 'https://api.extra.com',
            }),
            extraProviders: [ExtraService],
          }),
        ],
      }).compile();

      const httpService = module.get<HttpService>(HttpService);
      const extraService = module.get<ExtraService>(ExtraService);
      
      expect(httpService).toBeDefined();
      expect(extraService).toBeDefined();
      expect(extraService.getData()).toBe('extra');
    });
  });

  describe('forRoot', () => {
    it('should create a global module', async () => {
      const dynamicModule = HttpModule.forRoot({
        baseURL: 'https://api.global.com',
      });

      expect(dynamicModule.global).toBe(true);
      expect(dynamicModule.module).toBe(HttpModule);
      expect(dynamicModule.exports).toContain(HttpService);
    });
  });

  describe('forRootAsync', () => {
    it('should create a global async module', async () => {
      const dynamicModule = HttpModule.forRootAsync({
        useFactory: () => ({
          baseURL: 'https://api.global-async.com',
        }),
      });

      expect(dynamicModule.global).toBe(true);
      expect(dynamicModule.module).toBe(HttpModule);
      expect(dynamicModule.exports).toContain(HttpService);
    });
  });
});