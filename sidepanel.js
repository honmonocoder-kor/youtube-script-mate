// YouTube Script Mate - Side Panel Script

// State
let scriptData = [];
let currentPage = 0;
let pageBreakpoints = [];
let currentVideoId = null;
let currentVideoUrl = null;
let currentVideoTitle = null;
let currentMode = 'normal'; // 'normal', 'translate', 'summary'
let isPlaying = false;
let currentTime = 0;
let videoDuration = 0;
let syncInterval = null;
let selectedScriptIndex = -1;
let clickedScriptTimes = {}; // 문장 클릭 시점의 정확한 YouTube 비디오 시간 저장
let isExtracted = false;
let userSelectedIndex = -1; // 사용자가 직접 선택한 문장 인덱스 (시간 기반 판단 무시용)
let userSelectionTimeout = null; // 사용자 선택 후 일정 시간 후 자동 해제
let previousActiveIndex = -1; // 이전에 활성화된 스크립트 인덱스 (자동 패널 업데이트용)

// 구간반복 상태
let repeatState = 'idle'; // 'idle', 'start', 'active'
let repeatStartTime = 0;
let repeatEndTime = 0;
let repeatInterval = null;
let repeatKey = 'R'; // 기본값

// 뒤로/앞으로 가기 시간 (초)
let seekTime = 5; // 기본값

// 이번 페이지 필터 상태
let isCurrentPageFilterActive = false;

// 녹음 및 재생 상태
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let currentRecordingUrl = null;

// 영상 전체 shadowing 녹음용 변수 (문장 단위 녹음과 분리)
let videoMediaRecorder = null;
let videoAudioChunks = [];
let isVideoRecording = false;
let currentRecordingAudio = null;
let isPlayingRecording = false;
let isComparePlaying = false;
let currentPhraseRecordingUrl = null; // 현재 선택된 문장의 녹음 파일 URL
let loopPlayback = false; // 반복재생 설정

// 배속 상태
let playbackSpeed = 1.0;

// Summary state
let summaryOriginalText = ''; // 원문 그대로 요약
let summaryTranslatedText = ''; // 요약의 번역본
let summaryPages = [];
let currentSummaryPage = 0;
let summaryViewMode = 'original'; // 'original' or 'translated'

// For backward compatibility
let summaryText = '';

// Cache for extracted scripts per video
let extractedVideos = {};

// Flag to temporarily disable page sync after manual navigation
let manualPageNavigation = false;

// Height-based pagination constants
const SINGLE_LINE_HEIGHT = 43;
const GAP_HEIGHT = 3;
const TARGET_PAGE_HEIGHT = (SINGLE_LINE_HEIGHT * 10) + (GAP_HEIGHT * 9);

// DOM Elements
let elements = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  setupEventListeners();
  loadSettings();
  checkCurrentTab();
  startTabMonitoring();
});

function initializeElements() {
  elements = {
    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),

    // Header
    recordVideoBtn: document.getElementById('recordVideoBtn'),
    stopRecordVideoBtn: document.getElementById('stopRecordVideoBtn'),
    recordingsListBtn: document.getElementById('recordingsListBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    helpBtn: document.getElementById('helpBtn'),

    // Controls bar
    controlsBar: document.getElementById('controlsBar'),
    playPauseBtn: document.getElementById('playPauseBtn'),
    iconPlay: document.querySelector('.icon-play'),
    iconPause: document.querySelector('.icon-pause'),
    playbackTime: document.getElementById('playbackTime'),
    repeatIndicator: document.getElementById('repeatIndicator'),
    repeatIndicatorSimple: document.getElementById('repeatIndicatorSimple'),
    repeatControls: document.getElementById('repeatControls'),
    speedControl: document.getElementById('speedControl'),
    speedValue: document.getElementById('speedValue'),
    speedUpBtn: document.getElementById('speedUpBtn'),
    speedDownBtn: document.getElementById('speedDownBtn'),
    paginationSection: document.getElementById('paginationSection'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    pageInfo: document.getElementById('pageInfo'),

    // Script list
    scriptList: document.getElementById('scriptList'),
    emptyState: document.getElementById('emptyState'),

    // Summary
    summaryControlsBar: document.getElementById('summaryControlsBar'),
    summaryPlayPauseBtn: document.getElementById('summaryPlayPauseBtn'),
    summaryPlaybackTime: document.getElementById('summaryPlaybackTime'),
    summarySpeedUpBtn: document.getElementById('summarySpeedUpBtn'),
    summarySpeedDownBtn: document.getElementById('summarySpeedDownBtn'),
    summarySpeedValue: document.getElementById('summarySpeedValue'),
    summaryOriginalBtn: document.getElementById('summaryOriginalBtn'),
    summaryTranslatedBtn: document.getElementById('summaryTranslatedBtn'),
    summaryContent: document.getElementById('summaryContent'),
    summaryText: document.getElementById('summaryText'),
    summaryPrevBtn: document.getElementById('summaryPrevBtn'),
    summaryNextBtn: document.getElementById('summaryNextBtn'),
    summaryPageInfo: document.getElementById('summaryPageInfo'),
    summaryLoading: document.getElementById('summaryLoading'),

    // Content Input
    contentInputSection: document.getElementById('contentInputSection'),
    contentInputTextarea: document.getElementById('contentInputTextarea'),
    contentInputBody: document.getElementById('contentInputBody'),
    toggleContentInputBtn: document.getElementById('toggleContentInputBtn'),
    saveSelectedContentBtn: document.getElementById('saveSelectedContentBtn'),
    saveFullSummaryBtn: document.getElementById('saveFullSummaryBtn'),

    // Video phrases
    videoPhrasesSection: document.getElementById('videoPhrasesSection'),
    videoPhrasesList: document.getElementById('videoPhrasesList'),
    togglePhrasesBtn: document.getElementById('togglePhrasesBtn'),
    currentPageFilterBtn: document.getElementById('currentPageFilterBtn'),

    // Fixed Action Bar (replaces selection/translate panels)
    fixedActionBar: document.getElementById('fixedActionBar'),
    fixedTranslation: document.getElementById('fixedTranslation'),
    fixedTransText: document.getElementById('fixedTransText'),
    fixedActions: document.getElementById('fixedActions'),
    fixedRecordBtn: document.getElementById('fixedRecordBtn'),
    fixedPlayOriginalBtn: document.getElementById('fixedPlayOriginalBtn'),
    fixedPlayRecordingBtn: document.getElementById('fixedPlayRecordingBtn'),
    fixedCompareBtn: document.getElementById('fixedCompareBtn'),
    fixedSaveBtn: document.getElementById('fixedSaveBtn'),
    fixedRecordingStatus: document.getElementById('fixedRecordingStatus'),

    // Archive buttons
    archiveButtons: document.getElementById('archiveButtons'),
    videoArchiveBtn: document.getElementById('videoArchiveBtn'),
    masterArchiveBtn: document.getElementById('masterArchiveBtn'),

    // Loading
    loadingOverlay: document.getElementById('loadingOverlay'),

    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    myLangSelect: document.getElementById('myLangSelect'),
    sourceLangSelect: document.getElementById('sourceLangSelect'),
    targetLangSelect: document.getElementById('targetLangSelect'),
    apiModelInput: document.getElementById('apiModelInput'),
    modelHint: document.getElementById('modelHint'),
    apiGuideLink: document.getElementById('apiGuideLink'),
    apiGuideLink2: document.getElementById('apiGuideLink2'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    seekTimeInput: document.getElementById('seekTimeInput'),
    seekTimeUpBtn: document.getElementById('seekTimeUpBtn'),
    seekTimeDownBtn: document.getElementById('seekTimeDownBtn'),
    repeatKeyInput: document.getElementById('repeatKeyInput'),
    loopPlaybackCheckbox: document.getElementById('loopPlaybackCheckbox'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),

    // Video Archive Modal
    videoArchiveModal: document.getElementById('videoArchiveModal'),
    videoArchiveList: document.getElementById('videoArchiveList'),
    closeVideoArchiveBtn: document.getElementById('closeVideoArchiveBtn'),

    // Master Archive Modal
    masterArchiveModal: document.getElementById('masterArchiveModal'),
    masterArchiveList: document.getElementById('masterArchiveList'),
    closeMasterArchiveBtn: document.getElementById('closeMasterArchiveBtn')
  };
}

function setupEventListeners() {
  // Tab switching
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchMode(tab);
    });
  });

  // 전체 쉐도잉 녹음
  elements.recordVideoBtn.addEventListener('click', startVideoRecording);
  elements.stopRecordVideoBtn.addEventListener('click', stopVideoRecording);
  elements.recordingsListBtn.addEventListener('click', openRecordingsList);

  // Refresh button
  elements.refreshBtn.addEventListener('click', extractTranscript);

  // Play/Pause
  elements.playPauseBtn.addEventListener('click', togglePlayPause);

  // Pagination
  elements.prevBtn.addEventListener('click', () => {
    if (currentPage > 0) {
      goToPage(currentPage - 1, elements.prevBtn);
    }
  });

  elements.nextBtn.addEventListener('click', () => {
    if (currentPage < pageBreakpoints.length - 1) {
      goToPage(currentPage + 1, elements.nextBtn);
    }
  });

  // Page Up/Down 키 이벤트 - 이전/다음 페이지 이동
  document.addEventListener('keydown', (e) => {
    if (!isExtracted || scriptData.length === 0) return;
    
    // 좌우 화살표 키 - 5초 뒤로/앞으로 이동
    if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      seekRelative(-seekTime);
    }
    
    if (e.key === 'ArrowRight' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      seekRelative(seekTime);
    }
    
    // Page Up - 이전 페이지 (이전 버튼과 동일)
    if (e.key === 'PageUp') {
      e.preventDefault();
      if (currentPage > 0) {
        goToPage(currentPage - 1, elements.prevBtn);
      }
    }
    
    // Page Down - 다음 페이지 (다음 버튼과 동일)
    if (e.key === 'PageDown') {
      e.preventDefault();
      if (currentPage < pageBreakpoints.length - 1) {
        goToPage(currentPage + 1, elements.nextBtn);
      }
    }

    // 구간반복 키
    if (e.key.toUpperCase() === repeatKey.toUpperCase() && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      
      // 이미 반복 중이면 비활성화
      if (repeatState === 'active') {
        stopRepeat();
        repeatState = 'idle';
        repeatStartTime = 0;
        repeatEndTime = 0;
        updateRepeatIndicator();
        clearRepeatHighlight();
        return;
      }
      
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText && selection.anchorNode) {
        // 드래그한 텍스트가 있으면 해당 구간 반복
        handleDragRepeat(selection);
      } else if (selectedScriptIndex >= 0 && scriptData[selectedScriptIndex]) {
        // 스크립트 라인을 클릭한 상태면 해당 라인 기준으로 반복
        handleScriptLineRepeat(selectedScriptIndex);
      } else {
        // 드래그한 텍스트도 없고 클릭한 라인도 없으면 기존 방식 (현재 시간 기준)
        handleRepeatKey();
      }
    }
  });

  // Summary pagination
  elements.summaryPrevBtn.addEventListener('click', () => {
    if (currentSummaryPage > 0) {
      currentSummaryPage--;
      renderSummaryPage();
    }
  });

  elements.summaryNextBtn.addEventListener('click', () => {
    if (currentSummaryPage < summaryPages.length - 1) {
      currentSummaryPage++;
      renderSummaryPage();
    }
  });

  // Summary toggle buttons (요약/번역)
  elements.summaryOriginalBtn.addEventListener('click', () => {
    if (summaryViewMode !== 'original') {
      summaryViewMode = 'original';
      elements.summaryOriginalBtn.classList.add('active');
      elements.summaryTranslatedBtn.classList.remove('active');
      paginateSummary();
      renderSummaryPage();
    }
  });

  elements.summaryTranslatedBtn.addEventListener('click', () => {
    if (summaryViewMode !== 'translated') {
      summaryViewMode = 'translated';
      elements.summaryTranslatedBtn.classList.add('active');
      elements.summaryOriginalBtn.classList.remove('active');

      // 번역본이 없으면 생성
      if (!summaryTranslatedText && summaryOriginalText) {
        generateSummaryTranslation();
      } else {
        paginateSummary();
        renderSummaryPage();
      }
    }
  });

  // Summary playback controls
  elements.summaryPlayPauseBtn.addEventListener('click', togglePlayPause);

  elements.summarySpeedUpBtn.addEventListener('click', () => {
    adjustPlaybackSpeed(0.25);
  });

  elements.summarySpeedDownBtn.addEventListener('click', () => {
    adjustPlaybackSpeed(-0.25);
  });

  // Content input save buttons
  elements.saveSelectedContentBtn.addEventListener('click', saveSelectedContent);
  elements.saveFullSummaryBtn.addEventListener('click', saveFullSummary);

  // Enter 키로 선택 저장
  elements.contentInputTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveSelectedContent();
    }
  });

  // Fixed Action Bar events
  elements.fixedRecordBtn.addEventListener('click', startFixedRecording);
  elements.fixedPlayOriginalBtn.addEventListener('click', playFixedOriginal);
  elements.fixedPlayRecordingBtn.addEventListener('click', playFixedRecording);
  elements.fixedCompareBtn.addEventListener('click', startFixedComparePlay);
  elements.fixedSaveBtn.addEventListener('click', saveFixedPhrase);

  // Video phrases toggle
  elements.togglePhrasesBtn.addEventListener('click', () => {
    elements.togglePhrasesBtn.classList.toggle('collapsed');
    elements.videoPhrasesList.classList.toggle('collapsed');
  });

  // Content input toggle (요약 모드 내용 입력 접기/펼치기)
  if (elements.toggleContentInputBtn) {
    elements.toggleContentInputBtn.addEventListener('click', () => {
      elements.toggleContentInputBtn.classList.toggle('collapsed');
      elements.contentInputBody.classList.toggle('collapsed');
    });
  }

  // 이번 페이지 필터 토글
  elements.currentPageFilterBtn.addEventListener('click', () => {
    isCurrentPageFilterActive = !isCurrentPageFilterActive;
    elements.currentPageFilterBtn.classList.toggle('active', isCurrentPageFilterActive);
    loadVideoPhrases();
  });

  // Settings - 모든 모드에서 설정 버튼 클릭 가능
  elements.settingsBtn.addEventListener('click', () => {
    loadSettings();
    elements.settingsModal.classList.add('active');
  });

  elements.closeSettingsBtn.addEventListener('click', () => {
    elements.settingsModal.classList.remove('active');
  });

  elements.saveSettingsBtn.addEventListener('click', saveSettings);

  // Help button - 도움말 페이지 열기
  if (elements.helpBtn) {
    elements.helpBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('help.html') });
    });
  }

  // API Guide link click events
  const openApiGuide = (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('api-guide.html') });
  };

  if (elements.apiGuideLink) {
    elements.apiGuideLink.addEventListener('click', openApiGuide);
  }
  if (elements.apiGuideLink2) {
    elements.apiGuideLink2.addEventListener('click', openApiGuide);
  }

  // Seek time 조정
  elements.seekTimeUpBtn.addEventListener('click', () => {
    const current = parseInt(elements.seekTimeInput.value) || 5;
    elements.seekTimeInput.value = Math.max(1, current + 1);
  });

  elements.seekTimeDownBtn.addEventListener('click', () => {
    const current = parseInt(elements.seekTimeInput.value) || 5;
    elements.seekTimeInput.value = Math.max(1, current - 1);
  });

  // 배속 조정
  elements.speedUpBtn.addEventListener('click', () => {
    playbackSpeed = Math.min(playbackSpeed + 0.1, 2.0);
    updatePlaybackSpeed();
  });

  elements.speedDownBtn.addEventListener('click', () => {
    playbackSpeed = Math.max(playbackSpeed - 0.1, 0.5);
    updatePlaybackSpeed();
  });

  // Esc 키로 녹음 종료 (문장 단위 녹음 또는 영상 전체 녹음)
  // 스페이스바로 재생/일시정지
  // A, S, D, F, G 단축키 (일반 모드 액션 버튼)
  document.addEventListener('keydown', (e) => {
    // 입력 필드에 포커스가 있으면 무시
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    );

    if (e.key === 'Escape') {
      if (isRecording) {
        stopRecording();
      } else if (isVideoRecording) {
        stopVideoRecording();
      }
    }

    // 스페이스바: 재생/일시정지 (입력 필드가 아닐 때만)
    if (e.key === ' ' && !isInputFocused && isExtracted) {
      e.preventDefault(); // 페이지 스크롤 방지
      togglePlayPause();
    }

    // 일반/번역 모드 단축키 (A, S, D, F, G)
    if (!isInputFocused && (currentMode === 'normal' || currentMode === 'translate') && isExtracted && elements.fixedActionBar.style.display !== 'none') {
      const key = e.key.toLowerCase();

      if (key === 'a') {
        e.preventDefault();
        startFixedRecording();
      } else if (key === 's') {
        e.preventDefault();
        playFixedOriginal();
      } else if (key === 'd') {
        e.preventDefault();
        playFixedRecording();
      } else if (key === 'f') {
        e.preventDefault();
        startFixedComparePlay();
      } else if (key === 'g') {
        e.preventDefault();
        saveFixedPhrase();
      }
    }
  });

  // Archive buttons
  elements.videoArchiveBtn.addEventListener('click', showVideoArchive);
  elements.masterArchiveBtn.addEventListener('click', showMasterArchive);

  // Close archive modals
  elements.closeVideoArchiveBtn.addEventListener('click', () => {
    elements.videoArchiveModal.classList.remove('active');
  });

  elements.closeMasterArchiveBtn.addEventListener('click', () => {
    elements.masterArchiveModal.classList.remove('active');
  });

  // Close modals on background click
  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) {
      elements.settingsModal.classList.remove('active');
    }
  });

  elements.videoArchiveModal.addEventListener('click', (e) => {
    if (e.target === elements.videoArchiveModal) {
      elements.videoArchiveModal.classList.remove('active');
    }
  });

  elements.masterArchiveModal.addEventListener('click', (e) => {
    if (e.target === elements.masterArchiveModal) {
      elements.masterArchiveModal.classList.remove('active');
    }
  });

  // Text selection for translation/saving
  document.addEventListener('mouseup', handleTextSelection);
}

