import {
  type DynamicModule,
  Global,
  Module,
  type Provider,
} from "@nestjs/common";
import { randomStringGenerator } from "@nestjs/common/utils/random-string-generator.util";
import {
  HTTP_MODULE_ID,
  HTTP_MODULE_OPTIONS,
} from "./constants/http-module.constant";
import { HttpService } from "./http.service";
import type {
  HttpModuleAsyncOptions,
  HttpModuleOptions,
  HttpModuleOptionsFactory,
} from "./interfaces/http-module.interface";

@Module({})
export class HttpModule {
  static register(options: HttpModuleOptions = {}): DynamicModule {
    const providers = HttpModule.createProviders(options);

    return {
      module: HttpModule,
      providers,
      exports: [HttpService],
    };
  }

  private static createProviders(options: HttpModuleOptions): Provider[] {
    return [
      HttpModule.createOptionsProvider(options),
      HttpService,
      HttpModule.createModuleIdProvider(),
    ];
  }

  private static createOptionsProvider(options: HttpModuleOptions): Provider {
    return {
      provide: HTTP_MODULE_OPTIONS,
      useValue: options,
    };
  }

  private static createModuleIdProvider(): Provider {
    return {
      provide: HTTP_MODULE_ID,
      useValue: randomStringGenerator(),
    };
  }

  static registerAsync(options: HttpModuleAsyncOptions): DynamicModule {
    return {
      module: HttpModule,
      imports: options.imports || [],
      providers: [
        ...HttpModule.createAsyncProviders(options),
        HttpService,
        {
          provide: HTTP_MODULE_ID,
          useValue: randomStringGenerator(),
        },
        ...(options.extraProviders || []),
      ],
      exports: [HttpService],
    };
  }

  static forRoot(options: HttpModuleOptions = {}): DynamicModule {
    const dynamicModule = HttpModule.register(options);
    dynamicModule.global = true;
    return dynamicModule;
  }

  static forRootAsync(options: HttpModuleAsyncOptions): DynamicModule {
    const dynamicModule = HttpModule.registerAsync(options);
    dynamicModule.global = true;
    return dynamicModule;
  }

  private static createAsyncProviders(
    options: HttpModuleAsyncOptions
  ): Provider[] {
    const optionsProvider = HttpModule.createAsyncOptionsProvider(options);

    if (HttpModule.shouldUseOptionsProviderOnly(options)) {
      return [optionsProvider];
    }

    const classProvider = {
      provide: options.useClass!,
      useClass: options.useClass!,
    };

    return [optionsProvider, classProvider];
  }

  private static shouldUseOptionsProviderOnly(
    options: HttpModuleAsyncOptions
  ): boolean {
    return Boolean(options.useExisting || options.useFactory);
  }

  private static createAsyncOptionsProvider(
    options: HttpModuleAsyncOptions
  ): Provider {
    if (options.useFactory) {
      return HttpModule.createFactoryProvider(options);
    }

    return HttpModule.createClassProvider(options);
  }

  private static createFactoryProvider(
    options: HttpModuleAsyncOptions
  ): Provider {
    return {
      provide: HTTP_MODULE_OPTIONS,
      useFactory: options.useFactory!,
      inject: options.inject || [],
    };
  }

  private static createClassProvider(
    options: HttpModuleAsyncOptions
  ): Provider {
    return {
      provide: HTTP_MODULE_OPTIONS,
      useFactory: async (optionsFactory: HttpModuleOptionsFactory) =>
        optionsFactory.createHttpOptions(),
      inject: [options.useExisting || options.useClass!],
    };
  }
}
