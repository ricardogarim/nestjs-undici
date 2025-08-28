import type { ModuleMetadata, Provider, Type } from '@nestjs/common';
import type { Agent } from 'undici';

export interface HttpModuleOptions {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
  agent?: Agent;

  // Undici-specific options
  connections?: number;
  pipelining?: number;
  keepAliveTimeout?: number;
  keepAliveMaxTimeout?: number;
  connectTimeout?: number;
  bodyTimeout?: number;
  headersTimeout?: number;

  // Interceptors
  interceptors?: {
    request?: RequestInterceptor[];
    response?: ResponseInterceptor[];
  };
}

export interface HttpModuleOptionsFactory {
  createHttpOptions(): Promise<HttpModuleOptions> | HttpModuleOptions;
}

export interface HttpModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<HttpModuleOptionsFactory>;
  useClass?: Type<HttpModuleOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<HttpModuleOptions> | HttpModuleOptions;
  inject?: any[];
  extraProviders?: Provider[];
}

export interface RequestInterceptor {
  onRequest?(request: RequestOptions): Promise<RequestOptions> | RequestOptions;
  onError?(error: Error): Promise<void> | void;
}

export interface ResponseInterceptor {
  onResponse?(response: any): Promise<any> | any;
  onError?(error: Error): Promise<void> | void;
}

export interface RequestOptions {
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, any>;
  data?: any;
  params?: Record<string, any>;
  timeout?: number;
  responseType?: 'json' | 'text' | 'stream' | 'arraybuffer';
}