// Switch between modes
function switchMode(mode) {
  currentMode = mode;

  elements.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === mode);
  });

  // Hide fixed action bar
  elements.fixedActionBar.style.display = 'none';

  // Show/hide content based on mode
  if (mode === 'summary') {
    elements.scriptList.style.display = 'none';
    elements.summaryContent.style.display = 'flex';
    elements.controlsBar.style.display = 'none'; // 일반/번역 모드 컨트롤바 숨김
    elements.summaryControlsBar.style.display = isExtracted ? 'flex' : 'none'; // 요약 모드 컨트롤바 표시
    elements.contentInputSection.style.display = isExtracted ? 'flex' : 'none'; // 내용 입력 섹션 표시

    // 요약 버튼을 기본 활성화 상태로
    summaryViewMode = 'original';
    elements.summaryOriginalBtn.classList.add('active');
    elements.summaryTranslatedBtn.classList.remove('active');

    // Generate summary if we have script data and haven't generated yet
    if (scriptData.length > 0 && !summaryOriginalText) {
      generateSummary();
    } else if (summaryOriginalText) {
      paginateSummary();
      renderSummaryPage();
    }
  } else {
    elements.scriptList.style.display = 'flex';
    elements.summaryContent.style.display = 'none';
    elements.summaryControlsBar.style.display = 'none'; // 요약 모드 컨트롤바 숨김
    elements.controlsBar.style.display = isExtracted ? 'flex' : 'none'; // 일반/번역 모드 컨트롤바 표시
    elements.paginationSection.style.display = 'flex';
    elements.contentInputSection.style.display = 'none'; // 내용 입력 섹션 숨김

    // Re-render page to update highlights for the new mode
    if (scriptData.length > 0) {
      renderPage(currentPage);
    }
  }

  // Settings button - 모든 모드에서 활성화
  elements.settingsBtn.style.opacity = '1';
  elements.settingsBtn.style.pointerEvents = 'auto';

  // Update video phrases visibility based on mode
  loadVideoPhrases();
}

// Check current tab
function checkCurrentTab() {
  chrome.runtime.sendMessage({ action: 'getCurrentTab' }, (response) => {
    if (response?.tab) {
      const url = response.tab.url;
      if (url && url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(new URL(url).search);
        const newVideoId = urlParams.get('v');

        // Check if we switched to a different video
        if (newVideoId !== currentVideoId) {
          handleVideoChange(newVideoId, url, response.tab.title);
        }

        currentVideoId = newVideoId;
        currentVideoUrl = url;
        currentVideoTitle = response.tab.title?.replace(' - YouTube', '') || 'Unknown';
      }
    }
  });
}

// Handle video change (tab switch or navigation)
function handleVideoChange(newVideoId, url, title) {
  // Save current video's script data if extracted
  if (currentVideoId && isExtracted && scriptData.length > 0) {
    extractedVideos[currentVideoId] = {
      scriptData: scriptData,
      summaryOriginalText: summaryOriginalText,
      summaryTranslatedText: summaryTranslatedText,
      pageBreakpoints: pageBreakpoints
    };
  }

  // Check if the new video has cached script data
  if (extractedVideos[newVideoId]) {
    // Restore cached data
    const cached = extractedVideos[newVideoId];
    scriptData = cached.scriptData;
    summaryOriginalText = cached.summaryOriginalText || '';
    summaryTranslatedText = cached.summaryTranslatedText || '';
    summaryText = summaryOriginalText; // backward compatibility
    pageBreakpoints = cached.pageBreakpoints;
    currentPage = 0;
    isExtracted = true;

    // Update UI for extracted state
    elements.refreshBtn.classList.remove('btn-refresh-hint'); // 애니메이션 제거
    elements.refreshBtn.classList.add('extracted');
    elements.refreshBtn.title = '스크립트 추출 완료. 새로고침을 하려면 클릭하세요';
    elements.emptyState.style.display = 'none';
    if (currentMode === 'summary') {
      elements.summaryControlsBar.style.display = 'flex';
      elements.contentInputSection.style.display = 'flex';
    } else {
      elements.controlsBar.style.display = 'flex';
    }
    elements.archiveButtons.style.display = 'flex';

    renderPage(currentPage);
    loadVideoPhrases();
    startVideoSync();
    updateRepeatIndicator(); // 구간반복 표시 업데이트

    if (currentMode === 'summary') {
      paginateSummary();
      renderSummaryPage();
    }
  } else {
    // Reset to unextracted state for new video
    scriptData = [];
    summaryOriginalText = '';
    summaryTranslatedText = '';
    summaryText = '';
    summaryPages = [];
    pageBreakpoints = [];
    currentPage = 0;
    isExtracted = false;

    // 구간반복 초기화
    stopRepeat();
    repeatState = 'idle';
    repeatStartTime = 0;
    repeatEndTime = 0;
    updateRepeatIndicator();
    clearRepeatHighlight();
    
    // 클릭 시간 저장소 초기화
    clickedScriptTimes = {};
    
    // 이번 페이지 필터 초기화
    isCurrentPageFilterActive = false;
    if (elements.currentPageFilterBtn) {
      elements.currentPageFilterBtn.classList.remove('active');
    }

    // Update UI for unextracted state
    elements.refreshBtn.classList.remove('extracted');
    elements.refreshBtn.classList.add('btn-refresh-hint'); // 애니메이션 복원
    elements.refreshBtn.title = '스크립트 새로고침';
    elements.emptyState.style.display = 'block';
    elements.controlsBar.style.display = 'none';
    elements.summaryControlsBar.style.display = 'none';
    elements.contentInputSection.style.display = 'none';
    elements.archiveButtons.style.display = 'none';
    elements.fixedActionBar.style.display = 'none';

    // Clear script list
    const lines = elements.scriptList.querySelectorAll('.script-line');
    lines.forEach(line => line.remove());

    // Clear summary
    elements.summaryText.textContent = '';
  }
}

// Start monitoring for tab changes
function startTabMonitoring() {
  setInterval(() => {
    checkCurrentTab();
  }, 1000);
}

// Extract transcript
function extractTranscript() {
  showLoading(true);

  // 먼저 YouTube 스크립트 패널 열기 (구간반복 기능을 위해)
  chrome.runtime.sendMessage({ action: 'openYouTubeTranscriptPanel' }, (openResponse) => {
    // 패널 열기 완료 후 스크립트 추출
    chrome.runtime.sendMessage({ action: 'extractTranscript' }, (response) => {
    showLoading(false);

    if (response?.success && response.data && response.data.length > 0) {
      scriptData = response.data;
      currentPage = 0;
      isExtracted = true;
      summaryOriginalText = ''; // Reset summary when new transcript is extracted
      summaryTranslatedText = '';
      summaryText = '';

      calculatePageBreakpoints();

      // Update refresh button to show extracted state
      elements.refreshBtn.classList.remove('btn-refresh-hint'); // 애니메이션 제거
      elements.refreshBtn.classList.add('extracted');
      elements.refreshBtn.title = '스크립트 추출 완료. 새로고침을 하려면 클릭하세요';

      elements.emptyState.style.display = 'none';

      // 모드에 따라 컨트롤바 표시
      if (currentMode === 'summary') {
        elements.controlsBar.style.display = 'none';
        elements.summaryControlsBar.style.display = 'flex';
        elements.contentInputSection.style.display = 'flex';
      } else {
        elements.controlsBar.style.display = 'flex';
        elements.summaryControlsBar.style.display = 'none';
        elements.contentInputSection.style.display = 'none';
      }
      elements.archiveButtons.style.display = 'flex';

      renderPage(currentPage);
      loadVideoPhrases();
      startVideoSync();
      updateRepeatIndicator(); // 구간반복 표시 업데이트
      updatePlaybackSpeed(); // 배속 표시 업데이트

      // 스크립트 추출 후 모든 문장 번역 및 요약 생성하여 로컬에 캐시 저장
      cacheTranslationsAndSummary();

      // If in summary mode, generate summary
      if (currentMode === 'summary') {
        generateSummary();
      }
    } else {
      isExtracted = false;
      elements.refreshBtn.classList.remove('extracted');
      elements.refreshBtn.title = '스크립트 새로고침';

      elements.emptyState.style.display = 'block';
      elements.controlsBar.style.display = 'none';
      elements.summaryControlsBar.style.display = 'none';
      elements.contentInputSection.style.display = 'none';
      elements.archiveButtons.style.display = 'none';
    }
    });
  });

  // Get current tab info
  chrome.runtime.sendMessage({ action: 'getCurrentTab' }, (response) => {
    if (response?.tab) {
      const url = response.tab.url;
      if (url && url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(new URL(url).search);
        currentVideoId = urlParams.get('v');
        currentVideoUrl = url;
        currentVideoTitle = response.tab.title?.replace(' - YouTube', '') || 'Unknown';
      }
    }
  });
}

// 모든 스크립트 문장 번역 및 요약을 로컬에 캐시 저장
function cacheTranslationsAndSummary() {
  if (!currentVideoId || scriptData.length === 0) return;

  chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
    const sourceLang = settings?.sourceLang || 'EN';
    const targetLang = settings?.targetLang || 'KO';
    const apiKey = settings?.apiKey || '';
    const apiModel = settings?.apiModel || '';

    if (!apiKey) {
      console.log('API 키가 없어 번역/요약 캐시를 생성할 수 없습니다');
      return;
    }

    // 1. 모든 문장 번역 (전체 텍스트를 한 번에 번역)
    const allTexts = scriptData.map(s => s.text);
    const fullText = allTexts.join('\n');

    chrome.runtime.sendMessage({
      action: 'translateBatch',
      texts: allTexts,
      sourceLang: sourceLang,
      targetLang: targetLang,
      apiKey: apiKey,
      apiModel: apiModel
    }, (translateResult) => {
      if (translateResult?.success && translateResult.translations) {
        // 번역 결과를 문장별로 매핑하여 저장
        const translations = {};
        translateResult.translations.forEach((translated, index) => {
          if (scriptData[index]) {
            translations[scriptData[index].text] = translated;
          }
        });

        // 로컬에 저장
        const cacheKey = `temp_translations_${currentVideoId}`;
        chrome.storage.local.set({ [cacheKey]: translations }, () => {
          console.log('번역 캐시 저장 완료');
        });
      }
    });

    // 2. 원문 그대로 요약 생성 (스크립트 원어로 요약)
    const fullScriptText = scriptData.map(s => s.text).join(' ');

    chrome.runtime.sendMessage({
      action: 'summarizeOriginal',
      text: fullScriptText,
      apiKey: apiKey,
      apiModel: apiModel
    }, (summaryResult) => {
      if (summaryResult?.success && summaryResult.summaryText) {
        // 원문 요약을 로컬에 저장
        const summaryCacheKey = `temp_summary_original_${currentVideoId}`;
        chrome.storage.local.set({ [summaryCacheKey]: summaryResult.summaryText }, () => {
          console.log('원문 요약 캐시 저장 완료');
        });
      }
    });
  });
}

// Generate summary (원문 그대로 요약)
function generateSummary() {
  if (scriptData.length === 0) return;

  elements.summaryText.innerHTML = '';
  elements.summaryLoading.style.display = 'flex';

  // 로컬 캐시에서 원문 요약 가져오기
  const cacheKey = `temp_summary_original_${currentVideoId}`;
  chrome.storage.local.get([cacheKey], (result) => {
    const cachedSummary = result[cacheKey];

    if (cachedSummary) {
      // 로컬 캐시에 요약이 있으면 사용
      summaryOriginalText = cachedSummary;
      summaryText = summaryOriginalText; // backward compatibility
      paginateSummary();
      renderSummaryPage();
      elements.summaryLoading.style.display = 'none';
    } else {
      // 로컬 캐시에 없으면 API 호출 (fallback) - 원문 그대로 요약
      const fullText = scriptData.map(s => s.text).join(' ');

      chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
        const apiKey = settings?.apiKey || '';
        const apiModel = settings?.apiModel || '';

        chrome.runtime.sendMessage({
          action: 'summarizeOriginal',
          text: fullText,
          apiKey: apiKey,
          apiModel: apiModel
        }, (result) => {
          elements.summaryLoading.style.display = 'none';

          if (result?.success) {
            summaryOriginalText = result.summaryText;
            summaryText = summaryOriginalText; // backward compatibility

            // 로컬에 캐시 저장
            chrome.storage.local.set({ [cacheKey]: summaryOriginalText });

            paginateSummary();
            renderSummaryPage();
          } else {
            elements.summaryText.textContent = result?.error || '요약 실패';
          }
        });
      });
    }
  });
}

// Generate summary translation (요약의 번역본 생성)
function generateSummaryTranslation() {
  if (!summaryOriginalText) return;

  elements.summaryText.innerHTML = '';
  elements.summaryLoading.style.display = 'flex';

  // 로컬 캐시에서 번역 요약 가져오기
  const cacheKey = `temp_summary_translated_${currentVideoId}`;
  chrome.storage.local.get([cacheKey], (result) => {
    const cachedTranslation = result[cacheKey];

    if (cachedTranslation) {
      // 로컬 캐시에 번역이 있으면 사용
      summaryTranslatedText = cachedTranslation;
      paginateSummary();
      renderSummaryPage();
      elements.summaryLoading.style.display = 'none';
    } else {
      // 로컬 캐시에 없으면 API 호출
      chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
        const apiKey = settings?.apiKey || '';
        const apiModel = settings?.apiModel || '';
        let targetLang = settings?.myLang || 'auto';

        // If auto, use browser language
        if (targetLang === 'auto') {
          const browserLang = navigator.language.split('-')[0].toUpperCase();
          const supportedLangs = ['EN', 'KO', 'JA', 'ZH', 'ES', 'FR', 'DE'];
          targetLang = supportedLangs.includes(browserLang) ? browserLang : 'EN';
        }

        chrome.runtime.sendMessage({
          action: 'translateSummary',
          text: summaryOriginalText,
          targetLang: targetLang,
          apiKey: apiKey,
          apiModel: apiModel
        }, (result) => {
          elements.summaryLoading.style.display = 'none';

          if (result?.success) {
            summaryTranslatedText = result.translatedText;

            // 로컬에 캐시 저장
            chrome.storage.local.set({ [cacheKey]: summaryTranslatedText });

            paginateSummary();
            renderSummaryPage();
          } else {
            elements.summaryText.textContent = result?.error || '번역 실패';
          }
        });
      });
    }
  });
}

// Summary pagination constants
const SUMMARY_CHARS_PER_PAGE = 800; // 한 페이지당 글자 수

// Paginate summary text
function paginateSummary() {
  const text = summaryViewMode === 'original' ? summaryOriginalText : summaryTranslatedText;

  if (!text) {
    summaryPages = [];
    currentSummaryPage = 0;
    return;
  }

  // 문단 단위로 분리
  const paragraphs = text.split(/\n\n+/);
  summaryPages = [];
  let currentPageContent = '';

  for (const paragraph of paragraphs) {
    if (currentPageContent.length + paragraph.length > SUMMARY_CHARS_PER_PAGE && currentPageContent.length > 0) {
      // 현재 페이지 저장하고 새 페이지 시작
      summaryPages.push(currentPageContent.trim());
      currentPageContent = paragraph;
    } else {
      // 현재 페이지에 추가
      currentPageContent += (currentPageContent ? '\n\n' : '') + paragraph;
    }
  }

  // 마지막 페이지 추가
  if (currentPageContent.trim()) {
    summaryPages.push(currentPageContent.trim());
  }

  // 페이지가 없으면 전체 텍스트를 하나의 페이지로
  if (summaryPages.length === 0) {
    summaryPages = [text];
  }

  currentSummaryPage = 0;
}

// Render summary page
function renderSummaryPage() {
  if (summaryPages.length === 0) return;

  elements.summaryText.textContent = summaryPages[currentSummaryPage];

  // 페이지네이션 UI 업데이트
  elements.summaryPageInfo.textContent = `${currentSummaryPage + 1} / ${summaryPages.length}`;
  elements.summaryPrevBtn.disabled = currentSummaryPage === 0;
  elements.summaryNextBtn.disabled = currentSummaryPage >= summaryPages.length - 1;
}

// Calculate page breakpoints
function calculatePageBreakpoints() {
  pageBreakpoints = [0];

  let currentHeight = 0;
  let pageStartIndex = 0;

  for (let i = 0; i < scriptData.length; i++) {
    const item = scriptData[i];
    const itemHeight = estimateLineHeight(item.text);

    const gapHeight = (i > pageStartIndex) ? GAP_HEIGHT : 0;
    const totalItemHeight = itemHeight + gapHeight;

    if (currentHeight + totalItemHeight > TARGET_PAGE_HEIGHT && i > pageStartIndex) {
      pageBreakpoints.push(i);
      pageStartIndex = i;
      currentHeight = itemHeight;
    } else {
      currentHeight += totalItemHeight;
    }
  }
}

function estimateLineHeight(text) {
  const CHARS_PER_LINE = 40;
  const LINE_TEXT_HEIGHT = 21;
  const BASE_PADDING = 22;

  const textLines = Math.ceil(text.length / CHARS_PER_LINE);
  const textHeight = textLines * LINE_TEXT_HEIGHT;

  return BASE_PADDING + textHeight;
}

// Render page
function renderPage(pageIndex) {
  const container = elements.scriptList;

  const lines = container.querySelectorAll('.script-line');
  lines.forEach(line => line.remove());

  const totalPages = pageBreakpoints.length;
  const start = pageBreakpoints[pageIndex];
  const end = pageIndex < totalPages - 1 ? pageBreakpoints[pageIndex + 1] : scriptData.length;
  const pageItems = scriptData.slice(start, end);

  const pageInfoText = `${pageIndex + 1} / ${totalPages}`;
  elements.pageInfo.textContent = pageInfoText;
  elements.prevBtn.disabled = pageIndex === 0;
  elements.nextBtn.disabled = pageIndex >= totalPages - 1;

  pageItems.forEach((item, index) => {
    const globalIndex = start + index;
    const div = document.createElement('div');
    div.className = 'script-line';
    div.dataset.time = item.timeSeconds;
    div.dataset.index = globalIndex;

    checkSavedPhraseForLine(globalIndex, div);

    // 선택된 문장 표시
    if (selectedScriptIndex === globalIndex) {
      div.classList.add('selected');
    }

    div.innerHTML = `
      <span class="line-time">${item.timeStr}</span>
      <span class="line-text">${item.text}</span>
    `;

    div.addEventListener('click', async (e) => {
      if (!window.getSelection().toString()) {
        // 이전 선택 모두 해제 (active 포함)
        document.querySelectorAll('.script-line.selected, .script-line.active').forEach(el => {
          el.classList.remove('selected', 'active');
        });

        // 현재 문장 선택 표시
        div.classList.add('selected');
        selectedScriptIndex = globalIndex;

        // 사용자가 선택한 인덱스 설정 (시간 기반 판단 무시)
        setUserSelectedIndex(globalIndex);

        // 먼저 YouTube 스크립트 패널 열기 (이미 열려있으면 바로 진행)
        chrome.runtime.sendMessage({ action: 'openYouTubeTranscriptPanel' }, (openResponse) => {
          // 패널 열기 완료 후 세그먼트 클릭
          chrome.runtime.sendMessage({
            action: 'clickYouTubeTranscriptSegment',
            time: item.timeSeconds,
            text: item.text
          }, (response) => {
            // seek가 완료된 후 시간을 가져옴
            setTimeout(() => {
              chrome.runtime.sendMessage({ action: 'getVideoState' }, (stateResponse) => {
                if (stateResponse?.success) {
                  const exactClickTime = stateResponse.currentTime;
                  if (scriptData[globalIndex]) {
                    scriptData[globalIndex].exactClickTime = exactClickTime;
                  }
                  clickedScriptTimes[globalIndex] = exactClickTime;

                  // 다음 문장이 있으면, 다음 문장의 시작 시간도 미리 가져오기 (구간반복용)
                  const nextIndex = globalIndex + 1;
                  if (nextIndex < scriptData.length && !clickedScriptTimes[nextIndex]) {
                    const nextItem = scriptData[nextIndex];
                    // 다음 문장의 YouTube 세그먼트 시작 시간 가져오기 (클릭하지 않고 시간만)
                    chrome.runtime.sendMessage({
                      action: 'getYouTubeSegmentTime',
                      time: nextItem.timeSeconds,
                      text: nextItem.text
                    }, (nextResponse) => {
                      if (nextResponse?.success && nextResponse.exactTime) {
                        clickedScriptTimes[nextIndex] = nextResponse.exactTime;
                        if (scriptData[nextIndex]) {
                          scriptData[nextIndex].exactClickTime = nextResponse.exactTime;
                        }
                      }
                    });
                  }
                }
              });
            }, 200);
          });
        });

        // Show fixed action bar based on current mode
        if (currentMode === 'translate') {
          showFixedActionBar(item.text, true);
        } else if (currentMode === 'normal') {
          showFixedActionBar(item.text, false);
        }
      }
    });

    container.appendChild(div);
  });

  // 구간반복 하이라이트 다시 적용
  if (repeatState === 'active') {
    highlightRepeatRange();
  }

  updateActiveLine();
}

