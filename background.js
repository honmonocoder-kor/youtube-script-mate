// Background service worker for YouTube Script Mate Chrome Extension

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('YouTube Script Mate extension installed');

    // Set default values
    chrome.storage.sync.set({
      settings: {
        sourceLang: 'EN',
        targetLang: 'KO',
        myLang: 'auto',
        apiProvider: 'gemini',
        apiModel: '',
        apiKey: '',
        seekTime: 5,
        repeatKey: 'R',
        loopPlayback: false
      }
    });

    chrome.storage.local.set({
      savedPhrases: {}
    });
  }

  // Enable side panel to be opened by clicking the action icon
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Error setting panel behavior:', error));
});

// Handle action click to open side panel
chrome.action.onClicked.addListener(async (tab) => {
  try {
    const window = await chrome.windows.getCurrent();
    await chrome.sidePanel.open({ windowId: window.id });
  } catch (error) {
    console.error('Error opening side panel:', error);
  }
});

// Handle messages from content script and sidepanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true; // Always return true for async response
});

// Async message handler
async function handleMessage(request, sender, sendResponse) {
  try {
    // Settings
    if (request.action === "getSettings") {
      chrome.storage.sync.get(['settings'], (result) => {
        sendResponse(result.settings || { sourceLang: 'EN', targetLang: 'KO', myLang: 'auto', apiProvider: 'gemini', apiModel: '', apiKey: '', seekTime: 5, repeatKey: 'R', loopPlayback: false });
      });
      return;
    }

    if (request.action === "saveSettings") {
      chrome.storage.sync.set({ settings: request.settings }, () => {
        sendResponse({ success: true });
      });
      return;
    }

    // Translation with context using AI
    if (request.action === "translateWithContext") {
      const provider = request.apiProvider || detectProviderFromModel(request.apiModel);
      const result = await translateWithAI(
        request.text,
        request.context,
        request.sourceLang,
        request.targetLang,
        request.apiKey,
        provider,
        request.apiModel || ''
      );
      sendResponse(result);
      return;
    }

    // Translate batch (multiple texts at once)
    if (request.action === "translateBatch") {
      const provider = request.apiProvider || detectProviderFromModel(request.apiModel);
      const result = await translateBatchWithAI(
        request.texts,
        request.sourceLang,
        request.targetLang,
        request.apiKey,
        provider,
        request.apiModel || ''
      );
      sendResponse(result);
      return;
    }

    // Summarize transcript using AI
    if (request.action === "summarize") {
      const provider = request.apiProvider || detectProviderFromModel(request.apiModel);
      const result = await summarizeWithAI(
        request.text,
        request.targetLang,
        request.apiKey,
        provider,
        request.apiModel || ''
      );
      sendResponse(result);
      return;
    }

    // Summarize transcript in original language (no translation)
    if (request.action === "summarizeOriginal") {
      const provider = request.apiProvider || detectProviderFromModel(request.apiModel);
      const result = await summarizeOriginalWithAI(
        request.text,
        request.apiKey,
        provider,
        request.apiModel || ''
      );
      sendResponse(result);
      return;
    }

    // Translate summary text
    if (request.action === "translateSummary") {
      const provider = request.apiProvider || detectProviderFromModel(request.apiModel);
      const result = await translateSummaryWithAI(
        request.text,
        request.targetLang,
        request.apiKey,
        provider,
        request.apiModel || ''
      );
      sendResponse(result);
      return;
    }

    // Get video state
    if (request.action === "getVideoState") {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tabs[0] && tabs[0].url && tabs[0].url.includes('youtube.com/watch')) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              const video = document.querySelector('video');
              if (video) {
                return {
                  currentTime: video.currentTime,
                  duration: video.duration,
                  isPlaying: !video.paused
                };
              }
              return null;
            }
          });

          if (results[0]?.result) {
            sendResponse({ success: true, ...results[0].result });
          } else {
            sendResponse({ success: false, error: 'Video not found' });
          }
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      } else {
        sendResponse({ success: false, error: 'Not on YouTube' });
      }
      return;
    }

    // Toggle play/pause
    if (request.action === "togglePlayPause") {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tabs[0]) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              const video = document.querySelector('video');
              if (video) {
                if (video.paused) {
                  video.play();
                } else {
                  video.pause();
                }
                return { isPlaying: !video.paused };
              }
              return null;
            }
          });

          if (results[0]?.result) {
            sendResponse({ success: true, ...results[0].result });
          } else {
            sendResponse({ success: false, error: 'Video not found' });
          }
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      }
      return;
    }

    // Save phrase
    if (request.action === "savePhrase") {
      await savePhrase(request.data);
      sendResponse({ success: true });
      return;
    }

    // Get phrases
    if (request.action === "getPhrases") {
      chrome.storage.local.get(['savedPhrases'], (result) => {
        sendResponse({ phrases: result.savedPhrases || {} });
      });
      return;
    }

    // Save phrases (update entire phrases object)
    if (request.action === "savePhrases") {
      chrome.storage.local.set({ savedPhrases: request.phrases }, () => {
        sendResponse({ success: true });
      });
      return;
    }

    // Video recordings (영상 전체 shadowing 녹음)
    if (request.action === "getVideoRecordings") {
      chrome.storage.local.get(['videoRecordings'], (result) => {
        sendResponse({ recordings: result.videoRecordings || {} });
      });
      return;
    }

    if (request.action === "deleteVideoRecording") {
      chrome.storage.local.get(['videoRecordings'], (result) => {
        const videoRecordings = result.videoRecordings || {};
        const { videoId, recordingId } = request;
        
        if (videoRecordings[videoId]) {
          videoRecordings[videoId] = videoRecordings[videoId].filter(r => r.id !== recordingId);
          if (videoRecordings[videoId].length === 0) {
            delete videoRecordings[videoId];
          }
          chrome.storage.local.set({ videoRecordings: videoRecordings }, () => {
            sendResponse({ success: true });
          });
        } else {
          sendResponse({ success: false, error: 'Recording not found' });
        }
      });
      return;
    }

    // Delete phrase
    if (request.action === "deletePhrase") {
      try {
        await deletePhrase(request.videoId, request.phraseId);
        sendResponse({ success: true });
      } catch (error) {
        console.error('Delete phrase error:', error);
        sendResponse({ success: false, error: error.message });
      }
      return;
    }

    // Get current tab
    if (request.action === "getCurrentTab") {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      sendResponse({ tab: tabs[0] || null });
      return;
    }

    // Extract transcript
    if (request.action === "extractTranscript") {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tabs[0] || !tabs[0].url || !tabs[0].url.includes('youtube.com/watch')) {
        sendResponse({ success: false, error: 'YouTube 영상 페이지가 아닙니다' });
        return;
      }

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: extractTranscriptFromPage
        });

        const data = results[0]?.result || [];
        if (data.length === 0) {
          sendResponse({ success: false, error: '스크립트를 찾을 수 없습니다. YouTube에서 "스크립트 표시" 버튼을 먼저 클릭하세요.' });
        } else {
          sendResponse({ success: true, data: data });
        }
      } catch (error) {
        console.error('Script execution error:', error);
        sendResponse({ success: false, error: error.message });
      }
      return;
    }

    // Seek video
    if (request.action === "seekVideo") {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tabs[0]) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (time) => {
              const video = document.querySelector('video');
              if (video) {
                const wasPaused = video.paused;
                video.currentTime = time;
                if (wasPaused) video.pause();
              }
            },
            args: [request.time]
          });
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      } else {
        sendResponse({ success: false, error: 'Tab not found' });
      }
      return;
    }

    // Open YouTube transcript panel
    if (request.action === "openYouTubeTranscriptPanel") {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tabs[0]) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              // 이미 세그먼트가 있는지 확인
              const existingSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
              if (existingSegments.length > 0) {
                return { success: true, alreadyOpen: true };
              }

              // "스크립트 표시" 버튼 찾기
              const transcriptButton = document.querySelector('button[aria-label="스크립트 표시"]') ||
                                      document.querySelector('button[aria-label="Show transcript"]') ||
                                      document.querySelector('ytd-video-description-transcript-section-renderer button') ||
                                      document.querySelector('#primary-button ytd-button-renderer button');

              if (transcriptButton) {
                transcriptButton.click();
                return { success: true, opened: true };
              }

              return { success: false, error: 'Transcript button not found' };
            }
          });

          const result = results[0]?.result;
          if (result?.success) {
            // 패널이 열렸으면 세그먼트가 로드될 때까지 대기
            if (result.opened) {
              await new Promise(resolve => setTimeout(resolve, 800));
            }
            sendResponse({ success: true, alreadyOpen: result.alreadyOpen });
          } else {
            sendResponse({ success: false, error: result?.error || 'Failed to open transcript panel' });
          }
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      } else {
        sendResponse({ success: false, error: 'Tab not found' });
      }
      return;
    }

    // Click YouTube transcript segment to seek to exact time
    if (request.action === "clickYouTubeTranscriptSegment") {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tabs[0]) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (targetTime, targetText) => {
              // YouTube 스크립트 세그먼트 찾기
              const selectors = [
                'ytd-transcript-segment-renderer',
                'ytd-transcript-segment-list-renderer ytd-transcript-segment-renderer',
                'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"] ytd-transcript-segment-renderer',
                '#segments-container ytd-transcript-segment-renderer'
              ];

              let segments = [];
              for (const selector of selectors) {
                const found = document.querySelectorAll(selector);
                if (found.length > 0) {
                  segments = Array.from(found);
                  break;
                }
              }

              // 패널에서 찾기
              if (segments.length === 0) {
                const panel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]');
                if (panel) {
                  segments = Array.from(panel.querySelectorAll('ytd-transcript-segment-renderer'));
                }
              }

              // transcript renderer에서 찾기
              if (segments.length === 0) {
                const transcriptRenderer = document.querySelector('ytd-transcript-renderer');
                if (transcriptRenderer) {
                  segments = Array.from(transcriptRenderer.querySelectorAll('ytd-transcript-segment-renderer'));
                }
              }

              // 세그먼트가 없으면 스크립트 패널 열기 시도
              if (segments.length === 0) {
                // "스크립트 표시" 버튼 찾기
                const transcriptButton = document.querySelector('button[aria-label="스크립트 표시"]') ||
                                        document.querySelector('button[aria-label="Show transcript"]') ||
                                        document.querySelector('ytd-video-description-transcript-section-renderer button') ||
                                        document.querySelector('#primary-button ytd-button-renderer button');

                if (transcriptButton) {
                  transcriptButton.click();
                  return { success: false, error: 'Transcript panel opened, please retry' };
                }

                return { success: false, error: 'No transcript segments found' };
              }

              // 텍스트 정규화 함수
              const normalizeText = (text) => {
                return text
                  .toLowerCase()
                  .replace(/['']/g, "'")
                  .replace(/[""]/g, '"')
                  .replace(/\s+/g, ' ')
                  .trim();
              };

              // 타겟 텍스트와 일치하는 세그먼트 찾기
              let matchingSegment = null;
              let bestMatchScore = 0;

              if (targetText) {
                const normalizedTargetText = normalizeText(targetText);

                for (const seg of segments) {
                  const textEl = seg.querySelector('.segment-text') ||
                                seg.querySelector('[class*="segment-text"]') ||
                                seg.querySelector('yt-formatted-string.segment-text');

                  if (textEl) {
                    const segmentText = normalizeText(textEl.innerText);
                    let matchScore = 0;

                    if (segmentText === normalizedTargetText) {
                      matchScore = 100;
                    } else if (normalizedTargetText.startsWith(segmentText)) {
                      matchScore = 80 + (segmentText.length / normalizedTargetText.length) * 15;
                    } else if (normalizedTargetText.includes(segmentText) && segmentText.length > 10) {
                      const position = normalizedTargetText.indexOf(segmentText);
                      matchScore = 60 - (position / normalizedTargetText.length) * 30;
                    } else if (segmentText.includes(normalizedTargetText)) {
                      matchScore = 70;
                    }

                    if (matchScore > bestMatchScore) {
                      bestMatchScore = matchScore;
                      matchingSegment = seg;
                      if (matchScore === 100) break;
                    }
                  }
                }
              }

              // 텍스트 매칭 실패시 시간 기반 매칭
              if (!matchingSegment || bestMatchScore < 50) {
                let closestSegment = null;
                let minDiff = Infinity;

                for (const seg of segments) {
                  let segmentTime = 0;
                  const timestampEl = seg.querySelector('.segment-timestamp') ||
                                    seg.querySelector('[class*="timestamp"]') ||
                                    seg.querySelector('div.segment-timestamp');
                  if (timestampEl) {
                    const timeStr = timestampEl.innerText.trim();
                    const parts = timeStr.split(':').map(p => parseInt(p) || 0);
                    if (parts.length === 2) {
                      segmentTime = parts[0] * 60 + parts[1];
                    } else if (parts.length === 3) {
                      segmentTime = parts[0] * 3600 + parts[1] * 60 + parts[2];
                    }
                  }

                  if (segmentTime > 0) {
                    const diff = Math.abs(segmentTime - targetTime);
                    if (diff < minDiff) {
                      minDiff = diff;
                      closestSegment = seg;
                    }
                  }
                }

                if (!matchingSegment || bestMatchScore < 50) {
                  matchingSegment = closestSegment;
                }
              }

              // 매칭된 세그먼트 클릭
              if (matchingSegment) {
                // 내부 div.segment[role="button"] 클릭 (YouTube의 실제 클릭 대상)
                const segmentButton = matchingSegment.querySelector('div.segment[role="button"]') ||
                                     matchingSegment.querySelector('[role="button"]') ||
                                     matchingSegment.querySelector('div.segment');

                if (segmentButton) {
                  segmentButton.focus();
                  segmentButton.click();
                  return { success: true };
                }

                // 폴백: 세그먼트 자체 클릭
                matchingSegment.click();
                return { success: true };
              }

              return { success: false, error: 'No matching segment found' };
            },
            args: [request.time, request.text || '']
          });

          const result = results[0]?.result;
          if (result?.success) {
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: result?.error || 'Failed to click segment' });
          }
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      } else {
        sendResponse({ success: false, error: 'Tab not found' });
      }
      return;
    }

    // Get YouTube segment time by clicking and restoring position (for repeat range)
    if (request.action === "getYouTubeSegmentTime") {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tabs[0]) {
        try {
          // 1단계: 현재 비디오 상태 저장
          const stateResults = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              const video = document.querySelector('video');
              return {
                originalTime: video ? video.currentTime : 0,
                wasPaused: video ? video.paused : true
              };
            }
          });

          const originalState = stateResults[0]?.result || { originalTime: 0, wasPaused: true };

          // 2단계: 세그먼트 클릭
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (targetTime, targetText) => {
              const selectors = [
                'ytd-transcript-segment-renderer',
                'ytd-transcript-segment-list-renderer ytd-transcript-segment-renderer',
                'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"] ytd-transcript-segment-renderer'
              ];

              let segments = [];
              for (const selector of selectors) {
                const found = document.querySelectorAll(selector);
                if (found.length > 0) {
                  segments = Array.from(found);
                  break;
                }
              }

              // 세그먼트가 없으면 스크립트 패널 열기 시도
              if (segments.length === 0) {
                const transcriptButton = document.querySelector('button[aria-label="스크립트 표시"]') ||
                                        document.querySelector('button[aria-label="Show transcript"]') ||
                                        document.querySelector('ytd-video-description-transcript-section-renderer button');

                if (transcriptButton) {
                  transcriptButton.click();
                  return { success: false, panelOpened: true };
                }
                return { success: false };
              }

              const normalizeText = (text) => {
                return text.toLowerCase().replace(/['']/g, "'").replace(/[""]/g, '"').replace(/\s+/g, ' ').trim();
              };

              let matchingSegment = null;
              let bestMatchScore = 0;

              if (targetText) {
                const normalizedTargetText = normalizeText(targetText);

                for (const seg of segments) {
                  const textEl = seg.querySelector('.segment-text') ||
                                seg.querySelector('[class*="segment-text"]') ||
                                seg.querySelector('yt-formatted-string.segment-text');

                  if (textEl) {
                    const segmentText = normalizeText(textEl.innerText);
                    let matchScore = 0;

                    if (segmentText === normalizedTargetText) {
                      matchScore = 100;
                    } else if (normalizedTargetText.startsWith(segmentText)) {
                      matchScore = 80 + (segmentText.length / normalizedTargetText.length) * 15;
                    } else if (segmentText.includes(normalizedTargetText)) {
                      matchScore = 70;
                    }

                    if (matchScore > bestMatchScore) {
                      bestMatchScore = matchScore;
                      matchingSegment = seg;
                      if (matchScore === 100) break;
                    }
                  }
                }
              }

              // 시간 기반 폴백
              if (!matchingSegment || bestMatchScore < 50) {
                let closestSegment = null;
                let minDiff = Infinity;

                for (const seg of segments) {
                  const timestampEl = seg.querySelector('.segment-timestamp');
                  if (timestampEl) {
                    const timeStr = timestampEl.innerText.trim();
                    const parts = timeStr.split(':').map(p => parseInt(p) || 0);
                    let segmentTime = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];

                    const diff = Math.abs(segmentTime - targetTime);
                    if (diff < minDiff) {
                      minDiff = diff;
                      closestSegment = seg;
                    }
                  }
                }

                if (!matchingSegment || bestMatchScore < 50) {
                  matchingSegment = closestSegment;
                }
              }

              if (matchingSegment) {
                const segmentButton = matchingSegment.querySelector('div.segment[role="button"]') ||
                                     matchingSegment.querySelector('[role="button"]') ||
                                     matchingSegment.querySelector('div.segment');
                if (segmentButton) {
                  segmentButton.focus();
                  segmentButton.click();
                  return { success: true };
                }
              }

              return { success: false };
            },
            args: [request.time, request.text || '']
          });

          // 3단계: 150ms 대기 후 새 시간 가져오기
          await new Promise(resolve => setTimeout(resolve, 150));

          const timeResults = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              const video = document.querySelector('video');
              return video ? video.currentTime : 0;
            }
          });

          const exactTime = timeResults[0]?.result || 0;

          // 4단계: 원래 위치로 복귀
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (originalTime, wasPaused) => {
              const video = document.querySelector('video');
              if (video) {
                video.currentTime = originalTime;
                if (wasPaused) {
                  video.pause();
                }
              }
            },
            args: [originalState.originalTime, originalState.wasPaused]
          });

          sendResponse({ success: true, exactTime: exactTime });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      } else {
        sendResponse({ success: false, error: 'Tab not found' });
      }
      return;
    }

    // Play video
    if (request.action === "playVideo") {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              const video = document.querySelector('video');
              if (video) {
                video.play();
              }
            }
          });
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      } else {
        sendResponse({ success: false, error: 'Tab not found' });
      }
      return;
    }

    // Pause video
    if (request.action === "pauseVideo") {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              const video = document.querySelector('video');
              if (video) {
                video.pause();
              }
            }
          });
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      } else {
        sendResponse({ success: false, error: 'Tab not found' });
      }
      return;
    }

    // Set playback rate
    if (request.action === "setPlaybackRate") {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (rate) => {
              const video = document.querySelector('video');
              if (video) {
                video.playbackRate = rate;
              }
            },
            args: [request.rate]
          });
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      } else {
        sendResponse({ success: false, error: 'Tab not found' });
      }
      return;
    }

    sendResponse({ success: false, error: 'Unknown action' });
  } catch (error) {
    console.error('Message handler error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Function to be injected into the page to auto-open transcript and extract
async function extractTranscriptFromPage() {
  console.log('YouTube Script Mate: Starting transcript extraction...');

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  function findSegments() {
    const selectors = [
      'ytd-transcript-segment-renderer',
      'ytd-transcript-segment-list-renderer ytd-transcript-segment-renderer',
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"] ytd-transcript-segment-renderer',
      '#segments-container ytd-transcript-segment-renderer'
    ];

    for (const selector of selectors) {
      const found = document.querySelectorAll(selector);
      if (found.length > 0) {
        console.log(`YouTube Script Mate: Found ${found.length} segments with selector: ${selector}`);
        return found;
      }
    }

    const panel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]');
    if (panel) {
      const segs = panel.querySelectorAll('ytd-transcript-segment-renderer');
      if (segs.length > 0) {
        console.log(`YouTube Script Mate: Found ${segs.length} segments in engagement panel`);
        return segs;
      }
    }

    const transcriptRenderer = document.querySelector('ytd-transcript-renderer');
    if (transcriptRenderer) {
      const segs = transcriptRenderer.querySelectorAll('ytd-transcript-segment-renderer');
      if (segs.length > 0) {
        console.log(`YouTube Script Mate: Found ${segs.length} segments in transcript renderer`);
        return segs;
      }
    }

    return [];
  }

  async function openTranscriptPanel() {
    console.log('YouTube Script Mate: Trying to open transcript panel...');

    const existingPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]');
    if (existingPanel && existingPanel.offsetParent !== null) {
      console.log('YouTube Script Mate: Transcript panel already open');
      return true;
    }

    const expandBtn = document.querySelector('tp-yt-paper-button#expand') ||
                      document.querySelector('#expand') ||
                      document.querySelector('[aria-label="더보기"]') ||
                      document.querySelector('ytd-text-inline-expander #expand');

    if (expandBtn) {
      console.log('YouTube Script Mate: Found expand button, clicking...');
      expandBtn.click();
      await wait(500);
    }

    const transcriptButtonSelectors = [
      'button[aria-label="스크립트 표시"]',
      'ytd-button-renderer button[aria-label="스크립트 표시"]',
      'button[aria-label="Show transcript"]',
      'ytd-button-renderer button[aria-label="Show transcript"]',
      '#description ytd-button-renderer button',
      '#info-contents ytd-button-renderer button',
      'ytd-menu-renderer yt-button-shape button'
    ];

    for (const selector of transcriptButtonSelectors) {
      const buttons = document.querySelectorAll(selector);
      for (const btn of buttons) {
        const text = btn.innerText || btn.getAttribute('aria-label') || '';
        if (text.includes('스크립트') || text.toLowerCase().includes('transcript')) {
          console.log('YouTube Script Mate: Found transcript button, clicking...');
          btn.click();
          await wait(1000);

          const panel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]');
          if (panel) {
            console.log('YouTube Script Mate: Transcript panel opened successfully');
            return true;
          }
        }
      }
    }

    const engagementButtons = document.querySelectorAll('#secondary-inner ytd-button-renderer button, #below ytd-button-renderer button');
    for (const btn of engagementButtons) {
      const text = btn.innerText || btn.getAttribute('aria-label') || '';
      if (text.includes('스크립트') || text.toLowerCase().includes('transcript')) {
        console.log('YouTube Script Mate: Found engagement transcript button');
        btn.click();
        await wait(1000);
        return true;
      }
    }

    const menuButton = document.querySelector('#top-level-buttons-computed ytd-menu-renderer yt-icon-button button') ||
                       document.querySelector('ytd-menu-renderer #button');
    if (menuButton) {
      console.log('YouTube Script Mate: Trying menu approach...');
      menuButton.click();
      await wait(500);

      const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer, tp-yt-paper-item');
      for (const item of menuItems) {
        const text = item.innerText || '';
        if (text.includes('스크립트') || text.toLowerCase().includes('transcript')) {
          console.log('YouTube Script Mate: Found transcript in menu');
          item.click();
          await wait(1000);
          return true;
        }
      }

      document.body.click();
    }

    console.log('YouTube Script Mate: Could not find transcript button');
    return false;
  }

  let segments = findSegments();

  if (segments.length === 0) {
    const opened = await openTranscriptPanel();
    if (opened) {
      await wait(1500);
      segments = findSegments();
    }
  }

  if (segments.length === 0) {
    console.log('YouTube Script Mate: No transcript segments found after all attempts');
    return [];
  }

  // Extract raw data from segments
  const rawSegments = Array.from(segments).map(seg => {
    const timestampEl = seg.querySelector('.segment-timestamp') ||
                        seg.querySelector('[class*="timestamp"]') ||
                        seg.querySelector('div.segment-timestamp');

    const textEl = seg.querySelector('.segment-text') ||
                   seg.querySelector('[class*="segment-text"]') ||
                   seg.querySelector('yt-formatted-string.segment-text');

    const timeStr = timestampEl ? timestampEl.innerText.trim() : '0:00';
    const text = textEl ? textEl.innerText.trim() : '';

    // 밀리초 단위 시간 정보 추출
    let timeSeconds = 0;
    
    // 방법 1: 세그먼트 요소의 모든 속성에서 시간 정보 찾기
    // YouTube는 자막 세그먼트에 다양한 속성으로 시간 정보를 저장할 수 있음
    const allAttributes = Array.from(seg.attributes).map(attr => ({
      name: attr.name,
      value: attr.value
    }));
    
    // data-start-time, start-time, startTime 등 다양한 속성명 확인
    for (const attr of allAttributes) {
      if (attr.name.toLowerCase().includes('start') && attr.name.toLowerCase().includes('time')) {
        const timeValue = parseFloat(attr.value);
        if (!isNaN(timeValue) && timeValue > 0) {
          timeSeconds = timeValue;
          break;
        }
      }
    }
    
    // 방법 2: timestamp 버튼의 실제 동작 분석
    if (!timeSeconds) {
      // 세그먼트 내의 모든 버튼 요소 확인
      const buttons = seg.querySelectorAll('button');
      for (const button of buttons) {
        // onclick 속성에서 시간 추출
        const onclick = button.getAttribute('onclick');
        if (onclick) {
          // seekTo(123.456) 형식
          const seekToMatch = onclick.match(/seekTo\(([\d.]+)\)/);
          if (seekToMatch) {
            timeSeconds = parseFloat(seekToMatch[1]);
            break;
          }
        }
        
        // href 속성에서 시간 추출
        if (!timeSeconds) {
          const href = button.getAttribute('href');
          if (href) {
            // ?t=123.456 또는 &t=123.456 형식
            const hrefMatch = href.match(/[?&]t=([\d.]+)/);
            if (hrefMatch) {
              timeSeconds = parseFloat(hrefMatch[1]);
              break;
            }
          }
        }
        
        // data 속성에서 시간 추출
        if (!timeSeconds) {
          const dataTime = button.getAttribute('data-time') ||
                          button.getAttribute('data-start-time') ||
                          button.getAttribute('data-start');
          if (dataTime) {
            const parsed = parseFloat(dataTime);
            if (!isNaN(parsed) && parsed > 0) {
              timeSeconds = parsed;
              break;
            }
          }
        }
      }
      
      // timestampEl 자체가 버튼인 경우
      if (!timeSeconds && timestampEl && timestampEl.tagName === 'BUTTON') {
        const onclick = timestampEl.getAttribute('onclick');
        if (onclick) {
          const seekToMatch = onclick.match(/seekTo\(([\d.]+)\)/);
          if (seekToMatch) {
            timeSeconds = parseFloat(seekToMatch[1]);
          }
        }
      }
    }
    
    // 방법 3: 세그먼트 요소의 이벤트 리스너에서 시간 정보 추출 시도
    // YouTube는 이벤트 리스너를 통해 시간 정보를 전달할 수 있음
    if (!timeSeconds) {
      // 세그먼트 요소의 모든 속성 재확인 (대소문자 구분 없이)
      for (const attr of allAttributes) {
        const attrName = attr.name.toLowerCase();
        if ((attrName.includes('time') || attrName.includes('start')) && 
            !attrName.includes('class') && !attrName.includes('id')) {
          const timeValue = parseFloat(attr.value);
          if (!isNaN(timeValue) && timeValue > 0 && timeValue < 86400) { // 24시간 이내
            timeSeconds = timeValue;
            break;
          }
        }
      }
    }
    
    // 방법 4: timeStr에서 파싱 (밀리초 포함 형식 지원)
    if (!timeSeconds || timeSeconds === 0) {
      // 시간 문자열이 "MM:SS.mmm" 또는 "HH:MM:SS.mmm" 형식인지 확인
      const timeWithMs = timeStr.match(/^(\d+):(\d+)(?:\.(\d+))?$/);
      if (timeWithMs) {
        const minutes = parseInt(timeWithMs[1], 10);
        const seconds = parseInt(timeWithMs[2], 10);
        const milliseconds = timeWithMs[3] ? parseFloat('0.' + timeWithMs[3]) : 0;
        timeSeconds = minutes * 60 + seconds + milliseconds;
      } else {
        // 기존 방식: "MM:SS" 또는 "HH:MM:SS" 형식
        const parts = timeStr.split(':').map(p => parseFloat(p));
        if (parts.length === 3) {
          timeSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
          timeSeconds = parts[0] * 60 + parts[1];
        }
      }
    }

    return { timeSeconds, text, timeStr };
  }).filter(item => item.text.length > 0);

  console.log(`YouTube Script Mate: Extracted ${rawSegments.length} raw transcript items`);

  // Merge segments into complete sentences
  // 문장 끝 패턴: 마침표, 느낌표, 물음표로 끝나는 경우
  const sentenceEndRegex = /[.!?][\s]*$/;
  const mergedSentences = [];

  // 최대 세그먼트 병합 수 (너무 많은 세그먼트가 합쳐지지 않도록)
  const MAX_MERGE_COUNT = 10;
  // 최대 문자 수 (너무 긴 문장 방지)
  const MAX_CHAR_LENGTH = 300;

  let currentSentence = {
    timeSeconds: 0,
    timeStr: '',
    text: '',
    endTimeSeconds: 0,
    segmentCount: 0
  };

  // 헬퍼 함수: 현재 문장 저장
  const pushCurrentSentence = (nextSegmentTime) => {
    if (currentSentence.text.trim() !== '') {
      if (nextSegmentTime) {
        currentSentence.endTimeSeconds = nextSegmentTime;
      } else if (currentSentence.endTimeSeconds === 0) {
        const wordCount = currentSentence.text.split(/\s+/).length;
        const estimatedDuration = wordCount / 2.5;
        currentSentence.endTimeSeconds = currentSentence.timeSeconds + Math.max(estimatedDuration, 1);
      }
      currentSentence.text = currentSentence.text.replace(/\s+/g, ' ').trim();
      mergedSentences.push({
        timeSeconds: currentSentence.timeSeconds,
        timeStr: currentSentence.timeStr,
        text: currentSentence.text,
        endTimeSeconds: currentSentence.endTimeSeconds
      });
    }
    currentSentence = {
      timeSeconds: 0,
      timeStr: '',
      text: '',
      endTimeSeconds: 0,
      segmentCount: 0
    };
  };

  // 세그먼트 중간의 문장 경계를 찾는 정규식 (마침표/느낌표/물음표 + 공백 + 대문자)
  const sentenceBoundaryRegex = /([.!?])\s+(?=[A-Z])/g;

  for (let i = 0; i < rawSegments.length; i++) {
    const segment = rawSegments[i];
    const nextSegmentTime = i < rawSegments.length - 1 ? rawSegments[i + 1].timeSeconds : null;

    // 세그먼트 텍스트를 문장 경계로 분리
    // 예: "level. Take for example" → ["level.", "Take for example"]
    const parts = [];
    let lastIndex = 0;
    let match;

    sentenceBoundaryRegex.lastIndex = 0;
    while ((match = sentenceBoundaryRegex.exec(segment.text)) !== null) {
      // 마침표까지 포함한 부분
      parts.push(segment.text.substring(lastIndex, match.index + 1));
      lastIndex = match.index + match[0].length - (match[0].length - 1 - match[1].length);
      // 공백 이후부터 다음 부분 시작
      lastIndex = match.index + match[1].length + 1;
      while (lastIndex < segment.text.length && segment.text[lastIndex] === ' ') {
        lastIndex++;
      }
    }
    // 나머지 부분 추가
    if (lastIndex < segment.text.length) {
      parts.push(segment.text.substring(lastIndex));
    }

    // 분리된 부분이 없으면 전체 텍스트를 하나의 부분으로
    if (parts.length === 0) {
      parts.push(segment.text);
    }

    // 각 부분을 처리
    for (let j = 0; j < parts.length; j++) {
      const part = parts[j].trim();
      if (part.length === 0) continue;

      // 새 문장 시작
      if (currentSentence.text === '') {
        currentSentence.timeSeconds = segment.timeSeconds;
        currentSentence.timeStr = segment.timeStr;
        currentSentence.text = part;
        currentSentence.segmentCount = 1;
      } else {
        currentSentence.text += ' ' + part;
        currentSentence.segmentCount++;
      }

      // 문장 종료 조건 확인
      const endsWithPunctuation = sentenceEndRegex.test(part);
      const reachedMaxLimit = currentSentence.segmentCount >= MAX_MERGE_COUNT ||
                             currentSentence.text.length >= MAX_CHAR_LENGTH;

      if (endsWithPunctuation || reachedMaxLimit) {
        // 이 세그먼트에서 더 이상 처리할 부분이 없으면 다음 세그먼트 시간 사용
        const endTime = (j === parts.length - 1) ? nextSegmentTime : segment.timeSeconds;
        pushCurrentSentence(endTime);
      } else {
        // 다음 세그먼트의 시작 시간을 임시 종료 시간으로 설정
        if (nextSegmentTime) {
          currentSentence.endTimeSeconds = nextSegmentTime;
        }
      }
    }
  }

  // 마지막 문장 처리
  pushCurrentSentence(null);

  console.log(`YouTube Script Mate: Merged into ${mergedSentences.length} sentences`);
  return mergedSentences;
}

