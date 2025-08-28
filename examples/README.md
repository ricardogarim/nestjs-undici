# NestJS-Undici Examples

This directory contains comprehensive examples demonstrating all features and capabilities of the NestJS-Undici HTTP module.

## Features Supported

✅ **Request/Response Interceptors** - Full support for logging, transformation, and custom processing
✅ **Connection Pooling** - Advanced configuration with pipelining and keep-alive
✅ **Streaming** - Support for streams, SSE, and large file handling
✅ **Error Handling** - Comprehensive error management with retry and circuit breaker patterns
✅ **Async Configuration** - Multiple ways to configure the module dynamically
✅ **All HTTP Methods** - GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS

## Examples Overview

### 01. Basic Usage (`01-basic-usage.ts`)
- Simple HTTP requests (GET, POST, PUT, DELETE, PATCH)
- Query parameters
- Custom headers
- Base URL configuration
- Request/Response typing

### 02. Interceptors (`02-interceptors.ts`)
- **Logging Interceptor**: Log all requests and responses
- **Transform Interceptor**: Modify response data structure
- **Auth Interceptor**: Add authentication headers automatically
- **Retry Interceptor**: Handle retries on failure
- **Caching Interceptor**: Cache responses for GET requests

### 03. Connection Pooling (`03-pooling-config.ts`)
- Connection pool configuration
- HTTP/1.1 pipelining optimization
- Keep-alive settings
- Parallel vs sequential request comparison
- Pool statistics monitoring
- Custom Agent configuration

### 04. Error Handling (`04-error-handling.ts`)
- Network error handling
- Timeout management
- Retry with exponential backoff
- Circuit breaker pattern
- Fallback responses
- Response validation
- Global error interceptor

### 05. Streaming (`05-streaming.ts`)
- Stream JSON responses
- Transform streams on-the-fly
- Server-Sent Events (SSE)
- File downloads with progress
- Large JSON processing
- File serving as streams

### 06. Async Configuration (`06-async-config.ts`)
- Configuration with ConfigService
- Environment-based configuration
- Multi-tenant setup
- Load balancing
- Multiple HTTP clients
- Dynamic configuration loading

## Running the Examples

Each example is a standalone NestJS application. To run an example:

```bash
# Install dependencies (from root directory)
npm install

# Install NestJS dependencies for examples
npm install @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/config

# Run an example
npx ts-node examples/01-basic-usage.ts
npx ts-node examples/02-interceptors.ts
# ... etc
```

## Key Features Demonstration

### Interceptors for Logging and Transformation

```typescript
// Request Interceptor
class LoggingInterceptor implements RequestInterceptor {
  async onRequest(request) {
    console.log(`Request: ${request.method} ${request.url}`);
    return request;
  }
}

// Response Transformer
class TransformInterceptor implements ResponseInterceptor {
  async onResponse(response) {
    response.data = {
      result: response.data,
      timestamp: new Date()
    };
    return response;
  }
}
```

### Connection Pooling Benefits

The pooling example demonstrates:
- **10x faster** parallel requests vs sequential
- Efficient connection reuse
- HTTP/1.1 pipelining for multiple requests per connection
- Configurable keep-alive for persistent connections

### Advanced Error Handling

- Automatic retries with exponential backoff
- Circuit breaker to prevent cascade failures
- Fallback data when services are down
- Comprehensive error logging

### Streaming Capabilities

- Handle large datasets without loading into memory
- Real-time data streaming with SSE
- Progress tracking for file downloads
- On-the-fly data transformation

## Performance Tips

1. **Use Connection Pooling**: Configure appropriate pool size for your load
2. **Enable Pipelining**: For multiple requests to the same host
3. **Set Proper Timeouts**: Balance between reliability and performance
4. **Use Interceptors Wisely**: Avoid heavy processing in interceptors
5. **Stream Large Data**: Use streaming for files and large JSON responses

## Common Use Cases

- **Microservices Communication**: High-performance service-to-service calls
- **API Gateway**: Proxy requests with transformation and logging
- **Data Aggregation**: Parallel API calls with connection pooling
- **File Processing**: Stream large files without memory overhead
- **Real-time Updates**: SSE for live data streaming
- **Multi-tenant Apps**: Dynamic configuration per tenant

## Comparison with Axios

| Feature | NestJS-Undici | Axios |
|---------|---------------|--------|
| Connection Pooling | ✅ Native | ❌ Limited |
| HTTP/1.1 Pipelining | ✅ Yes | ❌ No |
| Keep-Alive | ✅ Advanced | ⚠️ Basic |
| Performance | 🚀 2-10x faster | 🐢 Slower |
| Memory Usage | 📉 Lower | 📈 Higher |
| Streaming | ✅ Native | ⚠️ Limited |

## Need Help?

Check the individual example files for detailed comments and implementation details. Each example is self-contained and runnable.