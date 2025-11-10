#!/bin/bash

# Render.com PostgreSQL 연결 정보
DB_URL="postgresql://athletetime:HuLeWIZPaVjLZarPddNtnX96g7K3jhhA@dpg-d3j9gkd6ubrc73cm1gn0-a.oregon-postgres.render.com/athletetime"

echo "🔄 데이터베이스 마이그레이션 실행 중..."
echo ""

# 마이그레이션 실행
psql "$DB_URL" -f database/migration-001-add-auth.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 마이그레이션 완료!"
    echo ""
    echo "이제 회원가입 기능을 테스트할 수 있습니다."
else
    echo ""
    echo "❌ 마이그레이션 실패"
    echo "Render.com Shell을 사용해서 직접 실행해주세요."
fi
