import { Module, Controller, Get, Injectable, Logger, Res, StreamableFile } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { HttpModule, HttpService } from '../src';
import { Response } from 'express';
import { Readable, Transform, pipeline } from 'stream';
import { promisify } from 'util';
import { createWriteStream, createReadStream } from 'fs';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';

const pipelineAsync = promisify(pipeline);

// Streaming service
@Injectable()
class StreamingService {
  private readonly logger = new Logger('StreamingService');
  
  constructor(private readonly httpService: HttpService) {}

  // Stream response directly to client
  async streamToClient(): Promise<Readable> {
    const response = await firstValueFrom(
      this.httpService.get('https://jsonplaceholder.typicode.com/photos', {
        responseType: 'stream'
      })
    );
    
    return response.data as Readable;
  }

  // Download file and save to disk
  async downloadFile(url: string, destinationPath: string): Promise<void> {
    this.logger.log(`Downloading ${url} to ${destinationPath}`);
    
    const response = await firstValueFrom(
      this.httpService.get(url, {
        responseType: 'stream'
      })
    );
    
    const writeStream = createWriteStream(destinationPath);
    const readStream = response.data as Readable;
    
    // Track progress
    let downloadedBytes = 0;
    const progressTransform = new Transform({
      transform(chunk, encoding, callback) {
        downloadedBytes += chunk.length;
        process.stdout.write(`\rDownloaded: ${downloadedBytes} bytes`);
        this.push(chunk);
        callback();
      }
    });
    
    await pipelineAsync(
      readStream,
      progressTransform,
      writeStream
    );
    
    this.logger.log(`\nDownload complete: ${destinationPath}`);
  }

  // Stream with transformation
  async streamWithTransformation(): Promise<Readable> {
    const response = await firstValueFrom(
      this.httpService.get('https://jsonplaceholder.typicode.com/users', {
        responseType: 'stream'
      })
    );
    
    const stream = response.data as Readable;
    
    // Transform JSON array to NDJSON (newline-delimited JSON)
    const transformStream = new Transform({
      transform(chunk, encoding, callback) {
        try {
          const data = JSON.parse(chunk.toString());
          if (Array.isArray(data)) {
            data.forEach(item => {
              this.push(JSON.stringify(item) + '\n');
            });
          } else {
            this.push(JSON.stringify(data) + '\n');
          }
          callback();
        } catch (error) {
          callback(error as Error);
        }
      }
    });
    
    return stream.pipe(transformStream);
  }

  // Server-Sent Events (SSE) stream
  async createSSEStream(): Promise<Readable> {
    const stream = new Readable({
      read() {}
    });
    
    let counter = 0;
    const interval = setInterval(async () => {
      counter++;
      
      try {
        // Fetch data
        const response = await firstValueFrom(
          this.httpService.get(`/users/${counter}`)
        );
        
        // Send as SSE
        stream.push(`data: ${JSON.stringify(response.data)}\n\n`);
        
        if (counter >= 10) {
          clearInterval(interval);
          stream.push('event: close\ndata: Stream ended\n\n');
          stream.push(null); // End stream
        }
      } catch (error) {
        this.logger.error(`SSE stream error: ${error}`);
        clearInterval(interval);
        stream.push(null);
      }
    }, 1000);
    
    return stream;
  }

  // Chunked upload simulation
  async uploadStream(dataStream: Readable): Promise<any> {
    // In a real scenario, you would send the stream to an API
    // Here we simulate processing chunks
    
    const chunks: Buffer[] = [];
    let totalSize = 0;
    
    return new Promise((resolve, reject) => {
      dataStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        totalSize += chunk.length;
        this.logger.debug(`Received chunk: ${chunk.length} bytes`);
      });
      
      dataStream.on('end', () => {
        this.logger.log(`Upload complete: ${totalSize} bytes`);
        resolve({
          success: true,
          totalSize,
          chunks: chunks.length
        });
      });
      
      dataStream.on('error', reject);
    });
  }

  // Process large JSON stream
  async processLargeJsonStream(): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.get('https://jsonplaceholder.typicode.com/photos', {
        responseType: 'stream'
      })
    );
    
    const stream = response.data as Readable;
    let buffer = '';
    let processedCount = 0;
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        
        // Try to parse accumulated data
        try {
          const data = JSON.parse(buffer);
          if (Array.isArray(data)) {
            processedCount = data.length;
            this.logger.log(`Processing ${processedCount} items`);
            
            // Process items in batches
            const batchSize = 100;
            for (let i = 0; i < data.length; i += batchSize) {
              const batch = data.slice(i, i + batchSize);
              this.logger.debug(`Processing batch: items ${i} to ${i + batch.length}`);
              // Process batch here
            }
          }
        } catch (e) {
          // JSON not complete yet, continue accumulating
        }
      });
      
      stream.on('end', () => {
        resolve({
          message: 'Stream processing complete',
          itemsProcessed: processedCount
        });
      });
      
      stream.on('error', reject);
    });
  }
}

// Controller
@Controller('stream')
class StreamController {
  constructor(private readonly streamingService: StreamingService) {}

  @Get('json')
  async streamJson(@Res() res: Response) {
    const stream = await this.streamingService.streamToClient();
    res.setHeader('Content-Type', 'application/json');
    stream.pipe(res);
  }

  @Get('transform')
  async streamTransform(@Res() res: Response) {
    const stream = await this.streamingService.streamWithTransformation();
    res.setHeader('Content-Type', 'application/x-ndjson');
    stream.pipe(res);
  }

  @Get('sse')
  async serverSentEvents(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const stream = await this.streamingService.createSSEStream();
    stream.pipe(res);
  }

  @Get('download')
  async downloadFile() {
    const fileName = 'data.json';
    const filePath = join(process.cwd(), fileName);
    
    await this.streamingService.downloadFile(
      'https://jsonplaceholder.typicode.com/users',
      filePath
    );
    
    return {
      message: 'File downloaded',
      path: filePath
    };
  }

  @Get('process')
  processLargeStream() {
    return this.streamingService.processLargeJsonStream();
  }

  @Get('file')
  getFile(): StreamableFile {
    // Example of serving a file as stream
    const file = createReadStream(join(process.cwd(), 'package.json'));
    return new StreamableFile(file, {
      type: 'application/json',
      disposition: 'attachment; filename="package.json"'
    });
  }
}

// Module
@Module({
  imports: [
    HttpModule.register({
      timeout: 60000, // Longer timeout for streaming
      bodyTimeout: 120000,
      headersTimeout: 60000,
    })
  ],
  controllers: [StreamController],
  providers: [StreamingService],
})
class StreamingModule {}

// Bootstrap
async function bootstrap() {
  const app = await NestFactory.create(StreamingModule);
  await app.listen(3004);
  
  console.log('Streaming example running on http://localhost:3004');
  console.log('');
  console.log('Endpoints:');
  console.log('  GET http://localhost:3004/stream/json      - Stream JSON response');
  console.log('  GET http://localhost:3004/stream/transform - Stream with transformation');
  console.log('  GET http://localhost:3004/stream/sse       - Server-Sent Events stream');
  console.log('  GET http://localhost:3004/stream/download  - Download file to disk');
  console.log('  GET http://localhost:3004/stream/process   - Process large JSON stream');
  console.log('  GET http://localhost:3004/stream/file      - Serve file as stream');
  console.log('');
  console.log('Test SSE with: curl -N http://localhost:3004/stream/sse');
}

if (require.main === module) {
  bootstrap();
}

export { StreamingModule, StreamingService };