// Check if line has saved phrases and highlight the specific text
function checkSavedPhraseForLine(index, lineElement) {
  chrome.runtime.sendMessage({ action: 'getPhrases' }, (response) => {
    const phrases = response?.phrases || {};
    if (phrases[currentVideoId]) {
      const item = scriptData[index];
      // Filter by current mode
      const modePhrases = phrases[currentVideoId].filter(p => {
        if (currentMode === 'translate') {
          return p.mode === 'translate';
        } else {
          return p.mode === 'normal' || p.mode === 'summary';
        }
      });

      // Find phrases that match this line's timestamp
      const matchingPhrases = modePhrases.filter(p =>
        Math.abs(p.timestamp - item.timeSeconds) < 5
      );

      if (matchingPhrases.length > 0) {
        // Highlight specific saved phrases within the text
        const lineTextEl = lineElement.querySelector('.line-text');
        if (lineTextEl) {
          let html = lineTextEl.textContent;
          matchingPhrases.forEach(p => {
            if (p.source && html.includes(p.source)) {
              html = html.replace(p.source, `<mark class="saved-phrase">${p.source}</mark>`);
            }
          });
          lineTextEl.innerHTML = html;
        }
      }
    }
  });
}

// Video sync
function startVideoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  syncInterval = setInterval(() => {
    chrome.runtime.sendMessage({ action: 'getVideoState' }, (response) => {
      if (response?.success) {
        currentTime = response.currentTime;
        videoDuration = response.duration;
        isPlaying = response.isPlaying;

        updatePlaybackUI();
        if (currentMode !== 'summary') {
          updateActiveLine();
        }
      }
    });
  }, 500);
}

function updatePlaybackUI() {
  // 일반/번역 모드 컨트롤바
  if (isPlaying) {
    elements.iconPlay.style.display = 'none';
    elements.iconPause.style.display = 'block';
  } else {
    elements.iconPlay.style.display = 'block';
    elements.iconPause.style.display = 'none';
  }
  elements.playbackTime.textContent = `${formatTime(currentTime)} / ${formatTime(videoDuration)}`;

  // 요약 모드 컨트롤바
  const summaryPlayBtn = elements.summaryPlayPauseBtn;
  if (summaryPlayBtn) {
    const summaryIconPlay = summaryPlayBtn.querySelector('.icon-play');
    const summaryIconPause = summaryPlayBtn.querySelector('.icon-pause');
    if (isPlaying) {
      if (summaryIconPlay) summaryIconPlay.style.display = 'none';
      if (summaryIconPause) summaryIconPause.style.display = 'block';
    } else {
      if (summaryIconPlay) summaryIconPlay.style.display = 'block';
      if (summaryIconPause) summaryIconPause.style.display = 'none';
    }
  }
  if (elements.summaryPlaybackTime) {
    elements.summaryPlaybackTime.textContent = `${formatTime(currentTime)} / ${formatTime(videoDuration)}`;
  }

  // 구간반복 표시 업데이트
  updateRepeatIndicator();
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateActiveLine() {
  const lines = document.querySelectorAll('.script-line');
  let activeIndex = -1;

  // 사용자가 직접 선택한 문장이 있으면 해당 인덱스를 우선 사용
  // (시간 기반 판단으로 인한 오류 방지)
  if (userSelectedIndex >= 0 && userSelectedIndex < scriptData.length) {
    activeIndex = userSelectedIndex;
  } else {
    // 현재 재생 시간과 비교하여 활성 라인 찾기
    // 각 문장의 시작 시간은 '유튜브 스크립트가 시작되는 지점' (클릭했을 때의 정확한 시간)을 우선 사용
    for (let i = 0; i < scriptData.length; i++) {
      // 문장의 시작 시간: 클릭했을 때의 정확한 시간이 있으면 사용, 없으면 스크립트 시간 사용
      const lineStartTime = clickedScriptTimes[i] ||
                           scriptData[i]?.exactClickTime ||
                           scriptData[i].timeSeconds;

      // 문장의 끝 시간: 다음 문장의 시작 시간
      let lineEndTime = null;
      if (i < scriptData.length - 1) {
        const nextLineIndex = i + 1;
        lineEndTime = clickedScriptTimes[nextLineIndex] ||
                     scriptData[nextLineIndex]?.exactClickTime ||
                     scriptData[nextLineIndex].timeSeconds;
      } else {
        lineEndTime = videoDuration || Infinity;
      }

      // 현재 시간이 이 문장의 시작 시간과 끝 시간 사이에 있으면 활성화
      if (currentTime >= lineStartTime && (lineEndTime === null || currentTime < lineEndTime)) {
        activeIndex = i;
        break;
      }
    }
  }

  const start = pageBreakpoints[currentPage];
  const end = currentPage < pageBreakpoints.length - 1 ? pageBreakpoints[currentPage + 1] : scriptData.length;

  lines.forEach(line => {
    const lineIndex = parseInt(line.dataset.index);
    const isActive = lineIndex === activeIndex;
    line.classList.toggle('active', isActive);

    // 번역 모드에서 인라인 번역 관리
    if (currentMode === 'translate') {
      updateInlineTranslation(line, isActive, lineIndex);
    } else {
      // 번역 모드가 아니면 인라인 번역 제거
      removeInlineTranslation(line);
    }
  });

  // Only auto-switch pages if not in manual navigation mode
  if (!manualPageNavigation && activeIndex >= 0 && (activeIndex < start || activeIndex >= end)) {
    for (let p = 0; p < pageBreakpoints.length; p++) {
      const pStart = pageBreakpoints[p];
      const pEnd = p < pageBreakpoints.length - 1 ? pageBreakpoints[p + 1] : scriptData.length;
      if (activeIndex >= pStart && activeIndex < pEnd) {
        currentPage = p;
        renderPage(currentPage);
        break;
      }
    }
  }

  // 활성 인덱스가 변경되었을 때 자동으로 패널 업데이트 (번역/일반 모드에서)
  if (activeIndex >= 0 && activeIndex !== previousActiveIndex && currentMode !== 'summary') {
    previousActiveIndex = activeIndex;
    autoUpdatePanelForActiveScript(activeIndex);
  }
}

// 사용자 선택 인덱스 설정 (일정 시간 후 자동 해제)
function setUserSelectedIndex(index) {
  userSelectedIndex = index;

  // 이전 타임아웃 취소
  if (userSelectionTimeout) {
    clearTimeout(userSelectionTimeout);
  }

  // 1초 후에 자동 해제 (시간 기반 하이라이트로 복귀)
  let duration = 1000;

  userSelectionTimeout = setTimeout(() => {
    userSelectedIndex = -1;
  }, duration);
}

// 인라인 번역 업데이트 (번역 모드용)
function updateInlineTranslation(lineElement, isActive, lineIndex) {
  const existingTranslation = lineElement.querySelector('.inline-translation');

  if (!isActive) {
    // 활성화되지 않으면 번역 제거
    removeInlineTranslation(lineElement);
    return;
  }

  // 이미 번역이 있으면 유지
  if (existingTranslation) {
    return;
  }

  // 번역 컨테이너 생성
  const translationDiv = document.createElement('div');
  translationDiv.className = 'inline-translation';
  translationDiv.textContent = '번역 중...';

  // 기존 내용을 line-content로 감싸기
  if (!lineElement.classList.contains('has-inline-translation')) {
    const lineTime = lineElement.querySelector('.line-time');
    const lineText = lineElement.querySelector('.line-text');

    if (lineTime && lineText) {
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'line-content';
      contentWrapper.appendChild(lineTime.cloneNode(true));
      contentWrapper.appendChild(lineText.cloneNode(true));

      lineElement.innerHTML = '';
      lineElement.appendChild(contentWrapper);
    }
  }

  lineElement.appendChild(translationDiv);
  lineElement.classList.add('has-inline-translation');

  // 번역 로드
  const scriptItem = scriptData[lineIndex];
  if (!scriptItem) return;

  const text = scriptItem.text;

  // 로컬 캐시에서 번역 가져오기
  const cacheKey = `temp_translations_${currentVideoId}`;
  chrome.storage.local.get([cacheKey], (result) => {
    const translations = result[cacheKey] || {};
    const translatedText = translations[text];

    if (translatedText) {
      translationDiv.textContent = translatedText;
    } else {
      // API 호출
      let context = '';
      const prevText = lineIndex > 0 ? scriptData[lineIndex - 1].text : '';
      const currentText = scriptItem.text;
      const nextText = lineIndex < scriptData.length - 1 ? scriptData[lineIndex + 1].text : '';
      context = [prevText, currentText, nextText].filter(t => t).join(' ');

      chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
        const sourceLang = settings?.sourceLang || 'EN';
        const targetLang = settings?.targetLang || 'KO';
        const apiKey = settings?.apiKey || '';
        const apiModel = settings?.apiModel || '';

        chrome.runtime.sendMessage({
          action: 'translateWithContext',
          text: text,
          context: context,
          sourceLang: sourceLang,
          targetLang: targetLang,
          apiKey: apiKey,
          apiModel: apiModel
        }, (apiResult) => {
          if (apiResult?.success) {
            translationDiv.textContent = apiResult.translatedText;
          } else {
            translationDiv.textContent = apiResult?.error || '번역 실패';
          }
        });
      });
    }
  });
}

// 인라인 번역 제거
function removeInlineTranslation(lineElement) {
  const existingTranslation = lineElement.querySelector('.inline-translation');
  if (existingTranslation) {
    existingTranslation.remove();
  }

  // line-content 래퍼가 있으면 원래 구조로 복원
  if (lineElement.classList.contains('has-inline-translation')) {
    const lineContent = lineElement.querySelector('.line-content');
    if (lineContent) {
      const lineTime = lineContent.querySelector('.line-time');
      const lineText = lineContent.querySelector('.line-text');

      if (lineTime && lineText) {
        lineElement.innerHTML = '';
        lineElement.appendChild(lineTime.cloneNode(true));
        lineElement.appendChild(lineText.cloneNode(true));
      }
    }
    lineElement.classList.remove('has-inline-translation');
  }
}

// 활성 스크립트가 변경될 때 자동으로 패널 업데이트
function autoUpdatePanelForActiveScript(activeIndex) {
  if (activeIndex < 0 || activeIndex >= scriptData.length) return;

  const scriptItem = scriptData[activeIndex];
  if (!scriptItem) return;

  selectedScriptIndex = activeIndex;

  if (currentMode === 'translate') {
    // 번역 모드: Fixed Action Bar 표시 및 번역 로드
    showFixedActionBar(scriptItem.text, true);
  } else if (currentMode === 'normal') {
    // 일반 모드: Fixed Action Bar 표시
    showFixedActionBar(scriptItem.text, false);
  }
}

// Play/Pause toggle
function togglePlayPause() {
  chrome.runtime.sendMessage({ action: 'togglePlayPause' }, (response) => {
    if (response?.success) {
      isPlaying = response.isPlaying;
      updatePlaybackUI();
    }
  });
}

// Seek to time
function seekToTime(seconds) {
  chrome.runtime.sendMessage({ action: 'seekVideo', time: seconds }, (response) => {
    if (!response?.success) {
      showToast('영상 이동 실패');
    }
  });
}

// 상대 시간으로 이동 (뒤로/앞으로 가기)
function seekRelative(seconds) {
  if (!isExtracted || scriptData.length === 0) return;
  
  chrome.runtime.sendMessage({ action: 'getVideoState' }, (response) => {
    if (response?.success) {
      const newTime = Math.max(0, Math.min(response.duration, response.currentTime + seconds));
      seekToTime(newTime);
      
      // 알림 표시
      const sign = seconds > 0 ? '+' : '';
      showToast(`${sign}${seconds}s`);
    }
  });
}

// 페이지로 이동 (해당 페이지의 첫 문장으로 영상 이동)
function goToPage(pageIndex, buttonElement) {
  // Disable auto page sync for longer time to prevent page jumping back
  manualPageNavigation = true;
  setTimeout(() => { manualPageNavigation = false; }, 2000);

  currentPage = pageIndex;
  renderPage(currentPage);

  // Seek video to the start of the new page (first sentence)
  // YouTube 세그먼트 클릭 방식으로 정확한 시간으로 이동
  const pageStartIndex = pageBreakpoints[currentPage];
  if (scriptData[pageStartIndex]) {
    const item = scriptData[pageStartIndex];

    // 먼저 YouTube 스크립트 패널 열기 (이미 열려있으면 바로 진행)
    chrome.runtime.sendMessage({ action: 'openYouTubeTranscriptPanel' }, (openResponse) => {
      // YouTube 스크립트 세그먼트 클릭하여 정확한 위치로 이동
      chrome.runtime.sendMessage({
        action: 'clickYouTubeTranscriptSegment',
        time: item.timeSeconds,
        text: item.text
      }, (response) => {
        // 클릭 후 정확한 시간 저장
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: 'getVideoState' }, (stateResponse) => {
            if (stateResponse?.success) {
              const exactClickTime = stateResponse.currentTime;
              if (scriptData[pageStartIndex]) {
                scriptData[pageStartIndex].exactClickTime = exactClickTime;
              }
              clickedScriptTimes[pageStartIndex] = exactClickTime;

              // 다음 문장의 시간도 미리 가져오기 (구간반복용)
              const nextIndex = pageStartIndex + 1;
              if (nextIndex < scriptData.length && !clickedScriptTimes[nextIndex]) {
                const nextItem = scriptData[nextIndex];
                chrome.runtime.sendMessage({
                  action: 'getYouTubeSegmentTime',
                  time: nextItem.timeSeconds,
                  text: nextItem.text
                }, (nextResponse) => {
                  if (nextResponse?.success && nextResponse.exactTime) {
                    clickedScriptTimes[nextIndex] = nextResponse.exactTime;
                    if (scriptData[nextIndex]) {
                      scriptData[nextIndex].exactClickTime = nextResponse.exactTime;
                    }
                  }
                });
              }
            }
          });
        }, 200);
      });
    });

    // 해당 문장 선택 상태로 설정
    selectedScriptIndex = pageStartIndex;
    setUserSelectedIndex(pageStartIndex); // 사용자 선택으로 설정하여 하이라이트 드리프트 방지
    const lines = document.querySelectorAll('.script-line');
    lines.forEach(line => line.classList.remove('selected'));
    const targetLine = document.querySelector(`.script-line[data-index="${pageStartIndex}"]`);
    if (targetLine) {
      targetLine.classList.add('selected');
    }
  }

  // 버튼 깜박임 애니메이션
  if (buttonElement) {
    animateButton(buttonElement);
  }

  // 이번 페이지 필터가 활성화되어 있으면 표현 목록 새로고침
  if (isCurrentPageFilterActive) {
    loadVideoPhrases();
  }
}


// 버튼 깜박임 애니메이션
function animateButton(button) {
  button.classList.add('blinking');
  setTimeout(() => {
    button.classList.remove('blinking');
  }, 600);
}

// 스크립트 라인 클릭 후 반복 처리
function handleScriptLineRepeat(lineIndex) {
  if (!isExtracted || scriptData.length === 0) return;
  if (lineIndex < 0 || lineIndex >= scriptData.length) return;
  
  // 시작 시간: 선택된 문장을 클릭했을 때 YouTube 영상이 시작하는 시간 (밀리초 단위)
  // clickedScriptTimes에서 먼저 확인, 없으면 exactClickTime 사용
  let startTime = clickedScriptTimes[lineIndex] || 
                  scriptData[lineIndex]?.exactClickTime;
  
  // 시작 시간이 없으면 exactClickTime이 저장될 때까지 기다림 (최대 500ms)
  if (!startTime) {
    let waitCount = 0;
    const maxWait = 10; // 최대 10번 시도 (500ms)
    const checkStartTime = setInterval(() => {
      startTime = clickedScriptTimes[lineIndex] || 
                  scriptData[lineIndex]?.exactClickTime;
      
      if (startTime) {
        clearInterval(checkStartTime);
        proceedWithRepeat(lineIndex, startTime);
      } else if (++waitCount >= maxWait) {
        clearInterval(checkStartTime);
        showToast('문장을 클릭한 후 구간반복을 사용하세요');
      }
    }, 50); // 50ms마다 확인
    return;
  }
  
  proceedWithRepeat(lineIndex, startTime);
}