// Detect AI provider from model name
function detectProviderFromModel(model) {
  if (!model) return 'gemini'; // Default provider

  const modelLower = model.toLowerCase();

  // Gemini models
  if (modelLower.includes('gemini')) return 'gemini';

  // OpenAI models
  if (modelLower.includes('gpt') || modelLower.includes('o1') || modelLower.includes('o3') || modelLower.startsWith('text-') || modelLower.includes('davinci') || modelLower.includes('curie')) return 'openai';

  // Anthropic models
  if (modelLower.includes('claude')) return 'anthropic';

  // Cohere models
  if (modelLower.includes('command') || modelLower.includes('cohere')) return 'cohere';

  // Mistral models
  if (modelLower.includes('mistral') || modelLower.includes('mixtral') || modelLower.includes('codestral') || modelLower.includes('pixtral')) return 'mistral';

  // Perplexity models
  if (modelLower.includes('sonar') || modelLower.includes('pplx')) return 'perplexity';

  // Groq models (usually uses other model names but accessed via groq)
  if (modelLower.includes('groq') || modelLower.includes('llama') || modelLower.includes('mixtral-groq')) return 'groq';

  // DeepL (translation-only, typically no model name needed)
  if (modelLower.includes('deepl')) return 'deepl';

  // Papago (translation-only, typically no model name needed)
  if (modelLower.includes('papago')) return 'papago';

  // Azure (detected by endpoint format in API key)
  if (modelLower.includes('azure')) return 'azure';

  // Default to gemini
  return 'gemini';
}

