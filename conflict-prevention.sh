#!/bin/bash

# GenSpark AI 실시간 충돌 방지 시스템
# 사용법: ./conflict-prevention.sh

echo "🛡️ 실시간 충돌 방지 시스템 가동"

# 1. 데이터 파일 잠금
lock_data_files() {
    echo "📁 데이터 파일 보호 중..."
    for file in community-posts.json *.db *.sqlite; do
        if [ -f "$file" ]; then
            chmod 444 "$file" 2>/dev/null || true
            echo "🔒 $file 보호됨"
        fi
    done
}

# 2. 프로세스 중복 확인
check_duplicate_processes() {
    echo "🔍 중복 프로세스 확인..."
    VITE_COUNT=$(ps aux | grep -c "vite" | grep -v grep || echo "0")
    if [ "$VITE_COUNT" -gt 3 ]; then
        echo "⚠️  중복 Vite 프로세스 발견: $VITE_COUNT 개"
        echo "🔄 프로세스 정리가 필요합니다"
    fi
}

# 3. Git 상태 실시간 모니터링
monitor_git_status() {
    echo "📊 Git 상태 모니터링..."
    git fetch origin main 2>/dev/null
    BEHIND=$(git rev-list HEAD..origin/main --count)
    AHEAD=$(git rev-list origin/main..HEAD --count)
    
    echo "📈 원격 대비 상태: $AHEAD ahead, $BEHIND behind"
    
    if [ "$BEHIND" -gt 0 ]; then
        echo "⚠️  원격 저장소에 새로운 변경사항 있음"
        return 1
    fi
    return 0
}

# 4. 자동 복구 메커니즘
auto_recovery() {
    echo "🔄 자동 복구 시도..."
    git stash && git pull origin main && git stash pop 2>/dev/null || {
        echo "❌ 자동 복구 실패. 수동 개입 필요"
        return 1
    }
    echo "✅ 자동 복구 완료"
    return 0
}

# 메인 실행
main() {
    lock_data_files
    check_duplicate_processes
    
    if ! monitor_git_status; then
        auto_recovery
    fi
    
    echo "🎯 충돌 방지 시스템 완료"
}

main "$@"