// 구간반복 진행 함수
function proceedWithRepeat(lineIndex, startTime) {
  // 종료 시간: 다음 문장의 시작 시간 (밀리초 단위)

  if (lineIndex < scriptData.length - 1) {
    // 다음 문장이 있으면
    const nextLineIndex = lineIndex + 1;

    // 다음 문장의 정확한 시간이 이미 저장되어 있는지 확인
    const nextClickTime = clickedScriptTimes[nextLineIndex] ||
                         scriptData[nextLineIndex]?.exactClickTime;

    if (nextClickTime && nextClickTime > startTime) {
      // 다음 문장의 정확한 시간이 있으면 바로 사용
      setRepeatRange(startTime, nextClickTime);
    } else {
      // 다음 문장의 정확한 시간이 없으면 YouTube 세그먼트에서 가져오기
      showToast('구간 설정 중. 잘 되지 않으면 F5(새로고침) 해주세요.');
      const nextItem = scriptData[nextLineIndex];

      // 타임아웃 설정 (3초 내에 응답이 없으면 폴백)
      let responded = false;
      const timeoutId = setTimeout(() => {
        if (!responded) {
          responded = true;
          console.log('getYouTubeSegmentTime timeout, using fallback');
          const endTime = scriptData[lineIndex]?.endTimeSeconds ||
                         scriptData[nextLineIndex]?.timeSeconds ||
                         (startTime + 3);
          setRepeatRange(startTime, endTime);
        }
      }, 3000);

      chrome.runtime.sendMessage({
        action: 'getYouTubeSegmentTime',
        time: nextItem.timeSeconds,
        text: nextItem.text
      }, (response) => {
        if (responded) return; // 이미 타임아웃 처리됨
        responded = true;
        clearTimeout(timeoutId);

        if (response?.success && response.exactTime && response.exactTime > startTime) {
          // 다음 문장의 정확한 시간 저장
          clickedScriptTimes[nextLineIndex] = response.exactTime;
          if (scriptData[nextLineIndex]) {
            scriptData[nextLineIndex].exactClickTime = response.exactTime;
          }
          setRepeatRange(startTime, response.exactTime);
        } else {
          // 실패시 다음 문장의 timeSeconds 또는 endTimeSeconds 사용
          console.log('getYouTubeSegmentTime failed, using fallback:', response);
          const endTime = scriptData[lineIndex]?.endTimeSeconds ||
                         scriptData[nextLineIndex]?.timeSeconds ||
                         (startTime + 3);
          setRepeatRange(startTime, endTime);
        }
      });
    }
  } else {
    // 마지막 라인이면 비디오 길이 또는 endTimeSeconds 사용
    chrome.runtime.sendMessage({ action: 'getVideoState' }, (response) => {
      let endTime;
      if (response?.success && response.duration) {
        endTime = Math.min(response.duration, startTime + 10); // 최대 10초
      } else {
        endTime = scriptData[lineIndex]?.endTimeSeconds || (startTime + 3);
      }
      setRepeatRange(startTime, endTime);
    });
  }
}

// 반복 구간 설정 헬퍼 함수
function setRepeatRange(startTime, endTime) {
  if (endTime > startTime) {
    repeatStartTime = startTime;
    repeatEndTime = endTime;
    repeatState = 'active';
    startRepeat();
    updateRepeatIndicator();
    highlightRepeatRange();
    seekToTime(repeatStartTime);
  }
}

// 드래그한 텍스트 구간 반복 처리 (여러 문장 선택 지원)
function handleDragRepeat(selection) {
  if (!isExtracted || scriptData.length === 0) return;

  const anchorNode = selection.anchorNode;
  if (!anchorNode) return;

  // 드래그 시작 라인 찾기
  const startLineElement = anchorNode.parentElement?.closest('.script-line');
  if (!startLineElement) return;

  const startLineIndex = parseInt(startLineElement.dataset.index);

  // 드래그 끝 라인 찾기
  let endLineIndex = startLineIndex;
  const focusNode = selection.focusNode;
  if (focusNode) {
    const endLineElement = focusNode.parentElement?.closest('.script-line');
    if (endLineElement) {
      endLineIndex = parseInt(endLineElement.dataset.index);
    }
  }

  // 시작/끝 인덱스 정렬 (드래그 방향에 관계없이)
  const firstIndex = Math.min(startLineIndex, endLineIndex);
  const lastIndex = Math.max(startLineIndex, endLineIndex);

  // 시작 시간: 첫 번째 문장의 정확한 YouTube 시간
  let startTime = clickedScriptTimes[firstIndex] ||
                  scriptData[firstIndex]?.exactClickTime;

  if (!startTime) {
    // 첫 번째 문장의 정확한 시간이 없으면 가져오기
    showToast('구간 설정 중. 잘 되지 않으면 F5(새로고침) 해주세요.');
    const firstItem = scriptData[firstIndex];

    // 타임아웃 설정 (3초 내에 응답이 없으면 폴백)
    let responded = false;
    const timeoutId = setTimeout(() => {
      if (!responded) {
        responded = true;
        proceedWithDragRepeat(firstIndex, lastIndex, firstItem.timeSeconds);
      }
    }, 3000);

    chrome.runtime.sendMessage({
      action: 'getYouTubeSegmentTime',
      time: firstItem.timeSeconds,
      text: firstItem.text
    }, (response) => {
      if (responded) return;
      responded = true;
      clearTimeout(timeoutId);

      if (response?.success && response.exactTime) {
        clickedScriptTimes[firstIndex] = response.exactTime;
        if (scriptData[firstIndex]) {
          scriptData[firstIndex].exactClickTime = response.exactTime;
        }
        // 시작 시간을 가져온 후 종료 시간 처리
        proceedWithDragRepeat(firstIndex, lastIndex, response.exactTime);
      } else {
        // 실패시 대략적인 시간 사용
        proceedWithDragRepeat(firstIndex, lastIndex, firstItem.timeSeconds);
      }
    });
    return;
  }

  proceedWithDragRepeat(firstIndex, lastIndex, startTime);
}

// 드래그 구간반복 진행 (시작 시간 확보 후)
function proceedWithDragRepeat(firstIndex, lastIndex, startTime) {
  // 종료 시간: 마지막 문장의 **다음 문장** 시작 시간
  const nextIndex = lastIndex + 1;

  if (nextIndex < scriptData.length) {
    // 다음 문장이 있으면
    const nextClickTime = clickedScriptTimes[nextIndex] ||
                          scriptData[nextIndex]?.exactClickTime;

    if (nextClickTime && nextClickTime > startTime) {
      setRepeatRange(startTime, nextClickTime);
    } else {
      // 다음 문장의 정확한 시간 가져오기
      const nextItem = scriptData[nextIndex];

      // 타임아웃 설정 (3초 내에 응답이 없으면 폴백)
      let responded = false;
      const timeoutId = setTimeout(() => {
        if (!responded) {
          responded = true;
          const endTime = scriptData[lastIndex]?.endTimeSeconds ||
                         scriptData[nextIndex]?.timeSeconds ||
                         (startTime + 5);
          setRepeatRange(startTime, endTime);
        }
      }, 3000);

      chrome.runtime.sendMessage({
        action: 'getYouTubeSegmentTime',
        time: nextItem.timeSeconds,
        text: nextItem.text
      }, (response) => {
        if (responded) return;
        responded = true;
        clearTimeout(timeoutId);

        if (response?.success && response.exactTime && response.exactTime > startTime) {
          clickedScriptTimes[nextIndex] = response.exactTime;
          if (scriptData[nextIndex]) {
            scriptData[nextIndex].exactClickTime = response.exactTime;
          }
          setRepeatRange(startTime, response.exactTime);
        } else {
          // 실패시 마지막 문장의 endTimeSeconds 또는 다음 문장 시간 사용
          const endTime = scriptData[lastIndex]?.endTimeSeconds ||
                         scriptData[nextIndex]?.timeSeconds ||
                         (startTime + 5);
          setRepeatRange(startTime, endTime);
        }
      });
    }
  } else {
    // 마지막 라인이면 endTimeSeconds 또는 비디오 길이 사용
    chrome.runtime.sendMessage({ action: 'getVideoState' }, (response) => {
      let endTime;
      if (response?.success && response.duration) {
        endTime = Math.min(response.duration, startTime + 30); // 최대 30초
      } else {
        endTime = scriptData[lastIndex]?.endTimeSeconds || (startTime + 5);
      }
      setRepeatRange(startTime, endTime);
    });
  }
}

// 구간반복 키 처리 (현재 시간 기준)
function handleRepeatKey() {
  if (!isExtracted || scriptData.length === 0) return;
  
  chrome.runtime.sendMessage({ action: 'getVideoState' }, (response) => {
    if (!response?.success) return;
    
    const now = response.currentTime;
    
    if (repeatState === 'idle') {
      // 첫 번째 클릭: 시작 시간 설정
      repeatState = 'start';
      repeatStartTime = now;
      updateRepeatIndicator();
    } else if (repeatState === 'start') {
      // 두 번째 클릭: 종료 시간 설정하고 반복 시작
      repeatEndTime = now;
      if (repeatEndTime > repeatStartTime) {
        repeatState = 'active';
        startRepeat();
        updateRepeatIndicator();
        highlightRepeatRange();
      } else {
        // 종료 시간이 시작 시간보다 작으면 초기화
        repeatState = 'idle';
        updateRepeatIndicator();
      }
    } else if (repeatState === 'active') {
      // 반복 중이면 중지
      stopRepeat();
      repeatState = 'idle';
      repeatStartTime = 0;
      repeatEndTime = 0;
      updateRepeatIndicator();
      clearRepeatHighlight();
    }
  });
}

// 구간반복 시작
function startRepeat() {
  if (repeatInterval) {
    clearInterval(repeatInterval);
  }
  
  // YouTube 스크립트 기준의 정확한 시간 정보 사용
  // 더 정확한 종료 시점 감지를 위해 체크 간격을 줄이고, YouTube 스크립트 시간 기준으로 비교
  repeatInterval = setInterval(() => {
    chrome.runtime.sendMessage({ action: 'getVideoState' }, (response) => {
      if (response?.success) {
        const now = response.currentTime;
        
        // YouTube 스크립트에서 설정한 정확한 종료 시간과 비교
        // 0.05초 여유를 두어 정확한 종료 시점 감지
        if (now >= repeatEndTime - 0.05) {
          // YouTube 스크립트에서 추출한 정확한 시작 시간으로 이동
          seekToTime(repeatStartTime);
        }
      }
    });
  }, 50); // 체크 간격을 50ms로 줄여 더 정확한 감지
}

// 구간반복 중지
function stopRepeat() {
  if (repeatInterval) {
    clearInterval(repeatInterval);
    repeatInterval = null;
  }
}

// 구간반복 표시 업데이트
function updateRepeatIndicator() {
  const indicator = elements.repeatIndicator;
  const simpleIndicator = elements.repeatIndicatorSimple;
  const controls = elements.repeatControls;
  
  // repeat-controls는 항상 숨김 (레이아웃 순서 고정을 위해)
  if (controls) controls.style.display = 'none';
  
  if (repeatState === 'idle') {
    if (isExtracted && scriptData.length > 0) {
      if (simpleIndicator) simpleIndicator.innerHTML = `구간반복<br>'${repeatKey.toUpperCase()}' key`;
    } else {
      if (simpleIndicator) simpleIndicator.textContent = '';
    }
  } else if (repeatState === 'start') {
    if (simpleIndicator) simpleIndicator.innerHTML = `${formatTime(repeatStartTime)}<br>~ `;
  } else if (repeatState === 'active') {
    if (simpleIndicator) simpleIndicator.innerHTML = `구간반복<br>${formatTime(repeatStartTime)} ~ ${formatTime(repeatEndTime)}`;
    if (indicator) indicator.textContent = `${formatTime(repeatStartTime)} ~ ${formatTime(repeatEndTime)}`;
  }
}

// 구간반복 범위 하이라이트
function highlightRepeatRange() {
  const lines = document.querySelectorAll('.script-line');
  lines.forEach(line => {
    const lineIndex = parseInt(line.dataset.index);
    // 해당 라인의 정확한 클릭 시간 또는 대략적인 시간 사용
    const lineExactTime = clickedScriptTimes[lineIndex] ||
                          scriptData[lineIndex]?.exactClickTime ||
                          parseFloat(line.dataset.time);

    // 다음 라인의 시작 시간 (이 라인의 종료 시간으로 간주)
    const nextIndex = lineIndex + 1;
    const nextLineTime = nextIndex < scriptData.length ?
      (clickedScriptTimes[nextIndex] || scriptData[nextIndex]?.exactClickTime || scriptData[nextIndex]?.timeSeconds) :
      (lineExactTime + 10);

    // 이 라인이 반복 구간에 포함되는지 확인
    // 라인의 시작 시간이 repeatStartTime 이상이고, repeatEndTime 미만이면 포함
    // 또는 라인의 범위가 반복 구간과 겹치면 포함
    const lineStartsInRange = lineExactTime >= repeatStartTime - 0.5 && lineExactTime < repeatEndTime - 0.5;
    const lineEndsInRange = nextLineTime > repeatStartTime && nextLineTime <= repeatEndTime + 0.5;
    const lineCoversRange = lineExactTime <= repeatStartTime && nextLineTime >= repeatEndTime;

    const isInRange = lineStartsInRange || (lineCoversRange && lineExactTime < repeatEndTime);

    if (isInRange) {
      line.classList.add('repeat-highlight');
    } else {
      line.classList.remove('repeat-highlight');
    }
  });
}

// 구간반복 하이라이트 제거
function clearRepeatHighlight() {
  const lines = document.querySelectorAll('.script-line');
  lines.forEach(line => {
    line.classList.remove('repeat-highlight');
  });
}

// Handle text selection
function handleTextSelection(e) {
  const selection = window.getSelection();
  const selectedTextContent = selection.toString().trim();

  if (!selectedTextContent) return;

  const anchorNode = selection.anchorNode;
  if (!anchorNode) return;

  // Check if selection is in script list or summary
  const inScriptList = elements.scriptList.contains(anchorNode);
  const inSummary = elements.summaryContent.contains(anchorNode);
  const inPhrasesList = elements.videoPhrasesList?.contains(anchorNode);

  // 저장된 표현에서 일부 단어 선택 시 - 문맥 포함 번역 툴팁 표시
  if (inPhrasesList && currentMode === 'translate') {
    const phraseItem = anchorNode.parentElement?.closest('.phrase-item');
    if (phraseItem) {
      const sourceText = phraseItem.querySelector('.phrase-text')?.textContent || '';
      const translationText = phraseItem.querySelector('.phrase-translation')?.textContent || '';
      showContextTranslationTooltip(selectedTextContent, sourceText, translationText, e);
    }
    return;
  }

  if (!inScriptList && !inSummary) return;
  if (anchorNode.closest && anchorNode.closest('.modal')) return;

  // 요약 모드에서 선택한 텍스트는 내용 입력창에 자동 붙여넣기
  if (currentMode === 'summary' && inSummary) {
    appendToContentInput(selectedTextContent);
    return; // 요약 모드에서는 선택 패널을 표시하지 않음
  }

  // Find which script line was selected (only for script list)
  if (inScriptList) {
    const lineElement = anchorNode.parentElement?.closest('.script-line');
    if (lineElement) {
      selectedScriptIndex = parseInt(lineElement.dataset.index);

      // 번역 모드에서 일부 문구 선택 시 - 인라인 문맥 번역 표시
      if (currentMode === 'translate') {
        const fullText = scriptData[selectedScriptIndex]?.text || '';
        // 선택한 텍스트가 전체 문장과 다르면 일부 문구 선택으로 판단
        if (selectedTextContent !== fullText && fullText.includes(selectedTextContent)) {
          showInlinePartialTranslation(lineElement, selectedTextContent, selectedScriptIndex);
          return;
        }
      }
    }
  } else {
    selectedScriptIndex = -1;
  }

  if (currentMode === 'normal') {
    showFixedActionBar(selectedTextContent, false);
  } else if (currentMode === 'translate') {
    showFixedActionBar(selectedTextContent, true);
  }
}

// 문맥 포함 번역 툴팁 표시
function showContextTranslationTooltip(selectedWord, fullSource, fullTranslation, event) {
  // 기존 툴팁 제거
  const existingTooltip = document.querySelector('.context-translation-tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }

  // 툴팁 생성
  const tooltip = document.createElement('div');
  tooltip.className = 'context-translation-tooltip';
  tooltip.innerHTML = `
    <div class="tooltip-content">
      <div class="tooltip-word">${selectedWord}</div>
      <div class="tooltip-translation">번역 중...</div>
    </div>
    <button class="tooltip-close">×</button>
  `;

  // 위치 설정
  const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
  tooltip.style.position = 'fixed';
  tooltip.style.left = `${rect.left}px`;
  tooltip.style.top = `${rect.bottom + 5}px`;
  tooltip.style.zIndex = '10000';

  document.body.appendChild(tooltip);

  // 닫기 버튼
  tooltip.querySelector('.tooltip-close').addEventListener('click', () => {
    tooltip.remove();
  });

  // 문서 클릭 시 툴팁 닫기
  const closeOnClick = (e) => {
    if (!tooltip.contains(e.target)) {
      tooltip.remove();
      document.removeEventListener('click', closeOnClick);
    }
  };
  setTimeout(() => {
    document.addEventListener('click', closeOnClick);
  }, 100);

  // 문맥 포함 AI 번역 요청
  chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
    const sourceLang = settings?.sourceLang || 'EN';
    const targetLang = settings?.targetLang || 'KO';
    const apiKey = settings?.apiKey || '';
    const apiModel = settings?.apiModel || '';

    chrome.runtime.sendMessage({
      action: 'translateWithContext',
      text: selectedWord,
      context: `원문: ${fullSource}\n번역문: ${fullTranslation}`,
      sourceLang: sourceLang,
      targetLang: targetLang,
      apiKey: apiKey,
      apiModel: apiModel
    }, (result) => {
      const translationEl = tooltip.querySelector('.tooltip-translation');
      if (result?.success) {
        translationEl.textContent = result.translatedText;
      } else {
        translationEl.textContent = result?.error || '번역 실패';
      }
    });
  });
}

// 스크립트 라인에서 일부 문구 선택 시 인라인 번역 표시
function showInlinePartialTranslation(lineElement, selectedText, lineIndex) {
  // 기존 부분 번역 제거
  const existingPartial = lineElement.querySelector('.partial-translation');
  if (existingPartial) {
    existingPartial.remove();
  }

  // 전체 문장과 번역 가져오기
  const fullText = scriptData[lineIndex]?.text || '';
  const cacheKey = `temp_translations_${currentVideoId}`;

  chrome.storage.local.get([cacheKey], (result) => {
    const translations = result[cacheKey] || {};
    const fullTranslation = translations[fullText] || '';

    // 부분 번역 컨테이너 생성
    const partialDiv = document.createElement('div');
    partialDiv.className = 'partial-translation';
    partialDiv.innerHTML = `
      <div class="partial-selected">${selectedText}</div>
      <div class="partial-result">
        <span class="partial-loading"></span>
        <span class="partial-text">번역 중...</span>
      </div>
      <button class="partial-close">×</button>
    `;

    // 인라인 번역 아래에 추가 또는 line-content 뒤에 추가
    const inlineTranslation = lineElement.querySelector('.inline-translation');
    if (inlineTranslation) {
      inlineTranslation.after(partialDiv);
    } else {
      lineElement.appendChild(partialDiv);
    }

    // 닫기 버튼
    partialDiv.querySelector('.partial-close').addEventListener('click', (e) => {
      e.stopPropagation();
      partialDiv.remove();
    });

    // AI 번역 요청
    chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
      const sourceLang = settings?.sourceLang || 'EN';
      const targetLang = settings?.targetLang || 'KO';
      const apiKey = settings?.apiKey || '';
      const apiModel = settings?.apiModel || '';

      chrome.runtime.sendMessage({
        action: 'translateWithContext',
        text: selectedText,
        context: `원문 문장: ${fullText}\n문장 번역: ${fullTranslation || '(번역 없음)'}`,
        sourceLang: sourceLang,
        targetLang: targetLang,
        apiKey: apiKey,
        apiModel: apiModel
      }, (apiResult) => {
        const loadingEl = partialDiv.querySelector('.partial-loading');
        const textEl = partialDiv.querySelector('.partial-text');

        if (loadingEl) loadingEl.style.display = 'none';

        if (apiResult?.success) {
          textEl.textContent = apiResult.translatedText;
        } else {
          textEl.textContent = apiResult?.error || '번역 실패';
          textEl.classList.add('error');
        }
      });
    });
  });
}

