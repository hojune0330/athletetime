// KAAF 2025 대회 일정 달력 시스템
class CompetitionsCalendar {
    constructor() {
        this.competitions = [];
        this.currentMonth = new Date().getMonth();
        this.currentYear = 2025;
        this.currentView = 'calendar';
        this.filters = {
            search: '',
            categories: ['all'],
            organizer: ''
        };
        
        this.init();
    }

    async init() {
        try {
            // 데이터 로드
            await this.loadCompetitions();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 초기 렌더링
            this.render();
            
            // 통계 업데이트
            this.updateStatistics();
        } catch (error) {
            console.error('초기화 오류:', error);
            this.showError('대회 일정을 불러오는데 실패했습니다.');
        }
    }

    async loadCompetitions() {
        try {
            const response = await fetch('data/kaaf-2025-competitions.json');
            const data = await response.json();
            this.competitions = data.competitions;
            this.metadata = data.metadata;
            this.statistics = data.statistics;
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // 뷰 전환 버튼
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.closest('.view-btn').dataset.view);
            });
        });

        // 달력 네비게이션
        document.getElementById('prev-month').addEventListener('click', () => {
            this.changeMonth(-1);
        });

        document.getElementById('next-month').addEventListener('click', () => {
            this.changeMonth(1);
        });

        document.getElementById('today-btn').addEventListener('click', () => {
            this.goToToday();
        });

        // 검색
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.render();
        });

        // 카테고리 필터
        document.querySelectorAll('.filter-chip input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.updateCategoryFilters();
                this.render();
            });
        });

        // 주최기관 필터
        document.getElementById('organizer-select').addEventListener('change', (e) => {
            this.filters.organizer = e.target.value;
            this.render();
        });

        // 정렬 옵션
        document.getElementById('sort-select')?.addEventListener('change', (e) => {
            this.sortCompetitions(e.target.value);
            this.renderListView();
        });

        // 모달 닫기
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        document.querySelector('.popup-close').addEventListener('click', () => {
            this.closePopup();
        });

        // 모달 외부 클릭시 닫기
        document.getElementById('competition-modal').addEventListener('click', (e) => {
            if (e.target.id === 'competition-modal') {
                this.closeModal();
            }
        });
    }

    updateCategoryFilters() {
        const checkboxes = document.querySelectorAll('.filter-chip input');
        const selected = [];
        
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selected.push(checkbox.value);
            }
        });

        // 전체 체크박스 처리
        if (selected.includes('all')) {
            this.filters.categories = ['all'];
            checkboxes.forEach(checkbox => {
                if (checkbox.value !== 'all') {
                    checkbox.checked = false;
                    checkbox.parentElement.classList.remove('active');
                }
            });
        } else if (selected.length === 0) {
            // 아무것도 선택되지 않으면 전체 선택
            this.filters.categories = ['all'];
            document.querySelector('input[value="all"]').checked = true;
            document.querySelector('input[value="all"]').parentElement.classList.add('active');
        } else {
            this.filters.categories = selected;
            document.querySelector('input[value="all"]').checked = false;
            document.querySelector('input[value="all"]').parentElement.classList.remove('active');
        }

        // active 클래스 업데이트
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                checkbox.parentElement.classList.add('active');
            } else {
                checkbox.parentElement.classList.remove('active');
            }
        });
    }

    switchView(view) {
        this.currentView = view;
        
        // 뷰 버튼 활성화 상태 변경
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.view-btn[data-view="${view}"]`).classList.add('active');
        
        // 뷰 섹션 표시/숨김
        document.querySelectorAll('.view-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${view}-view`).classList.add('active');
        
        this.render();
    }

    changeMonth(direction) {
        this.currentMonth += direction;
        
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        } else if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        
        this.renderCalendarView();
    }

    goToToday() {
        const today = new Date();
        this.currentMonth = today.getMonth();
        this.currentYear = today.getFullYear();
        this.renderCalendarView();
    }

    render() {
        const filteredCompetitions = this.getFilteredCompetitions();
        
        switch (this.currentView) {
            case 'calendar':
                this.renderCalendarView();
                break;
            case 'list':
                this.renderListView();
                break;
            case 'timeline':
                this.renderTimelineView();
                break;
        }
    }

    getFilteredCompetitions() {
        return this.competitions.filter(comp => {
            // 검색 필터
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                if (!comp.title.toLowerCase().includes(searchTerm) && 
                    !comp.location.toLowerCase().includes(searchTerm)) {
                    return false;
                }
            }
            
            // 카테고리 필터
            if (!this.filters.categories.includes('all')) {
                if (!this.filters.categories.includes(comp.category)) {
                    return false;
                }
            }
            
            // 주최기관 필터
            if (this.filters.organizer && comp.organizer !== this.filters.organizer) {
                return false;
            }
            
            return true;
        });
    }

    renderCalendarView() {
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', 
                           '7월', '8월', '9월', '10월', '11월', '12월'];
        
        // 현재 월 표시 업데이트
        document.getElementById('current-month-display').textContent = 
            `${this.currentYear}년 ${monthNames[this.currentMonth]}`;
        
        // 달력 그리드 생성
        const calendarBody = document.getElementById('calendar-body');
        calendarBody.innerHTML = '';
        
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const prevLastDay = new Date(this.currentYear, this.currentMonth, 0);
        
        const startDate = firstDay.getDay();
        const lastDate = lastDay.getDate();
        const prevLastDate = prevLastDay.getDate();
        
        // 이전 달 날짜들
        for (let i = startDate - 1; i >= 0; i--) {
            const dayDiv = this.createCalendarDay(prevLastDate - i, true);
            calendarBody.appendChild(dayDiv);
        }
        
        // 현재 달 날짜들
        const today = new Date();
        const filteredCompetitions = this.getFilteredCompetitions();
        
        for (let date = 1; date <= lastDate; date++) {
            const dayDiv = this.createCalendarDay(date, false);
            
            // 오늘 날짜 체크
            if (this.currentYear === today.getFullYear() &&
                this.currentMonth === today.getMonth() &&
                date === today.getDate()) {
                dayDiv.classList.add('today');
            }
            
            // 해당 날짜의 대회들 추가
            const dayCompetitions = this.getCompetitionsForDate(
                this.currentYear, 
                this.currentMonth, 
                date, 
                filteredCompetitions
            );
            
            if (dayCompetitions.length > 0) {
                this.addEventsToDay(dayDiv, dayCompetitions, date);
            }
            
            calendarBody.appendChild(dayDiv);
        }
        
        // 다음 달 날짜들
        const remainingDays = 42 - (startDate + lastDate); // 6주 * 7일
        for (let date = 1; date <= remainingDays; date++) {
            const dayDiv = this.createCalendarDay(date, true);
            calendarBody.appendChild(dayDiv);
        }
        
        // 월간 대회 목록 업데이트
        this.renderMonthCompetitions(filteredCompetitions);
    }

    createCalendarDay(date, isOtherMonth) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        if (isOtherMonth) {
            dayDiv.classList.add('other-month');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date;
        dayDiv.appendChild(dayNumber);
        
        const eventsDiv = document.createElement('div');
        eventsDiv.className = 'day-events';
        dayDiv.appendChild(eventsDiv);
        
        return dayDiv;
    }

    getCompetitionsForDate(year, month, date, competitions) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
        
        return competitions.filter(comp => {
            const startDate = new Date(comp.start_date);
            const endDate = new Date(comp.end_date);
            const checkDate = new Date(dateStr);
            
            return checkDate >= startDate && checkDate <= endDate;
        });
    }

    addEventsToDay(dayDiv, competitions, date) {
        const eventsDiv = dayDiv.querySelector('.day-events');
        const maxDisplay = 2; // 최대 표시 개수
        
        competitions.slice(0, maxDisplay).forEach(comp => {
            const eventBar = document.createElement('div');
            eventBar.className = `event-bar ${this.getCategoryClass(comp.category)}`;
            
            // 여러 날짜에 걸친 대회인지 확인
            if (comp.start_date !== comp.end_date) {
                eventBar.classList.add('multi-day');
            }
            
            eventBar.textContent = this.truncateText(comp.title, 15);
            eventBar.title = comp.title;
            
            eventBar.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showCompetitionDetail(comp);
            });
            
            eventsDiv.appendChild(eventBar);
        });
        
        // 추가 대회가 있으면 표시
        if (competitions.length > maxDisplay) {
            const moreDiv = document.createElement('div');
            moreDiv.className = 'more-events';
            moreDiv.textContent = `+${competitions.length - maxDisplay} 더보기`;
            eventsDiv.appendChild(moreDiv);
        }
        
        // 날짜 클릭시 팝업
        dayDiv.addEventListener('click', () => {
            if (competitions.length > 0) {
                this.showDateCompetitions(date, competitions);
            }
        });
    }

    renderMonthCompetitions(competitions) {
        const monthCompetitions = competitions.filter(comp => {
            const startDate = new Date(comp.start_date);
            const endDate = new Date(comp.end_date);
            
            return (startDate.getFullYear() === this.currentYear && 
                    startDate.getMonth() === this.currentMonth) ||
                   (endDate.getFullYear() === this.currentYear && 
                    endDate.getMonth() === this.currentMonth);
        });
        
        const container = document.getElementById('month-competitions-list');
        
        if (monthCompetitions.length === 0) {
            container.innerHTML = '<p class="empty-state">이번 달 대회가 없습니다.</p>';
            return;
        }
        
        container.innerHTML = monthCompetitions.map(comp => `
            <div class="competition-item" data-id="${comp.id}">
                <div class="competition-info">
                    <div class="competition-title">${comp.title}</div>
                    <div class="competition-meta">
                        <span>📅 ${this.formatDateRange(comp.start_date, comp.end_date)}</span>
                        <span>📍 ${comp.location}</span>
                        <span>🏛️ ${comp.organizer}</span>
                    </div>
                </div>
                <span class="category-badge ${this.getCategoryClass(comp.category)}">
                    ${comp.category}
                </span>
            </div>
        `).join('');
        
        // 클릭 이벤트 추가
        container.querySelectorAll('.competition-item').forEach(item => {
            item.addEventListener('click', () => {
                const comp = competitions.find(c => c.id == item.dataset.id);
                this.showCompetitionDetail(comp);
            });
        });
    }

    renderListView() {
        const filteredCompetitions = this.getFilteredCompetitions();
        const container = document.getElementById('competitions-list');
        
        if (filteredCompetitions.length === 0) {
            container.innerHTML = '<p class="empty-state">검색 결과가 없습니다.</p>';
            return;
        }
        
        container.innerHTML = filteredCompetitions.map(comp => `
            <div class="competition-item" data-id="${comp.id}">
                <div class="competition-info">
                    <div class="competition-title">${comp.title}</div>
                    <div class="competition-meta">
                        <span>📅 ${this.formatDateRange(comp.start_date, comp.end_date)}</span>
                        <span>📍 ${comp.location}</span>
                        <span>🏛️ ${comp.organizer}</span>
                    </div>
                </div>
                <span class="category-badge ${this.getCategoryClass(comp.category)}">
                    ${comp.category}
                </span>
            </div>
        `).join('');
        
        // 클릭 이벤트 추가
        container.querySelectorAll('.competition-item').forEach(item => {
            item.addEventListener('click', () => {
                const comp = filteredCompetitions.find(c => c.id == item.dataset.id);
                this.showCompetitionDetail(comp);
            });
        });
    }

    renderTimelineView() {
        const filteredCompetitions = this.getFilteredCompetitions();
        const container = document.getElementById('timeline-container');
        
        // 월별로 그룹화
        const groupedByMonth = {};
        filteredCompetitions.forEach(comp => {
            const month = new Date(comp.start_date).getMonth();
            if (!groupedByMonth[month]) {
                groupedByMonth[month] = [];
            }
            groupedByMonth[month].push(comp);
        });
        
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', 
                           '7월', '8월', '9월', '10월', '11월', '12월'];
        
        container.innerHTML = Object.keys(groupedByMonth)
            .sort((a, b) => a - b)
            .map(month => {
                const competitions = groupedByMonth[month];
                return `
                    <div class="timeline-month">
                        <div class="timeline-month-header">
                            ${monthNames[month]} (${competitions.length}개 대회)
                        </div>
                        <div class="timeline-events">
                            ${competitions.map(comp => `
                                <div class="timeline-event ${this.getCategoryClass(comp.category)}" 
                                     data-id="${comp.id}">
                                    <div class="competition-title">${comp.title}</div>
                                    <div class="competition-meta">
                                        <span>📅 ${this.formatDateRange(comp.start_date, comp.end_date)}</span>
                                        <span>📍 ${comp.location}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('');
        
        // 클릭 이벤트 추가
        container.querySelectorAll('.timeline-event').forEach(item => {
            item.addEventListener('click', () => {
                const comp = filteredCompetitions.find(c => c.id == item.dataset.id);
                this.showCompetitionDetail(comp);
            });
        });
    }

    showDateCompetitions(date, competitions) {
        const popup = document.getElementById('date-competitions-popup');
        const title = document.getElementById('popup-date-title');
        const list = document.getElementById('popup-competitions-list');
        
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', 
                           '7월', '8월', '9월', '10월', '11월', '12월'];
        
        title.textContent = `${this.currentYear}년 ${monthNames[this.currentMonth]} ${date}일 대회`;
        
        list.innerHTML = competitions.map(comp => `
            <div class="competition-item" data-id="${comp.id}">
                <div class="competition-info">
                    <div class="competition-title">${comp.title}</div>
                    <div class="competition-meta">
                        <span>📅 ${this.formatDateRange(comp.start_date, comp.end_date)}</span>
                        <span>📍 ${comp.location}</span>
                        <span>🏛️ ${comp.organizer}</span>
                    </div>
                </div>
                <span class="category-badge ${this.getCategoryClass(comp.category)}">
                    ${comp.category}
                </span>
            </div>
        `).join('');
        
        // 클릭 이벤트 추가
        list.querySelectorAll('.competition-item').forEach(item => {
            item.addEventListener('click', () => {
                const comp = competitions.find(c => c.id == item.dataset.id);
                this.closePopup();
                this.showCompetitionDetail(comp);
            });
        });
        
        popup.classList.add('active');
    }

    showCompetitionDetail(competition) {
        const modal = document.getElementById('competition-modal');
        const modalBody = document.getElementById('modal-body');
        
        // D-Day 계산
        const today = new Date();
        const startDate = new Date(competition.start_date);
        const dDay = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
        
        let dDayText = '';
        if (dDay > 0) {
            dDayText = `<span style="color: var(--primary-color)">D-${dDay}</span>`;
        } else if (dDay === 0) {
            dDayText = '<span style="color: var(--track-color)">D-Day</span>';
        } else {
            dDayText = `<span style="color: var(--text-secondary)">종료 (D+${Math.abs(dDay)})</span>`;
        }
        
        modalBody.innerHTML = `
            <h2>${competition.title}</h2>
            <div class="competition-detail">
                <div class="detail-header">
                    <span class="category-badge ${this.getCategoryClass(competition.category)}">
                        ${competition.category}
                    </span>
                    <span class="d-day">${dDayText}</span>
                </div>
                
                <div class="detail-info">
                    <div class="info-row">
                        <span class="info-label">📅 일정</span>
                        <span class="info-value">${this.formatDateRange(competition.start_date, competition.end_date)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">📍 장소</span>
                        <span class="info-value">${competition.location}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">🏛️ 주최</span>
                        <span class="info-value">${competition.organizer}</span>
                    </div>
                    ${competition.status ? `
                    <div class="info-row">
                        <span class="info-label">📌 상태</span>
                        <span class="info-value">${competition.status}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="detail-actions">
                    <button class="action-btn" onclick="calendar.addToCalendar(${competition.id})">
                        📅 캘린더 추가
                    </button>
                    <button class="action-btn" onclick="calendar.shareCompetition(${competition.id})">
                        🔗 공유하기
                    </button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    addToCalendar(competitionId) {
        const competition = this.competitions.find(c => c.id === competitionId);
        if (!competition) return;
        
        // Google 캘린더 URL 생성
        const startDate = competition.start_date.replace(/-/g, '');
        const endDate = competition.end_date.replace(/-/g, '');
        const details = `${competition.category} | ${competition.organizer} | ${competition.location}`;
        
        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(competition.title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(competition.location)}`;
        
        window.open(googleCalendarUrl, '_blank');
    }

    shareCompetition(competitionId) {
        const competition = this.competitions.find(c => c.id === competitionId);
        if (!competition) return;
        
        const shareText = `${competition.title}\n📅 ${this.formatDateRange(competition.start_date, competition.end_date)}\n📍 ${competition.location}\n🏛️ ${competition.organizer}`;
        
        if (navigator.share) {
            navigator.share({
                title: competition.title,
                text: shareText,
                url: window.location.href
            });
        } else {
            // 클립보드에 복사
            navigator.clipboard.writeText(shareText).then(() => {
                alert('대회 정보가 클립보드에 복사되었습니다.');
            });
        }
    }

    sortCompetitions(sortBy) {
        const container = document.getElementById('competitions-list');
        const items = Array.from(container.querySelectorAll('.competition-item'));
        const competitions = this.getFilteredCompetitions();
        
        competitions.sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return new Date(a.start_date) - new Date(b.start_date);
                case 'name':
                    return a.title.localeCompare(b.title);
                case 'location':
                    return a.location.localeCompare(b.location);
                case 'category':
                    return a.category.localeCompare(b.category);
                default:
                    return 0;
            }
        });
        
        this.renderListView();
    }

    updateStatistics() {
        if (!this.statistics) return;
        
        document.getElementById('total-competitions').textContent = this.statistics.total_competitions;
        document.getElementById('stat-track').textContent = this.statistics.by_category['트랙필드'];
        document.getElementById('stat-road').textContent = this.statistics.by_category['로드레이스'];
        document.getElementById('stat-single').textContent = this.statistics.by_category['단일경기'];
        document.getElementById('stat-peak').textContent = this.statistics.peak_locations['예천'];
    }

    getCategoryClass(category) {
        switch (category) {
            case '트랙필드':
                return 'track';
            case '로드레이스':
                return 'road';
            case '단일경기':
                return 'single';
            default:
                return '';
        }
    }

    formatDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const formatDate = (date) => {
            return `${date.getMonth() + 1}/${date.getDate()}`;
        };
        
        if (startDate === endDate) {
            return formatDate(start);
        } else {
            return `${formatDate(start)} - ${formatDate(end)}`;
        }
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    closeModal() {
        document.getElementById('competition-modal').classList.remove('active');
    }

    closePopup() {
        document.getElementById('date-competitions-popup').classList.remove('active');
    }

    showError(message) {
        console.error(message);
        // 에러 메시지 표시 로직 추가 가능
    }
}

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.calendar = new CompetitionsCalendar();
});