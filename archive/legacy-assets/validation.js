/**
 * 입력 검증 및 에러 처리 시스템
 */

const ValidationSystem = {
    // 검증 규칙
    rules: {
        // 시간 검증
        time: {
            hours: {
                min: 0,
                max: 23,
                message: '시간은 0-23 사이여야 합니다'
            },
            minutes: {
                min: 0,
                max: 59,
                message: '분은 0-59 사이여야 합니다'
            },
            seconds: {
                min: 0,
                max: 59,
                message: '초는 0-59 사이여야 합니다'
            }
        },
        
        // VDOT 검증
        vdot: {
            min: 20,
            max: 85,
            message: 'VDOT는 20-85 사이여야 합니다'
        },
        
        // 거리 검증
        distance: {
            min: 100,
            max: 100000,
            message: '거리는 100m-100km 사이여야 합니다'
        }
    },

    // 페이스 계산기 입력 검증
    validatePaceInput: function(hours, minutes, seconds, distance) {
        const errors = [];
        
        // 시간 검증
        if (hours !== null && hours !== undefined) {
            const h = parseInt(hours);
            if (isNaN(h) || h < 0 || h > 23) {
                errors.push({ field: 'hours', message: this.rules.time.hours.message });
            }
        }
        
        if (minutes !== null && minutes !== undefined) {
            const m = parseInt(minutes);
            if (isNaN(m) || m < 0 || m > 59) {
                errors.push({ field: 'minutes', message: this.rules.time.minutes.message });
            }
        }
        
        if (seconds !== null && seconds !== undefined) {
            const s = parseInt(seconds);
            if (isNaN(s) || s < 0 || s > 59) {
                errors.push({ field: 'seconds', message: this.rules.time.seconds.message });
            }
        }
        
        // 최소 시간 검증 (최소 1초)
        const totalSeconds = (parseInt(hours) || 0) * 3600 + 
                           (parseInt(minutes) || 0) * 60 + 
                           (parseInt(seconds) || 0);
        
        if (totalSeconds === 0) {
            errors.push({ field: 'time', message: '시간을 입력해주세요' });
        }
        
        // 거리 검증
        if (distance) {
            const d = parseInt(distance);
            if (isNaN(d) || d < this.rules.distance.min || d > this.rules.distance.max) {
                errors.push({ field: 'distance', message: this.rules.distance.message });
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    // VDOT 검증
    validateVDOT: function(vdot) {
        const value = parseFloat(vdot);
        
        if (isNaN(value)) {
            return {
                isValid: false,
                errors: [{ field: 'vdot', message: '숫자를 입력해주세요' }]
            };
        }
        
        if (value < this.rules.vdot.min || value > this.rules.vdot.max) {
            return {
                isValid: false,
                errors: [{ field: 'vdot', message: this.rules.vdot.message }]
            };
        }
        
        return {
            isValid: true,
            errors: []
        };
    },

    // 실시간 입력 검증 설정
    attachRealtimeValidation: function(inputElement, type, customValidator) {
        let errorElement = inputElement.nextElementSibling;
        
        // 에러 메시지 엘리먼트가 없으면 생성
        if (!errorElement || !errorElement.classList.contains('validation-error')) {
            errorElement = document.createElement('span');
            errorElement.className = 'validation-error text-danger text-sm';
            errorElement.style.display = 'none';
            inputElement.parentNode.insertBefore(errorElement, inputElement.nextSibling);
        }
        
        // 입력 이벤트 리스너
        inputElement.addEventListener('input', () => {
            this.validateInput(inputElement, type, errorElement, customValidator);
        });
        
        // 블러 이벤트 리스너
        inputElement.addEventListener('blur', () => {
            this.validateInput(inputElement, type, errorElement, customValidator);
        });
        
        // 초기 상태 설정
        inputElement.classList.add('has-validation');
    },

    // 개별 입력 검증
    validateInput: function(input, type, errorElement, customValidator) {
        const value = input.value.trim();
        let isValid = true;
        let message = '';
        
        // 커스텀 검증
        if (customValidator) {
            const result = customValidator(value);
            isValid = result.isValid;
            message = result.message || '';
        } else {
            // 기본 검증
            switch(type) {
                case 'hours':
                    const h = parseInt(value);
                    if (value && (isNaN(h) || h < 0 || h > 23)) {
                        isValid = false;
                        message = this.rules.time.hours.message;
                    }
                    break;
                    
                case 'minutes':
                case 'seconds':
                    const v = parseInt(value);
                    if (value && (isNaN(v) || v < 0 || v > 59)) {
                        isValid = false;
                        message = this.rules.time[type].message;
                    }
                    break;
                    
                case 'vdot':
                    const vdot = parseFloat(value);
                    if (value && (isNaN(vdot) || vdot < 20 || vdot > 85)) {
                        isValid = false;
                        message = this.rules.vdot.message;
                    }
                    break;
                    
                case 'required':
                    if (!value) {
                        isValid = false;
                        message = '이 필드는 필수입니다';
                    }
                    break;
                    
                case 'number':
                    if (value && isNaN(value)) {
                        isValid = false;
                        message = '숫자를 입력해주세요';
                    }
                    break;
            }
        }
        
        // UI 업데이트
        if (isValid) {
            input.classList.remove('error');
            input.classList.add('success');
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        } else {
            input.classList.add('error');
            input.classList.remove('success');
            errorElement.style.display = 'block';
            errorElement.textContent = message;
        }
        
        return isValid;
    },

    // 폼 전체 검증
    validateForm: function(formElement) {
        const inputs = formElement.querySelectorAll('.has-validation');
        let isValid = true;
        
        inputs.forEach(input => {
            const errorElement = input.nextElementSibling;
            if (errorElement && errorElement.classList.contains('validation-error')) {
                const type = input.dataset.validationType || 'required';
                const result = this.validateInput(input, type, errorElement);
                if (!result) isValid = false;
            }
        });
        
        return isValid;
    },

    // 에러 메시지 표시
    showError: function(message, field) {
        // 토스트 메시지
        if (window.UIUtils) {
            window.UIUtils.showToast(message, 'error');
        }
        
        // 필드 하이라이트
        if (field) {
            const element = document.getElementById(field) || 
                           document.querySelector(`[name="${field}"]`);
            if (element) {
                element.classList.add('error');
                element.focus();
                
                // 3초 후 에러 스타일 제거
                setTimeout(() => {
                    element.classList.remove('error');
                }, 3000);
            }
        }
    },

    // 성공 메시지 표시
    showSuccess: function(message) {
        if (window.UIUtils) {
            window.UIUtils.showToast(message, 'success');
        }
    },

    // 경고 메시지 표시
    showWarning: function(message) {
        if (window.UIUtils) {
            window.UIUtils.showToast(message, 'warning');
        }
    },

    // 입력 필드 초기화
    clearValidation: function(formElement) {
        const inputs = formElement.querySelectorAll('.has-validation');
        inputs.forEach(input => {
            input.classList.remove('error', 'success');
            const errorElement = input.nextElementSibling;
            if (errorElement && errorElement.classList.contains('validation-error')) {
                errorElement.style.display = 'none';
                errorElement.textContent = '';
            }
        });
    }
};

// CSS 스타일 추가
const validationStyles = `
    <style>
    .validation-error {
        display: block;
        color: var(--danger);
        font-size: 0.875rem;
        margin-top: 0.25rem;
    }
    
    input.error {
        border-color: var(--danger) !important;
        background-color: rgba(239, 68, 68, 0.05);
    }
    
    input.success {
        border-color: var(--success) !important;
        background-color: rgba(16, 185, 129, 0.05);
    }
    
    .error-shake {
        animation: shake 0.5s;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    </style>
`;

// 스타일 삽입
if (!document.querySelector('#validation-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'validation-styles';
    styleElement.innerHTML = validationStyles;
    document.head.appendChild(styleElement.firstChild);
}

// 전역 객체로 내보내기
window.ValidationSystem = ValidationSystem;