// 투표 기능 모듈
const PollHandler = {
  // 투표 생성
  createPoll(options = []) {
    if (!options || options.length < 2) {
      throw new Error('최소 2개 이상의 선택지가 필요합니다');
    }
    
    if (options.length > 10) {
      throw new Error('최대 10개까지의 선택지만 가능합니다');
    }
    
    return {
      id: 'poll_' + Date.now(),
      options: options.map((text, index) => ({
        id: index,
        text: text.trim(),
        votes: [],
        percentage: 0
      })),
      totalVotes: 0,
      allowMultiple: false,
      showResultsBeforeVote: false,
      endDate: null,
      createdAt: new Date().toISOString()
    };
  },
  
  // 투표하기
  vote(poll, optionId, userId) {
    if (!poll || !poll.options) return false;
    
    // 이미 투표했는지 확인
    const hasVoted = this.hasUserVoted(poll, userId);
    
    if (hasVoted && !poll.allowMultiple) {
      // 기존 투표 취소
      poll.options.forEach(option => {
        option.votes = option.votes.filter(id => id !== userId);
      });
    }
    
    // 새로운 투표 추가
    const option = poll.options.find(o => o.id === optionId);
    if (option) {
      if (!option.votes.includes(userId)) {
        option.votes.push(userId);
      }
      
      // 전체 투표수 재계산
      this.updatePollStats(poll);
      return true;
    }
    
    return false;
  },
  
  // 투표 통계 업데이트
  updatePollStats(poll) {
    if (!poll || !poll.options) return;
    
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
    poll.totalVotes = totalVotes;
    
    poll.options.forEach(option => {
      option.percentage = totalVotes > 0 ? 
        Math.round((option.votes.length / totalVotes) * 100) : 0;
    });
  },
  
  // 사용자가 투표했는지 확인
  hasUserVoted(poll, userId) {
    if (!poll || !poll.options) return false;
    
    return poll.options.some(option => 
      option.votes && option.votes.includes(userId)
    );
  },
  
  // 사용자가 어떤 옵션에 투표했는지 확인
  getUserVotedOptions(poll, userId) {
    if (!poll || !poll.options) return [];
    
    return poll.options
      .filter(option => option.votes && option.votes.includes(userId))
      .map(option => option.id);
  },
  
  // 투표 UI 렌더링
  renderPollUI(poll, userId, isCompact = false) {
    if (!poll || !poll.options) return '';
    
    const hasVoted = this.hasUserVoted(poll, userId);
    const userVotes = this.getUserVotedOptions(poll, userId);
    const showResults = hasVoted || poll.showResultsBeforeVote;
    
    if (isCompact) {
      // 컴팩트 뷰 (게시물 목록에서)
      return `
        <div class="poll-compact bg-gray-50 rounded-lg p-3 mt-2">
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-poll text-blue-500"></i>
            <span class="font-medium">투표</span>
            <span class="text-gray-500">${poll.totalVotes}명 참여</span>
            ${!hasVoted ? '<span class="text-blue-600">• 투표하면 결과를 볼 수 있습니다</span>' : ''}
          </div>
        </div>
      `;
    }
    
    // 전체 뷰 (게시물 상세에서)
    return `
      <div class="poll-container bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 my-4 border border-blue-200">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <i class="fas fa-poll-h text-blue-600 text-lg"></i>
            <span class="font-bold text-gray-800">투표</span>
          </div>
          <span class="text-sm text-gray-600">${poll.totalVotes}명 참여</span>
        </div>
        
        ${!hasVoted && !poll.showResultsBeforeVote ? `
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm">
            <i class="fas fa-info-circle text-yellow-600 mr-2"></i>
            <span class="text-yellow-800 font-medium">투표하면 결과를 볼 수 있습니다</span>
          </div>
        ` : ''}
        
        <div class="space-y-2">
          ${poll.options.map(option => {
            const isVoted = userVotes.includes(option.id);
            const voteCount = option.votes.length;
            const percentage = option.percentage;
            
            if (showResults) {
              // 결과 표시
              return `
                <div class="poll-option relative ${isVoted ? 'ring-2 ring-blue-400' : ''}">
                  <div class="relative bg-white rounded-lg overflow-hidden border ${isVoted ? 'border-blue-400' : 'border-gray-200'}">
                    <div class="absolute inset-0 bg-gradient-to-r from-blue-100 to-blue-50" 
                         style="width: ${percentage}%; transition: width 0.5s ease-out;"></div>
                    <div class="relative px-4 py-3 flex justify-between items-center">
                      <div class="flex items-center gap-2">
                        ${isVoted ? '<i class="fas fa-check-circle text-blue-600"></i>' : ''}
                        <span class="font-medium text-gray-800">${this.escapeHtml(option.text)}</span>
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="text-sm font-bold text-gray-700">${percentage}%</span>
                        <span class="text-xs text-gray-500">(${voteCount}표)</span>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            } else {
              // 투표 버튼
              return `
                <button onclick="votePoll(${option.id})" 
                        class="poll-option-button w-full text-left bg-white hover:bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 transition-all hover:border-blue-400 hover:shadow-sm">
                  <span class="text-gray-800">${this.escapeHtml(option.text)}</span>
                </button>
              `;
            }
          }).join('')}
        </div>
        
        ${hasVoted ? `
          <div class="mt-4 pt-3 border-t border-gray-200">
            <div class="flex items-center justify-between text-sm text-gray-600">
              <span><i class="fas fa-check text-green-500 mr-1"></i> 투표 완료</span>
              <button onclick="changePollVote()" class="text-blue-600 hover:text-blue-700 font-medium">
                <i class="fas fa-redo mr-1"></i> 다시 투표
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },
  
  // 투표 생성 UI
  renderPollCreator() {
    return `
      <div id="pollCreator" class="hidden">
        <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div class="flex items-center justify-between mb-3">
            <label class="text-sm font-medium text-gray-700">
              <i class="fas fa-poll mr-2 text-blue-600"></i>투표 만들기
            </label>
            <button onclick="removePoll()" class="text-red-500 hover:text-red-600">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div id="pollOptions" class="space-y-2">
            <div class="poll-option-input flex gap-2">
              <input type="text" placeholder="선택지 1" class="flex-1 px-3 py-2 border rounded-lg text-sm poll-input" maxlength="100">
              <button onclick="removePollOption(this)" class="px-2 text-gray-400 hover:text-red-500 hidden remove-btn">
                <i class="fas fa-minus-circle"></i>
              </button>
            </div>
            <div class="poll-option-input flex gap-2">
              <input type="text" placeholder="선택지 2" class="flex-1 px-3 py-2 border rounded-lg text-sm poll-input" maxlength="100">
              <button onclick="removePollOption(this)" class="px-2 text-gray-400 hover:text-red-500 hidden remove-btn">
                <i class="fas fa-minus-circle"></i>
              </button>
            </div>
          </div>
          
          <button onclick="addPollOption()" class="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <i class="fas fa-plus-circle mr-1"></i>선택지 추가
          </button>
          
          <div class="mt-3 text-xs text-gray-500">
            <i class="fas fa-info-circle mr-1"></i>
            최소 2개, 최대 10개의 선택지를 만들 수 있습니다
          </div>
        </div>
      </div>
    `;
  },
  
  // HTML 이스케이프
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  // 투표 결과 애니메이션
  animatePollResults(pollElement) {
    const bars = pollElement.querySelectorAll('.poll-option .absolute');
    bars.forEach(bar => {
      const width = bar.style.width;
      bar.style.width = '0%';
      setTimeout(() => {
        bar.style.width = width;
      }, 100);
    });
  },
  
  // 투표 데이터 검증
  validatePoll(poll) {
    if (!poll || !poll.options || !Array.isArray(poll.options)) {
      return false;
    }
    
    if (poll.options.length < 2 || poll.options.length > 10) {
      return false;
    }
    
    return poll.options.every(option => 
      option.text && option.text.trim().length > 0
    );
  },
  
  // 투표 통계 가져오기
  getPollStats(poll) {
    if (!poll || !poll.options) return null;
    
    const stats = {
      totalVotes: poll.totalVotes || 0,
      options: poll.options.map(option => ({
        text: option.text,
        votes: option.votes.length,
        percentage: option.percentage || 0
      })),
      mostVoted: null,
      leastVoted: null
    };
    
    if (stats.totalVotes > 0) {
      stats.mostVoted = stats.options.reduce((prev, current) => 
        (prev.votes > current.votes) ? prev : current
      );
      
      stats.leastVoted = stats.options.reduce((prev, current) => 
        (prev.votes < current.votes) ? prev : current
      );
    }
    
    return stats;
  }
};

// 전역에서 사용 가능하도록
window.PollHandler = PollHandler;