// Multi-provider API call helper
async function callAI(provider, model, apiKey, prompt, temperature = 0.3, maxTokens = 1024) {
  if (!apiKey) {
    const providerNames = {
      'gemini': 'Google Gemini',
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'deepl': 'DeepL',
      'papago': 'Naver Papago',
      'azure': 'Azure OpenAI',
      'cohere': 'Cohere',
      'mistral': 'Mistral AI',
      'perplexity': 'Perplexity AI',
      'groq': 'Groq'
    };
    return { success: false, error: `${providerNames[provider] || provider} API 키를 설정에서 입력해주세요` };
  }

  try {
    let response, data, resultText;

    switch (provider) {
      case 'gemini':
        const geminiModel = model || 'gemini-2.5-flash-lite';
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature, maxOutputTokens: maxTokens }
          })
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }
        data = await response.json();
        resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        break;

      case 'openai':
        const openaiModel = model || 'gpt-4o-mini';
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: openaiModel,
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens: maxTokens
          })
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }
        data = await response.json();
        resultText = data.choices?.[0]?.message?.content?.trim();
        break;

      case 'anthropic':
        const anthropicModel = model || 'claude-3-5-haiku-20241022';
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: anthropicModel,
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }
        data = await response.json();
        resultText = data.content?.[0]?.text?.trim();
        break;

      case 'cohere':
        const cohereModel = model || 'command-r';
        response = await fetch('https://api.cohere.ai/v1/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: cohereModel,
            prompt: prompt,
            max_tokens: maxTokens,
            temperature
          })
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }
        data = await response.json();
        resultText = data.generations?.[0]?.text?.trim();
        break;

      case 'azure':
        // Azure OpenAI requires endpoint URL in API key format: endpoint|api-key
        // Or user can set just the API key and we use a default pattern
        const azureModel = model || 'gpt-4o';
        let azureEndpoint, azureApiKey;
        if (apiKey.includes('|')) {
          [azureEndpoint, azureApiKey] = apiKey.split('|');
        } else {
          return { success: false, error: 'Azure OpenAI는 "엔드포인트URL|API키" 형식으로 입력해주세요' };
        }
        response = await fetch(`${azureEndpoint}/openai/deployments/${azureModel}/chat/completions?api-version=2024-02-15-preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': azureApiKey
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens: maxTokens
          })
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }
        data = await response.json();
        resultText = data.choices?.[0]?.message?.content?.trim();
        break;

      case 'mistral':
        const mistralModel = model || 'mistral-large-latest';
        response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: mistralModel,
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens: maxTokens
          })
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || errorData.message || `API error: ${response.status}`);
        }
        data = await response.json();
        resultText = data.choices?.[0]?.message?.content?.trim();
        break;

      case 'perplexity':
        const perplexityModel = model || 'sonar';
        response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: perplexityModel,
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens: maxTokens
          })
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || errorData.detail || `API error: ${response.status}`);
        }
        data = await response.json();
        resultText = data.choices?.[0]?.message?.content?.trim();
        break;

      case 'groq':
        const groqModel = model || 'llama-3.3-70b-versatile';
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens: maxTokens
          })
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }
        data = await response.json();
        resultText = data.choices?.[0]?.message?.content?.trim();
        break;

      default:
        return { success: false, error: `지원하지 않는 AI 제공자입니다: ${provider}` };
    }

    if (resultText) {
      return { success: true, text: resultText };
    } else {
      return { success: false, error: '결과를 받지 못했습니다' };
    }
  } catch (error) {
    console.error(`${provider} API error:`, error);
    return { success: false, error: error.message };
  }
}

// DeepL Translation API
async function translateWithDeepL(text, sourceLang, targetLang, apiKey) {
  if (!apiKey) {
    return { success: false, error: 'DeepL API 키를 설정에서 입력해주세요' };
  }

  // DeepL language codes mapping
  const deeplLangMap = {
    'EN': 'EN',
    'KO': 'KO',
    'JA': 'JA',
    'ZH': 'ZH',
    'ES': 'ES',
    'FR': 'FR',
    'DE': 'DE'
  };

  const deeplTargetLang = deeplLangMap[targetLang] || targetLang;

  try {
    // Determine if it's a free or pro API key
    const baseUrl = apiKey.endsWith(':fx')
      ? 'https://api-free.deepl.com'
      : 'https://api.deepl.com';

    const response = await fetch(`${baseUrl}/v2/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `DeepL-Auth-Key ${apiKey}`
      },
      body: new URLSearchParams({
        text: text,
        target_lang: deeplTargetLang
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.translations && data.translations[0]) {
      return { success: true, text: data.translations[0].text };
    }
    return { success: false, error: '번역 결과를 받지 못했습니다' };
  } catch (error) {
    console.error('DeepL API error:', error);
    return { success: false, error: error.message };
  }
}

