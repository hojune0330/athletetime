/**
 * 익명 사용자 ID 관리 유틸리티
 * 
 * localStorage를 사용하여 익명 사용자를 추적하고,
 * 향후 회원 시스템으로 전환 시 기존 게시물/댓글을 연결할 수 있도록 함
 */

import { STORAGE_KEYS } from '../types/post';

/**
 * 익명 사용자 ID 생성
 * 
 * 형식: anon_${timestamp}_${random}
 * 예시: anon_1730208000000_a8f3c2
 */
function generateAnonymousId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `anon_${timestamp}_${random}`;
}

/**
 * 익명 사용자 ID 가져오기 (없으면 생성)
 */
export function getAnonymousId(): string {
  let anonymousId = localStorage.getItem(STORAGE_KEYS.ANONYMOUS_ID);
  
  if (!anonymousId) {
    anonymousId = generateAnonymousId();
    localStorage.setItem(STORAGE_KEYS.ANONYMOUS_ID, anonymousId);
    
    // 생성 시간 저장
    localStorage.setItem(`${STORAGE_KEYS.ANONYMOUS_ID}_created`, new Date().toISOString());
  }
  
  return anonymousId;
}

/**
 * 익명 사용자 이름 가져오기
 */
export function getUsername(): string | null {
  return localStorage.getItem(STORAGE_KEYS.USERNAME);
}

/**
 * 익명 사용자 이름 설정
 */
export function setUsername(username: string): void {
  localStorage.setItem(STORAGE_KEYS.USERNAME, username);
}

/**
 * 투표 기록 저장
 * 
 * @param postId - 게시글 ID
 * @param voteType - 'like' | 'dislike'
 */
export function saveVoteRecord(postId: number, voteType: 'like' | 'dislike'): void {
  const votedPosts = getVotedPosts();
  votedPosts[postId] = voteType;
  localStorage.setItem(STORAGE_KEYS.VOTED_POSTS, JSON.stringify(votedPosts));
}

/**
 * 투표 기록 가져오기
 */
export function getVotedPosts(): Record<number, 'like' | 'dislike'> {
  const stored = localStorage.getItem(STORAGE_KEYS.VOTED_POSTS);
  if (!stored) return {};
  
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

/**
 * 특정 게시글에 투표했는지 확인
 */
export function hasVoted(postId: number): { voted: boolean; type?: 'like' | 'dislike' } {
  const votedPosts = getVotedPosts();
  const voteType = votedPosts[postId];
  
  return {
    voted: !!voteType,
    type: voteType,
  };
}

/**
 * 투표 기록 제거 (재투표 시)
 */
export function removeVoteRecord(postId: number): void {
  const votedPosts = getVotedPosts();
  delete votedPosts[postId];
  localStorage.setItem(STORAGE_KEYS.VOTED_POSTS, JSON.stringify(votedPosts));
}

/**
 * 익명 사용자 정보 초기화 (테스트용)
 */
export function clearAnonymousData(): void {
  localStorage.removeItem(STORAGE_KEYS.ANONYMOUS_ID);
  localStorage.removeItem(STORAGE_KEYS.USERNAME);
  localStorage.removeItem(STORAGE_KEYS.VOTED_POSTS);
  localStorage.removeItem(`${STORAGE_KEYS.ANONYMOUS_ID}_created`);
}

/**
 * 익명 사용자 정보 전체 가져오기
 */
export function getAnonymousUserInfo() {
  return {
    anonymousId: getAnonymousId(),
    username: getUsername(),
    votedPosts: getVotedPosts(),
    createdAt: localStorage.getItem(`${STORAGE_KEYS.ANONYMOUS_ID}_created`),
  };
}

/**
 * 회원 전환 시 호출할 함수 (향후 구현)
 * 
 * anonymousId를 사용하여 기존 게시물/댓글을 회원 계정으로 연결
 */
export async function convertToMember(
  email: string,
  _password: string,
  nickname: string
): Promise<void> {
  const anonymousId = getAnonymousId();
  
  // TODO: 백엔드 API 호출
  // POST /api/auth/convert
  // { anonymousId, email, password: _password, nickname }
  
  console.log('[TODO] Convert anonymous user to member:', {
    anonymousId,
    email,
    nickname,
  });
  
  // 전환 후 익명 ID 유지 (히스토리 연결을 위해)
  // localStorage.removeItem(STORAGE_KEYS.ANONYMOUS_ID);
}
