// Master Archive Page Script

let archiveData = [];
let isTranslateMode = false;
let currentPlayingAudio = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Get mode from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  isTranslateMode = urlParams.get('mode') === 'translate';

  const modeLabel = isTranslateMode ? '번역 모드' : '일반 모드';
  document.getElementById('pageTitle').textContent = `전체 보관함 (${modeLabel})`;
  document.title = `YouTube Script Mate - 전체 보관함 (${modeLabel})`;

  // Download button event listener
  document.getElementById('downloadBtn').addEventListener('click', downloadCSV);

  loadArchiveData();
});

function loadArchiveData() {
  chrome.runtime.sendMessage({ action: 'getPhrases' }, (response) => {
    const phrases = response?.phrases || {};

    // Collect all phrases filtered by mode
    archiveData = [];
    Object.entries(phrases).forEach(([videoId, notes]) => {
      notes.forEach(note => {
        if (isTranslateMode) {
          if (note.mode === 'translate') {
            archiveData.push({ ...note, videoId });
          }
        } else {
          if (note.mode === 'normal' || note.mode === 'summary') {
            archiveData.push({ ...note, videoId });
          }
        }
      });
    });

    renderTable();
  });
}

function renderTable() {
  const tableHead = document.getElementById('tableHead');
  const tableBody = document.getElementById('tableBody');
  const countText = document.getElementById('countText');

  countText.textContent = `총 ${archiveData.length}개의 표현`;

  if (archiveData.length === 0) {
    tableHead.innerHTML = '';
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;">저장된 표현이 없습니다</td></tr>';
    return;
  }

  // Set headers
  if (isTranslateMode) {
    tableHead.innerHTML = '<tr><th>번호</th><th>영상 제목</th><th>링크</th><th>시간</th><th>원문</th><th>번역문</th><th>녹음</th><th>저장일</th><th>삭제</th></tr>';
  } else {
    tableHead.innerHTML = '<tr><th>번호</th><th>영상 제목</th><th>링크</th><th>시간</th><th>원문</th><th>녹음</th><th>저장일</th><th>삭제</th></tr>';
  }

  // Render rows
  tableBody.innerHTML = '';
  archiveData.forEach((p, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.videoId = p.videoId;
    tr.dataset.phraseId = p.id;

    const time = formatTime(p.timestamp);
    const date = new Date(p.createdAt);
    const dateStr = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;

    const hasRecording = p.recordingUrl || p.hasRecording;
    const recordingBtn = hasRecording
      ? `<button class="btn-play-recording" data-idx="${idx}">
          <svg viewBox="0 0 24 24" fill="none"><polygon points="5,3 19,12 5,21" fill="currentColor"/></svg>
          재생
        </button>`
      : '<span class="no-recording">-</span>';

    if (isTranslateMode) {
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${escapeHtml(p.videoTitle || 'Unknown')}</td>
        <td><a href="${p.videoUrl}&t=${Math.floor(p.timestamp)}" target="_blank">영상 보기</a></td>
        <td>${time}</td>
        <td>${escapeHtml(p.source)}</td>
        <td>${escapeHtml(p.translation || '')}</td>
        <td>${recordingBtn}</td>
        <td>${dateStr}</td>
        <td><button class="btn-delete" data-video-id="${p.videoId}" data-phrase-id="${p.id}">삭제</button></td>
      `;
    } else {
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${escapeHtml(p.videoTitle || 'Unknown')}</td>
        <td><a href="${p.videoUrl}&t=${Math.floor(p.timestamp)}" target="_blank">영상 보기</a></td>
        <td>${time}</td>
        <td>${escapeHtml(p.source)}</td>
        <td>${recordingBtn}</td>
        <td>${dateStr}</td>
        <td><button class="btn-delete" data-video-id="${p.videoId}" data-phrase-id="${p.id}">삭제</button></td>
      `;
    }

    tableBody.appendChild(tr);
  });

  // Add event listeners for dynamically created buttons
  document.querySelectorAll('.btn-play-recording').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      playRecording(idx);
    });
  });

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const videoId = btn.dataset.videoId;
      const phraseId = parseInt(btn.dataset.phraseId, 10);
      deleteItem(videoId, phraseId);
    });
  });
}