// Papago Translation API
async function translateWithPapago(text, sourceLang, targetLang, apiKey) {
  if (!apiKey) {
    return { success: false, error: 'Papago API 키를 설정에서 입력해주세요 (Client ID|Client Secret 형식)' };
  }

  // Papago language codes mapping
  const papagoLangMap = {
    'EN': 'en',
    'KO': 'ko',
    'JA': 'ja',
    'ZH': 'zh-CN',
    'ES': 'es',
    'FR': 'fr',
    'DE': 'de'
  };

  const papagoSourceLang = papagoLangMap[sourceLang] || sourceLang.toLowerCase();
  const papagoTargetLang = papagoLangMap[targetLang] || targetLang.toLowerCase();

  try {
    // API key format: ClientID|ClientSecret
    const [clientId, clientSecret] = apiKey.split('|');
    if (!clientId || !clientSecret) {
      return { success: false, error: 'Papago API 키는 "Client ID|Client Secret" 형식으로 입력해주세요' };
    }

    const response = await fetch('https://openapi.naver.com/v1/papago/n2mt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret
      },
      body: new URLSearchParams({
        source: papagoSourceLang,
        target: papagoTargetLang,
        text: text
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.errorMessage || `API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.message?.result?.translatedText) {
      return { success: true, text: data.message.result.translatedText };
    }
    return { success: false, error: '번역 결과를 받지 못했습니다' };
  } catch (error) {
    console.error('Papago API error:', error);
    return { success: false, error: error.message };
  }
}

// Translate with AI (multi-provider)
async function translateWithAI(text, context, sourceLang, targetLang, apiKey, provider, model) {
  const langNames = {
    'EN': 'English',
    'KO': '한국어',
    'JA': '日本語',
    'ZH': '中文',
    'ES': 'Español',
    'FR': 'Français',
    'DE': 'Deutsch'
  };

  // Handle translation-only APIs
  if (provider === 'deepl') {
    const result = await translateWithDeepL(text, sourceLang, targetLang, apiKey);
    if (result.success) {
      return { success: true, translatedText: result.text };
    }
    return result;
  }

  if (provider === 'papago') {
    const result = await translateWithPapago(text, sourceLang, targetLang, apiKey);
    if (result.success) {
      return { success: true, translatedText: result.text };
    }
    return result;
  }

  // For AI-based translation
  const sourceLangName = langNames[sourceLang] || sourceLang;
  const targetLangName = langNames[targetLang] || targetLang;

  const prompt = `You are a professional translator. Translate the following text from ${sourceLangName} to ${targetLangName}.

Context (surrounding sentences for better understanding):
"${context}"

Text to translate:
"${text}"

Provide ONLY the translation, without any explanation or additional text. The translation should be natural and accurate, considering the context provided.`;

  const result = await callAI(provider, model, apiKey, prompt, 0.3, 1024);
  if (result.success) {
    return { success: true, translatedText: result.text };
  }
  return result;
}

// Summarize transcript using AI (multi-provider)
async function summarizeWithAI(text, targetLang, apiKey, provider, model) {
  // DeepL and Papago cannot summarize - they are translation-only
  if (provider === 'deepl' || provider === 'papago') {
    return { success: false, error: `${provider === 'deepl' ? 'DeepL' : 'Papago'}는 번역 전용 서비스입니다. 요약 기능을 사용하려면 AI 기반 제공자(Gemini, OpenAI, Anthropic 등)를 선택해주세요.` };
  }

  const langNames = {
    'EN': 'English',
    'KO': '한국어',
    'JA': '日本語',
    'ZH': '中文',
    'ES': 'Español',
    'FR': 'Français',
    'DE': 'Deutsch'
  };

  const targetLangName = langNames[targetLang] || targetLang;

  const prompt = `You are a professional content summarizer. Summarize the following video transcript in ${targetLangName}.

Transcript:
"${text}"

Provide a comprehensive but concise summary that captures the main points, key arguments, and important details of the video. The summary should be:
- Written in ${targetLangName}
- Well-structured with clear paragraphs
- Easy to understand
- Between 200-500 words depending on the content length

Do not include any meta-commentary like "Here is the summary" - just provide the summary directly.`;

  const result = await callAI(provider, model, apiKey, prompt, 0.5, 2048);
  if (result.success) {
    return { success: true, summaryText: result.text };
  }
  return result;
}

// Summarize transcript in original language using AI (multi-provider)
// 3페이지 이내 분량으로 요약 (약 2400자, 페이지당 800자 기준)
async function summarizeOriginalWithAI(text, apiKey, provider, model) {
  // DeepL and Papago cannot summarize
  if (provider === 'deepl' || provider === 'papago') {
    return { success: false, error: `${provider === 'deepl' ? 'DeepL' : 'Papago'}는 번역 전용 서비스입니다. 요약 기능을 사용하려면 AI 기반 제공자를 선택해주세요.` };
  }

  const prompt = `You are a professional content summarizer. Summarize the following video transcript.

Transcript:
"${text}"

IMPORTANT RULES:
1. Summarize the content IN THE SAME LANGUAGE as the transcript. Do NOT translate.
   - If the transcript is in English, provide the summary in English.
   - If the transcript is in Korean, provide the summary in Korean.
   - If the transcript is in Japanese, provide the summary in Japanese.

2. LENGTH CONSTRAINT: The summary MUST be within 2000-2400 characters maximum (approximately 3 pages).
   - Be concise but comprehensive
   - Focus on the most important points only
   - If the content is short, the summary can be shorter

3. The summary should be:
   - Well-structured with clear paragraphs
   - Easy to understand
   - Capture main points and key arguments

Do not include any meta-commentary like "Here is the summary" - just provide the summary directly.`;

  const result = await callAI(provider, model, apiKey, prompt, 0.5, 2048);
  if (result.success) {
    return { success: true, summaryText: result.text };
  }
  return result;
}

// Translate batch (multiple texts at once) using AI (multi-provider)
async function translateBatchWithAI(texts, sourceLang, targetLang, apiKey, provider, model) {
  if (!texts || texts.length === 0) {
    return { success: true, translations: [] };
  }

  // For DeepL and Papago, translate each text individually
  if (provider === 'deepl') {
    const translations = [];
    for (const text of texts) {
      const result = await translateWithDeepL(text, sourceLang, targetLang, apiKey);
      if (result.success) {
        translations.push(result.text);
      } else {
        return result; // Return error if any translation fails
      }
    }
    return { success: true, translations };
  }

  if (provider === 'papago') {
    const translations = [];
    for (const text of texts) {
      const result = await translateWithPapago(text, sourceLang, targetLang, apiKey);
      if (result.success) {
        translations.push(result.text);
      } else {
        return result;
      }
    }
    return { success: true, translations };
  }

  // For AI-based providers, use batch translation
  const langNames = {
    'EN': 'English',
    'KO': '한국어',
    'JA': '日本語',
    'ZH': '中文',
    'ES': 'Español',
    'FR': 'Français',
    'DE': 'Deutsch'
  };

  const sourceLangName = langNames[sourceLang] || sourceLang;
  const targetLangName = langNames[targetLang] || targetLang;

  const numberedTexts = texts.map((text, i) => `${i + 1}. ${text}`).join('\n');

  const prompt = `You are a professional translator. Translate the following ${texts.length} sentences from ${sourceLangName} to ${targetLangName}.

Sentences to translate:
${numberedTexts}

IMPORTANT:
- Provide ONLY the translations, numbered exactly like the input (1., 2., 3., etc.)
- Each translation should be on its own line
- Do not add any explanation or additional text
- Keep the numbering format exactly as shown
- The translations should be natural and accurate`;

  const result = await callAI(provider, model, apiKey, prompt, 0.3, 8192);

  if (result.success) {
    const responseText = result.text;
    const lines = responseText.split('\n').filter(line => line.trim());
    const translations = [];

    for (let i = 0; i < texts.length; i++) {
      const pattern = new RegExp(`^${i + 1}\\.\\s*(.+)$`);
      let found = false;

      for (const line of lines) {
        const match = line.match(pattern);
        if (match) {
          translations.push(match[1].trim());
          found = true;
          break;
        }
      }

      if (!found && lines[i]) {
        const cleanLine = lines[i].replace(/^\d+\.\s*/, '').trim();
        translations.push(cleanLine);
      } else if (!found) {
        translations.push('');
      }
    }

    return { success: true, translations };
  }
  return result;
}

// Translate summary text using AI (multi-provider)
async function translateSummaryWithAI(text, targetLang, apiKey, provider, model) {
  // Handle translation-only APIs
  if (provider === 'deepl') {
    const result = await translateWithDeepL(text, 'EN', targetLang, apiKey);
    if (result.success) {
      return { success: true, translatedText: result.text };
    }
    return result;
  }

  if (provider === 'papago') {
    const result = await translateWithPapago(text, 'EN', targetLang, apiKey);
    if (result.success) {
      return { success: true, translatedText: result.text };
    }
    return result;
  }

  const langNames = {
    'EN': 'English',
    'KO': '한국어',
    'JA': '日本語',
    'ZH': '中文',
    'ES': 'Español',
    'FR': 'Français',
    'DE': 'Deutsch'
  };

  const targetLangName = langNames[targetLang] || targetLang;

  const prompt = `You are a professional translator. Translate the following summary text to ${targetLangName}.

Text to translate:
"${text}"

Provide ONLY the translation, without any explanation or additional text. The translation should be natural, accurate, and maintain the original meaning and structure.`;

  const result = await callAI(provider, model, apiKey, prompt, 0.3, 2048);
  if (result.success) {
    return { success: true, translatedText: result.text };
  }
  return result;
}

// Save phrase to local storage
async function savePhrase(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['savedPhrases'], (result) => {
      const phrases = result.savedPhrases || {};
      const videoId = data.videoId;

      if (!phrases[videoId]) {
        phrases[videoId] = [];
      }

      phrases[videoId].push({
        id: Date.now(),
        source: data.source,
        translation: data.translation || '',
        timestamp: data.timestamp,
        videoUrl: data.videoUrl,
        videoTitle: data.videoTitle,
        mode: data.mode || 'normal',
        createdAt: new Date().toISOString()
      });

      chrome.storage.local.set({ savedPhrases: phrases }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  });
}

// Delete phrase from local storage
async function deletePhrase(videoId, phraseId) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['savedPhrases'], (result) => {
      const phrases = result.savedPhrases || {};

      if (phrases[videoId]) {
        phrases[videoId] = phrases[videoId].filter(p => p.id !== phraseId);

        if (phrases[videoId].length === 0) {
          delete phrases[videoId];
        }
      }

      chrome.storage.local.set({ savedPhrases: phrases }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  });
}