// 내용 입력창에 텍스트 추가
function appendToContentInput(text) {
  if (!elements.contentInputTextarea) return;

  const currentValue = elements.contentInputTextarea.value;
  if (currentValue) {
    // 이미 내용이 있으면 줄바꿈 후 추가
    elements.contentInputTextarea.value = currentValue + '\n' + text;
  } else {
    elements.contentInputTextarea.value = text;
  }

  // 텍스트 영역 자동 높이 조절
  elements.contentInputTextarea.style.height = 'auto';
  elements.contentInputTextarea.style.height = Math.min(elements.contentInputTextarea.scrollHeight, 200) + 'px';

  // 포커스 이동
  elements.contentInputTextarea.focus();

  showToast('내용이 입력창에 추가되었습니다');
}

// ========== Fixed Action Bar Functions ==========

// 현재 선택된 텍스트를 저장하는 변수
let fixedSelectedText = '';

// Fixed Action Bar 표시
async function showFixedActionBar(text, isTranslateMode) {
  fixedSelectedText = text;
  elements.fixedActionBar.style.display = 'block';

  // 저장된 표현 접기
  if (!elements.togglePhrasesBtn.classList.contains('collapsed')) {
    elements.togglePhrasesBtn.classList.add('collapsed');
    elements.videoPhrasesList.classList.add('collapsed');
  }

  // 현재 문구의 녹음 URL 초기화
  currentPhraseRecordingUrl = null;

  // 번역은 인라인으로 표시되므로 하단 fixedTranslation 영역은 항상 숨김
  elements.fixedTranslation.style.display = 'none';

  // 녹음 여부 확인 및 버튼 업데이트
  checkFixedRecordingStatus((hasRecording) => {
    updateFixedActionButtons(hasRecording);
  });
}

// Fixed Action Bar 녹음 여부 확인
function checkFixedRecordingStatus(callback) {
  chrome.runtime.sendMessage({ action: 'getPhrases' }, (response) => {
    const phrases = response?.phrases || {};
    let hasRecording = false;

    if (phrases[currentVideoId] && selectedScriptIndex >= 0 && scriptData[selectedScriptIndex]) {
      // 모드에 관계없이 녹음이 있는 phrase 찾기 (같은 시간, 같은 텍스트)
      const savedPhrase = phrases[currentVideoId].find(p => {
        const timeMatch = Math.abs(p.timestamp - scriptData[selectedScriptIndex].timeSeconds) < 0.5;
        const textMatch = p.source === fixedSelectedText ||
                         p.source.includes(fixedSelectedText) ||
                         fixedSelectedText.includes(p.source);
        // 현재 모드이거나, 또는 translate 모드 (녹음이 있는 경우)
        const modeMatch = p.mode === currentMode || p.mode === 'translate';
        return modeMatch && timeMatch && textMatch && p.recordingUrl;
      });

      if (savedPhrase && savedPhrase.recordingUrl) {
        hasRecording = true;
        currentPhraseRecordingUrl = savedPhrase.recordingUrl;
      }
    }

    // recordings 스토리지에서도 확인 (녹음 후 저장하지 않은 경우)
    chrome.storage.local.get(['recordings'], (result) => {
      const recordings = result.recordings || {};
      if (!hasRecording && recordings[currentVideoId] && recordings[currentVideoId][selectedScriptIndex]) {
        hasRecording = true;
        currentPhraseRecordingUrl = recordings[currentVideoId][selectedScriptIndex].data;
      }
      callback(hasRecording);
    });
  });
}

// Fixed Action Bar 버튼 업데이트
function updateFixedActionButtons(hasRecording) {
  const labelEl = elements.fixedRecordBtn.querySelector('.btn-label');
  if (hasRecording) {
    if (labelEl) {
      labelEl.textContent = '재녹음';
    } else {
      elements.fixedRecordBtn.textContent = '재녹음';
    }
    // 재녹음 상태에서 하이라이트 제거
    elements.fixedRecordBtn.classList.remove('highlighted');
  } else {
    if (labelEl) {
      labelEl.textContent = '녹음';
    } else {
      elements.fixedRecordBtn.textContent = '녹음';
    }
    elements.fixedRecordBtn.classList.remove('highlighted');
  }
}

// Fixed Action Bar 녹음
async function startFixedRecording() {
  if (isRecording) {
    // 녹음 중이면 정지
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(track => track.stop());
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(audioBlob);
      currentPhraseRecordingUrl = audioUrl;

      await saveRecordingAsMP3(audioBlob);

      elements.fixedRecordingStatus.style.display = 'none';
      elements.fixedRecordBtn.classList.remove('recording');
      updateFixedActionButtons(true);
      isRecording = false;
    };

    mediaRecorder.start();
    isRecording = true;
    elements.fixedRecordBtn.classList.add('recording');
    const labelEl = elements.fixedRecordBtn.querySelector('.btn-label');
    if (labelEl) {
      labelEl.textContent = '녹음 중...';
    } else {
      elements.fixedRecordBtn.textContent = '녹음 중...';
    }
    elements.fixedRecordingStatus.style.display = 'block';
  } catch (error) {
    console.error('녹음 시작 실패:', error);
    let errorMessage = '녹음 권한이 필요합니다';

    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = '마이크 권한이 거부되었습니다.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = '마이크를 찾을 수 없습니다.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMessage = '마이크에 접근할 수 없습니다.';
    }

    showToast(errorMessage);
  }
}

// Fixed Action Bar 원문 재생
function playFixedOriginal() {
  if (selectedScriptIndex >= 0 && scriptData[selectedScriptIndex]) {
    const timestamp = scriptData[selectedScriptIndex].timeSeconds;
    seekToTime(timestamp);

    // 원문 재생 버튼 하이라이트
    elements.fixedPlayOriginalBtn.classList.add('highlighted');

    chrome.runtime.sendMessage({ action: 'playVideo' }, () => {
      const nextPhrase = scriptData.find((item, index) => index > selectedScriptIndex && item.timeSeconds > timestamp);
      const endTime = nextPhrase ? nextPhrase.timeSeconds : (timestamp + 5);

      const checkEnd = setInterval(() => {
        chrome.runtime.sendMessage({ action: 'getVideoState' }, (response) => {
          if (response?.success) {
            if (response.currentTime >= endTime || response.paused) {
              clearInterval(checkEnd);
              // 재생 종료 시 하이라이트 제거
              elements.fixedPlayOriginalBtn.classList.remove('highlighted');
              if (!response.paused && response.currentTime >= endTime) {
                chrome.runtime.sendMessage({ action: 'pauseVideo' });
              }
            }
          }
        });
      }, 100);
    });
  }
}

// 녹음 파일 재생 헬퍼 함수
function playRecordingAudio(url) {
  // 녹음파일 재생 버튼 하이라이트
  elements.fixedPlayRecordingBtn.classList.add('highlighted');

  const audio = new Audio(url);
  currentAudio = audio;

  audio.onended = () => {
    // 재생 종료 시 하이라이트 제거
    elements.fixedPlayRecordingBtn.classList.remove('highlighted');
    currentAudio = null;
  };

  audio.onerror = () => {
    elements.fixedPlayRecordingBtn.classList.remove('highlighted');
    currentAudio = null;
    showToast('녹음 파일 재생 실패');
  };

  audio.play().catch(err => {
    console.error('녹음 재생 오류:', err);
    elements.fixedPlayRecordingBtn.classList.remove('highlighted');
    showToast('녹음 파일 재생 실패');
  });
}

// Fixed Action Bar 녹음 재생
function playFixedRecording() {
  if (!currentPhraseRecordingUrl) {
    chrome.runtime.sendMessage({ action: 'getPhrases' }, (response) => {
      const phrases = response?.phrases || {};
      let recordingUrl = null;

      if (phrases[currentVideoId] && selectedScriptIndex >= 0) {
        const savedPhrase = phrases[currentVideoId].find(p => {
          const timeMatch = Math.abs(p.timestamp - scriptData[selectedScriptIndex].timeSeconds) < 0.5;
          const textMatch = p.source === fixedSelectedText ||
                           p.source.includes(fixedSelectedText) ||
                           fixedSelectedText.includes(p.source);
          return p.mode === currentMode && timeMatch && textMatch;
        });

        if (savedPhrase && savedPhrase.recordingUrl) {
          recordingUrl = savedPhrase.recordingUrl;
        }
      }

      if (!recordingUrl) {
        chrome.storage.local.get(['recordings'], (result) => {
          const recordings = result.recordings || {};
          if (recordings[currentVideoId] && recordings[currentVideoId][selectedScriptIndex]) {
            recordingUrl = recordings[currentVideoId][selectedScriptIndex].data;
          }

          if (recordingUrl) {
            currentPhraseRecordingUrl = recordingUrl;
            playRecordingAudio(recordingUrl);
          } else {
            showToast('녹음 파일이 없습니다');
          }
        });
      } else {
        currentPhraseRecordingUrl = recordingUrl;
        playRecordingAudio(recordingUrl);
      }
    });
    return;
  }

  playRecordingAudio(currentPhraseRecordingUrl);
}

// Fixed Action Bar 비교재생
function startFixedComparePlay() {
  if (!currentPhraseRecordingUrl) {
    chrome.runtime.sendMessage({ action: 'getPhrases' }, (response) => {
      const phrases = response?.phrases || {};
      let recordingUrl = null;

      if (phrases[currentVideoId] && selectedScriptIndex >= 0) {
        const savedPhrase = phrases[currentVideoId].find(p => {
          const timeMatch = Math.abs(p.timestamp - scriptData[selectedScriptIndex].timeSeconds) < 0.5;
          const textMatch = p.source === fixedSelectedText ||
                           p.source.includes(fixedSelectedText) ||
                           fixedSelectedText.includes(p.source);
          return p.mode === currentMode && timeMatch && textMatch;
        });

        if (savedPhrase && savedPhrase.recordingUrl) {
          recordingUrl = savedPhrase.recordingUrl;
        }
      }

      if (!recordingUrl) {
        chrome.storage.local.get(['recordings'], (result) => {
          const recordings = result.recordings || {};
          if (recordings[currentVideoId] && recordings[currentVideoId][selectedScriptIndex]) {
            recordingUrl = recordings[currentVideoId][selectedScriptIndex].data;
          }

          if (recordingUrl) {
            currentPhraseRecordingUrl = recordingUrl;
            startFixedComparePlayback(recordingUrl);
          } else {
            showToast('녹음 파일이 없습니다');
          }
        });
      } else {
        currentPhraseRecordingUrl = recordingUrl;
        startFixedComparePlayback(recordingUrl);
      }
    });
    return;
  }

  startFixedComparePlayback(currentPhraseRecordingUrl);
}

// Fixed 비교재생 로직
function startFixedComparePlayback(recordingUrl) {
  isComparePlaying = true;

  if (selectedScriptIndex < 0 || !scriptData[selectedScriptIndex]) {
    showToast('문장을 선택해주세요');
    isComparePlaying = false;
    return;
  }

  // 비교재생 버튼 하이라이트
  elements.fixedCompareBtn.classList.add('highlighted');

  const timestamp = scriptData[selectedScriptIndex].timeSeconds;
  const nextPhrase = scriptData.find((item, index) => index > selectedScriptIndex && item.timeSeconds > timestamp);
  const endTime = nextPhrase ? nextPhrase.timeSeconds : (timestamp + 5);
  const duration = (endTime - timestamp) * 1000;

  seekToTime(timestamp);
  chrome.runtime.sendMessage({ action: 'playVideo' });

  setTimeout(() => {
    chrome.runtime.sendMessage({ action: 'pauseVideo' });

    if (!isComparePlaying) {
      elements.fixedCompareBtn.classList.remove('highlighted');
      return;
    }

    setTimeout(() => {
      if (!isComparePlaying) {
        elements.fixedCompareBtn.classList.remove('highlighted');
        return;
      }

      const audio = new Audio(recordingUrl);
      currentAudio = audio;
      audio.play();

      audio.onended = () => {
        isComparePlaying = false;
        currentAudio = null;
        // 비교재생 종료 시 하이라이트 제거
        elements.fixedCompareBtn.classList.remove('highlighted');
      };

      audio.onerror = () => {
        isComparePlaying = false;
        currentAudio = null;
        elements.fixedCompareBtn.classList.remove('highlighted');
      };
    }, 500);
  }, duration);
}

// Fixed Action Bar 저장
function saveFixedPhrase() {
  const source = fixedSelectedText;

  if (!source) {
    showToast('저장할 내용이 없습니다');
    return;
  }

  if (!currentVideoId) {
    showToast('영상 정보를 가져올 수 없습니다');
    return;
  }

  const timestamp = selectedScriptIndex >= 0 ? scriptData[selectedScriptIndex].timeSeconds : 0;

  chrome.runtime.sendMessage({ action: 'getPhrases' }, (response) => {
    const phrases = response?.phrases || {};
    if (phrases[currentVideoId]) {
      const duplicate = phrases[currentVideoId].find(p => {
        const timeMatch = Math.abs(p.timestamp - timestamp) < 0.5;
        const textMatch = p.source === source || p.source.trim() === source.trim();
        const modeMatch = p.mode === currentMode;
        return timeMatch && textMatch && modeMatch;
      });

      if (duplicate) {
        showToast('이미 저장된 문장입니다');
        return;
      }
    }

    // 번역 모드일 때는 번역문도 저장
    const translation = currentMode === 'translate' ? elements.fixedTransText.textContent : '';

    const data = {
      videoId: currentVideoId,
      source: source,
      translation: translation,
      timestamp: timestamp,
      videoUrl: currentVideoUrl,
      videoTitle: currentVideoTitle,
      mode: currentMode,
      hasRecording: !!currentPhraseRecordingUrl,
      recordingUrl: currentPhraseRecordingUrl || ''
    };

    chrome.runtime.sendMessage({ action: 'savePhrase', data: data }, (response) => {
      if (response?.success) {
        showToast('저장되었습니다!');
        loadVideoPhrases();
        if (currentMode !== 'summary') {
          renderPage(currentPage);
        }
      } else {
        showToast('저장 실패: ' + (response?.error || 'Unknown error'));
      }
    });
  });
}

// ========== Fixed Action Bar Functions End ==========

// 저장된 표현 삭제
function deleteVideoPhrase(phraseId) {
  if (!currentVideoId) return;
  
  chrome.runtime.sendMessage({
    action: 'deletePhrase',
    videoId: currentVideoId,
    phraseId: phraseId
  }, (response) => {
    if (response?.success) {
      showToast('삭제되었습니다');
      loadVideoPhrases();
      if (currentMode !== 'summary') {
        renderPage(currentPage);
      }
    } else {
      showToast('삭제 실패: ' + (response?.error || 'Unknown error'));
    }
  });
}

// Load video phrases
function loadVideoPhrases() {
  if (!currentVideoId) return;

  // 요약 모드에서는 요약 저장소를 불러옴
  if (currentMode === 'summary') {
    elements.videoPhrasesSection.style.display = 'block';
    loadSummaryPhrases();
    return;
  }

  // 일반/번역 모드에서는 헤더를 "저장된 표현"으로 복원하고 이번 페이지 버튼 표시
  const headerSpan = elements.videoPhrasesSection?.querySelector('.phrases-header > span');
  if (headerSpan) {
    headerSpan.textContent = '저장된 표현';
  }
  if (elements.currentPageFilterBtn) {
    elements.currentPageFilterBtn.style.display = '';
  }

  chrome.runtime.sendMessage({ action: 'getPhrases' }, (response) => {
    const phrases = response?.phrases || {};
    let videoPhrases = (phrases[currentVideoId] || []).filter(p => {
      // Filter by mode: translate mode shows only translated phrases, normal mode shows only non-translated
      if (currentMode === 'translate') {
        return p.mode === 'translate';
      } else {
        return p.mode === 'normal' || p.mode === 'summary';
      }
    });

    // 이번 페이지 필터가 활성화되어 있으면 현재 페이지에 해당하는 표현만 필터링
    if (isCurrentPageFilterActive && scriptData.length > 0 && pageBreakpoints.length > 0) {
      const pageStartIndex = pageBreakpoints[currentPage];
      const pageEndIndex = currentPage < pageBreakpoints.length - 1 
        ? pageBreakpoints[currentPage + 1] 
        : scriptData.length;
      
      const pageStartTime = scriptData[pageStartIndex]?.timeSeconds || 0;
      const pageEndTime = scriptData[pageEndIndex - 1]?.timeSeconds || Infinity;
      
      videoPhrases = videoPhrases.filter(p => {
        return p.timestamp >= pageStartTime && p.timestamp <= pageEndTime;
      });
    }

    // 시간 순서대로 정렬
    videoPhrases.sort((a, b) => a.timestamp - b.timestamp);

    // 저장된 표현이 없어도 메뉴는 항상 표시
    elements.videoPhrasesSection.style.display = 'block';
    elements.videoPhrasesList.innerHTML = '';

    if (videoPhrases.length > 0) {
      videoPhrases.forEach(phrase => {
        const item = document.createElement('div');
        const isTranslateMode = currentMode === 'translate';
        item.className = 'phrase-item' + (isTranslateMode ? ' translate-mode' : '');
        const hasRecording = phrase.hasRecording || phrase.recordingUrl;

        // 로컬 캐시에서 번역 가져오기 (저장된 번역 대신)
        const cacheKey = `temp_translations_${currentVideoId}`;

        // 번역 모드: 원문 아래 번역문 (스크립트 창과 동일한 레이아웃)
        let contentHtml;
        if (isTranslateMode) {
          // 번역은 나중에 캐시에서 채워짐
          contentHtml = `
            <div class="phrase-content">
              <div class="phrase-text">${phrase.source}</div>
              <div class="phrase-translation" data-source="${encodeURIComponent(phrase.source)}">번역 중...</div>
              <div class="phrase-time">${formatTime(phrase.timestamp)}</div>
            </div>
          `;
        } else {
          contentHtml = `
            <div class="phrase-content">
              <div class="phrase-text">${phrase.source}</div>
              ${phrase.translation ? `<div class="phrase-translation">${phrase.translation}</div>` : ''}
              <div class="phrase-time">${formatTime(phrase.timestamp)}</div>
            </div>
          `;
        }

        item.innerHTML = `
          <button class="phrase-delete-btn" data-phrase-id="${phrase.id}" title="삭제">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="phrase-play-buttons">
            <button class="phrase-play-btn" data-phrase-id="${phrase.id}" data-timestamp="${phrase.timestamp}" data-action="record" title="녹음">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
              </svg>
            </button>
            <button class="phrase-play-btn" data-phrase-id="${phrase.id}" data-timestamp="${phrase.timestamp}" data-action="play" title="원문 재생">
              <svg viewBox="0 0 24 24" fill="none">
                <polygon points="5,3 19,12 5,21" fill="currentColor"/>
              </svg>
            </button>
            ${hasRecording ? `
            <button class="phrase-play-btn" data-phrase-id="${phrase.id}" data-action="play-recording" title="녹음파일 재생">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" fill="currentColor"/>
              </svg>
            </button>
            <button class="phrase-play-btn" data-phrase-id="${phrase.id}" data-timestamp="${phrase.timestamp}" data-action="compare" title="비교재생">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
                <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
            ` : ''}
          </div>
          ${contentHtml}
        `;
        
        // 카드 클릭 시 영상 이동
        const phraseContent = item.querySelector('.phrase-content');
        phraseContent.addEventListener('click', () => {
          seekToTime(phrase.timestamp);
        });
        
        // X 버튼 클릭 시 삭제
        const deleteBtn = item.querySelector('.phrase-delete-btn');
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteVideoPhrase(phrase.id);
        });
        
        // 재생 버튼 클릭 이벤트
        const playButtons = item.querySelectorAll('.phrase-play-btn');
        playButtons.forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const phraseId = parseInt(btn.dataset.phraseId);
            handlePhrasePlayback(phraseId, action, phrase, btn);
          });
        });
        
        elements.videoPhrasesList.appendChild(item);
      });

      // 번역 모드에서 로컬 캐시로부터 번역 채우기
      if (currentMode === 'translate') {
        const cacheKey = `temp_translations_${currentVideoId}`;
        chrome.storage.local.get([cacheKey], (result) => {
          const translations = result[cacheKey] || {};
          const translationElements = elements.videoPhrasesList.querySelectorAll('.phrase-translation[data-source]');
          translationElements.forEach(el => {
            const source = decodeURIComponent(el.dataset.source);
            const cachedTranslation = translations[source];
            if (cachedTranslation) {
              el.textContent = cachedTranslation;
            } else {
              el.textContent = '번역 없음';
            }
          });
        });
      }
    } else {
      // 저장된 표현이 없을 때 빈 상태 메시지 표시
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'phrases-empty';
      emptyMessage.textContent = '저장된 표현이 없습니다';
      elements.videoPhrasesList.appendChild(emptyMessage);
    }
  });
}

