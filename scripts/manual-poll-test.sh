#!/bin/bash

echo "🧪 Poll API 수동 테스트"
echo "======================="
echo ""

# 테스트 게시글 ID (수동으로 생성 필요)
POST_ID=1
USER_ID="550e8400-e29b-41d4-a716-446655440000"

BASE_URL="https://athletetime-backend.onrender.com"

echo "1️⃣  투표 제출 테스트"
curl -X POST "$BASE_URL/api/posts/$POST_ID/poll/vote" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$USER_ID\", \"option_ids\": [1]}" \
  | jq '.'
echo ""

echo "2️⃣  투표 결과 조회 테스트"
curl -s "$BASE_URL/api/posts/$POST_ID/poll/results" | jq '.'
echo ""

echo "3️⃣  투표 취소 테스트"
curl -X DELETE "$BASE_URL/api/posts/$POST_ID/poll/vote" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$USER_ID\"}" \
  | jq '.'
echo ""

echo "✅ 수동 테스트 완료"
