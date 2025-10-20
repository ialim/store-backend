import { NestFactory } from '@nestjs/core';
import { join } from 'path';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable CORS for admin UI during development
  const rawCorsOrigins = (
    process.env.ADMIN_UI_ORIGIN || 'http://localhost:5173'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowAllOrigins = rawCorsOrigins.includes('*');
  const normalizedOrigins = rawCorsOrigins
    .filter((origin) => origin !== '*')
    .map((origin) => origin.toLowerCase());

  const localhostPrefixes = [
    'http://localhost:',
    'https://localhost:',
    'http://127.0.0.1:',
    'https://127.0.0.1:',
    'http://0.0.0.0:',
    'https://0.0.0.0:',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (allowAllOrigins || !origin) {
        return callback(null, true);
      }
      const lowered = origin.toLowerCase();
      const inConfig = normalizedOrigins.includes(lowered);
      const isLocalhost = localhostPrefixes.some((prefix) =>
        lowered.startsWith(prefix),
      );
      if (inConfig || isLocalhost) {
        return callback(null, true);
      }
      return callback(
        new Error(
          `Origin ${origin} not allowed by CORS. Configure ADMIN_UI_ORIGIN to permit it.`,
        ),
        false,
      );
    },
    credentials: true,
  });
  // Serve uploaded files under /uploads
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