function deleteItem(videoId, phraseId) {
  if (!confirm('이 항목을 삭제하시겠습니까?')) {
    return;
  }

  // Ensure phraseId is a number for comparison
  const phraseIdNum = typeof phraseId === 'string' ? parseInt(phraseId, 10) : phraseId;

  chrome.runtime.sendMessage({
    action: 'deletePhrase',
    videoId: videoId,
    phraseId: phraseIdNum
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Delete error:', chrome.runtime.lastError);
      showToast('삭제 실패: ' + chrome.runtime.lastError.message);
      return;
    }
    if (response?.success) {
      showToast('삭제되었습니다');
      // Reload data to refresh the table
      loadArchiveData();
    } else {
      showToast('삭제 실패' + (response?.error ? ': ' + response.error : ''));
    }
  });
}

function downloadCSV() {
  if (archiveData.length === 0) {
    showToast('다운로드할 데이터가 없습니다');
    return;
  }

  let csvContent = '';

  if (isTranslateMode) {
    csvContent = '\uFEFF번호,영상제목,영상링크,시간,원문,번역문,저장일\n';
    archiveData.forEach((p, idx) => {
      const time = formatTime(p.timestamp);
      const date = new Date(p.createdAt);
      const dateStr = date.getFullYear() + '.' + (date.getMonth() + 1) + '.' + date.getDate();
      const title = '"' + (p.videoTitle || '').replace(/"/g, '""') + '"';
      const link = '"' + (p.videoUrl + '&t=' + Math.floor(p.timestamp)) + '"';
      const source = '"' + (p.source || '').replace(/"/g, '""') + '"';
      const translation = '"' + (p.translation || '').replace(/"/g, '""') + '"';
      csvContent += (idx + 1) + ',' + title + ',' + link + ',' + time + ',' + source + ',' + translation + ',' + dateStr + '\n';
    });
  } else {
    csvContent = '\uFEFF번호,영상제목,영상링크,시간,원문,저장일\n';
    archiveData.forEach((p, idx) => {
      const time = formatTime(p.timestamp);
      const date = new Date(p.createdAt);
      const dateStr = date.getFullYear() + '.' + (date.getMonth() + 1) + '.' + date.getDate();
      const title = '"' + (p.videoTitle || '').replace(/"/g, '""') + '"';
      const link = '"' + (p.videoUrl + '&t=' + Math.floor(p.timestamp)) + '"';
      const source = '"' + (p.source || '').replace(/"/g, '""') + '"';
      csvContent += (idx + 1) + ',' + title + ',' + link + ',' + time + ',' + source + ',' + dateStr + '\n';
    });
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'master_archive_' + (isTranslateMode ? 'translate' : 'normal') + '.csv';
  link.click();
  URL.revokeObjectURL(url);
  showToast('CSV 다운로드 완료!');
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins + ':' + secs.toString().padStart(2, '0');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message) {
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function playRecording(idx) {
  const phrase = archiveData[idx];
  if (!phrase) return;

  // 이미 재생 중이면 정지
  if (currentPlayingAudio) {
    currentPlayingAudio.pause();
    currentPlayingAudio = null;
    // 모든 버튼 상태 초기화
    document.querySelectorAll('.btn-play-recording.playing').forEach(btn => {
      btn.classList.remove('playing');
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><polygon points="5,3 19,12 5,21" fill="currentColor"/></svg>재생`;
    });
    return;
  }

  const recordingUrl = phrase.recordingUrl;
  if (!recordingUrl) {
    // 녹음 파일 저장소에서 찾기
    chrome.storage.local.get(['recordings'], (result) => {
      const recordings = result.recordings || {};
      if (recordings[phrase.videoId] && recordings[phrase.videoId][phrase.id]) {
        const savedUrl = recordings[phrase.videoId][phrase.id].data;
        playAudioFile(savedUrl, idx);
      } else {
        showToast('녹음 파일이 없습니다');
      }
    });
    return;
  }

  playAudioFile(recordingUrl, idx);
}

function playAudioFile(url, idx) {
  const button = document.querySelector(`.btn-play-recording[data-idx="${idx}"]`);

  currentPlayingAudio = new Audio(url);

  if (button) {
    button.classList.add('playing');
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></svg>정지`;
  }

  currentPlayingAudio.play();

  currentPlayingAudio.onended = () => {
    currentPlayingAudio = null;
    if (button) {
      button.classList.remove('playing');
      button.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><polygon points="5,3 19,12 5,21" fill="currentColor"/></svg>재생`;
    }
  };

  currentPlayingAudio.onerror = () => {
    currentPlayingAudio = null;
    if (button) {
      button.classList.remove('playing');
      button.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><polygon points="5,3 19,12 5,21" fill="currentColor"/></svg>재생`;
    }
    showToast('녹음 파일 재생 실패');
  };
}
