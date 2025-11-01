import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnprocessableEntityException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppService } from './app.service';
import {
  validateRecordRequest,
  type RecordRequest,
  type Difficulty,
} from './dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return 'Cursor가 말아주는 파리잡기 프로젝트';
  }

  /**
   * Health check
   * GET /api/health
   */
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  /**
   * 게임 결과 저장
   * POST /api/record
   */
  @Post('record')
  @HttpCode(HttpStatus.CREATED)
  createRecord(@Body() body: RecordRequest, @Req() req: Request) {
    // 유효성 검사
    const validation = validateRecordRequest(body);
    if (!validation.valid) {
      throw new UnprocessableEntityException({
        error: 'UNPROCESSABLE_ENTITY',
        message: validation.message || 'invalid payload',
      });
    }

    // 클라이언트 IP 추출
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';

    try {
      return this.appService.createRecord(body, clientIp);
    } catch (error) {
      // HttpException (429)은 이미 적절한 형태로 throw됨
      throw error;
    }
  }

  /**
   * 난이도별 랭킹 조회 (TOP 5)
   * GET /api/leaderboard?difficulty=<easy|medium|hard>
   */
  @Get('leaderboard')
  getLeaderboard(@Query('difficulty') difficulty: string) {
    if (!difficulty) {
      throw new BadRequestException({
        error: 'BAD_REQUEST',
        message: 'difficulty is required (easy|medium|hard)',
      });
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      throw new BadRequestException({
        error: 'BAD_REQUEST',
        message: 'difficulty must be one of: easy, medium, hard',
      });
    }

    return this.appService.getLeaderboard(difficulty as Difficulty);
  }
}
