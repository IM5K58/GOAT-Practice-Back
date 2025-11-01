import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 트러스트 프록시 설정 (IP 추출을 위해)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  // 전역 경로 prefix 설정
  app.setGlobalPrefix('api');

  // CORS 설정
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://port-next-goat-practice-mhfztudd556964ed.sel3.cloudtype.app',
    ],
    credentials: true,
  });


  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
