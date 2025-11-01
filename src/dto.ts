export type Difficulty = 'easy' | 'medium' | 'hard';

export interface RecordRequest {
  name: string;
  difficulty: Difficulty;
  score: number;
  durationMs: number;
  avgCatchMs: number;
  caught: number;
}

export interface LeaderboardEntry {
  id: string;
  rank?: number;
  name: string;
  difficulty: Difficulty;
  score: number;
  durationMs: number;
  avgCatchMs: number;
  caught: number;
  createdAt: number;
}

/**
 * 유효성 검사 헬퍼 함수
 */
export function validateRecordRequest(
  request: RecordRequest,
): { valid: boolean; message?: string } {
  // name 검증: 1~12자
  if (!request.name || typeof request.name !== 'string') {
    return { valid: false, message: 'name is required (1~12 characters)' };
  }
  if (request.name.length < 1 || request.name.length > 12) {
    return { valid: false, message: 'name must be 1~12 characters' };
  }

  // difficulty 검증
  if (!['easy', 'medium', 'hard'].includes(request.difficulty)) {
    return {
      valid: false,
      message: 'difficulty must be one of: easy, medium, hard',
    };
  }

  // score 검증: 정수, -999~999
  if (typeof request.score !== 'number' || !Number.isInteger(request.score)) {
    return { valid: false, message: 'score must be an integer' };
  }
  if (request.score < -999 || request.score > 999) {
    return {
      valid: false,
      message: 'score must be an integer between -999 and 999',
    };
  }

  // durationMs 검증: 1000~120000
  if (
    typeof request.durationMs !== 'number' ||
    !Number.isInteger(request.durationMs)
  ) {
    return { valid: false, message: 'durationMs must be an integer' };
  }
  if (request.durationMs < 1000 || request.durationMs > 120000) {
    return {
      valid: false,
      message: 'durationMs must be between 1000 and 120000',
    };
  }

  // avgCatchMs 검증: >= 0
  if (typeof request.avgCatchMs !== 'number') {
    return { valid: false, message: 'avgCatchMs must be a number' };
  }
  if (request.avgCatchMs < 0) {
    return { valid: false, message: 'avgCatchMs must be >= 0' };
  }

  // caught 검증: 정수, >= 0
  if (typeof request.caught !== 'number' || !Number.isInteger(request.caught)) {
    return { valid: false, message: 'caught must be an integer' };
  }
  if (request.caught < 0) {
    return { valid: false, message: 'caught must be >= 0' };
  }

  // avgCatchMs와 caught 일관성 체크 (caught가 0이면 avgCatchMs는 0이어야 함)
  if (request.caught === 0 && request.avgCatchMs !== 0) {
    return {
      valid: false,
      message: 'avgCatchMs must be 0 when caught is 0',
    };
  }

  return { valid: true };
}
