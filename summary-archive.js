// Summary Archive Page Script

let archiveData = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  document.title = 'YouTube Script Mate - 전체 보관함 (요약 모드)';

  // Download button event listener
  document.getElementById('downloadBtn').addEventListener('click', downloadCSV);

  loadArchiveData();
});

function loadArchiveData() {
  chrome.storage.local.get(['savedSummaries'], (result) => {
    const summaries = result.savedSummaries || {};

    // Collect all summaries
    archiveData = [];
    Object.entries(summaries).forEach(([videoId, videoSummaries]) => {
      videoSummaries.forEach(summary => {
        archiveData.push({ ...summary, videoId });
      });
    });

    // Sort by date (newest first)
    archiveData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    renderTable();
  });
}

function renderTable() {
  const tableHead = document.getElementById('tableHead');
  const tableBody = document.getElementById('tableBody');
  const countText = document.getElementById('countText');

  countText.textContent = `총 ${archiveData.length}개의 요약`;

  if (archiveData.length === 0) {
    tableHead.innerHTML = '';
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">저장된 요약이 없습니다</td></tr>';
    return;
  }

  // Set headers
  tableHead.innerHTML = '<tr><th>번호</th><th>영상 제목</th><th>링크</th><th>유형</th><th>요약 내용</th><th>저장일</th><th>삭제</th></tr>';

  // Render rows
  tableBody.innerHTML = '';
  archiveData.forEach((s, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.videoId = s.videoId;
    tr.dataset.summaryId = s.id;

    const date = new Date(s.createdAt);
    const dateStr = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;

    const typeLabel = s.type === 'full' ? '전체' : '선택';
    const typeClass = s.type === 'full' ? 'full' : '';

    // Truncate content for display
    const contentPreview = (s.content || '').substring(0, 100) + ((s.content || '').length > 100 ? '...' : '');

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${escapeHtml(s.videoTitle || 'Unknown')}</td>
      <td><a href="${s.videoUrl}" target="_blank">영상 보기</a></td>
      <td><span class="summary-type ${typeClass}">${typeLabel}</span></td>
      <td class="summary-content" title="${escapeHtml(s.content || '')}">${escapeHtml(contentPreview)}</td>
      <td>${dateStr}</td>
      <td><button class="btn-delete" data-video-id="${s.videoId}" data-summary-id="${s.id}">삭제</button></td>
    `;

    tableBody.appendChild(tr);
  });

  // Add event listeners for dynamically created delete buttons
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const videoId = btn.dataset.videoId;
      const summaryId = parseInt(btn.dataset.summaryId, 10);
      deleteItem(videoId, summaryId);
    });
  });
}

function deleteItem(videoId, summaryId) {
  if (!confirm('이 항목을 삭제하시겠습니까?')) {
    return;
  }

  // Ensure summaryId is a number for comparison
  const summaryIdNum = typeof summaryId === 'string' ? parseInt(summaryId, 10) : summaryId;

  chrome.storage.local.get(['savedSummaries'], (result) => {
    const summaries = result.savedSummaries || {};

    if (summaries[videoId]) {
      summaries[videoId] = summaries[videoId].filter(s => s.id !== summaryIdNum);

      if (summaries[videoId].length === 0) {
        delete summaries[videoId];
      }

      chrome.storage.local.set({ savedSummaries: summaries }, () => {
        if (chrome.runtime.lastError) {
          console.error('Delete error:', chrome.runtime.lastError);
          showToast('삭제 실패: ' + chrome.runtime.lastError.message);
          return;
        }
        showToast('삭제되었습니다');
        // Reload data to refresh the table
        loadArchiveData();
      });
    } else {
      showToast('삭제 실패: 항목을 찾을 수 없습니다');
    }
  });
}

function downloadCSV() {
  if (archiveData.length === 0) {
    showToast('다운로드할 데이터가 없습니다');
    return;
  }

  let csvContent = '\uFEFF번호,영상제목,영상링크,유형,요약내용,저장일\n';
  archiveData.forEach((s, idx) => {
    const date = new Date(s.createdAt);
    const dateStr = date.getFullYear() + '.' + (date.getMonth() + 1) + '.' + date.getDate();
    const title = '"' + (s.videoTitle || '').replace(/"/g, '""') + '"';
    const link = '"' + (s.videoUrl || '') + '"';
    const typeLabel = s.type === 'full' ? '전체' : '선택';
    const content = '"' + (s.content || '').replace(/"/g, '""').replace(/\n/g, ' ') + '"';
    csvContent += (idx + 1) + ',' + title + ',' + link + ',' + typeLabel + ',' + content + ',' + dateStr + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'summary_archive.csv';
  link.click();
  URL.revokeObjectURL(url);
  showToast('CSV 다운로드 완료!');
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
