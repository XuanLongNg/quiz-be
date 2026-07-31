import { ConfigService } from '@base/configs/config.service';
import { configSwagger } from '@base/apis/docs/swagger.config';
import { AllExceptionsFilter } from '@base/filters/all-exceptions.filter';
import { TransformInterceptor } from '@base/interceptors/app.interceptor';
import { ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { I18nService, I18nValidationPipe } from 'nestjs-i18n';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');
  const configs = app.get(ConfigService);
  const port = parseInt(configs.PORT, 10) || 3000;

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api/v1');

  app.set('query parser', 'extended');

  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new TransformInterceptor(reflector),
  );

  app.useGlobalFilters(new AllExceptionsFilter(app.get(I18nService)));

  configSwagger(app);
  await app.listen(port);

  logger.log(`Swagger: http://localhost:${port}/api/v1/docs`);
  logger.log(`Environment: ${configs.NODE_ENV}`);
}
void bootstrap();
