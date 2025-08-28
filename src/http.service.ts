import { Inject, Injectable } from "@nestjs/common";
import { from, type Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { Agent, request } from "undici";
import {
  HTTP_MODULE_OPTIONS,
  HTTP_DEFAULTS,
} from "./constants/http-module.constant";
import type {
  HttpModuleOptions,
  RequestInterceptor,
  ResponseInterceptor,
} from "./interfaces/http-module.interface";

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string | string[]>;
}

export interface RequestConfig {
  url?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
  responseType?: "json" | "text" | "stream" | "arraybuffer";
}

@Injectable()
export class HttpService {
  private agent: Agent;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(
    @Inject(HTTP_MODULE_OPTIONS)
    private readonly options: HttpModuleOptions = {}
  ) {
    this.agent = this.createAgent();
    this.initializeInterceptors();
  }

  private createAgent(): Agent {
    if (this.options.agent) return this.options.agent;

    return new Agent({
      connections: this.options.connections || HTTP_DEFAULTS.CONNECTION_COUNT,
      pipelining: this.options.pipelining || HTTP_DEFAULTS.PIPELINING_LIMIT,
      keepAliveTimeout:
        this.options.keepAliveTimeout || HTTP_DEFAULTS.KEEP_ALIVE_TIMEOUT,
      keepAliveMaxTimeout:
        this.options.keepAliveMaxTimeout ||
        HTTP_DEFAULTS.KEEP_ALIVE_MAX_TIMEOUT,
      connect: {
        timeout: this.options.connectTimeout || HTTP_DEFAULTS.CONNECT_TIMEOUT,
      },
      bodyTimeout: this.options.bodyTimeout || HTTP_DEFAULTS.BODY_TIMEOUT,
      headersTimeout:
        this.options.headersTimeout || HTTP_DEFAULTS.HEADERS_TIMEOUT,
    });
  }

  private initializeInterceptors(): void {
    if (!this.options.interceptors) return;

    this.requestInterceptors = this.options.interceptors.request || [];
    this.responseInterceptors = this.options.interceptors.response || [];
  }

  request<T = any>(config: RequestConfig): Observable<HttpResponse<T>> {
    return from(this.executeRequest<T>(config)).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  get<T = any>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method">
  ): Observable<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: "GET" });
  }

  post<T = any>(
    url: string,
    data?: any,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Observable<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: "POST", data });
  }

  put<T = any>(
    url: string,
    data?: any,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Observable<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: "PUT", data });
  }

  delete<T = any>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method">
  ): Observable<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: "DELETE" });
  }

  patch<T = any>(
    url: string,
    data?: any,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Observable<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: "PATCH", data });
  }

  head<T = any>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method">
  ): Observable<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: "HEAD" });
  }

  private async executeRequest<T>(
    config: RequestConfig
  ): Promise<HttpResponse<T>> {
    const finalConfig = await this.applyRequestInterceptors(config);
    const url = this.buildUrl(finalConfig);
    const headers = this.mergeHeaders(finalConfig);
    const body = this.prepareRequestBody(finalConfig, headers);

    try {
      const response = await this.performRequest(
        url,
        finalConfig,
        headers,
        body
      );
      const data = await this.parseResponseData(response, finalConfig);
      const httpResponse = this.createHttpResponse<T>(response, data);
      return await this.applyResponseInterceptors(httpResponse);
    } catch (error) {
      await this.handleRequestError(error as Error);
      throw error;
    }
  }

  private async applyRequestInterceptors(
    config: RequestConfig
  ): Promise<RequestConfig> {
    let finalConfig = config;
    for (const interceptor of this.requestInterceptors) {
      if (!interceptor.onRequest) continue;

      try {
        finalConfig = await interceptor.onRequest(finalConfig);
      } catch (error) {
        if (interceptor.onError) {
          await interceptor.onError(error as Error);
        }
        throw error;
      }
    }
    return finalConfig;
  }

  private buildUrl(config: RequestConfig): string {
    const baseUrl = config.url || "";
    const urlWithBase = this.shouldPrependBaseUrl(baseUrl)
      ? `${this.options.baseURL}${baseUrl}`
      : baseUrl;

    return this.appendQueryParams(urlWithBase, config.params);
  }

  private shouldPrependBaseUrl(url: string): boolean {
    return Boolean(this.options.baseURL && !url.startsWith("http"));
  }

  private appendQueryParams(url: string, params?: Record<string, any>): string {
    if (!params) return url;

    const queryString = new URLSearchParams(params).toString();
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}${queryString}`;
  }

  private mergeHeaders(config: RequestConfig): Record<string, string> {
    return {
      ...this.options.headers,
      ...config.headers,
    };
  }

  private prepareRequestBody(
    config: RequestConfig,
    headers: Record<string, string>
  ): any {
    if (!config.data) return undefined;

    const shouldStringify = this.isJsonSerializable(config.data);
    if (shouldStringify) {
      headers["Content-Type"] =
        headers["Content-Type"] || HTTP_DEFAULTS.DEFAULT_CONTENT_TYPE;
      return JSON.stringify(config.data);
    }

    return config.data;
  }

  private isJsonSerializable(data: any): boolean {
    return typeof data === "object" && !(data instanceof FormData);
  }

  private async performRequest(
    url: string,
    config: RequestConfig,
    headers: Record<string, string>,
    body: any
  ) {
    return await request(url, {
      method: config.method || HTTP_DEFAULTS.DEFAULT_METHOD,
      headers,
      body,
      dispatcher: this.agent,
      bodyTimeout: config.timeout || this.options.timeout,
    });
  }

  private async parseResponseData(
    response: any,
    config: RequestConfig
  ): Promise<any> {
    const responseType =
      config.responseType || HTTP_DEFAULTS.DEFAULT_RESPONSE_TYPE;

    const parsers = {
      json: () => response.body.json(),
      text: () => response.body.text(),
      arraybuffer: () => response.body.arrayBuffer(),
      stream: () => response.body,
    };

    const parser =
      parsers[responseType] || parsers[HTTP_DEFAULTS.DEFAULT_RESPONSE_TYPE];
    return await parser();
  }

  private createHttpResponse<T>(response: any, data: any): HttpResponse<T> {
    return {
      data: data as T,
      status: response.statusCode,
      statusText: this.getStatusText(response.statusCode),
      headers: response.headers as Record<string, string | string[]>,
    };
  }

  private getStatusText(statusCode: number): string {
    return statusCode === HTTP_DEFAULTS.OK_STATUS
      ? HTTP_DEFAULTS.OK_STATUS_TEXT
      : HTTP_DEFAULTS.ERROR_STATUS_TEXT;
  }

  private async applyResponseInterceptors<T>(
    response: HttpResponse<T>
  ): Promise<HttpResponse<T>> {
    let finalResponse = response;

    for (const interceptor of this.responseInterceptors) {
      if (!interceptor.onResponse) continue;

      try {
        finalResponse = await interceptor.onResponse(finalResponse);
      } catch (error) {
        if (interceptor.onError) {
          await interceptor.onError(error as Error);
        }
        throw error;
      }
    }

    return finalResponse;
  }

  private async handleRequestError(error: Error): Promise<void> {
    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onError) {
        await interceptor.onError(error);
      }
    }
  }

  // Get agent stats for monitoring
  getPoolStats() {
    return this.agent.stats;
  }

  // Close all connections
  async close() {
    return this.agent.close();
  }
}
