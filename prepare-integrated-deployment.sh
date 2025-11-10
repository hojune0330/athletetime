#!/bin/bash

# Athlete Time 통합 네비게이션 배포 준비 스크립트

echo "🚀 Athlete Time 통합 네비게이션 배포 준비 시작..."

# 1. Netlify 설정 파일 백업 및 교체
echo "📋 Netlify 설정 파일 구성..."
if [ -f "netlify.toml" ]; then
    cp netlify.toml netlify-community.toml
    echo "✅ 기존 netlify.toml 백업 완료"
fi

cp netlify-main.toml netlify.toml
echo "✅ 통합 네비게이션용 Netlify 설정 적용"

# 2. HTML 파일들이 존재하는지 확인
echo "🔍 HTML 파일 확인..."
required_files=(
    "index.html"
    "pace-calculator.html"
    "training-calculator.html"
    "chat.html"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 존재"
    else
        echo "❌ $file 없음 - 배포 실패 가능성 있음"
    fi
done

# 3. index.html이 통합 버전인지 확인
echo "🧭 index.html 통합 네비게이션 확인..."
if grep -q "IntegratedApp" index.html; then
    echo "✅ index.html에 통합 네비게이션 적용됨"
else
    echo "⚠️  index.html에 통합 네비게이션이 없음"
fi

# 4. 외부 링크 확인
echo "🔗 외부 링크 확인..."
if grep -q "athlete-time.netlify.app/community" index.html; then
    echo "✅ 커뮤니티 외부 링크 설정됨"
fi

# 5. 배포용 압축 파일 생성
echo "📦 배포용 파일 준비..."
if [ -f "athletetime-integrated.zip" ]; then
    rm athletetime-integrated.zip
fi

# 필요한 파일들만 선택하여 압축
zip -r athletetime-integrated.zip \
    index.html \
    pace-calculator.html \
    training-calculator.html \
    chat.html \
    netlify.toml \
    _redirects \
    *.js \
    *.css \
    src/ \
    assets/ \
    images/ \
    -x "node_modules/*" "*.zip" "*.tar.gz" 2>/dev/null || true

echo "✅ athletetime-integrated.zip 생성 완료"

# 6. 배포 지침 출력
echo ""
echo "🎯 배포 지침:"
echo "1. Netlify 대시보드에서 athlete-time.netlify.app 사이트로 이동"
echo "2. "Deploy settings"에서 배포 파일로 athletetime-integrated.zip 업로드"
echo "3. 또는 Git 연결을 통해 자동 배포 설정"
echo ""
echo "📊 배포 파일 정보:"
ls -lh athletetime-integrated.zip 2>/dev/null || echo "압축 파일 생성 실패"

echo ""
echo "✨ 통합 네비게이션 배포 준비 완료!"
echo "이제 https://athlete-time.netlify.app/ 에서 통합 네비게이션을 확인하세요."