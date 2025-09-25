// 이미지 처리 모듈
const ImageHandler = {
  // 설정
  MAX_WIDTH: 1200,        // 최대 너비
  MAX_HEIGHT: 1200,       // 최대 높이
  THUMB_WIDTH: 400,       // 썸네일 너비
  QUALITY: 0.8,           // JPEG 품질 (0.0 ~ 1.0)
  MAX_FILE_SIZE: 5 * 1024 * 1024,  // 5MB
  MAX_IMAGES_PER_POST: 3, // 게시물당 최대 이미지 수
  
  // 이미지 압축 및 리사이징
  async compressImage(file, options = {}) {
    const {
      maxWidth = this.MAX_WIDTH,
      maxHeight = this.MAX_HEIGHT,
      quality = this.QUALITY,
      outputType = 'base64'
    } = options;
    
    return new Promise((resolve, reject) => {
      // 파일 크기 체크
      if (file.size > this.MAX_FILE_SIZE) {
        reject(new Error(`파일 크기는 5MB를 초과할 수 없습니다. (현재: ${(file.size / 1024 / 1024).toFixed(2)}MB)`));
        return;
      }
      
      // 이미지 타입 체크
      const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!file.type || !acceptedTypes.includes(file.type.toLowerCase())) {
        reject(new Error(`지원하지 않는 파일 형식입니다. (지원 형식: JPG, PNG, GIF, WebP)`));
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          // Canvas 생성
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // 비율 계산
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }
          
          // Canvas 크기 설정
          canvas.width = width;
          canvas.height = height;
          
          // 이미지 그리기
          ctx.drawImage(img, 0, 0, width, height);
          
          // 압축된 이미지 반환
          if (outputType === 'base64') {
            const base64 = canvas.toDataURL('image/jpeg', quality);
            resolve({
              data: base64,
              width: width,
              height: height,
              size: Math.round(base64.length * 0.75), // Base64 크기 추정
              originalSize: file.size
            });
          } else if (outputType === 'blob') {
            canvas.toBlob((blob) => {
              resolve({
                data: blob,
                width: width,
                height: height,
                size: blob.size,
                originalSize: file.size
              });
            }, 'image/jpeg', quality);
          }
        };
        
        img.onerror = () => {
          reject(new Error('이미지 로드 실패'));
        };
        
        img.src = e.target.result;
      };
      
      reader.onerror = () => {
        reject(new Error('파일 읽기 실패'));
      };
      
      reader.readAsDataURL(file);
    });
  },
  
  // 썸네일 생성
  async createThumbnail(file) {
    return this.compressImage(file, {
      maxWidth: this.THUMB_WIDTH,
      maxHeight: this.THUMB_WIDTH,
      quality: 0.6
    });
  },
  
  // 다중 이미지 처리
  async processMultipleImages(files) {
    const results = [];
    const errors = [];
    
    // 파일 수 제한
    const filesToProcess = Array.from(files).slice(0, this.MAX_IMAGES_PER_POST);
    
    for (const file of filesToProcess) {
      try {
        // 원본 압축
        const compressed = await this.compressImage(file);
        
        // 썸네일 생성
        const thumbnail = await this.createThumbnail(file);
        
        results.push({
          id: Date.now() + Math.random(),
          name: file.name,
          original: compressed.data,
          thumbnail: thumbnail.data,
          width: compressed.width,
          height: compressed.height,
          size: compressed.size,
          compressionRatio: Math.round((1 - compressed.size / file.size) * 100)
        });
      } catch (error) {
        errors.push({
          file: file.name,
          error: error.message
        });
      }
    }
    
    return { results, errors };
  },
  
  // 이미지 미리보기 생성
  createPreview(imageData) {
    const div = document.createElement('div');
    div.className = 'relative inline-block m-1';
    
    const img = document.createElement('img');
    img.src = imageData.thumbnail || imageData.original;
    img.className = 'w-20 h-20 object-cover rounded cursor-pointer';
    img.onclick = () => this.showFullImage(imageData.original);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      div.remove();
    };
    
    div.appendChild(img);
    div.appendChild(removeBtn);
    
    return div;
  },
  
  // 전체 이미지 보기
  showFullImage(imageSrc) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-[100] flex items-center justify-center p-4';
    modal.onclick = () => modal.remove();
    
    const container = document.createElement('div');
    container.className = 'relative';
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.className = 'max-w-full max-h-full object-contain';
    
    // 닫기 버튼
    const closeBtn = document.createElement('button');
    closeBtn.className = 'absolute top-4 right-4 text-white text-3xl font-bold bg-black bg-opacity-50 rounded-full w-10 h-10';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      modal.remove();
    };
    
    // 로딩 인디케이터
    const loader = document.createElement('div');
    loader.className = 'absolute inset-0 flex items-center justify-center';
    loader.innerHTML = '<div class="text-white">로딩중...</div>';
    
    img.onload = () => loader.remove();
    img.onerror = () => {
      loader.innerHTML = '<div class="text-red-500">이미지를 불러올 수 없습니다</div>';
    };
    
    container.appendChild(loader);
    container.appendChild(img);
    modal.appendChild(container);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
    
    // ESC 키로 닫기
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  },
  
  // localStorage 용량 체크
  checkStorageSpace() {
    let totalSize = 0;
    
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    
    // Bytes to MB
    const usedMB = (totalSize / 1024 / 1024).toFixed(2);
    const estimatedMaxMB = 5; // 브라우저별 차이 있음
    const percentUsed = (usedMB / estimatedMaxMB * 100).toFixed(1);
    
    return {
      used: usedMB,
      max: estimatedMaxMB,
      percent: percentUsed,
      available: estimatedMaxMB - usedMB
    };
  },
  
  // 오래된 이미지 정리 (선택적)
  cleanOldImages(posts, daysToKeep = 7, keepThumbnails = true) {
    const now = Date.now();
    const cutoffTime = now - (daysToKeep * 24 * 60 * 60 * 1000);
    let cleanedPosts = 0;
    let freedSpace = 0;
    
    posts.forEach(post => {
      if (post.date && new Date(post.date).getTime() < cutoffTime) {
        if (post.images && post.images.length > 0) {
          if (keepThumbnails) {
            // 썸네일만 유지, 원본 제거 (기본 동작)
            post.images = post.images.map(img => {
              if (img.original) {
                // 원본 크기 추정 (base64 길이의 약 75%)
                freedSpace += img.original.length * 0.75;
                return {
                  ...img,
                  original: null,  // 원본 이미지 삭제
                  thumbnail: img.thumbnail,  // 썸네일 유지
                  cleanedAt: new Date().toISOString()
                };
              }
              return img;
            });
          } else {
            // 완전 삭제 옵션
            freedSpace += post.images.reduce((sum, img) => {
              return sum + (img.original ? img.original.length * 0.75 : 0) + 
                          (img.thumbnail ? img.thumbnail.length * 0.75 : 0);
            }, 0);
            post.images = [];  // 모든 이미지 삭제
          }
          cleanedPosts++;
        }
      }
    });
    
    return {
      postsAffected: cleanedPosts,
      spaceFreedMB: (freedSpace / 1024 / 1024).toFixed(2)
    };
  },
  
  // 자동 정리 실행 (localStorage 용량 관리)
  autoCleanup(posts, settings = {}) {
    const {
      storageThreshold = 80,  // 저장소 사용률 임계값 (%)
      daysForOriginal = 3,    // 원본 이미지 보관 기간
      daysForThumbnail = 30,  // 썸네일 보관 기간
      daysForFullDelete = 90  // 완전 삭제 기간
    } = settings;
    
    const storage = this.checkStorageSpace();
    const results = {
      originalsCleaned: 0,
      thumbnailsCleaned: 0,
      fullDeleted: 0,
      spaceFreedMB: 0
    };
    
    // 저장소 사용률이 임계값 이상일 때만 정리
    if (storage.percent > storageThreshold) {
      // 1단계: 3일 이상된 원본 이미지 삭제
      const step1 = this.cleanOldImages(posts, daysForOriginal, true);
      results.originalsCleaned = step1.postsAffected;
      results.spaceFreedMB += parseFloat(step1.spaceFreedMB);
      
      // 2단계: 여전히 부족하면 30일 이상된 썸네일도 삭제
      const newStorage = this.checkStorageSpace();
      if (newStorage.percent > storageThreshold) {
        const step2 = this.cleanOldImages(posts, daysForThumbnail, false);
        results.thumbnailsCleaned = step2.postsAffected;
        results.spaceFreedMB += parseFloat(step2.spaceFreedMB);
      }
      
      // 3단계: 90일 이상된 게시물의 모든 이미지 삭제
      const step3 = this.cleanOldImages(posts, daysForFullDelete, false);
      results.fullDeleted = step3.postsAffected;
      results.spaceFreedMB += parseFloat(step3.spaceFreedMB);
    }
    
    return results;
  },
  
  // 이미지 다운로드
  downloadImage(imageSrc, filename = 'image.jpg') {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// 전역에서 사용 가능하도록
window.ImageHandler = ImageHandler;