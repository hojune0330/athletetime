#!/bin/bash

# Netlify 배포용 ZIP 파일 생성 스크립트

echo "🚀 Netlify 배포용 ZIP 파일 생성 중..."

# 기존 ZIP 파일 삭제
rm -f athletetime-for-netlify.zip

# athletetime-netlify 폴더로 이동
cd athletetime-netlify

# 폴더 내용물만 ZIP으로 압축 (폴더 자체는 포함 안 함)
zip -r ../athletetime-for-netlify.zip . -x "*.DS_Store" -x "__MACOSX/*"

cd ..

# 파일 크기 확인
echo "✅ ZIP 파일 생성 완료!"
ls -lh athletetime-for-netlify.zip

echo ""
echo "📌 이제 athletetime-for-netlify.zip 파일을 Netlify에 업로드하세요!"
echo "   1. Netlify 대시보드 접속"
echo "   2. 'Drag and drop your site folder here' 영역에"
echo "   3. athletetime-for-netlify.zip 파일 드래그"