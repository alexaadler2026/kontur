import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';
import { configureApp } from './app/configure-app.js';

const port = Number(process.env['PORT'] ?? 3333);

const app = configureApp(await NestFactory.create(AppModule));
await app.listen(port);
Logger.log(`SignFlow API on http://localhost:${port}/api/v1`, 'Bootstrap');
