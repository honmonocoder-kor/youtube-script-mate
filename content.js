// YouTube Script Mate - Content Script
// DOM Scraping, UI Injection, Event Handling

(function() {
  'use strict';

  // State
  let scriptData = [];
  let currentPage = 0;
  const LINES_PER_PAGE = 15;
  let isUICreated = false;
  let currentVideoId = null;
  let savedNotesForVideo = {};

  // Wait utility
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Parse time string to seconds
  function parseTime(timeStr) {
    const parts = timeStr.split(':').map(p => parseInt(p, 10));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseInt(timeStr, 10) || 0;
  }

  // Format seconds to time string
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Get video ID from URL
  function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
  }

  // Initialize the app
  async function initApp() {
    const videoId = getVideoId();
    if (!videoId) return;

    // Check if video changed
    if (currentVideoId !== videoId) {
      currentVideoId = videoId;
      scriptData = [];
      currentPage = 0;
      isUICreated = false;
      removeUI();
    }

    // Wait for page to load
    await wait(2000);

    // Try to extract transcript
    const success = await tryExtractTranscript();

    if (success && scriptData.length > 0) {
      if (!isUICreated) {
        createUI();
        isUICreated = true;
      }
      await loadSavedNotesForVideo();
      renderPage(currentPage);
    }
  }

  // Try to extract transcript from YouTube
  async function tryExtractTranscript() {
    // First check if transcript panel is already open
    let segments = document.querySelectorAll('ytd-transcript-segment-renderer');

    if (segments.length > 0) {
      extractTranscriptDOM(segments);
      return true;
    }

    // Try to find and click transcript button
    // Method 1: Look in description/menu area
    const transcriptButton = await findTranscriptButton();

    if (transcriptButton) {
      transcriptButton.click();
      await wait(1500);

      segments = document.querySelectorAll('ytd-transcript-segment-renderer');
      if (segments.length > 0) {
        extractTranscriptDOM(segments);
        return true;
      }
    }

    // Method 2: Check if transcript is in engagement panel
    const engagementPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]');
    if (engagementPanel) {
      segments = engagementPanel.querySelectorAll('ytd-transcript-segment-renderer');
      if (segments.length > 0) {
        extractTranscriptDOM(segments);
        return true;
      }
    }

    console.log('YouTube Script Mate: Transcript not found. Please open transcript manually.');
    return false;
  }

  // Find transcript button
  async function findTranscriptButton() {
    // Try various selectors for transcript button
    const selectors = [
      'button[aria-label="스크립트 표시"]',
      'button[aria-label="Show transcript"]',
      'button[aria-label="Open transcript"]',
      'ytd-button-renderer:has-text("Transcript")',
      '[aria-label*="transcript" i]',
      '[aria-label*="스크립트" i]'
    ];

    for (const selector of selectors) {
      try {
        const btn = document.querySelector(selector);
        if (btn) return btn;
      } catch (e) {
        // Selector not supported, continue
      }
    }

    // Try to find in "more" menu
    const moreButtons = document.querySelectorAll('ytd-menu-renderer button, #menu button');
    for (const btn of moreButtons) {
      const text = btn.innerText || btn.getAttribute('aria-label') || '';
      if (text.toLowerCase().includes('transcript') || text.includes('스크립트')) {
        return btn;
      }
    }

    // Look in description area buttons
    const descButtons = document.querySelectorAll('#description-inner button, #info-contents button');
    for (const btn of descButtons) {
      const text = btn.innerText || btn.getAttribute('aria-label') || '';
      if (text.toLowerCase().includes('transcript') || text.includes('스크립트')) {
        return btn;
      }
    }

    return null;
  }

  // Extract transcript from DOM
  function extractTranscriptDOM(segments) {
    scriptData = Array.from(segments).map(seg => {
      const timestampEl = seg.querySelector('.segment-timestamp');
      const textEl = seg.querySelector('.segment-text');

      const timeStr = timestampEl ? timestampEl.innerText.trim() : '0:00';
      const text = textEl ? textEl.innerText.trim() : '';

      return {
        timeSeconds: parseTime(timeStr),
        text: text,
        timeStr: timeStr
      };
    }).filter(item => item.text.length > 0);

    console.log(`YouTube Script Mate: Extracted ${scriptData.length} transcript segments`);
  }

  // Load saved notes for current video
  async function loadSavedNotesForVideo() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getPhrases' }, (response) => {
        if (response && response.phrases) {
          savedNotesForVideo = response.phrases[currentVideoId] || [];
        }
        resolve();
      });
    });
  }

  // Create main UI container
  function createUI() {
    // Remove existing UI if present
    removeUI();

    const container = document.createElement('div');
    container.id = 'ys-container';
    container.innerHTML = `
      <div class="ys-header">
        <div class="ys-title">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Script Mate</span>
        </div>
        <div class="ys-header-actions">
          <button class="ys-btn-icon" id="ys-archive-btn" title="보관함">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 8V21H3V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M23 3H1V8H23V3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 12H14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="ys-btn-icon" id="ys-settings-btn" title="설정">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
              <path d="M12 1V4M12 20V23M4.22 4.22L6.34 6.34M17.66 17.66L19.78 19.78M1 12H4M20 12H23M4.22 19.78L6.34 17.66M17.66 6.34L19.78 4.22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="ys-btn-icon ys-btn-close" id="ys-close-btn" title="닫기">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="ys-pagination">
        <button class="ys-btn-page" id="ys-prev-btn" title="이전">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <span class="ys-page-info" id="ys-page-info">1 / 1</span>
        <button class="ys-btn-page" id="ys-next-btn" title="다음">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div class="ys-script-list" id="ys-script-list">
        <!-- Script lines will be inserted here -->
      </div>

      <div class="ys-translate-panel" id="ys-translate-panel" style="display: none;">
        <div class="ys-translate-header">
          <span>번역</span>
          <button class="ys-btn-icon ys-btn-close-panel" id="ys-close-panel-btn">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="ys-source-text" id="ys-source-text"></div>
        <div class="ys-trans-text" id="ys-trans-text"></div>
        <button class="ys-btn-save" id="ys-save-btn">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H14L19 8V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          저장하기
        </button>
      </div>

      <!-- Settings Modal -->
      <div class="ys-modal" id="ys-settings-modal">
        <div class="ys-modal-content">
          <div class="ys-modal-header">
            <h3>설정</h3>
            <button class="ys-btn-icon ys-btn-close-modal" id="ys-close-settings">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="ys-modal-body">
            <div class="ys-setting-item">
              <label for="ys-api-key">DeepL API Key</label>
              <input type="password" id="ys-api-key" placeholder="DeepL API 키를 입력하세요">
            </div>
            <button class="ys-btn-primary" id="ys-save-settings">설정 저장</button>
          </div>
        </div>
      </div>

      <!-- Archive Modal -->
      <div class="ys-modal ys-archive-modal" id="ys-archive-modal">
        <div class="ys-modal-content ys-modal-large">
          <div class="ys-modal-header">
            <h3>보관함</h3>
            <button class="ys-btn-icon ys-btn-close-modal" id="ys-close-archive">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="ys-modal-body">
            <div class="ys-archive-list" id="ys-archive-list">
              <!-- Archive items will be inserted here -->
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    setupEventListeners();
  }

  // Remove UI
  function removeUI() {
    const container = document.getElementById('ys-container');
    if (container) {
      container.remove();
    }
  }

  // Setup event listeners
  function setupEventListeners() {
    // Close button
    document.getElementById('ys-close-btn').addEventListener('click', () => {
      const container = document.getElementById('ys-container');
      if (container) {
        container.classList.add('ys-hidden');
      }
    });

    // Pagination
    document.getElementById('ys-prev-btn').addEventListener('click', () => {
      if (currentPage > 0) {
        currentPage--;
        renderPage(currentPage);
      }
    });

    document.getElementById('ys-next-btn').addEventListener('click', () => {
      const totalPages = Math.ceil(scriptData.length / LINES_PER_PAGE);
      if (currentPage < totalPages - 1) {
        currentPage++;
        renderPage(currentPage);
      }
    });

    // Close translate panel
    document.getElementById('ys-close-panel-btn').addEventListener('click', () => {
      document.getElementById('ys-translate-panel').style.display = 'none';
    });

    // Save button
    document.getElementById('ys-save-btn').addEventListener('click', savePhrase);

    // Settings
    document.getElementById('ys-settings-btn').addEventListener('click', () => {
      loadApiKey();
      document.getElementById('ys-settings-modal').classList.add('active');
    });

    document.getElementById('ys-close-settings').addEventListener('click', () => {
      document.getElementById('ys-settings-modal').classList.remove('active');
    });

    document.getElementById('ys-save-settings').addEventListener('click', saveApiKey);

    // Archive
    document.getElementById('ys-archive-btn').addEventListener('click', showArchive);

    document.getElementById('ys-close-archive').addEventListener('click', () => {
      document.getElementById('ys-archive-modal').classList.remove('active');
    });

    // Close modals on background click
    document.getElementById('ys-settings-modal').addEventListener('click', (e) => {
      if (e.target.id === 'ys-settings-modal') {
        document.getElementById('ys-settings-modal').classList.remove('active');
      }
    });

    document.getElementById('ys-archive-modal').addEventListener('click', (e) => {
      if (e.target.id === 'ys-archive-modal') {
        document.getElementById('ys-archive-modal').classList.remove('active');
      }
    });

    // Text selection for translation
    document.addEventListener('mouseup', handleTextSelection);
  }

  // Render current page of transcript
  function renderPage(pageIndex) {
    const container = document.getElementById('ys-script-list');
    if (!container) return;

    container.innerHTML = '';

    const totalPages = Math.ceil(scriptData.length / LINES_PER_PAGE);
    const start = pageIndex * LINES_PER_PAGE;
    const end = Math.min(start + LINES_PER_PAGE, scriptData.length);
    const pageItems = scriptData.slice(start, end);

    // Update page info
    document.getElementById('ys-page-info').textContent = `${pageIndex + 1} / ${totalPages}`;

    // Update button states
    document.getElementById('ys-prev-btn').disabled = pageIndex === 0;
    document.getElementById('ys-next-btn').disabled = pageIndex >= totalPages - 1;

    pageItems.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'ys-line';
      div.dataset.time = item.timeSeconds;
      div.dataset.index = start + index;

      // Check if this line has saved notes
      const hasSavedNote = savedNotesForVideo.some && savedNotesForVideo.some(note =>
        note.source && item.text.includes(note.source.substring(0, 20))
      );

      if (hasSavedNote) {
        div.classList.add('ys-line-saved');
      }

      div.innerHTML = `
        <span class="ys-time">${item.timeStr}</span>
        <span class="ys-text">${item.text}</span>
      `;

      // Click to seek video
      div.addEventListener('click', (e) => {
        if (!window.getSelection().toString()) {
          seekToTime(item.timeSeconds);
        }
      });

      container.appendChild(div);
    });
  }

  // Seek video to specific time
  function seekToTime(seconds) {
    const video = document.querySelector('video');
    if (video) {
      const wasPaused = video.paused;
      video.currentTime = seconds;
      if (wasPaused) {
        video.pause();
      }
    }
  }

  // Handle text selection for translation
  function handleTextSelection(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    const container = document.getElementById('ys-container');

    if (!selectedText || !container) return;

    // Check if selection is within our container
    const anchorNode = selection.anchorNode;
    if (!container.contains(anchorNode)) return;

    // Don't trigger on modal areas
    if (anchorNode.closest && (anchorNode.closest('.ys-modal') || anchorNode.closest('.ys-translate-panel'))) return;

    showTranslatePanel(selectedText);
  }

  // Show translate panel with selected text
  async function showTranslatePanel(text) {
    const panel = document.getElementById('ys-translate-panel');
    const sourceEl = document.getElementById('ys-source-text');
    const transEl = document.getElementById('ys-trans-text');

    panel.style.display = 'block';
    sourceEl.textContent = text;
    transEl.textContent = '번역 중...';

    // Get API key and translate
    chrome.runtime.sendMessage({ action: 'getApiKey' }, async (response) => {
      const apiKey = response?.apiKey || '';

      chrome.runtime.sendMessage({
        action: 'translate',
        text: text,
        apiKey: apiKey
      }, (result) => {
        if (result?.success) {
          transEl.textContent = result.translatedText;
        } else {
          transEl.textContent = result?.error || '번역 실패';
        }
      });
    });
  }

  // Save phrase to storage
  function savePhrase() {
    const source = document.getElementById('ys-source-text').textContent;
    const translation = document.getElementById('ys-trans-text').textContent;
    const video = document.querySelector('video');
    const timestamp = video ? video.currentTime : 0;

    if (!source || translation === '번역 중...' || translation === '번역 실패') {
      showToast('저장할 내용이 없습니다');
      return;
    }

    const data = {
      videoId: currentVideoId,
      source: source,
      translation: translation,
      timestamp: timestamp,
      videoUrl: window.location.href,
      videoTitle: document.title.replace(' - YouTube', '')
    };

    chrome.runtime.sendMessage({ action: 'savePhrase', data: data }, (response) => {
      if (response?.success) {
        showToast('저장되었습니다!');
        document.getElementById('ys-translate-panel').style.display = 'none';
        loadSavedNotesForVideo().then(() => renderPage(currentPage));
      } else {
        showToast('저장 실패: ' + (response?.error || 'Unknown error'));
      }
    });
  }

  // Load API key
  function loadApiKey() {
    chrome.runtime.sendMessage({ action: 'getApiKey' }, (response) => {
      const input = document.getElementById('ys-api-key');
      if (input && response?.apiKey) {
        input.value = response.apiKey;
      }
    });
  }

  // Save API key
  function saveApiKey() {
    const apiKey = document.getElementById('ys-api-key').value.trim();
    chrome.runtime.sendMessage({ action: 'saveApiKey', apiKey: apiKey }, (response) => {
      if (response?.success) {
        showToast('설정이 저장되었습니다!');
        document.getElementById('ys-settings-modal').classList.remove('active');
      }
    });
  }

  // Show archive modal
  function showArchive() {
    const modal = document.getElementById('ys-archive-modal');
    const listContainer = document.getElementById('ys-archive-list');

    modal.classList.add('active');
    listContainer.innerHTML = '<div class="ys-loading">불러오는 중...</div>';

    chrome.runtime.sendMessage({ action: 'getPhrases' }, (response) => {
      const phrases = response?.phrases || {};
      listContainer.innerHTML = '';

      const entries = Object.entries(phrases);
      if (entries.length === 0) {
        listContainer.innerHTML = `
          <div class="ys-empty-state">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M21 8V21H3V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M23 3H1V8H23V3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 12H14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <p>저장된 표현이 없습니다</p>
          </div>
        `;
        return;
      }

      entries.forEach(([videoId, notes]) => {
        notes.forEach(note => {
          const item = document.createElement('div');
          item.className = 'ys-archive-item';

          const timeStr = formatTime(note.timestamp || 0);
          const date = new Date(note.createdAt);
          const dateStr = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;

          item.innerHTML = `
            <div class="ys-arc-title">${note.videoTitle || 'Unknown'} <span class="ys-arc-time">(${timeStr})</span></div>
            <div class="ys-arc-content">
              <p class="ys-arc-source"><strong>Eng:</strong> ${note.source}</p>
              <p class="ys-arc-trans"><strong>Kor:</strong> ${note.translation}</p>
            </div>
            <div class="ys-arc-footer">
              <span class="ys-arc-date">${dateStr}</span>
              <div class="ys-arc-actions">
                <a href="${note.videoUrl}&t=${Math.floor(note.timestamp)}s" target="_blank" class="ys-btn-link">영상 보기</a>
                <button class="ys-btn-delete" data-video-id="${videoId}" data-phrase-id="${note.id}">삭제</button>
              </div>
            </div>
          `;

          // Delete button handler
          item.querySelector('.ys-btn-delete').addEventListener('click', async (e) => {
            const vId = e.target.dataset.videoId;
            const pId = parseInt(e.target.dataset.phraseId);

            chrome.runtime.sendMessage({
              action: 'deletePhrase',
              videoId: vId,
              phraseId: pId
            }, (response) => {
              if (response?.success) {
                item.remove();
                showToast('삭제되었습니다');
                loadSavedNotesForVideo().then(() => renderPage(currentPage));
              }
            });
          });

          listContainer.appendChild(item);
        });
      });
    });
  }

  // Show toast notification
  function showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.ys-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'ys-toast';
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

  // Watch for URL changes (YouTube is SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      if (url.includes('youtube.com/watch')) {
        setTimeout(initApp, 1000);
      } else {
        removeUI();
      }
    }
  }).observe(document, { subtree: true, childList: true });

  // Initial load
  if (location.href.includes('youtube.com/watch')) {
    initApp();
  }

})();