// Load settings
function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
    if (settings) {
      elements.myLangSelect.value = settings.myLang || 'auto';
      elements.sourceLangSelect.value = settings.sourceLang || 'EN';
      elements.targetLangSelect.value = settings.targetLang || 'KO';

      // API Model settings
      if (elements.apiModelInput) {
        elements.apiModelInput.value = settings.apiModel || '';
      }
      elements.apiKeyInput.value = settings.apiKey || '';

      seekTime = settings.seekTime || 5;
      repeatKey = settings.repeatKey || 'R';
      loopPlayback = settings.loopPlayback || false;

      if (elements.seekTimeInput) {
        elements.seekTimeInput.value = seekTime;
      }
      if (elements.repeatKeyInput) {
        elements.repeatKeyInput.value = repeatKey.toUpperCase();
      }
      if (elements.loopPlaybackCheckbox) {
        elements.loopPlaybackCheckbox.checked = loopPlayback;
      }
    }
  });
}


// Save settings
function saveSettings() {
  const settings = {
    myLang: elements.myLangSelect.value,
    sourceLang: elements.sourceLangSelect.value,
    targetLang: elements.targetLangSelect.value,
    apiModel: elements.apiModelInput ? elements.apiModelInput.value.trim() : '',
    apiKey: elements.apiKeyInput.value.trim(),
    seekTime: parseInt(elements.seekTimeInput.value) || 5,
    repeatKey: (elements.repeatKeyInput.value || 'R').toUpperCase(),
    loopPlayback: elements.loopPlaybackCheckbox ? elements.loopPlaybackCheckbox.checked : false
  };

  seekTime = settings.seekTime;
  repeatKey = settings.repeatKey;
  loopPlayback = settings.loopPlayback;

  chrome.runtime.sendMessage({ action: 'saveSettings', settings: settings }, (response) => {
    if (response?.success) {
      showToast('설정이 저장되었습니다!');
      elements.settingsModal.classList.remove('active');
      updateRepeatIndicator();
    }
  });
}

// Show video archive
function showVideoArchive() {
  elements.videoArchiveModal.classList.add('active');
  elements.videoArchiveList.innerHTML = '<div class="loading-text">불러오는 중...</div>';

  // 요약 모드일 때는 저장된 요약 표시
  if (currentMode === 'summary') {
    showSummaryVideoArchive();
    return;
  }

  chrome.runtime.sendMessage({ action: 'getPhrases' }, (response) => {
    const phrases = response?.phrases || {};
    const allPhrases = phrases[currentVideoId] || [];

    // Filter by current mode
    const videoPhrases = allPhrases.filter(p => {
      if (currentMode === 'translate') {
        return p.mode === 'translate';
      } else {
        return p.mode === 'normal' || p.mode === 'summary';
      }
    });

    elements.videoArchiveList.innerHTML = '';

    // Add CSV download button
    if (videoPhrases.length > 0) {
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'btn-csv-download';
      downloadBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
          <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        CSV 다운로드
      `;
      downloadBtn.addEventListener('click', () => {
        // Fetch latest data before downloading CSV
        downloadVideoArchiveCSV();
      });
      elements.videoArchiveList.appendChild(downloadBtn);
    }

    if (videoPhrases.length === 0) {
      elements.videoArchiveList.innerHTML = `
        <div class="empty-state">
          <p>이 영상에 저장된 표현이 없습니다</p>
        </div>
      `;
      return;
    }

    videoPhrases.forEach(note => {
      const item = createArchiveItem(note, currentVideoId);
      elements.videoArchiveList.appendChild(item);
    });

    // 번역 모드에서 로컬 캐시로부터 번역 채우기
    if (currentMode === 'translate') {
      const cacheKey = `temp_translations_${currentVideoId}`;
      chrome.storage.local.get([cacheKey], (result) => {
        const translations = result[cacheKey] || {};
        const translationElements = elements.videoArchiveList.querySelectorAll('.archive-trans[data-source]');
        translationElements.forEach(el => {
          const source = decodeURIComponent(el.dataset.source);
          const cachedTranslation = translations[source];
          if (cachedTranslation) {
            el.textContent = cachedTranslation;
          } else {
            el.textContent = '번역 없음';
          }
        });
      });
    }
  });
}

// 요약 모드 영상 내 보관함 (저장된 요약 표시)
function showSummaryVideoArchive() {
  chrome.storage.local.get(['savedSummaries'], (result) => {
    const summaries = result.savedSummaries || {};
    const videoSummaries = summaries[currentVideoId] || [];

    elements.videoArchiveList.innerHTML = '';

    // Add CSV download button
    if (videoSummaries.length > 0) {
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'btn-csv-download';
      downloadBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
          <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        CSV 다운로드
      `;
      downloadBtn.addEventListener('click', () => {
        downloadSummaryVideoArchiveCSV(videoSummaries);
      });
      elements.videoArchiveList.appendChild(downloadBtn);
    }

    if (videoSummaries.length === 0) {
      elements.videoArchiveList.innerHTML = `
        <div class="empty-state">
          <p>이 영상에 저장된 요약이 없습니다</p>
        </div>
      `;
      return;
    }

    videoSummaries.forEach(summary => {
      const item = createSummaryArchiveItem(summary, currentVideoId);
      elements.videoArchiveList.appendChild(item);
    });
  });
}

// 요약 보관함 아이템 생성
function createSummaryArchiveItem(summary, videoId) {
  const item = document.createElement('div');
  item.className = 'archive-item card-style summary-archive';

  const date = new Date(summary.createdAt);
  const dateStr = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
  const hasRecording = summary.hasRecording || summary.recordingUrl;
  const typeLabel = summary.type === 'full' ? '전체 요약' : '선택 요약';

  item.innerHTML = `
    <div class="archive-header">
      <span class="archive-meta">${dateStr} · ${typeLabel}</span>
      <button class="btn-delete-icon" data-video-id="${videoId}" data-summary-id="${summary.id}" title="삭제">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="archive-content">
      <p class="archive-source summary-content">${escapeHtml(summary.content)}</p>
    </div>
    <div class="archive-actions-bar">
      <button class="btn-archive-action" data-action="record-summary" data-summary-id="${summary.id}" title="녹음">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
        녹음
      </button>
      ${hasRecording ? `
      <button class="btn-archive-action" data-action="play-summary-recording" data-summary-id="${summary.id}" data-recording-url="${summary.recordingUrl || ''}" title="녹음파일 재생">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" fill="currentColor"/>
        </svg>
        녹음 재생
      </button>
      ` : ''}
    </div>
  `;

  // 삭제 버튼
  item.querySelector('.btn-delete-icon').addEventListener('click', (e) => {
    e.stopPropagation();
    const sId = parseInt(e.target.closest('.btn-delete-icon').dataset.summaryId);
    deleteSavedSummary(videoId, sId);
    item.remove();
  });

  // 액션 버튼들
  const actionButtons = item.querySelectorAll('.btn-archive-action');
  actionButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      handleSummaryArchiveAction(action, summary, btn, videoId);
    });
  });

  return item;
}

// 요약 보관함 액션 처리
function handleSummaryArchiveAction(action, summary, button, videoId) {
  if (action === 'record-summary') {
    startSummaryArchiveRecording(summary, button, videoId);
  } else if (action === 'play-summary-recording') {
    const recordingUrl = button.dataset.recordingUrl || summary.recordingUrl;
    if (recordingUrl) {
      playSummaryArchiveRecording(recordingUrl, button);
    } else {
      // storage에서 녹음 파일 찾기
      chrome.storage.local.get(['summaryRecordings'], (result) => {
        const recordings = result.summaryRecordings || {};
        if (recordings[videoId] && recordings[videoId][summary.id]) {
          playSummaryArchiveRecording(recordings[videoId][summary.id].data, button);
        } else {
          showToast('녹음 파일이 없습니다');
        }
      });
    }
  }
}

// 요약 보관함 녹음 시작
let summaryArchiveRecordingSummary = null;
let summaryArchiveRecordingButton = null;
let summaryArchiveRecordingVideoId = null;

async function startSummaryArchiveRecording(summary, button, videoId) {
  if (isRecording) {
    stopSummaryArchiveRecordingSession();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(track => track.stop());
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      await saveSummaryArchiveRecording(audioBlob, summary, videoId);
    };

    summaryArchiveRecordingSummary = summary;
    summaryArchiveRecordingButton = button;
    summaryArchiveRecordingVideoId = videoId;

    mediaRecorder.start();
    isRecording = true;
    button.classList.add('recording');
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
      </svg>
      녹음 중...
    `;
    showToast('녹음이 시작되었습니다');
  } catch (error) {
    console.error('Recording error:', error);
    showToast('마이크 접근 권한이 필요합니다');
  }
}

function stopSummaryArchiveRecordingSession() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    if (summaryArchiveRecordingButton) {
      summaryArchiveRecordingButton.classList.remove('recording');
      summaryArchiveRecordingButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
        녹음
      `;
    }
  }
}

async function saveSummaryArchiveRecording(audioBlob, summary, videoId) {
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64data = reader.result;

    chrome.storage.local.get(['summaryRecordings', 'savedSummaries'], (result) => {
      const recordings = result.summaryRecordings || {};
      const summaries = result.savedSummaries || {};

      if (!recordings[videoId]) {
        recordings[videoId] = {};
      }
      recordings[videoId][summary.id] = {
        data: base64data,
        createdAt: Date.now()
      };

      // 요약 정보에 녹음 플래그 추가
      if (summaries[videoId]) {
        const idx = summaries[videoId].findIndex(s => s.id === summary.id);
        if (idx !== -1) {
          summaries[videoId][idx].hasRecording = true;
          summaries[videoId][idx].recordingUrl = base64data;
        }
      }

      chrome.storage.local.set({ summaryRecordings: recordings, savedSummaries: summaries }, () => {
        showToast('녹음이 저장되었습니다');
        // 보관함 새로고침
        showSummaryVideoArchive();
        loadVideoSummaries();
      });
    });
  };
  reader.readAsDataURL(audioBlob);
}

// 요약 보관함 녹음 재생
function playSummaryArchiveRecording(recordingUrl, button) {
  if (currentPlayingAudio) {
    currentPlayingAudio.pause();
    currentPlayingAudio = null;
    document.querySelectorAll('.btn-archive-action.playing').forEach(btn => {
      btn.classList.remove('playing');
    });
    return;
  }

  currentPlayingAudio = new Audio(recordingUrl);
  button.classList.add('playing');

  currentPlayingAudio.play();
  currentPlayingAudio.onended = () => {
    currentPlayingAudio = null;
    button.classList.remove('playing');
  };
  currentPlayingAudio.onerror = () => {
    currentPlayingAudio = null;
    button.classList.remove('playing');
    showToast('녹음 재생 실패');
  };
}

