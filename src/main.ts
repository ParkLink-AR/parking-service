import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { trustedCallerMiddleware } from './trusted-caller.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(trustedCallerMiddleware(process.env.GATEWAY_INTERNAL_SECRET, process.env.INTERNAL_SERVICE_KEY));

  // Valida y transforma automáticamente los DTOs (query params, body) en cada request
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Parking Service escuchando en el puerto ${port}`);
}
bootstrap();
