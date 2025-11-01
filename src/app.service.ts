import { Injectable, BadRequestException } from '@nestjs/common';
import { Difficulty, LeaderboardEntry, RecordRequest } from './dto';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AppService {
  // 인메모리 저장소: 난이도별로 배열 관리
  private records: Map<Difficulty, LeaderboardEntry[]> = new Map([
    ['easy', []],
    ['medium', []],
    ['hard', []],
  ]);

  // 레이트 리밋: IP별 마지막 제출 시간 추적 (간단 구현)
  private lastSubmission: Map<string, number> = new Map();
  private readonly RATE_LIMIT_MS = 3000; // 3초

  /**
   * 랭킹 정렬 함수
   * score 내림차순 → durationMs 오름차순 → createdAt 오름차순
   */
  private sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    return entries.sort((a, b) => {
      // 1. score 내림차순
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 2. durationMs 오름차순
      if (a.durationMs !== b.durationMs) {
        return a.durationMs - b.durationMs;
      }
      // 3. createdAt 오름차순
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * 게임 결과 저장
   */
  createRecord(request: RecordRequest, clientIp: string): {
    stored: boolean;
    id: string;
    rankPreview: {
      difficulty: Difficulty;
      score: number;
      estimatedRank: number;
    };
  } {
    // 레이트 리밋 체크
    const lastTime = this.lastSubmission.get(clientIp);
    const now = Date.now();
    if (lastTime && now - lastTime < this.RATE_LIMIT_MS) {
      const retryAfterSec = Math.ceil(
        (this.RATE_LIMIT_MS - (now - lastTime)) / 1000,
      );
      throw new BadRequestException({
        error: 'TOO_MANY_REQUESTS',
        retryAfterSec,
      });
    }

    // 새 레코드 생성
    const entry: LeaderboardEntry = {
      id: randomUUID(),
      name: request.name,
      difficulty: request.difficulty,
      score: request.score,
      durationMs: request.durationMs,
      avgCatchMs: request.avgCatchMs,
      caught: request.caught,
      createdAt: now,
    };

    // 난이도별 배열에 추가
    const difficultyRecords = this.records.get(request.difficulty) || [];
    difficultyRecords.push(entry);

    // 정렬
    const sorted = this.sortEntries(difficultyRecords);

    // 최대 100개까지만 유지 (메모리 관리)
    if (sorted.length > 100) {
      sorted.splice(100);
    }

    this.records.set(request.difficulty, sorted);

    // 랭킹 계산 (1-based)
    const rank = sorted.findIndex((e) => e.id === entry.id) + 1;

    // 레이트 리밋 업데이트
    this.lastSubmission.set(clientIp, now);

    return {
      stored: true,
      id: entry.id,
      rankPreview: {
        difficulty: request.difficulty,
        score: request.score,
        estimatedRank: rank,
      },
    };
  }

  /**
   * 난이도별 랭킹 조회 (TOP 5)
   */
  getLeaderboard(difficulty: Difficulty): {
    difficulty: Difficulty;
    top: LeaderboardEntry[];
  } {
    const records = this.records.get(difficulty) || [];
    const sorted = this.sortEntries([...records]); // 복사본 정렬

    // TOP 5만 반환 (rank 필드 포함)
    const top5 = sorted.slice(0, 5).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    return {
      difficulty,
      top: top5,
    };
  }

  /**
   * Health check
   */
  getHealth(): { ok: boolean; ts: number } {
    return {
      ok: true,
      ts: Date.now(),
    };
  }
}
