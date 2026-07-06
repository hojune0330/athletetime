/**
 * 검색 모듈
 *
 * 선수명/소속 검색 → 종목별 아코디언 결과 표시
 */

const search = {
  debounceTimer: null,
  currentQuery: '',
  expandedSections: new Set(),

  // ── 초기화 ──

  init() {
    const input = document.getElementById('search-input');
    const typeSelect = document.getElementById('search-type');
    const compSelect = document.getElementById('search-comp');
    const btn = document.getElementById('search-btn');

    if (input) {
      input.addEventListener('input', () => this.debounceSearch());
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.executeSearch(); });
    }
    if (typeSelect) typeSelect.addEventListener('change', () => this.debounceSearch());
    if (compSelect) compSelect.addEventListener('change', () => this.debounceSearch());
    if (btn) btn.addEventListener('click', () => this.executeSearch());

    this.loadCompetitions();
  },

  // ── 대회 목록 로드 ──

  async loadCompetitions() {
    try {
      const result = await api.get('/api/search/competitions');
      if (!result.success) return;

      const sel = document.getElementById('search-comp');
      if (!sel) return;

      sel.innerHTML = '<option value="">전체 대회</option>';
      for (const c of result.data) {
        const opt = document.createElement('option');
        opt.value = c.filename;
        opt.textContent = c.competition + (c.year ? ` (${c.year})` : '');
        sel.appendChild(opt);
      }
    } catch (e) {
      console.error('대회 목록 로드 실패:', e);
    }
  },

  // ── 검색 실행 ──

  debounceSearch() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.executeSearch(), 300);
  },

  async executeSearch() {
    const input = document.getElementById('search-input');
    const q = (input && input.value || '').trim();

    if (q.length < 2) {
      this.renderEmpty(q.length === 0 ? '' : '2글자 이상 입력해주세요.');
      return;
    }

    // BUG3: type 변경 후에도 빈 결과 메시지가 올바르게 표시되도록
    const type = (document.getElementById('search-type') || {}).value || 'all';

    this.currentQuery = q;
    const comp = (document.getElementById('search-comp') || {}).value || '';

    this.renderLoading();

    try {
      const qs = new URLSearchParams({ q, type });
      if (comp) qs.set('comp', comp);

      const result = await api.get(`/api/search?${qs.toString()}`);
      if (!result.success) {
        this.renderEmpty(result.error || '검색 실패');
        return;
      }

      // BUG3: 결과가 비어있으면 renderResults 내부에서 빈 메시지를 표시
      this.renderResults(result.data);
    } catch (e) {
      this.renderEmpty('검색 중 오류가 발생했습니다.');
    }
  },

  // ── 렌더링: 빈 상태 ──

  renderEmpty(message) {
    const container = document.getElementById('search-results');
    if (!container) return;
    container.innerHTML = message
      ? `<div class="search-empty">${this.esc(message)}</div>`
      : '<div class="search-empty">선수 이름이나 소속팀을 검색하세요.</div>';
  },

  renderLoading() {
    const container = document.getElementById('search-results');
    if (!container) return;
    container.innerHTML = '<div class="search-empty">검색 중...</div>';
  },

  // ── 렌더링: 검색 결과 ──

  renderResults(data) {
    const container = document.getElementById('search-results');
    if (!container) return;

    if (!data.sections || data.sections.length === 0) {
      container.innerHTML = `<div class="search-empty">"${this.esc(data.query)}" 검색 결과가 없습니다.</div>`;
      return;
    }

    // 요약 헤더
    let html = `
      <div class="search-summary">
        <span class="search-summary__query">"${this.esc(data.query)}"</span>
        <span class="search-summary__stats">${data.totalEvents}개 종목 / ${data.totalMatches}명 매칭</span>
        ${data.competitions.length > 0 ? `<span class="search-summary__comp">${this.esc(data.competitions.join(', '))}</span>` : ''}
      </div>
    `;

    // 종목별 섹션
    for (let i = 0; i < data.sections.length; i++) {
      const section = data.sections[i];
      const sectionId = `search-section-${i}`;
      const isExpanded = this.expandedSections.has(sectionId);
      const typeLabel = { track: '트랙', field: '필드', marathon: '마라톤' }[section.eventType] || section.eventType;
      const subCount = section.subSections.length;

      html += `
        <div class="search-section" id="${sectionId}">
          <div class="search-section__header" onclick="search.toggleSection('${sectionId}')">
            <div class="search-section__left">
              <span class="search-section__arrow ${isExpanded ? 'search-section__arrow--open' : ''}">&rsaquo;</span>
              <span class="search-section__event">${this.esc(section.event)}</span>
            </div>
            <div class="search-section__right">
              <span class="search-section__type search-section__type--${section.eventType}">${typeLabel}</span>
              <span class="search-section__count">${subCount}건</span>
            </div>
          </div>
          <div class="search-section__body" style="display:${isExpanded ? 'block' : 'block'};">
      `;

      // 서브섹션 (성별+라운드)
      for (const sub of section.subSections) {
        html += `
          <div class="search-subsection">
            <div class="search-subsection__header">
              <span class="search-subsection__label">${this.esc(sub.label)}</span>
              ${sub.division ? `<span class="search-subsection__division">${this.esc(sub.division)}</span>` : ''}
              ${sub.date ? `<span class="search-subsection__date">${this.esc(sub.date)}</span>` : ''}
              ${sub.wind ? `<span class="search-subsection__wind">풍속 ${this.esc(sub.wind)}</span>` : ''}
              <span class="search-subsection__total">${sub.totalAthletes}명</span>
            </div>
            <table class="search-table">
              <thead>
                <tr>
                  <th class="search-table__rank">순위</th>
                  <th class="search-table__name">이름</th>
                  <th class="search-table__aff">소속</th>
                  <th class="search-table__record">기록</th>
                  <th class="search-table__note">비고</th>
                </tr>
              </thead>
              <tbody>
        `;

        for (const r of sub.results) {
          if (r.isSeparator) {
            html += `
              <tr class="search-table__sep">
                <td colspan="5">
                  <span class="search-table__sep-dots">...</span>
                  <button class="search-table__expand-btn" onclick="search.expandSubSection(this, '${sectionId}')">전체 ${sub.totalAthletes}명 보기</button>
                </td>
              </tr>
            `;
            continue;
          }

          const matchClass = r.isMatch ? ' search-table__row--match' : '';
          const rankIcon = r.rank === 1 ? ' search-rank--gold' : r.rank === 2 ? ' search-rank--silver' : r.rank === 3 ? ' search-rank--bronze' : '';
          const newRecordBadge = r.newRecord ? `<span class="search-badge--record" title="${this.esc(r.newRecord)}">NR</span>` : '';

          html += `
            <tr class="search-table__row${matchClass}">
              <td class="search-table__rank"><span class="search-rank${rankIcon}">${r.rank || '-'}</span></td>
              <td class="search-table__name">${r.isMatch ? '<strong>' : ''}${this.esc(r.name)}${r.isMatch ? '</strong>' : ''}</td>
              <td class="search-table__aff">${this.esc(r.affiliation)}</td>
              <td class="search-table__record">${this.esc(r.record)}${sub.hasWind && r.wind ? ` <span class="search-wind">(${this.esc(r.wind)})</span>` : ''} ${newRecordBadge}</td>
              <td class="search-table__note">${this.esc(r.note || '')}</td>
            </tr>
          `;
        }

        html += '</tbody></table>';

        // "전체 보기" 데이터를 숨겨놓기 (allResults)
        if (sub.hasMore) {
          html += `<div class="search-allresults" style="display:none;" data-all='${JSON.stringify(sub.allResults).replace(/'/g, "&#39;")}'></div>`;
        }

        html += '</div>';  // subsection
      }

      html += '</div></div>';  // section body + section
    }

    container.innerHTML = html;
  },

  // ── 인터랙션 ──

  toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const body = section.querySelector('.search-section__body');
    const arrow = section.querySelector('.search-section__arrow');
    if (!body) return;

    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    if (arrow) arrow.classList.toggle('search-section__arrow--open', !isOpen);

    if (isOpen) {
      this.expandedSections.delete(sectionId);
    } else {
      this.expandedSections.add(sectionId);
    }
  },

  expandSubSection(btn, sectionId) {
    // "전체 보기" 버튼 클릭 → 숨겨진 allResults로 교체
    const subsection = btn.closest('.search-subsection');
    if (!subsection) return;

    const hiddenData = subsection.querySelector('.search-allresults');
    if (!hiddenData) return;

    let allResults;
    try {
      allResults = JSON.parse(hiddenData.dataset.all);
    } catch (e) { return; }

    const tbody = subsection.querySelector('tbody');
    if (!tbody) return;

    const sub = subsection.querySelector('.search-subsection__header .search-subsection__wind');
    const hasWind = !!sub;

    let rows = '';
    for (const r of allResults) {
      const matchClass = r.isMatch ? ' search-table__row--match' : '';
      const rankIcon = r.rank === 1 ? ' search-rank--gold' : r.rank === 2 ? ' search-rank--silver' : r.rank === 3 ? ' search-rank--bronze' : '';
      const newRecordBadge = r.newRecord ? `<span class="search-badge--record" title="${this.esc(r.newRecord)}">NR</span>` : '';

      rows += `
        <tr class="search-table__row${matchClass}">
          <td class="search-table__rank"><span class="search-rank${rankIcon}">${r.rank || '-'}</span></td>
          <td class="search-table__name">${r.isMatch ? '<strong>' : ''}${this.esc(r.name)}${r.isMatch ? '</strong>' : ''}</td>
          <td class="search-table__aff">${this.esc(r.affiliation)}</td>
          <td class="search-table__record">${this.esc(r.record)} ${newRecordBadge}</td>
          <td class="search-table__note">${this.esc(r.note || '')}</td>
        </tr>
      `;
    }

    tbody.innerHTML = rows;
  },

  // ── 유틸리티 ──

  esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};
