// 이미지 처리 모듈
const ImageHandler = {
  // 설정
  MAX_WIDTH: 1200,        // 최대 너비
  MAX_HEIGHT: 1200,       // 최대 높이
  THUMB_WIDTH: 400,       // 썸네일 너비
  QUALITY: 0.8,           // JPEG 품질 (0.0 ~ 1.0)
  MAX_FILE_SIZE: 5 * 1024 * 1024,  // 압축 후 최대 크기 5MB
  MAX_INPUT_SIZE: 50 * 1024 * 1024,  // 입력 파일 최대 크기 50MB
  MAX_IMAGES_PER_POST: 3, // 게시물당 최대 이미지 수
  
  // 이미지 압축 및 리사이징
  async compressImage(file, options = {}) {
    const {
      maxWidth = this.MAX_WIDTH,
      maxHeight = this.MAX_HEIGHT,
      quality = this.QUALITY,
      outputType = 'base64',
      forceCompress = false  // 강제 압축 옵션
    } = options;
    
    // this 컨텍스트 저장
    const self = this;
    
    return new Promise((resolve, reject) => {
      // 입력 파일 크기 체크 (50MB까지 허용)
      if (file.size > self.MAX_INPUT_SIZE) {
        reject(new Error(`파일이 너무 큽니다. 최대 50MB까지 가능합니다. (현재: ${(file.size / 1024 / 1024).toFixed(2)}MB)`));
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
          
          // 원본 크기가 매우 크면 먼저 줄임
          let width = img.width;
          let height = img.height;
          
          // 원본이 4000px를 넘으면 먼저 줄임
          if (width > 4000 || height > 4000) {
            const preScale = Math.min(4000 / width, 4000 / height);
            width = Math.floor(width * preScale);
            height = Math.floor(height * preScale);
            console.log(`Pre-scaling large image: ${img.width}x${img.height} → ${width}x${height}`);
          }
          
          // 설정된 최대 크기로 다시 조정
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }
          
          // Canvas 크기 설정
          canvas.width = width;
          canvas.height = height;
          
          // PNG의 경우 흰색 배경 추가 (투명 배경 처리)
          if (file.type === 'image/png') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }
          
          // 이미지 그리기
          ctx.drawImage(img, 0, 0, width, height);
          
          // 압축된 이미지 반환
          if (outputType === 'base64') {
            let finalQuality = quality;
            let base64 = canvas.toDataURL('image/jpeg', finalQuality);
            // Base64 실제 크기 계산 (더 정확한 방법)
            let estimatedSize = (base64.length - 'data:image/jpeg;base64,'.length) * 3 / 4;
            
            console.log(`Initial compression: ${(file.size/1024/1024).toFixed(2)}MB → ${(estimatedSize/1024/1024).toFixed(2)}MB (quality: ${finalQuality})`);
            
            // 압축 후에도 5MB를 초과하면 품질을 더 낮춰서 재압축
            let attempts = 0;
            while (estimatedSize > self.MAX_FILE_SIZE && attempts < 5) {
              finalQuality = Math.max(0.3, finalQuality * 0.8); // 품질을 20%씩 감소 (최소 0.3)
              base64 = canvas.toDataURL('image/jpeg', finalQuality);
              estimatedSize = (base64.length - 'data:image/jpeg;base64,'.length) * 3 / 4;
              attempts++;
              console.log(`Recompression attempt ${attempts}: ${(estimatedSize/1024/1024).toFixed(2)}MB (quality: ${finalQuality.toFixed(2)})`);
            }
            
            // 그래도 크면 크기를 더 줄임
            if (estimatedSize > self.MAX_FILE_SIZE) {
              const scaleFactor = Math.sqrt(self.MAX_FILE_SIZE / estimatedSize) * 0.8;
              const newWidth = Math.max(400, Math.floor(width * scaleFactor));
              const newHeight = Math.max(400, Math.floor(height * scaleFactor));
              
              console.log(`Resizing image: ${width}x${height} → ${newWidth}x${newHeight}`);
              
              // 새 캔버스 생성
              const newCanvas = document.createElement('canvas');
              const newCtx = newCanvas.getContext('2d');
              newCanvas.width = newWidth;
              newCanvas.height = newHeight;
              
              // PNG의 경우 흰색 배경
              if (file.type === 'image/png') {
                newCtx.fillStyle = '#FFFFFF';
                newCtx.fillRect(0, 0, newWidth, newHeight);
              }
              
              newCtx.drawImage(img, 0, 0, newWidth, newHeight);
              base64 = newCanvas.toDataURL('image/jpeg', 0.4);
              estimatedSize = (base64.length - 'data:image/jpeg;base64,'.length) * 3 / 4;
              
              // 최종 캔버스 업데이트
              canvas.width = newWidth;
              canvas.height = newHeight;
              
              console.log(`Final size after resize: ${(estimatedSize/1024/1024).toFixed(2)}MB`);
            }
            
            resolve({
              data: base64,
              width: canvas.width,
              height: canvas.height,
              size: estimatedSize,
              originalSize: file.size,
              compressionRatio: Math.round((1 - estimatedSize / file.size) * 100),
              quality: finalQuality
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
  
  // 대용량 이미지 스마트 압축
  async smartCompress(file) {
    const fileSizeMB = file.size / 1024 / 1024;
    
    // 파일 크기에 따라 압축 전략 결정
    let compressionOptions = {
      maxWidth: this.MAX_WIDTH,
      maxHeight: this.MAX_HEIGHT,
      quality: this.QUALITY,
      forceCompress: true
    };
    
    // 더 공격적인 압축 전략
    if (fileSizeMB > 30) {
      // 30MB 이상: 매우 공격적 압축
      compressionOptions.maxWidth = 800;
      compressionOptions.maxHeight = 800;
      compressionOptions.quality = 0.5;
    } else if (fileSizeMB > 20) {
      // 20-30MB: 공격적 압축
      compressionOptions.maxWidth = 1000;
      compressionOptions.maxHeight = 1000;
      compressionOptions.quality = 0.55;
    } else if (fileSizeMB > 10) {
      // 10-20MB: 중간 압축
      compressionOptions.maxWidth = 1100;
      compressionOptions.maxHeight = 1100;
      compressionOptions.quality = 0.65;
    } else if (fileSizeMB > 5) {
      // 5-10MB: 약간 압축
      compressionOptions.maxWidth = 1200;
      compressionOptions.maxHeight = 1200;
      compressionOptions.quality = 0.7;
    }
    
    console.log(`Smart compress: ${fileSizeMB.toFixed(2)}MB file with strategy:`, compressionOptions);
    
    try {
      const result = await this.compressImage(file, compressionOptions);
      const compressedSizeMB = result.size / 1024 / 1024;
      
      console.log(`Compressed: ${fileSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB (${result.compressionRatio}% reduction)`);
      
      // 여전히 크면 추가 압축 시도
      if (result.size > this.MAX_FILE_SIZE) {
        console.log(`Still too large, trying aggressive compression...`);
        
        // 매우 공격적인 재압축
        compressionOptions.maxWidth = 600;
        compressionOptions.maxHeight = 600;
        compressionOptions.quality = 0.4;
        
        const secondTry = await this.compressImage(file, compressionOptions);
        const secondSizeMB = secondTry.size / 1024 / 1024;
        
        console.log(`Aggressive recompression: ${compressedSizeMB.toFixed(2)}MB → ${secondSizeMB.toFixed(2)}MB`);
        
        if (secondTry.size > this.MAX_FILE_SIZE) {
          throw new Error(`파일이 너무 커서 압축할 수 없습니다. (${secondSizeMB.toFixed(2)}MB) 더 작은 이미지를 사용하거나 스크린샷으로 찍어주세요.`);
        }
        
        return secondTry;
      }
      
      return result;
    } catch (error) {
      throw new Error(`이미지 압축 실패: ${error.message}`);
    }
  },
  
  // 썸네일 생성
  async createThumbnail(file) {
    return this.compressImage(file, {
      maxWidth: this.THUMB_WIDTH,
      maxHeight: this.THUMB_WIDTH,
      quality: 0.6,
      forceCompress: true
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
        let compressed;
        const fileSizeMB = file.size / 1024 / 1024;
        
        // 5MB 이상이면 스마트 압축 사용
        if (file.size > this.MAX_FILE_SIZE) {
          console.log(`Large file detected: ${file.name} (${fileSizeMB.toFixed(2)}MB) - using smart compression`);
          compressed = await this.smartCompress(file);
        } else {
          // 5MB 이하는 일반 압축
          compressed = await this.compressImage(file);
        }
        
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
          originalSize: file.size,
          compressionRatio: compressed.compressionRatio || Math.round((1 - compressed.size / file.size) * 100),
          quality: compressed.quality
        });
        
        console.log(`Successfully processed: ${file.name} - ${(file.size/1024/1024).toFixed(2)}MB → ${(compressed.size/1024/1024).toFixed(2)}MB`);
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        errors.push({
          file: file.name,
          size: `${(file.size/1024/1024).toFixed(2)}MB`,
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