#!/bin/bash
echo "🧪 육상 커뮤니티 API 테스트"
echo "================================"
echo ""

echo "1️⃣ 헬스 체크..."
curl -s http://localhost:3005/api/health | jq -r '.status'
echo ""

echo "2️⃣ 통계 조회..."
curl -s http://localhost:3005/api/stats | jq '.stats'
echo ""

echo "3️⃣ 게시글 목록..."
curl -s http://localhost:3005/api/posts | jq '.posts | length'
echo ""

echo "4️⃣ 공지사항 카테고리..."
curl -s "http://localhost:3005/api/posts/category/%EA%B3%B5%EC%A7%80" | jq '.count'
echo ""

echo "✅ 모든 테스트 완료!"
