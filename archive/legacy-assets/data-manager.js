/**
 * 데이터 관리자 - LocalStorage를 활용한 데이터 저장/불러오기
 */

const DataManager = {
    // 저장소 키 정의
    KEYS: {
        PACE_HISTORY: 'athletetime_pace_history',
        TRAINING_HISTORY: 'athletetime_training_history',
        USER_PREFERENCES: 'athletetime_preferences',
        RECENT_CALCULATIONS: 'athletetime_recent'
    },

    // 페이스 계산 결과 저장
    savePaceCalculation: function(data) {
        try {
            const history = this.getPaceHistory();
            const calculation = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                distance: data.distance,
                time: data.time,
                pace: data.pace,
                vdot: data.vdot,
                results: data.results
            };
            
            history.unshift(calculation);
            
            // 최대 50개까지만 저장
            if (history.length > 50) {
                history = history.slice(0, 50);
            }
            
            localStorage.setItem(this.KEYS.PACE_HISTORY, JSON.stringify(history));
            return calculation;
        } catch (e) {
            console.error('페이스 계산 저장 실패:', e);
            return null;
        }
    },

    // 페이스 히스토리 가져오기
    getPaceHistory: function() {
        try {
            const data = localStorage.getItem(this.KEYS.PACE_HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('페이스 히스토리 로드 실패:', e);
            return [];
        }
    },

    // 훈련 계산 결과 저장
    saveTrainingCalculation: function(data) {
        try {
            const history = this.getTrainingHistory();
            const calculation = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                vdot: data.vdot,
                level: data.level,
                goal: data.goal,
                frequency: data.frequency,
                zones: data.zones,
                weeklyPlan: data.weeklyPlan
            };
            
            history.unshift(calculation);
            
            // 최대 50개까지만 저장
            if (history.length > 50) {
                history = history.slice(0, 50);
            }
            
            localStorage.setItem(this.KEYS.TRAINING_HISTORY, JSON.stringify(history));
            return calculation;
        } catch (e) {
            console.error('훈련 계산 저장 실패:', e);
            return null;
        }
    },

    // 훈련 히스토리 가져오기
    getTrainingHistory: function() {
        try {
            const data = localStorage.getItem(this.KEYS.TRAINING_HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('훈련 히스토리 로드 실패:', e);
            return [];
        }
    },

    // 사용자 설정 저장
    savePreferences: function(prefs) {
        try {
            const current = this.getPreferences();
            const updated = { ...current, ...prefs };
            localStorage.setItem(this.KEYS.USER_PREFERENCES, JSON.stringify(updated));
            return updated;
        } catch (e) {
            console.error('설정 저장 실패:', e);
            return null;
        }
    },

    // 사용자 설정 가져오기
    getPreferences: function() {
        try {
            const data = localStorage.getItem(this.KEYS.USER_PREFERENCES);
            return data ? JSON.parse(data) : {
                darkMode: false,
                language: 'ko',
                units: 'metric',
                defaultDistance: '10000',
                defaultVDOT: 45
            };
        } catch (e) {
            console.error('설정 로드 실패:', e);
            return {};
        }
    },

    // 최근 계산 저장
    saveRecentCalculation: function(type, data) {
        try {
            const recent = this.getRecentCalculations();
            recent[type] = {
                ...data,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(this.KEYS.RECENT_CALCULATIONS, JSON.stringify(recent));
            return recent;
        } catch (e) {
            console.error('최근 계산 저장 실패:', e);
            return null;
        }
    },

    // 최근 계산 가져오기
    getRecentCalculations: function() {
        try {
            const data = localStorage.getItem(this.KEYS.RECENT_CALCULATIONS);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('최근 계산 로드 실패:', e);
            return {};
        }
    },

    // 특정 계산 결과 가져오기
    getCalculationById: function(type, id) {
        const history = type === 'pace' ? this.getPaceHistory() : this.getTrainingHistory();
        return history.find(item => item.id === id);
    },

    // 특정 계산 결과 삭제
    deleteCalculation: function(type, id) {
        try {
            const key = type === 'pace' ? this.KEYS.PACE_HISTORY : this.KEYS.TRAINING_HISTORY;
            const history = type === 'pace' ? this.getPaceHistory() : this.getTrainingHistory();
            const filtered = history.filter(item => item.id !== id);
            localStorage.setItem(key, JSON.stringify(filtered));
            return true;
        } catch (e) {
            console.error('계산 결과 삭제 실패:', e);
            return false;
        }
    },

    // 모든 데이터 내보내기
    exportAllData: function() {
        const data = {
            paceHistory: this.getPaceHistory(),
            trainingHistory: this.getTrainingHistory(),
            preferences: this.getPreferences(),
            recentCalculations: this.getRecentCalculations(),
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `athletetime-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        return data;
    },

    // 데이터 가져오기
    importData: function(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            if (data.paceHistory) {
                localStorage.setItem(this.KEYS.PACE_HISTORY, JSON.stringify(data.paceHistory));
            }
            if (data.trainingHistory) {
                localStorage.setItem(this.KEYS.TRAINING_HISTORY, JSON.stringify(data.trainingHistory));
            }
            if (data.preferences) {
                localStorage.setItem(this.KEYS.USER_PREFERENCES, JSON.stringify(data.preferences));
            }
            if (data.recentCalculations) {
                localStorage.setItem(this.KEYS.RECENT_CALCULATIONS, JSON.stringify(data.recentCalculations));
            }
            
            return true;
        } catch (e) {
            console.error('데이터 가져오기 실패:', e);
            return false;
        }
    },

    // 모든 데이터 초기화
    clearAllData: function() {
        if (confirm('모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            Object.values(this.KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        }
        return false;
    },

    // 용량 확인
    getStorageInfo: function() {
        let totalSize = 0;
        const breakdown = {};
        
        Object.entries(this.KEYS).forEach(([name, key]) => {
            const data = localStorage.getItem(key);
            if (data) {
                const size = new Blob([data]).size;
                totalSize += size;
                breakdown[name] = {
                    size: size,
                    sizeKB: (size / 1024).toFixed(2)
                };
            }
        });
        
        return {
            totalSize,
            totalSizeKB: (totalSize / 1024).toFixed(2),
            breakdown,
            maxSize: 5 * 1024 * 1024, // 5MB (localStorage 제한)
            usage: ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(2) + '%'
        };
    }
};

// 전역 객체로 내보내기
window.DataManager = DataManager;