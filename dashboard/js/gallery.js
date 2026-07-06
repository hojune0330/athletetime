/**
 * 갤러리 컴포넌트
 */

const gallery = {
  currentPage: 0,
  pageSize: 24,

  async load(sort = 'newest') {
    const sortSelect = document.getElementById('gallery-sort');
    if (sortSelect) sort = sortSelect.value;

    try {
      const result = await api.getGallery({
        limit: this.pageSize,
        offset: this.currentPage * this.pageSize,
        sort,
      });

      this.render(result.data);
    } catch (error) {
      const grid = document.getElementById('gallery-grid');
      if (grid) grid.innerHTML = '<div class="gallery-empty">갤러리 로딩 실패</div>';
    }
  },

  render(data) {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    const { images, total } = data;

    if (!images || images.length === 0) {
      grid.innerHTML = '<div class="gallery-empty">생성된 카드뉴스가 없습니다.</div>';
      return;
    }

    grid.innerHTML = images.map(img => `
      <div class="gallery-item" onclick="app.openOverlay('${img.path}', '${img.filename}')">
        <img src="${img.path}" alt="${img.filename}" loading="lazy">
        <div class="gallery-item__label">${this.formatFilename(img.filename)}</div>
      </div>
    `).join('');

    // 페이지네이션
    const pagination = document.getElementById('gallery-pagination');
    if (pagination) {
      const totalPages = Math.ceil(total / this.pageSize);
      if (totalPages > 1) {
        let html = '';
        for (let i = 0; i < totalPages; i++) {
          const cls = i === this.currentPage ? 'btn btn--primary btn--small' : 'btn btn--small';
          html += `<button class="${cls}" onclick="gallery.goToPage(${i})">${i + 1}</button>`;
        }
        pagination.innerHTML = html;
      } else {
        pagination.innerHTML = '';
      }
    }
  },

  goToPage(page) {
    this.currentPage = page;
    this.load();
  },

  formatFilename(filename) {
    return filename
      .replace('.png', '')
      .replace(/_/g, ' ')
      .slice(0, 30);
  },
};
