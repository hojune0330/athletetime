// 실시간 개발 충돌 모니터링 시스템
// GenSpark AI - 2025-11-10

class RealTimeConflictMonitor {
    constructor() {
        this.vulnerableFiles = [
            'community-posts.json',
            'manifest.json',
            'package.json',
            '.env',
            'netlify.toml'
        ];
        
        this.lastModified = new Map();
        this.conflictCount = 0;
        
        this.startMonitoring();
    }

    // 실시간 파일 변경 감지
    startMonitoring() {
        console.log('🔍 실시간 충돌 모니터링 시작...');
        
        setInterval(() => {
            this.checkFileChanges();
            this.checkGitConflicts();
        }, 5000); // 5초마다 확인
    }

    // 파일 변경 감지
    checkFileChanges() {
        const fs = require('fs');
        
        this.vulnerableFiles.forEach(file => {
            try {
                const stats = fs.statSync(file);
                const currentTime = stats.mtime.getTime();
                const lastTime = this.lastModified.get(file);
                
                if (lastTime && currentTime !== lastTime) {
                    console.log(`⚠️ 파일 변경 감지: ${file}`);
                    this.handlePotentialConflict(file);
                }
                
                this.lastModified.set(file, currentTime);
            } catch (error) {
                console.error(`❌ 파일 확인 실패: ${file}`, error.message);
            }
        });
    }

    // Git 충돌 확인
    checkGitConflicts() {
        const { execSync } = require('child_process');
        
        try {
            // 원격 변경사항 확인
            execSync('git fetch origin main', { stdio: 'ignore' });
            
            const behind = execSync('git rev-list HEAD..origin/main --count', { encoding: 'utf8' }).trim();
            const ahead = execSync('git rev-list origin/main..HEAD --count', { encoding: 'utf8' }).trim();
            
            if (parseInt(behind) > 0) {
                console.log(`🚨 원격 저장소 충돌 위험: ${behind} commits behind`);
                this.conflictCount++;
                
                if (this.conflictCount > 3) {
                    console.log('🔴 반복 충돌 감지! 즉시 조치 필요');
                    this.emergencyProtocol();
                }
            }
            
            console.log(`📊 상태: ${ahead} ahead, ${behind} behind`);
            
        } catch (error) {
            console.error('❌ Git 확인 실패:', error.message);
        }
    }

    // 잠재적 충돌 처리
    handlePotentialConflict(file) {
        console.log(`🛡️ 잠재적 충돌 처리: ${file}`);
        
        // 긴급 백업 생성
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = `${file}.backup.${timestamp}`;
        
        const { execSync } = require('child_process');
        try {
            execSync(`cp ${file} ${backupFile}`);
            console.log(`✅ 백업 생성됨: ${backupFile}`);
        } catch (error) {
            console.error(`❌ 백업 실패: ${file}`, error.message);
        }
    }

    // 비상 프로토콜
    emergencyProtocol() {
        console.log('🚨 비상 프로토콜 발동!');
        
        const { execSync } = require('child_process');
        try {
            // 자동 복구 시도
            execSync('git stash && git pull origin main && git stash pop');
            console.log('✅ 자동 복구 완료');
            this.conflictCount = 0;
        } catch (error) {
            console.error('❌ 자동 복구 실패. 수동 개입 필요');
            process.exit(1);
        }
    }
}

// 모니터링 시작
if (require.main === module) {
    new RealTimeConflictMonitor();
}

module.exports = RealTimeConflictMonitor;