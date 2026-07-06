/**
 * 이미지 오버레이 컴포넌트
 */

const imageOverlay = {
  open(imagePath, filename) {
    const overlay = document.getElementById('image-overlay');
    const img = document.getElementById('overlay-image');
    const info = document.getElementById('overlay-info');

    if (!overlay || !img) return;

    img.src = imagePath;
    if (info) info.textContent = filename || '';

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  },

  close(event) {
    // 이벤트가 오버레이 배경 클릭인 경우에만 닫기
    if (event && event.target !== event.currentTarget &&
        !event.target.classList.contains('overlay__close')) {
      return;
    }

    const overlay = document.getElementById('image-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  },
};

// ESC 키로 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') imageOverlay.close();
});
