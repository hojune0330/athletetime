#!/bin/bash

echo "🚀 Athlete Time 서버 시작..."

# Node.js 체크
if ! command -v node &> /dev/null; then
    echo "❌ Node.js가 설치되어 있지 않습니다."
    exit 1
fi

# 의존성 설치
if [ ! -d "node_modules" ]; then
    echo "📦 의존성 설치 중..."
    npm install
fi

# 환경 변수 확인
if [ ! -f ".env" ]; then
    echo "⚠️ .env 파일이 없습니다. .env.example을 복사합니다."
    cp .env.example .env
fi

# 서버 시작
echo "✅ 서버 시작..."
npm run production