// 요약 영상 보관함 CSV 다운로드
function downloadSummaryVideoArchiveCSV(summaries) {
  if (summaries.length === 0) {
    showToast('다운로드할 데이터가 없습니다');
    return;
  }

  let csvContent = '\uFEFF유형,내용,저장일\n';
  summaries.forEach(s => {
    const date = new Date(s.createdAt);
    const dateStr = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
    const typeLabel = s.type === 'full' ? '전체 요약' : '선택 요약';
    const content = `"${(s.content || '').replace(/"/g, '""')}"`;
    csvContent += `${typeLabel},${content},${dateStr}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${currentVideoTitle || 'video'}_summary_archive.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('CSV 다운로드 완료!');
}

// Download video archive as CSV - fetches latest data
function downloadVideoArchiveCSV() {
  chrome.runtime.sendMessage({ action: 'getPhrases' }, (response) => {
    const phrases = response?.phrases || {};
    const allPhrases = phrases[currentVideoId] || [];

    // Filter by current mode
    const videoPhrases = allPhrases.filter(p => {
      if (currentMode === 'translate') {
        return p.mode === 'translate';
      } else {
        return p.mode === 'normal' || p.mode === 'summary';
      }
    });

    if (videoPhrases.length === 0) {
      showToast('다운로드할 데이터가 없습니다');
      return;
    }

    let csvContent = '';

    if (currentMode === 'translate') {
      // 번역모드: 분:초, 원문, 번역문
      csvContent = '\uFEFF시간,원문,번역문\n';
      videoPhrases.forEach(p => {
        const time = formatTime(p.timestamp);
        const source = `"${(p.source || '').replace(/"/g, '""')}"`;
        const translation = `"${(p.translation || '').replace(/"/g, '""')}"`;
        csvContent += `${time},${source},${translation}\n`;
      });
    } else {
      // 일반모드: 분:초, 원문
      csvContent = '\uFEFF시간,원문\n';
      videoPhrases.forEach(p => {
        const time = formatTime(p.timestamp);
        const source = `"${(p.source || '').replace(/"/g, '""')}"`;
        csvContent += `${time},${source}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentVideoTitle || 'video'}_${currentMode}_archive.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('CSV 다운로드 완료!');
  });
}

// Show master archive - opens in new tab
function showMasterArchive() {
  // 요약 모드일 때는 요약 전체 보관함 표시
  if (currentMode === 'summary') {
    showSummaryMasterArchive();
    return;
  }
  const mode = currentMode === 'translate' ? 'translate' : 'normal';
  const url = chrome.runtime.getURL(`master-archive.html?mode=${mode}`);
  chrome.tabs.create({ url: url });
}

// 요약 전체 보관함 표시 (새 탭으로)
function showSummaryMasterArchive() {
  const url = chrome.runtime.getURL('summary-archive.html');
  chrome.tabs.create({ url: url });
}

// Escape HTML entities
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Create archive item
function createArchiveItem(note, videoId) {
  const item = document.createElement('div');
  item.className = 'archive-item card-style';

  const date = new Date(note.createdAt);
  const dateStr = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;

  const hasRecording = note.hasRecording || note.recordingUrl;
  const isTranslateMode = note.mode === 'translate';

  // 스크립트와 동일한 레이아웃: 원문 → 번역문 (위아래 배치)
  let contentHtml;
  if (isTranslateMode) {
    contentHtml = `
      <div class="archive-content">
        <p class="archive-source">${note.source}</p>
        <p class="archive-trans" data-source="${encodeURIComponent(note.source)}">번역 중...</p>
      </div>
    `;
  } else {
    contentHtml = `
      <div class="archive-content">
        <p class="archive-source">${note.source}</p>
        ${note.translation ? `<p class="archive-trans">${note.translation}</p>` : ''}
      </div>
    `;
  }

  item.innerHTML = `
    <div class="archive-header">
      <span class="archive-meta">${dateStr} · ${formatTime(note.timestamp)}</span>
      <button class="btn-delete-icon" data-video-id="${videoId}" data-phrase-id="${note.id}" title="삭제">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    ${contentHtml}
    <div class="archive-actions-bar">
      <button class="btn-archive-action" data-action="record" data-phrase-id="${note.id}" title="녹음">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
        녹음
      </button>
      <button class="btn-archive-action" data-action="play-original" data-timestamp="${note.timestamp}" title="원문 재생">
        <svg viewBox="0 0 24 24" fill="none">
          <polygon points="5,3 19,12 5,21" fill="currentColor"/>
        </svg>
        원문 재생
      </button>
      ${hasRecording ? `
      <button class="btn-archive-action archive-play-recording" data-action="play-recording" data-phrase-id="${note.id}" data-recording-url="${note.recordingUrl || ''}" title="녹음파일 재생">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" fill="currentColor"/>
        </svg>
        녹음 재생
      </button>
      <button class="btn-archive-action" data-action="compare" data-phrase-id="${note.id}" data-timestamp="${note.timestamp}" data-recording-url="${note.recordingUrl || ''}" title="비교재생">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
          <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        비교재생
      </button>
      ` : ''}
    </div>
  `;

  // 삭제 버튼
  item.querySelector('.btn-delete-icon').addEventListener('click', (e) => {
    e.stopPropagation();
    const vId = e.target.closest('.btn-delete-icon').dataset.videoId;
    const pId = parseInt(e.target.closest('.btn-delete-icon').dataset.phraseId);

    chrome.runtime.sendMessage({
      action: 'deletePhrase',
      videoId: vId,
      phraseId: pId
    }, (response) => {
      if (response?.success) {
        item.remove();
        showToast('삭제되었습니다');
        loadVideoPhrases();
      }
    });
  });

  // 액션 버튼들
  const actionButtons = item.querySelectorAll('.btn-archive-action');
  actionButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      handleArchiveAction(action, note, btn, videoId);
    });
  });

  return item;
}

// 보관함 액션 처리
function handleArchiveAction(action, note, button, videoId) {
  if (action === 'record') {
    startArchiveRecording(note, button, videoId);
  } else if (action === 'play-original') {
    playArchiveOriginal(note.timestamp);
  } else if (action === 'play-recording') {
    const recordingUrl = button.dataset.recordingUrl || note.recordingUrl;
    if (recordingUrl) {
      playArchiveRecording(recordingUrl, button);
    } else {
      showToast('녹음 파일이 없습니다');
    }
  } else if (action === 'compare') {
    const recordingUrl = button.dataset.recordingUrl || note.recordingUrl;
    if (recordingUrl) {
      startArchiveComparePlay(note.timestamp, recordingUrl);
    } else {
      showToast('녹음 파일이 없습니다');
    }
  }
}

// 보관함에서 원문 재생
function playArchiveOriginal(timestamp) {
  seekToTime(timestamp);
  chrome.runtime.sendMessage({ action: 'playVideo' }, () => {
    // 다음 문장까지 재생 후 정지
    const nextPhrase = scriptData.find(item => item.timeSeconds > timestamp);
    const endTime = nextPhrase ? nextPhrase.timeSeconds : (timestamp + 5);

    const checkEnd = setInterval(() => {
      chrome.runtime.sendMessage({ action: 'getVideoState' }, (response) => {
        if (response?.success) {
          if (response.currentTime >= endTime || response.paused) {
            clearInterval(checkEnd);
            if (!response.paused && response.currentTime >= endTime) {
              chrome.runtime.sendMessage({ action: 'pauseVideo' });
            }
          }
        }
      });
    }, 100);
  });
}

// 보관함에서 비교 재생
function startArchiveComparePlay(timestamp, recordingUrl) {
  seekToTime(timestamp);
  chrome.runtime.sendMessage({ action: 'playVideo' }, () => {
    const nextPhrase = scriptData.find(item => item.timeSeconds > timestamp);
    const endTime = nextPhrase ? nextPhrase.timeSeconds : (timestamp + 5);
    const duration = (endTime - timestamp) * 1000;

    setTimeout(() => {
      chrome.runtime.sendMessage({ action: 'pauseVideo' });

      setTimeout(() => {
        const audio = new Audio(recordingUrl);
        audio.play();
      }, 500);
    }, duration);
  });
}

// 보관함에서 녹음 시작
let archiveRecordingNote = null;
let archiveRecordingButton = null;
let archiveRecordingVideoId = null;

async function startArchiveRecording(note, button, videoId) {
  if (isRecording) {
    stopArchiveRecordingSession();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    archiveRecordingNote = note;
    archiveRecordingButton = button;
    archiveRecordingVideoId = videoId;

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

      await saveArchiveRecording(audioBlob, archiveRecordingNote, archiveRecordingVideoId);

      if (archiveRecordingButton) {
        archiveRecordingButton.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
          녹음
        `;
        archiveRecordingButton.classList.remove('recording');
      }

      showToast('녹음이 저장되었습니다');
      showVideoArchive(); // 새로고침

      isRecording = false;
      archiveRecordingNote = null;
      archiveRecordingButton = null;
      archiveRecordingVideoId = null;
    };

    mediaRecorder.start();
    isRecording = true;

    if (button) {
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="8" y="8" width="8" height="8" fill="currentColor"/>
        </svg>
        정지
      `;
      button.classList.add('recording');
    }

    showToast('녹음 중... 버튼을 다시 클릭하면 종료됩니다');
  } catch (error) {
    console.error('녹음 시작 실패:', error);
    showToast('마이크 권한이 필요합니다');
  }
}

function stopArchiveRecordingSession() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
}

async function saveArchiveRecording(audioBlob, note, videoId) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const audioData = reader.result;

      chrome.runtime.sendMessage({ action: 'getPhrases' }, (response) => {
        const phrases = response?.phrases || {};

        if (phrases[videoId]) {
          const targetPhrase = phrases[videoId].find(p => p.id === note.id);
          if (targetPhrase) {
            targetPhrase.recordingUrl = audioData;
            targetPhrase.hasRecording = true;

            chrome.runtime.sendMessage({
              action: 'savePhrases',
              phrases: phrases
            }, () => {
              resolve();
            });
            return;
          }
        }
        resolve();
      });
    };
    reader.readAsDataURL(audioBlob);
  });
}

// 보관함 모달의 녹음파일 재생
function playArchiveRecording(recordingUrl, button) {
  if (currentRecordingAudio) {
    currentRecordingAudio.pause();
    currentRecordingAudio = null;
  }
  
  const audio = new Audio(recordingUrl);
  audio.playbackRate = playbackSpeed;
  currentRecordingAudio = audio;
  
  // 재생 버튼을 정지 버튼으로 변경
  button.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="6" y="6" width="4" height="12" fill="currentColor"/>
      <rect x="14" y="6" width="4" height="12" fill="currentColor"/>
    </svg>
  `;
  button.dataset.playing = 'true';
  button.title = '정지';
  
  const stopPlayback = () => {
    if (currentRecordingAudio) {
      currentRecordingAudio.pause();
      currentRecordingAudio.currentTime = 0;
      currentRecordingAudio = null;
    }
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" fill="currentColor"/>
      </svg>
    `;
    button.dataset.playing = 'false';
    button.title = '녹음파일 재생';
    button.onclick = (e) => {
      e.stopPropagation();
      playArchiveRecording(recordingUrl, button);
    };
  };
  
  button.onclick = (e) => {
    e.stopPropagation();
    stopPlayback();
  };
  
  audio.onended = () => {
    stopPlayback();
  };
  
  audio.onerror = () => {
    showToast('재생 실패');
    stopPlayback();
  };
  
  audio.play();
}

// Show loading
function showLoading(show) {
  if (show) {
    elements.loadingOverlay.classList.add('active');
  } else {
    elements.loadingOverlay.classList.remove('active');
  }
}

// Show toast
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

// 배속 업데이트
function updatePlaybackSpeed() {
  // 일반/번역 모드 컨트롤바
  if (elements.speedValue) {
    elements.speedValue.textContent = playbackSpeed.toFixed(2) + 'x';
  }
  // 요약 모드 컨트롤바
  if (elements.summarySpeedValue) {
    elements.summarySpeedValue.textContent = playbackSpeed.toFixed(2) + 'x';
  }
  chrome.runtime.sendMessage({
    action: 'setPlaybackRate',
    rate: playbackSpeed
  });
}

// 녹음 종료
function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    isRecording = false;
  }
}

// 녹음 파일을 MP3로 저장
async function saveRecordingAsMP3(audioBlob) {
  // WebM을 MP3로 변환하는 것은 복잡하므로, 여기서는 WebM 파일로 저장
  // 실제 MP3 변환은 서버나 WebAssembly 라이브러리가 필요합니다
  const timestamp = Date.now();
  const filename = `recording_${timestamp}.webm`;
  
  // Chrome Storage에 저장
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64data = reader.result;
    chrome.storage.local.get(['recordings'], (result) => {
      const recordings = result.recordings || {};
      if (!recordings[currentVideoId]) {
        recordings[currentVideoId] = {};
      }
      recordings[currentVideoId][selectedScriptIndex] = {
        data: base64data,
        timestamp: timestamp,
        filename: filename
      };
      chrome.storage.local.set({ recordings: recordings });
    });
  };
  reader.readAsDataURL(audioBlob);
}

// 녹음과 함께 문장 자동 저장
async function autoSavePhraseWithRecording() {
  // Fixed Action Bar에서 선택된 텍스트 사용
  const source = fixedSelectedText || '';
  const translation = currentMode === 'translate' ? elements.fixedTransText.textContent : '';
  
  if (!source || !currentVideoId) return;
  
  const timestamp = selectedScriptIndex >= 0 ? scriptData[selectedScriptIndex].timeSeconds : 0;
  
  // 중복 체크: 이미 저장된 문장인지 확인
  chrome.runtime.sendMessage({ action: 'getPhrases' }, (response) => {
    const phrases = response?.phrases || {};
    let isDuplicate = false;
    
    if (phrases[currentVideoId]) {
      const duplicate = phrases[currentVideoId].find(p => {
        const timeMatch = Math.abs(p.timestamp - timestamp) < 0.5;
        const textMatch = p.source === source || p.source.trim() === source.trim();
        const modeMatch = p.mode === 'translate';
        return timeMatch && textMatch && modeMatch;
      });
      
      if (duplicate) {
        isDuplicate = true;
        // 이미 저장된 문장이면 녹음 정보만 업데이트
        const data = {
          videoId: currentVideoId,
          source: source,
          translation: translation || duplicate.translation || '',
          timestamp: timestamp,
          videoUrl: currentVideoUrl,
          videoTitle: currentVideoTitle,
          recordingUrl: currentPhraseRecordingUrl,
          hasRecording: true,
          mode: 'translate',
          id: duplicate.id // 기존 ID 사용하여 업데이트
        };
        
        chrome.runtime.sendMessage({ action: 'savePhrase', data: data }, (response) => {
          if (response?.success) {
            loadVideoPhrases();
            if (currentMode !== 'summary') {
              renderPage(currentPage);
            }
            updateFixedActionButtons(true);
          }
        });
        return;
      }
    }

    // 중복이 없으면 새로 저장
    if (!isDuplicate) {
      const data = {
        videoId: currentVideoId,
        source: source,
        translation: translation || '',
        timestamp: timestamp,
        videoUrl: currentVideoUrl,
        videoTitle: currentVideoTitle,
        recordingUrl: currentPhraseRecordingUrl,
        hasRecording: true,
        mode: currentMode
      };

      chrome.runtime.sendMessage({ action: 'savePhrase', data: data }, (response) => {
        if (response?.success) {
          loadVideoPhrases();
          if (currentMode !== 'summary') {
            renderPage(currentPage);
          }
          updateFixedActionButtons(true);
        }
      });
    }
  });
}

// 저장된 표현 카드에서 녹음 시작
let phraseRecordingPhrase = null;
let phraseRecordingButton = null;

async function startPhraseRecording(phrase, button) {
  if (isRecording) {
    // 이미 녹음 중이면 녹음 종료
    stopPhraseRecordingSession();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    phraseRecordingPhrase = phrase;
    phraseRecordingButton = button;

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // 녹음 파일 저장
      await savePhraseRecording(audioBlob, phraseRecordingPhrase);

      // 버튼 복원
      if (phraseRecordingButton) {
        phraseRecordingButton.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
        `;
        phraseRecordingButton.classList.remove('recording');
      }

      showToast('녹음이 저장되었습니다');

      // 저장된 표현 목록 새로고침
      loadVideoPhrases();

      isRecording = false;
      phraseRecordingPhrase = null;
      phraseRecordingButton = null;
    };

    mediaRecorder.start();
    isRecording = true;

    // 버튼을 녹음 중 상태로 변경
    if (button) {
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="8" y="8" width="8" height="8" fill="currentColor"/>
        </svg>
      `;
      button.classList.add('recording');
    }

    showToast('녹음 중... 버튼을 다시 클릭하면 종료됩니다');
  } catch (error) {
    console.error('녹음 시작 실패:', error);
    showToast('마이크 권한이 필요합니다');
  }
}

function stopPhraseRecordingSession() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
}

async function savePhraseRecording(audioBlob, phrase) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const audioData = reader.result;

      // 저장된 표현에 녹음 URL 추가
      chrome.runtime.sendMessage({ action: 'getPhrases' }, (response) => {
        const phrases = response?.phrases || {};

        if (phrases[currentVideoId]) {
          const targetPhrase = phrases[currentVideoId].find(p => p.id === phrase.id);
          if (targetPhrase) {
            targetPhrase.recordingUrl = audioData;
            targetPhrase.hasRecording = true;

            chrome.runtime.sendMessage({
              action: 'savePhrases',
              phrases: phrases
            }, () => {
              resolve();
            });
            return;
          }
        }
        resolve();
      });
    };
    reader.readAsDataURL(audioBlob);
  });
}

// 저장된 문장 카드 재생 처리
function handlePhrasePlayback(phraseId, action, phrase, button) {
  const timestamp = phrase.timestamp;

  if (action === 'record') {
    // 녹음 시작 - 해당 문장으로 이동 후 녹음
    startPhraseRecording(phrase, button);
    return;
  }

  if (action === 'play') {
    // 해당 문장 재생
    seekToTime(timestamp);
    chrome.runtime.sendMessage({ action: 'playVideo' }, () => {
      // 재생 시간 계산
      const nextPhrase = scriptData.find(item => item.timeSeconds > timestamp);
      const endTime = nextPhrase ? nextPhrase.timeSeconds : (timestamp + 5);
      
      // 재생 종료 감지
      const checkEnd = setInterval(() => {
        chrome.runtime.sendMessage({ action: 'getVideoState' }, (response) => {
          if (response?.success) {
            if (response.currentTime >= endTime || response.paused) {
              clearInterval(checkEnd);
              if (loopPlayback && !response.paused) {
                seekToTime(timestamp);
              }
            }
          }
        });
      }, 100);
    });
  } else if (action === 'play-recording') {
    // 녹음 파일 재생
    chrome.storage.local.get(['recordings'], (result) => {
      const recordings = result.recordings || {};
      if (recordings[currentVideoId] && phrase.recordingUrl) {
        playPhraseRecording(phrase.recordingUrl, phraseId);
      } else {
        showToast('녹음 파일이 없습니다');
      }
    });
  } else if (action === 'compare') {
    // 비교재생
    seekToTime(timestamp);
    chrome.storage.local.get(['recordings'], (result) => {
      const recordings = result.recordings || {};
      if (recordings[currentVideoId] && phrase.recordingUrl) {
        startPhraseComparePlayback(phrase.recordingUrl, timestamp, phraseId);
      } else {
        showToast('녹음 파일이 없습니다');
      }
    });
  }
}

// 저장된 문장의 녹음 파일 재생
function playPhraseRecording(recordingUrl, phraseId) {
  if (currentRecordingAudio) {
    currentRecordingAudio.pause();
    currentRecordingAudio = null;
  }
  
  const audio = new Audio(recordingUrl);
  audio.playbackRate = playbackSpeed;
  currentRecordingAudio = audio;
  
  // 재생 버튼을 정지 버튼으로 변경
  const playBtn = document.querySelector(`.phrase-play-btn[data-phrase-id="${phraseId}"][data-action="play-recording"]`);
  if (playBtn) {
    playBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="6" y="6" width="4" height="12" fill="currentColor"/>
        <rect x="14" y="6" width="4" height="12" fill="currentColor"/>
      </svg>
    `;
    playBtn.dataset.playing = 'true';
    playBtn.onclick = (e) => {
      e.stopPropagation();
      stopPhrasePlayback(phraseId);
    };
  }
  
  audio.onended = () => {
    if (loopPlayback) {
      audio.currentTime = 0;
      audio.play();
    } else {
      stopPhrasePlayback(phraseId);
    }
  };
  
  audio.onerror = () => {
    showToast('재생 실패');
    stopPhrasePlayback(phraseId);
  };
  
  audio.play();
}

// 저장된 문장의 비교재생
function startPhraseComparePlayback(recordingUrl, timestamp, phraseId) {
  seekToTime(timestamp);
  chrome.runtime.sendMessage({ action: 'playVideo' }, () => {
    const audio = new Audio(recordingUrl);
    audio.playbackRate = playbackSpeed;
    
    // 유튜브 영상이 끝나면 녹음 파일 재생
    const nextPhrase = scriptData.find(item => item.timeSeconds > timestamp);
    const videoEndTime = nextPhrase ? nextPhrase.timeSeconds : (timestamp + 5);
    
    const checkVideoEnd = setInterval(() => {
      chrome.runtime.sendMessage({ action: 'getVideoState' }, (response) => {
        if (response?.success && response.currentTime >= videoEndTime) {
          audio.play();
          clearInterval(checkVideoEnd);
        }
      });
    }, 100);
    
    // 녹음 파일이 끝나면 유튜브 영상 재생
    audio.onended = () => {
      seekToTime(timestamp);
      chrome.runtime.sendMessage({ action: 'playVideo' }, () => {
        if (loopPlayback) {
          setTimeout(() => {
            audio.currentTime = 0;
            audio.play();
          }, (videoEndTime - timestamp) * 1000);
        } else {
          stopPhraseComparePlayback(phraseId);
        }
      });
    };
    
    audio.onerror = () => {
      showToast('재생 실패');
      stopPhraseComparePlayback(phraseId);
    };
  });
  
  // 재생 버튼을 정지 버튼으로 변경
  const compareBtn = document.querySelector(`.phrase-play-btn[data-phrase-id="${phraseId}"][data-action="compare"]`);
  if (compareBtn) {
    compareBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="6" y="6" width="4" height="12" fill="currentColor"/>
        <rect x="14" y="6" width="4" height="12" fill="currentColor"/>
      </svg>
    `;
    compareBtn.dataset.playing = 'true';
    compareBtn.onclick = (e) => {
      e.stopPropagation();
      stopPhraseComparePlayback(phraseId);
    };
  }
}

// 저장된 문장 재생 정지
function stopPhrasePlayback(phraseId) {
  if (currentRecordingAudio) {
    currentRecordingAudio.pause();
    currentRecordingAudio.currentTime = 0;
    currentRecordingAudio = null;
  }
  
  const playBtn = document.querySelector(`.phrase-play-btn[data-phrase-id="${phraseId}"][data-action="play-recording"]`);
  if (playBtn && playBtn.dataset.playing === 'true') {
    playBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" fill="currentColor"/>
      </svg>
    `;
    playBtn.dataset.playing = 'false';
    const phrase = { id: phraseId };
    playBtn.onclick = (e) => {
      e.stopPropagation();
      handlePhrasePlayback(phraseId, 'play-recording', phrase);
    };
  }
}

// 저장된 문장 비교재생 정지
function stopPhraseComparePlayback(phraseId) {
  if (currentRecordingAudio) {
    currentRecordingAudio.pause();
    currentRecordingAudio.currentTime = 0;
    currentRecordingAudio = null;
  }
  chrome.runtime.sendMessage({ action: 'pauseVideo' });
  
  const compareBtn = document.querySelector(`.phrase-play-btn[data-phrase-id="${phraseId}"][data-action="compare"]`);
  if (compareBtn && compareBtn.dataset.playing === 'true') {
    compareBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
        <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    compareBtn.dataset.playing = 'false';
    const phrase = { id: phraseId };
    compareBtn.onclick = (e) => {
      e.stopPropagation();
      handlePhrasePlayback(phraseId, 'compare', phrase);
    };
  }
}

