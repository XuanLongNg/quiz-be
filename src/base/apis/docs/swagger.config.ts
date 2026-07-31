import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Shourai project')
    .setDescription('## The Shourai API description')
    .setVersion('1.0')
    .addBearerAuth(
      {
        description: `Enter authentication token from JWT.`,
        name: 'Authorization',
        bearerFormat: 'Bearer',
        scheme: 'Bearer',
        type: 'http',
        in: 'Header',
      },
      'JWT',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);
}
