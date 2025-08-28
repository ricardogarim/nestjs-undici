import { Module, Controller, Get, Injectable } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { HttpModule, HttpService } from '../src';
import { firstValueFrom } from 'rxjs';

// Basic service using HttpService
@Injectable()
class ApiService {
  constructor(private readonly httpService: HttpService) {}

  async getUsers() {
    const response = await firstValueFrom(
      this.httpService.get('https://jsonplaceholder.typicode.com/users')
    );
    return response.data;
  }

  async createUser(userData: any) {
    const response = await firstValueFrom(
      this.httpService.post('https://jsonplaceholder.typicode.com/users', userData)
    );
    return response.data;
  }

  async updateUser(id: number, userData: any) {
    const response = await firstValueFrom(
      this.httpService.put(`https://jsonplaceholder.typicode.com/users/${id}`, userData)
    );
    return response.data;
  }

  async patchUser(id: number, userData: any) {
    const response = await firstValueFrom(
      this.httpService.patch(`https://jsonplaceholder.typicode.com/users/${id}`, userData)
    );
    return response.data;
  }

  async deleteUser(id: number) {
    const response = await firstValueFrom(
      this.httpService.delete(`https://jsonplaceholder.typicode.com/users/${id}`)
    );
    return response.status;
  }

  async getUserWithParams() {
    const response = await firstValueFrom(
      this.httpService.get('https://jsonplaceholder.typicode.com/posts', {
        params: { userId: 1, _limit: 5 }
      })
    );
    return response.data;
  }

  async getUserWithHeaders() {
    const response = await firstValueFrom(
      this.httpService.get('https://jsonplaceholder.typicode.com/users/1', {
        headers: {
          'Custom-Header': 'CustomValue',
          'Authorization': 'Bearer token'
        }
      })
    );
    return response.data;
  }
}

// Controller to expose endpoints
@Controller('users')
class UsersController {
  constructor(private readonly apiService: ApiService) {}

  @Get()
  getUsers() {
    return this.apiService.getUsers();
  }

  @Get('with-params')
  getUserWithParams() {
    return this.apiService.getUserWithParams();
  }

  @Get('with-headers')
  getUserWithHeaders() {
    return this.apiService.getUserWithHeaders();
  }
}

// Module setup with basic configuration
@Module({
  imports: [
    HttpModule.register({
      baseURL: 'https://jsonplaceholder.typicode.com',
      timeout: 5000,
      headers: {
        'User-Agent': 'NestJS-Undici-Client'
      }
    })
  ],
  controllers: [UsersController],
  providers: [ApiService],
})
class AppModule {}

// Bootstrap application
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log('Application running on http://localhost:3000');
  console.log('Try: GET http://localhost:3000/users');
  console.log('     GET http://localhost:3000/users/with-params');
  console.log('     GET http://localhost:3000/users/with-headers');
}

// Run if executed directly
if (require.main === module) {
  bootstrap();
}

export { AppModule, ApiService };