// ========== 영상 전체 shadowing 녹음 기능 ==========

// 영상 전체 shadowing 녹음 시작
async function startVideoRecording() {
  if (!currentVideoId) {
    showToast('영상 정보를 가져올 수 없습니다');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    videoMediaRecorder = new MediaRecorder(stream);
    videoAudioChunks = [];
    
    videoMediaRecorder.ondataavailable = (event) => {
      videoAudioChunks.push(event.data);
    };
    
    videoMediaRecorder.onstop = async () => {
      const audioBlob = new Blob(videoAudioChunks, { type: 'audio/webm' });
      
      // MP3로 변환하여 저장 (실제로는 WebM으로 저장, MP3 변환은 복잡함)
      await saveVideoRecordingAsMP3(audioBlob);
      
      // 녹음 완료 후 버튼 복원
      elements.recordVideoBtn.style.display = 'flex';
      elements.stopRecordVideoBtn.style.display = 'none';
      isVideoRecording = false;

      showToast('녹음이 완료되었습니다');
    };

    videoMediaRecorder.start();
    isVideoRecording = true;

    // 녹음 버튼 숨기고 정지 버튼 표시
    elements.recordVideoBtn.style.display = 'none';
    elements.stopRecordVideoBtn.style.display = 'flex';

    showToast('녹음이 시작되었습니다');
  } catch (error) {
    console.error('녹음 시작 실패:', error);
    let errorMessage = '녹음 권한이 필요합니다';

    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = '마이크 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = '마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMessage = '마이크에 접근할 수 없습니다. 다른 프로그램에서 사용 중인지 확인해주세요.';
    }

    showToast(errorMessage);
    elements.recordVideoBtn.style.display = 'flex';
    elements.stopRecordVideoBtn.style.display = 'none';
  }
}

// 영상 전체 shadowing 녹음 종료
function stopVideoRecording() {
  if (videoMediaRecorder && isVideoRecording) {
    videoMediaRecorder.stop();
    videoMediaRecorder.stream.getTracks().forEach(track => track.stop());
    isVideoRecording = false;
  }
}

// 영상 전체 shadowing 녹음 파일 저장 (WebM 형식, MP3 변환은 복잡하므로 WebM으로 저장)
async function saveVideoRecordingAsMP3(audioBlob) {
  const timestamp = Date.now();
  const filename = `video_recording_${timestamp}.webm`;
  
  // Chrome Storage에 저장 (기존 녹음 DB와 분리)
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64data = reader.result;
    chrome.storage.local.get(['videoRecordings'], (result) => {
      const videoRecordings = result.videoRecordings || {};
      if (!videoRecordings[currentVideoId]) {
        videoRecordings[currentVideoId] = [];
      }
      
      const recordingData = {
        id: `rec_${timestamp}`,
        data: base64data,
        timestamp: timestamp,
        filename: filename,
        videoId: currentVideoId,
        videoUrl: currentVideoUrl,
        videoTitle: currentVideoTitle
      };
      
      videoRecordings[currentVideoId].push(recordingData);
      chrome.storage.local.set({ videoRecordings: videoRecordings });
    });
  };
  reader.readAsDataURL(audioBlob);
}

// 녹음파일 리스트 HTML 생성 및 새 탭으로 열기
function openRecordingsList() {
  chrome.storage.local.get(['videoRecordings'], (result) => {
    const videoRecordings = result.videoRecordings || {};
    
    // HTML 생성
    let html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>녹음파일 리스트</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      margin-bottom: 20px;
      color: #333;
    }
    .recordings-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .recording-item {
      display: flex;
      align-items: center;
      padding: 16px;
      background: #f9f9f9;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
      transition: all 0.2s;
    }
    .recording-item:hover {
      background: #f0f0f0;
      border-color: #ccc;
    }
    .video-title {
      flex: 1;
      font-weight: 500;
      color: #1976d2;
      cursor: pointer;
      text-decoration: none;
      margin-right: 16px;
    }
    .video-title:hover {
      text-decoration: underline;
    }
    .recording-file {
      flex: 1;
      color: #666;
      cursor: pointer;
      margin-right: 16px;
      padding: 8px 12px;
      background: #e3f2fd;
      border-radius: 4px;
      text-align: center;
      transition: background 0.2s;
    }
    .recording-file:hover {
      background: #bbdefb;
    }
    .recording-file.playing {
      background: #4caf50;
      color: white;
    }
    .delete-btn {
      padding: 8px 16px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .delete-btn:hover {
      background: #d32f2f;
    }
    .stop-btn {
      padding: 8px 16px;
      background: #ff9800;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-right: 8px;
      display: none;
    }
    .stop-btn.active {
      display: inline-block;
    }
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>녹음파일 리스트</h1>
    <div class="recordings-list" id="recordingsList">
`;
    
    let hasRecordings = false;
    let currentPlayingAudio = null;
    let currentPlayingId = null;
    
    // 모든 비디오의 녹음 파일을 리스트에 추가
    for (const videoId in videoRecordings) {
      const recordings = videoRecordings[videoId];
      for (const recording of recordings) {
        hasRecordings = true;
        html += `
      <div class="recording-item" data-recording-id="${recording.id}">
        <a href="${recording.videoUrl}" target="_blank" class="video-title">${recording.videoTitle || 'Unknown'}</a>
        <div class="recording-file" data-recording-id="${recording.id}" data-recording-data="${recording.data}">녹음파일 재생</div>
        <button class="stop-btn" data-recording-id="${recording.id}">정지</button>
        <button class="delete-btn" data-recording-id="${recording.id}" data-video-id="${videoId}">삭제</button>
      </div>
`;
      }
    }
    
    if (!hasRecordings) {
      html += `
      <div class="empty-state">
        <p>녹음된 파일이 없습니다.</p>
      </div>
`;
    }
    
    html += `
    </div>
  </div>
  <script>
    let currentPlayingAudio = null;
    let currentPlayingId = null;
    
    // 녹음파일 재생
    document.querySelectorAll('.recording-file').forEach(file => {
      file.addEventListener('click', function() {
        const recordingId = this.dataset.recordingId;
        const recordingData = this.dataset.recordingData;
        
        // 기존 재생 중지
        if (currentPlayingAudio) {
          currentPlayingAudio.pause();
          currentPlayingAudio = null;
          document.querySelectorAll('.recording-file').forEach(f => {
            f.classList.remove('playing');
            f.textContent = '녹음파일 재생';
          });
          document.querySelectorAll('.stop-btn').forEach(btn => {
            btn.classList.remove('active');
          });
        }
        
        // 새 녹음파일 재생
        const audio = new Audio(recordingData);
        currentPlayingAudio = audio;
        currentPlayingId = recordingId;
        
        this.classList.add('playing');
        this.textContent = '재생 중...';
        document.querySelector(\`.stop-btn[data-recording-id="\${recordingId}"]\`).classList.add('active');
        
        audio.onended = () => {
          this.classList.remove('playing');
          this.textContent = '녹음파일 재생';
          document.querySelector(\`.stop-btn[data-recording-id="\${recordingId}"]\`).classList.remove('active');
          currentPlayingAudio = null;
          currentPlayingId = null;
        };
        
        audio.play();
      });
    });
    
    // 정지 버튼
    document.querySelectorAll('.stop-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        if (currentPlayingAudio) {
          currentPlayingAudio.pause();
          currentPlayingAudio.currentTime = 0;
          currentPlayingAudio = null;
          document.querySelectorAll('.recording-file').forEach(f => {
            f.classList.remove('playing');
            f.textContent = '녹음파일 재생';
          });
          document.querySelectorAll('.stop-btn').forEach(b => {
            b.classList.remove('active');
          });
          currentPlayingId = null;
        }
      });
    });
    
    // Esc 키로 재생 중지
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && currentPlayingAudio) {
        currentPlayingAudio.pause();
        currentPlayingAudio.currentTime = 0;
        currentPlayingAudio = null;
        document.querySelectorAll('.recording-file').forEach(f => {
          f.classList.remove('playing');
          f.textContent = '녹음파일 재생';
        });
        document.querySelectorAll('.stop-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        currentPlayingId = null;
      }
    });
    
    // 삭제 버튼
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const recordingId = this.dataset.recordingId;
        const videoId = this.dataset.videoId;
        
        if (confirm('이 녹음파일을 삭제하시겠습니까?')) {
          // Chrome Extension API를 통해 삭제
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
              action: 'deleteVideoRecording',
              videoId: videoId,
              recordingId: recordingId
            }, (response) => {
              if (response?.success) {
                // 리스트에서 제거
                document.querySelector(\`.recording-item[data-recording-id="\${recordingId}"]\`).remove();
                
                // 재생 중이면 중지
                if (currentPlayingId === recordingId && currentPlayingAudio) {
                  currentPlayingAudio.pause();
                  currentPlayingAudio = null;
                  currentPlayingId = null;
                }
                
                // 리스트가 비었으면 메시지 표시
                if (document.querySelectorAll('.recording-item').length === 0) {
                  document.getElementById('recordingsList').innerHTML = '<div class="empty-state"><p>녹음된 파일이 없습니다.</p></div>';
                }
              } else {
                alert('삭제에 실패했습니다.');
              }
            });
          } else {
            alert('Chrome Extension API를 사용할 수 없습니다. 확장 프로그램이 활성화되어 있는지 확인해주세요.');
          }
        }
      });
    });
  </script>
</body>
</html>
`;
    
    // 새 탭으로 열기
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    chrome.tabs.create({ url: url });
  });
}

// 선택 저장 - 내용 입력창에 있는 내용을 저장
function saveSelectedContent() {
  const content = elements.contentInputTextarea?.value?.trim();

  if (!content) {
    showToast('저장할 내용이 없습니다');
    return;
  }

  if (!currentVideoId) {
    showToast('영상 정보를 가져올 수 없습니다');
    return;
  }

  const summaryData = {
    id: Date.now(),
    content: content,
    type: 'selected', // 선택 저장
    videoId: currentVideoId,
    videoTitle: currentVideoTitle,
    videoUrl: currentVideoUrl,
    createdAt: new Date().toISOString()
  };

  saveSummaryToStorage(summaryData, () => {
    showToast('선택한 내용이 저장되었습니다');
    elements.contentInputTextarea.value = '';
    loadSummaryPhrases();
  });
}

// 전체 저장 - 요약의 모든 페이지 내용을 저장
function saveFullSummary() {
  const fullSummary = summaryViewMode === 'original' ? summaryOriginalText : summaryTranslatedText;

  if (!fullSummary) {
    showToast('저장할 요약이 없습니다');
    return;
  }

  if (!currentVideoId) {
    showToast('영상 정보를 가져올 수 없습니다');
    return;
  }

  const summaryData = {
    id: Date.now(),
    content: fullSummary,
    type: 'full', // 전체 저장
    viewMode: summaryViewMode, // 'original' or 'translated'
    videoId: currentVideoId,
    videoTitle: currentVideoTitle,
    videoUrl: currentVideoUrl,
    createdAt: new Date().toISOString()
  };

  saveSummaryToStorage(summaryData, () => {
    showToast('전체 요약이 저장되었습니다');
    loadSummaryPhrases();
  });
}

// 요약을 저장소에 저장
function saveSummaryToStorage(summaryData, callback) {
  chrome.storage.local.get(['savedSummaries'], (result) => {
    const summaries = result.savedSummaries || {};
    const videoId = summaryData.videoId;

    if (!summaries[videoId]) {
      summaries[videoId] = [];
    }

    // 중복 체크 - 같은 타입과 같은 내용이 있으면 건너뛰기
    const isDuplicate = summaries[videoId].some(s =>
      s.type === summaryData.type && s.content === summaryData.content
    );

    if (isDuplicate) {
      showToast('이미 저장된 내용입니다');
      return;
    }

    summaries[videoId].push(summaryData);

    chrome.storage.local.set({ savedSummaries: summaries }, () => {
      if (callback) callback();
    });
  });
}

// 요약 저장소 불러오기
function loadSummaryPhrases() {
  if (currentMode !== 'summary') return;

  // 헤더 텍스트를 "저장된 요약"으로 변경하고 이번 페이지 버튼 숨기기
  const headerSpan = elements.videoPhrasesSection?.querySelector('.phrases-header > span');
  if (headerSpan) {
    headerSpan.textContent = '저장된 요약';
  }
  if (elements.currentPageFilterBtn) {
    elements.currentPageFilterBtn.style.display = 'none';
  }

  chrome.storage.local.get(['savedSummaries'], (result) => {
    const summaries = result.savedSummaries || {};
    const videoSummaries = summaries[currentVideoId] || [];

    // 영상 내 보관함 업데이트
    renderVideoSummaries(videoSummaries);
  });
}

// 영상 내 요약 보관함 렌더링
function renderVideoSummaries(summaries) {
  if (!elements.videoPhrasesList) return;

  // 요약 모드일 때만 업데이트
  if (currentMode !== 'summary') return;

  elements.videoPhrasesList.innerHTML = '';

  if (summaries.length === 0) {
    elements.videoPhrasesList.innerHTML = '<div class="phrases-empty">저장된 요약이 없습니다</div>';
    return;
  }

  summaries.forEach((summary) => {
    const item = document.createElement('div');
    item.className = 'phrase-item summary-mode';
    const hasRecording = summary.recordingUrl || summary.hasRecording;

    item.innerHTML = `
      <button class="phrase-delete-btn" data-id="${summary.id}" title="삭제">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="phrase-play-buttons summary-buttons">
        <button class="phrase-play-btn" data-summary-id="${summary.id}" data-action="record-summary" title="녹음">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
        </button>
        ${hasRecording ? `
        <button class="phrase-play-btn" data-summary-id="${summary.id}" data-action="play-summary-recording" title="녹음파일 재생">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" fill="currentColor"/>
          </svg>
        </button>
        ` : ''}
      </div>
      <div class="phrase-content">
        <div class="phrase-summary-text">${escapeHtml(summary.content)}</div>
        <div class="phrase-meta">
          <span class="phrase-type">${summary.type === 'full' ? '전체' : '선택'}</span>
          <span class="phrase-date">${new Date(summary.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    `;

    // 삭제 버튼 이벤트
    const deleteBtn = item.querySelector('.phrase-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSavedSummary(currentVideoId, summary.id);
    });

    // 녹음 버튼 이벤트
    const playButtons = item.querySelectorAll('.phrase-play-btn');
    playButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const summaryId = parseInt(btn.dataset.summaryId);
        handleSummaryPlayback(summaryId, action, summary, btn);
      });
    });

    // 클릭 시 내용 입력창에 복사
    const phraseContent = item.querySelector('.phrase-content');
    phraseContent.addEventListener('click', (e) => {
      if (e.target.closest('.phrase-delete-btn') || e.target.closest('.phrase-play-btn')) return;
      if (elements.contentInputTextarea) {
        elements.contentInputTextarea.value = summary.content;
        elements.contentInputTextarea.style.height = 'auto';
        elements.contentInputTextarea.style.height = Math.min(elements.contentInputTextarea.scrollHeight, 200) + 'px';
        showToast('내용이 입력창에 복사되었습니다');
      }
    });

    elements.videoPhrasesList.appendChild(item);
  });
}

// 요약 재생/녹음 처리
let summaryRecordingSummary = null;
let summaryRecordingButton = null;

function handleSummaryPlayback(summaryId, action, summary, button) {
  if (action === 'record-summary') {
    startSummaryRecording(summary, button);
  } else if (action === 'play-summary-recording') {
    playSummaryRecording(summary, button);
  }
}

async function startSummaryRecording(summary, button) {
  if (isRecording) {
    stopSummaryRecordingSession();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    summaryRecordingSummary = summary;
    summaryRecordingButton = button;

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

      // 녹음 파일 저장
      await saveSummaryRecording(audioBlob, summaryRecordingSummary);

      // 버튼 복원
      if (summaryRecordingButton) {
        summaryRecordingButton.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
        `;
        summaryRecordingButton.classList.remove('recording');
      }

      showToast('녹음이 저장되었습니다');
      loadSummaryPhrases();

      isRecording = false;
      summaryRecordingSummary = null;
      summaryRecordingButton = null;
    };

    mediaRecorder.start();
    isRecording = true;

    if (button) {
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="8" y="8" width="8" height="8" fill="currentColor"/>
        </svg>
      `;
      button.classList.add('recording');
    }

    showToast('녹음 중... 버튼을 다시 클릭하면 종료됩니다');
  } catch (error) {
    console.error('녹음 시작 실패:', error);
    showToast('마이크 권한이 필요합니다');
  }
}

function stopSummaryRecordingSession() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
}

async function saveSummaryRecording(audioBlob, summary) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const audioData = reader.result;

      chrome.storage.local.get(['savedSummaries'], (result) => {
        const summaries = result.savedSummaries || {};

        if (summaries[currentVideoId]) {
          const targetSummary = summaries[currentVideoId].find(s => s.id === summary.id);
          if (targetSummary) {
            targetSummary.recordingUrl = audioData;
            targetSummary.hasRecording = true;

            chrome.storage.local.set({ savedSummaries: summaries }, () => {
              resolve();
            });
            return;
          }
        }
        resolve();
      });
    };
    reader.readAsDataURL(audioBlob);
  });
}

function playSummaryRecording(summary, button) {
  if (!summary.recordingUrl) {
    showToast('녹음 파일이 없습니다');
    return;
  }

  if (currentRecordingAudio) {
    currentRecordingAudio.pause();
    currentRecordingAudio = null;
    if (button) {
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" fill="currentColor"/>
        </svg>
      `;
    }
    return;
  }

  const audio = new Audio(summary.recordingUrl);
  currentRecordingAudio = audio;

  if (button) {
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="6" y="6" width="4" height="12" fill="currentColor"/>
        <rect x="14" y="6" width="4" height="12" fill="currentColor"/>
      </svg>
    `;
  }

  audio.play();

  audio.onended = () => {
    currentRecordingAudio = null;
    if (button) {
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" fill="currentColor"/>
        </svg>
      `;
    }
  };
}

// 저장된 요약 삭제
function deleteSavedSummary(videoId, summaryId) {
  chrome.storage.local.get(['savedSummaries'], (result) => {
    const summaries = result.savedSummaries || {};

    if (summaries[videoId]) {
      summaries[videoId] = summaries[videoId].filter(s => s.id !== summaryId);

      if (summaries[videoId].length === 0) {
        delete summaries[videoId];
      }

      chrome.storage.local.set({ savedSummaries: summaries }, () => {
        showToast('삭제되었습니다');
        loadSummaryPhrases();
      });
    }
  });
}

