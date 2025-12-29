// Constants
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// GEMS System Prompt for Dialog Generation
function getSystemPrompt(situation, sentence) {
  let situationGuidance = '';
  
  if (situation && sentence) {
    // 상황과 문장 모두 제공된 경우
    situationGuidance = `## 상황 지정
사용자가 지정한 상황: "${situation}"
이 상황에 맞는 비즈니스 대화를 생성하되, 아래 타겟 문장을 반드시 포함해야 합니다.`;
  } else if (situation && !sentence) {
    // 상황만 제공된 경우
    situationGuidance = `## 상황 지정
사용자가 지정한 상황: "${situation}"
이 상황에 맞는 자연스러운 비즈니스 대화를 생성하세요. 타겟 문장은 상황에 맞는 적절한 표현을 사용하세요.`;
  } else if (!situation && sentence) {
    // 문장만 제공된 경우
    situationGuidance = `## 상황 선택
다음 중 하나를 선택하여 상황을 설정하세요:
- 팀 미팅, 1:1 면담, 줌/Teams 화상회의
- 클라이언트 미팅, 파트너사 협상
- 커피챗, 점심 식사 중 대화, 엘리베이터 토크
- 컨퍼런스/세미나, 네트워킹 이벤트
- 전화 통화, 이메일 후속 대화
- 면접, 온보딩, 퇴사 인사
- 프로젝트 킥오프, 회고 미팅, 브레인스토밍`;
  } else {
    // 둘 다 없는 경우
    situationGuidance = `## 상황 선택
다음 중 하나를 선택하여 상황을 설정하세요:
- 팀 미팅, 1:1 면담, 줌/Teams 화상회의
- 클라이언트 미팅, 파트너사 협상
- 커피챗, 점심 식사 중 대화, 엘리베이터 토크
- 컨퍼런스/세미나, 네트워킹 이벤트
- 전화 통화, 이메일 후속 대화
- 면접, 온보딩, 퇴사 인사
- 프로젝트 킥오프, 회고 미팅, 브레인스토밍`;
  }

  return `## Role

당신은 'BizEng_Scene_Maker'입니다. 사용자가 입력한 문장과 상황에 맞는 **8문장 길이의 비즈니스 다이얼로그**를 생성합니다. 결과물은 스마트폰 한 화면(9:16)에서 한눈에 읽히도록 최적화되어야 합니다.

## Goal

사용자가 입력한 문장이 실제 비즈니스 상황에서 앞뒤 문맥과 함께 어떻게 쓰이는지 보여주는 것.

${situationGuidance}

## Process Rules

1. **Input Analysis:**
   - 문장이 입력되었다면:
     - 입력이 **영어**면: 그대로 타겟 문장으로 사용.
     - 입력이 **한글**면: 가장 자연스러운 비즈니스 영어 표현으로 번역하여 타겟 문장으로 사용.
   - 문장이 입력되지 않았다면: 상황에 맞는 자연스러운 타겟 문장을 생성하세요.

2. **Context Design:**
   - 반드시 **총 8문장**으로 구성 (A와 B가 4번씩 주고받거나 흐름에 맞게 조절).
   - 타겟 문장의 위치는 대화의 시작, 중간, 끝 어디든 가장 자연스러운 곳에 배치.
   - 상황 설정은 구체적이고 현실적인 비즈니스 상황이어야 함.

3. **Output Format:**
   반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 순수 JSON만 출력하세요.

\`\`\`json
{
  "situation": "상황을 한 줄로 요약 (한글)",
  "title_line1": "대화의 핵심을 담은 영어 제목 첫 줄",
  "title_line2": "대화의 핵심을 담은 영어 제목 두번째 줄 (타겟 문장의 핵심 표현 포함)",
  "target_sentence": "영어로 된 타겟 문장",
  "target_index": 5,
  "dialog": [
    {"speaker": "A", "text": "영어 대화문 1", "translation": "한글 번역 1"},
    {"speaker": "B", "text": "영어 대화문 2", "translation": "한글 번역 2"},
    {"speaker": "A", "text": "영어 대화문 3", "translation": "한글 번역 3"},
    {"speaker": "B", "text": "영어 대화문 4", "translation": "한글 번역 4"},
    {"speaker": "A", "text": "영어 대화문 5", "translation": "한글 번역 5"},
    {"speaker": "B", "text": "영어 대화문 6 (타겟 문장)", "translation": "한글 번역 6"},
    {"speaker": "A", "text": "영어 대화문 7", "translation": "한글 번역 7"},
    {"speaker": "B", "text": "영어 대화문 8", "translation": "한글 번역 8"}
  ],
  "vocab": {
    "word": "핵심 단어/표현",
    "meaning": "뜻 (한글)"
  }
}
\`\`\`

target_index는 타겟 문장이 위치한 dialog 배열의 인덱스입니다 (0부터 시작).`;

// GEMS System Prompt for Essay Generation
function getEssaySystemPrompt(topic, sentence) {
  let topicGuidance = '';
  
  if (topic && sentence) {
    topicGuidance = `## 주제 지정
사용자가 지정한 주제: "${topic}"
이 주제에 맞는 비즈니스 에세이를 생성하되, 아래 타겟 문장을 반드시 포함해야 합니다.`;
  } else if (topic && !sentence) {
    topicGuidance = `## 주제 지정
사용자가 지정한 주제: "${topic}"
이 주제에 맞는 자연스러운 비즈니스 에세이를 생성하세요. 타겟 문장은 주제에 맞는 적절한 표현을 사용하세요.`;
  } else if (!topic && sentence) {
    topicGuidance = `## 주제 선택
다음 중 하나를 선택하여 주제를 설정하세요:
- 여행, 출장, 해외 출장 경험
- 일상, 업무 일과, 라이프스타일
- 고민, 직장 생활, 커리어 고민
- 목표, 비전, 미래 계획
- 동기, 영감, 성장 스토리
- 협업, 팀워크, 인간관계
- 학습, 자기계발, 도전`;
  } else {
    topicGuidance = `## 주제 선택
다음 중 하나를 선택하여 주제를 설정하세요:
- 여행, 출장, 해외 출장 경험
- 일상, 업무 일과, 라이프스타일
- 고민, 직장 생활, 커리어 고민
- 목표, 비전, 미래 계획
- 동기, 영감, 성장 스토리
- 협업, 팀워크, 인간관계
- 학습, 자기계발, 도전`;
  }

  return `## Role

당신은 'BizEng_Essay_Maker'입니다. 사용자가 입력한 문장과 주제에 맞는 **비즈니스 영어 에세이**를 생성합니다. 결과물은 스마트폰 한 화면(9:16)에서 한눈에 읽히도록 최적화되어야 합니다.

## Goal

사용자가 입력한 문장이 실제 비즈니스 상황에서 어떻게 사용되는지 에세이 형식으로 보여주는 것.

${topicGuidance}

## Process Rules

1. **Input Analysis:**
   - 문장이 입력되었다면:
     - 입력이 **영어**면: 그대로 타겟 문장으로 사용.
     - 입력이 **한글**면: 가장 자연스러운 비즈니스 영어 표현으로 번역하여 타겟 문장으로 사용.
   - 문장이 입력되지 않았다면: 주제에 맞는 자연스러운 타겟 문장을 생성하세요.

2. **Essay Design:**
   - 비즈니스 상황에 맞는 자연스러운 영어 에세이를 작성하세요.
   - 타겟 문장을 에세이 내에 자연스럽게 포함시키세요.
   - 에세이는 논리적 흐름과 구조를 가져야 합니다.
   - 주제 설정은 구체적이고 현실적인 비즈니스 상황이어야 함.

3. **Output Format:**
   반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 순수 JSON만 출력하세요.

\`\`\`json
{
  "situation": "주제를 한 줄로 요약 (한글)",
  "title_line1": "에세이의 핵심을 담은 영어 제목 첫 줄",
  "title_line2": "에세이의 핵심을 담은 영어 제목 두번째 줄 (타겟 문장의 핵심 표현 포함)",
  "target_sentence": "영어로 된 타겟 문장",
  "essay": "완전한 영어 에세이 본문 (타겟 문장이 자연스럽게 포함된 전체 에세이, 단락은 \\n\\n으로 구분)",
  "essay_sentences": [
    {"text": "에세이의 첫 번째 문장", "translation": "첫 번째 문장의 한글 번역"},
    {"text": "에세이의 두 번째 문장", "translation": "두 번째 문장의 한글 번역"},
    {"text": "에세이의 세 번째 문장", "translation": "세 번째 문장의 한글 번역"}
  ],
  "vocab": {
    "word": "핵심 단어/표현",
    "meaning": "뜻 (한글)"
  }
}
\`\`\`

**중요**: essay_sentences 배열에는 에세이의 모든 문장을 순서대로 포함하고, 각 문장에 대한 정확한 한글 번역을 제공해야 합니다. 문장은 마침표(.), 물음표(?), 느낌표(!)로 끝나는 완전한 문장 단위로 구분하세요.`;

// DOM Elements
let elements = {};

// State
let currentDialog = null;
let savedDialogs = [];
let savedEssays = [];
let currentMode = ''; // 'dialog' or 'essay' - empty initially to trigger initial load
let essayCurrentPage = 1;
let essayTotalPages = 1;
let essayAllParagraphs = []; // Store all paragraph elements for pagination

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  loadSettings();
  loadSavedDialogs();
  setupEventListeners();
  // Set default mode to dialog and load content
  switchMode('dialog');
});

function initializeElements() {
  elements = {
    // Mode selector
    dialogModeBtn: document.getElementById('dialogModeBtn'),
    essayModeBtn: document.getElementById('essayModeBtn'),
    
    // Header buttons
    newDialogBtn: document.getElementById('newDialogBtn'),
    saveBtn: document.getElementById('saveBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    closeBtn: document.getElementById('closeBtn'),

    // Input section
    inputSection: document.getElementById('inputSection'),
    situationInput: document.getElementById('situationInput'),
    sentenceInput: document.getElementById('sentenceInput'),
    submitBtn: document.getElementById('submitBtn'),
    generateEssayBtn: document.getElementById('generateEssayBtn'),
    useAsIsBtn: document.getElementById('useAsIsBtn'),

    // Dialog content
    dialogContent: document.getElementById('dialogContent'),
    dialogTitle: document.getElementById('dialogTitle'),
    dialogSubtitle: document.getElementById('dialogSubtitle'),
    dialogLines: document.getElementById('dialogLines'),

    // Essay content
    essayContent: document.getElementById('essayContent'),
    essayTitle: document.getElementById('essayTitle'),
    essaySubtitle: document.getElementById('essaySubtitle'),
    essayCard: document.getElementById('essayCard'),
    essayPagination: document.getElementById('essayPagination'),
    essayPrevBtn: document.getElementById('essayPrevBtn'),
    essayNextBtn: document.getElementById('essayNextBtn'),
    essayPaginationInfo: document.getElementById('essayPaginationInfo'),

    // Tooltip
    tooltip: document.getElementById('tooltip'),

    // Loading
    loadingOverlay: document.getElementById('loadingOverlay'),

    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),

    // Saved Modal
    savedModal: document.getElementById('savedModal'),
    savedList: document.getElementById('savedList'),
    closeSavedBtn: document.getElementById('closeSavedBtn')
  };
}

function setupEventListeners() {
  // Mode selector buttons
  elements.dialogModeBtn.addEventListener('click', () => switchMode('dialog'));
  elements.essayModeBtn.addEventListener('click', () => switchMode('essay'));
  
  // Header buttons
  elements.newDialogBtn.addEventListener('click', toggleInputSection);
  elements.saveBtn.addEventListener('click', saveCurrentDialog);
  elements.settingsBtn.addEventListener('click', () => openModal(elements.settingsModal));
  elements.closeBtn.addEventListener('click', () => window.close());

  // Input section
  elements.submitBtn.addEventListener('click', generateDialog);
  elements.generateEssayBtn.addEventListener('click', generateDialog);
  elements.useAsIsBtn.addEventListener('click', () => {
    // 입력된 문장을 그대로 활용하여 에세이 생성
    if (currentMode === 'essay') {
      generateDialog();
    }
  });
  elements.situationInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') generateDialog();
  });
  elements.sentenceInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') generateDialog();
  });

  // Settings modal
  elements.saveSettingsBtn.addEventListener('click', saveSettings);
  elements.closeSettingsBtn.addEventListener('click', () => closeModal(elements.settingsModal));

  // Saved modal
  elements.closeSavedBtn.addEventListener('click', () => closeModal(elements.savedModal));

  // Essay pagination
  if (elements.essayPrevBtn) {
    elements.essayPrevBtn.addEventListener('click', () => changeEssayPage(-1));
  }
  if (elements.essayNextBtn) {
    elements.essayNextBtn.addEventListener('click', () => changeEssayPage(1));
  }

  // Close modal on background click
  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) closeModal(elements.settingsModal);
  });
  elements.savedModal.addEventListener('click', (e) => {
    if (e.target === elements.savedModal) closeModal(elements.savedModal);
  });
}

function switchMode(mode) {
  if (currentMode === mode) return;
  
  currentMode = mode;
  
  // Update button states
  if (mode === 'dialog') {
    elements.dialogModeBtn.classList.add('active');
    elements.essayModeBtn.classList.remove('active');
    showDialogView();
  } else {
    elements.essayModeBtn.classList.add('active');
    elements.dialogModeBtn.classList.remove('active');
    showEssayView();
  }
}

function showDialogView() {
  // Show dialog content, hide essay content
  if (elements.dialogContent) {
    elements.dialogContent.style.display = 'block';
  }
  if (elements.essayContent) {
    elements.essayContent.style.display = 'none';
  }
  updateButtonLabels('dialog');
  // Show/hide buttons based on mode
  if (elements.generateEssayBtn) {
    elements.generateEssayBtn.style.display = 'none';
  }
  if (elements.useAsIsBtn) {
    elements.useAsIsBtn.style.display = 'none';
  }
  // Load last dialog
  loadLastContent('dialog');
}

function showEssayView() {
  // Hide dialog content, show essay view
  if (elements.dialogContent) {
    elements.dialogContent.style.display = 'none';
  }
  if (elements.essayContent) {
    elements.essayContent.style.display = 'block';
  }
  updateButtonLabels('essay');
  // Show/hide buttons based on mode
  if (elements.generateEssayBtn) {
    elements.generateEssayBtn.style.display = 'flex';
  }
  if (elements.useAsIsBtn) {
    elements.useAsIsBtn.style.display = 'flex';
  }
  // Load last essay
  loadLastContent('essay');
}

function updateButtonLabels(mode) {
  const newDialogBtn = elements.newDialogBtn;
  const saveBtn = elements.saveBtn;
  const savedModalTitle = document.querySelector('#savedModal h3');
  
  if (mode === 'essay') {
    if (newDialogBtn) {
      const span = newDialogBtn.querySelector('span');
      if (span) span.textContent = 'New Essay';
      newDialogBtn.title = 'New Essay';
    }
    if (saveBtn) {
      saveBtn.title = 'Save Essay';
    }
    if (savedModalTitle) {
      savedModalTitle.textContent = 'Saved Essays';
    }
    // Update input placeholder for essay mode (topic instead of situation)
    if (elements.situationInput) {
      elements.situationInput.placeholder = '주제 (예: 목표, 고민, 일상) - 선택사항';
    }
  } else {
    if (newDialogBtn) {
      const span = newDialogBtn.querySelector('span');
      if (span) span.textContent = 'New Dialog';
      newDialogBtn.title = 'New Dialog';
    }
    if (saveBtn) {
      saveBtn.title = 'Save Dialog';
    }
    if (savedModalTitle) {
      savedModalTitle.textContent = 'Saved Dialogs';
    }
    // Update input placeholder for dialog mode (situation)
    if (elements.situationInput) {
      elements.situationInput.placeholder = '상황 (예: 커피챗, 면접, 팀 미팅...) - 선택사항';
    }
  }
}

function toggleInputSection() {
  // New Dialog를 시작할 때 입력 필드를 초기화
  elements.situationInput.value = '';
  elements.sentenceInput.value = '';
  // 현재 모드에 따라 placeholder 설정
  if (currentMode === 'essay') {
    if (elements.situationInput) {
      elements.situationInput.placeholder = '주제 (예: 목표, 고민, 일상) - 선택사항';
    }
  } else {
    if (elements.situationInput) {
      elements.situationInput.placeholder = '상황 (예: 커피챗, 면접, 팀 미팅...) - 선택사항';
    }
  }
  elements.inputSection.classList.add('active');
  elements.situationInput.focus();
}

async function generateDialog() {
  const inputValue = elements.situationInput.value.trim();
  const sentence = elements.sentenceInput.value.trim();

  // 최소한 하나는 입력되어야 함
  if (!inputValue && !sentence) {
    const inputLabel = currentMode === 'essay' ? '주제' : '상황';
    showToast(`${inputLabel} 또는 문장 중 하나는 입력해주세요`);
    return;
  }

  console.log('generateDialog called with input:', inputValue, 'sentence:', sentence, 'mode:', currentMode);

  const apiKey = await getApiKey();
  if (!apiKey) {
    showToast('Please set your Gemini API key in settings');
    openModal(elements.settingsModal);
    return;
  }

  // Choose system prompt based on current mode
  const systemPrompt = currentMode === 'essay' 
    ? getEssaySystemPrompt(inputValue, sentence)
    : getSystemPrompt(inputValue, sentence);
  
  // 사용자 입력 구성
  const inputLabel = currentMode === 'essay' ? '주제' : '상황';
  let userInput = '';
  if (inputValue && sentence) {
    userInput = `${inputLabel}: "${inputValue}"\n문장: "${sentence}"`;
  } else if (inputValue) {
    userInput = `${inputLabel}: "${inputValue}"`;
  } else {
    userInput = `문장: "${sentence}"`;
  }

  showLoading(true);

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n사용자 입력:\n${userInput}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('API response:', data);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('No text in API response:', data);
      throw new Error('No response from API');
    }

    console.log('API response text:', text);

    // Parse JSON from response
    // Try to extract JSON from markdown code block first
    let jsonStr = null;
    const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    } else {
      // If no code block, try to find JSON object directly
      const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonStr = jsonObjectMatch[0];
      }
    }

    let dialogData;
    if (jsonStr) {
      try {
        dialogData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('JSON string (first 500 chars):', jsonStr.substring(0, 500));
        console.error('Full response text (first 1000 chars):', text.substring(0, 1000));
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }
    } else {
      console.error('No JSON found in response. Full text (first 1000 chars):', text.substring(0, 1000));
      throw new Error('Failed to parse data - no JSON found in response');
    }

    // Validate data based on mode
    if (currentMode === 'essay') {
      if (!dialogData || !dialogData.essay) {
        console.error('Invalid essay data structure:', dialogData);
        throw new Error('Invalid essay data structure received from API');
      }
      
      // Store and display essay
      currentDialog = {
        ...dialogData,
        inputSentence: sentence || '',
        inputTopic: inputValue || '',
        createdAt: new Date().toISOString()
      };

      console.log('Generated essay:', currentDialog);
      displayEssay(currentDialog);
      saveLastContent('essay', currentDialog);

      showToast('Essay generated successfully!');
    } else {
      if (!dialogData || !dialogData.dialog || !Array.isArray(dialogData.dialog)) {
        console.error('Invalid dialog data structure:', dialogData);
        throw new Error('Invalid dialog data structure received from API');
      }

      // Store and display dialog
      currentDialog = {
        ...dialogData,
        inputSentence: sentence || '',
        inputSituation: inputValue || '',
        createdAt: new Date().toISOString()
      };

      console.log('Generated dialog:', currentDialog);
      displayDialog(currentDialog);
      saveLastContent('dialog', currentDialog);

      showToast('Dialog generated successfully!');
    }

    // Hide input section and clear input
    elements.inputSection.classList.remove('active');
    elements.situationInput.value = '';
    elements.sentenceInput.value = '';

  } catch (error) {
    console.error('Error generating dialog:', error);
    showToast(`Error: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

function displayDialog(dialog) {
  if (!dialog) {
    console.error('displayDialog called with null/undefined dialog');
    return;
  }

  console.log('displayDialog called with:', dialog);

  // Validate dialog structure
  if (!dialog.dialog || !Array.isArray(dialog.dialog)) {
    console.error('Invalid dialog structure:', dialog);
    showToast('Error: Invalid dialog data');
    return;
  }

  // Set title
  if (elements.dialogTitle) {
    elements.dialogTitle.textContent = dialog.title_line1 || 'Business Dialog';
  } else {
    console.error('dialogTitle element not found');
  }

  if (elements.dialogSubtitle) {
    elements.dialogSubtitle.textContent = dialog.title_line2 || '';
  } else {
    console.error('dialogSubtitle element not found');
  }

  // Clear and populate dialog lines
  if (elements.dialogLines) {
    elements.dialogLines.innerHTML = '';

    dialog.dialog.forEach((line, index) => {
      const isTarget = index === dialog.target_index;
      const lineElement = createDialogLine(line, isTarget);
      elements.dialogLines.appendChild(lineElement);
    });
  } else {
    console.error('dialogLines element not found');
  }
}

function displayEssay(essay) {
  if (!essay) {
    console.error('displayEssay called with null/undefined essay');
    return;
  }

  console.log('displayEssay called with:', essay);

  // Validate essay structure
  if (!essay.essay) {
    console.error('Invalid essay structure:', essay);
    showToast('Error: Invalid essay data');
    return;
  }

  // Set title
  if (elements.essayTitle) {
    elements.essayTitle.textContent = essay.title_line1 || 'Business Essay';
  } else {
    console.error('essayTitle element not found');
  }

  if (elements.essaySubtitle) {
    elements.essaySubtitle.textContent = essay.title_line2 || '';
  } else {
    console.error('essaySubtitle element not found');
  }

  // Set essay content
  if (elements.essayCard) {
    // Use essay_sentences if available, otherwise fall back to essay text
    let paragraphs = [];
    
    if (essay.essay_sentences && Array.isArray(essay.essay_sentences) && essay.essay_sentences.length > 0) {
      // Group sentences into paragraphs
      let currentParagraph = [];
      
      essay.essay_sentences.forEach((sentenceObj, index) => {
        if (sentenceObj.text && sentenceObj.text.trim()) {
          currentParagraph.push(sentenceObj);
        }
        // Check if we should start a new paragraph (simple heuristic: every 3-4 sentences or if empty)
        if (currentParagraph.length > 0 && (index === essay.essay_sentences.length - 1 || currentParagraph.length >= 3)) {
          paragraphs.push({ sentences: [...currentParagraph] });
          currentParagraph = [];
        }
      });
      
      // If no paragraphs were created, create one with all sentences
      if (paragraphs.length === 0 && currentParagraph.length > 0) {
        paragraphs.push({ sentences: currentParagraph });
      }
    } else {
      // Fallback to original essay text format (split by paragraphs)
      const essayText = essay.essay || '';
      const textParagraphs = essayText.split('\n\n').filter(p => p.trim());
      paragraphs = textParagraphs.map(text => ({ text }));
    }
    
    renderEssayWithPagination(paragraphs);
  } else {
    console.error('essayCard element not found');
  }
}

// Helper function to calculate lines in an element
function calculateLines(element) {
  const styles = window.getComputedStyle(element);
  const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.8;
  const height = element.offsetHeight;
  return Math.max(1, Math.ceil(height / lineHeight));
}

// Function to render essay with pagination
function renderEssayWithPagination(paragraphs) {
  if (!elements.essayCard) return;
  
  elements.essayCard.innerHTML = '';
  essayAllParagraphs = [];
  
  // Create a temporary container to measure paragraph heights
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.visibility = 'hidden';
  tempContainer.style.width = elements.essayCard.offsetWidth + 'px';
  const cardPadding = window.getComputedStyle(elements.essayCard).padding;
  tempContainer.style.padding = cardPadding;
  tempContainer.className = 'essay-card';
  tempContainer.style.fontSize = window.getComputedStyle(elements.essayCard).fontSize;
  tempContainer.style.fontFamily = window.getComputedStyle(elements.essayCard).fontFamily;
  tempContainer.style.lineHeight = window.getComputedStyle(elements.essayCard).lineHeight;
  document.body.appendChild(tempContainer);
  
  paragraphs.forEach(paragraphData => {
    const p = document.createElement('p');
    p.className = 'essay-paragraph';
    
    if (paragraphData.sentences) {
      // essay_sentences format
      paragraphData.sentences.forEach((sentenceObj, sentIndex) => {
        const span = document.createElement('span');
        span.className = 'essay-sentence';
        span.textContent = sentenceObj.text + (sentIndex < paragraphData.sentences.length - 1 ? ' ' : '');
        p.appendChild(span);
      });
    } else {
      // plain text format
      p.textContent = paragraphData.text;
    }
    
    tempContainer.appendChild(p);
    
    // Calculate lines for this paragraph
    const lines = calculateLines(p);
    essayAllParagraphs.push({ element: p.cloneNode(true), lines, paragraphData });
  });
  
  document.body.removeChild(tempContainer);
  
  // Calculate total lines and pages
  const totalLines = essayAllParagraphs.reduce((sum, p) => sum + p.lines, 0);
  essayTotalPages = Math.max(1, Math.ceil(totalLines / 16));
  essayCurrentPage = 1;
  
  // Show pagination if more than 16 lines
  if (totalLines > 16 && elements.essayPagination) {
    elements.essayPagination.style.display = 'flex';
  } else if (elements.essayPagination) {
    elements.essayPagination.style.display = 'none';
  }
  
  // Render first page
  renderEssayPage(1);
}

function renderEssayPage(page) {
  if (!elements.essayCard) return;
  
  elements.essayCard.innerHTML = '';
  
  // Calculate which paragraphs should be on this page
  // Each page has exactly 16 lines
  let currentLineCount = 0;
  const pageStartLine = (page - 1) * 16 + 1;
  const pageEndLine = page * 16;
  let linesAddedThisPage = 0;
  
  essayAllParagraphs.forEach(({ element, lines, paragraphData }) => {
    // Skip if we've already added 16 lines
    if (linesAddedThisPage >= 16) {
      return;
    }
    
    const paragraphStartLine = currentLineCount + 1;
    const paragraphEndLine = currentLineCount + lines;
    
    // Check if this paragraph starts before or at the end of this page
    // and hasn't already been displayed on a previous page
    if (paragraphStartLine <= pageEndLine) {
      // Calculate how many lines this paragraph would add
      const availableSpace = 16 - linesAddedThisPage;
      
      // Only add if the entire paragraph fits or we're at the start of a new page range
      if (linesAddedThisPage + lines <= 16) {
        // Add the entire paragraph
        const p = document.createElement('p');
        p.className = 'essay-paragraph';
        
        if (paragraphData.sentences) {
          // essay_sentences format
          paragraphData.sentences.forEach((sentenceObj, sentIndex) => {
            const span = document.createElement('span');
            span.className = 'essay-sentence';
            span.textContent = sentenceObj.text + (sentIndex < paragraphData.sentences.length - 1 ? ' ' : '');
            
            // Add tooltip functionality if translation exists
            if (sentenceObj.translation) {
              span.addEventListener('mouseenter', (e) => showTooltip(e, sentenceObj.translation));
              span.addEventListener('mousemove', (e) => moveTooltip(e));
              span.addEventListener('mouseleave', hideTooltip);
            }
            
            p.appendChild(span);
          });
        } else {
          // plain text format
          const sentences = paragraphData.text.match(/[^.!?]+[.!?]+/g) || [paragraphData.text];
          sentences.forEach((sentence, sentIndex) => {
            const span = document.createElement('span');
            span.className = 'essay-sentence';
            span.textContent = sentence.trim() + (sentIndex < sentences.length - 1 ? ' ' : '');
            p.appendChild(span);
          });
        }
        
        elements.essayCard.appendChild(p);
        linesAddedThisPage += lines;
      }
    }
    
    currentLineCount += lines;
  });
  
  updateEssayPagination();
}

function updateEssayPagination() {
  if (elements.essayPaginationInfo) {
    elements.essayPaginationInfo.textContent = `${essayCurrentPage} / ${essayTotalPages}`;
  }
  
  if (elements.essayPrevBtn) {
    elements.essayPrevBtn.disabled = essayCurrentPage <= 1;
    elements.essayPrevBtn.style.opacity = essayCurrentPage <= 1 ? '0.5' : '1';
    elements.essayPrevBtn.style.cursor = essayCurrentPage <= 1 ? 'not-allowed' : 'pointer';
  }
  
  if (elements.essayNextBtn) {
    elements.essayNextBtn.disabled = essayCurrentPage >= essayTotalPages;
    elements.essayNextBtn.style.opacity = essayCurrentPage >= essayTotalPages ? '0.5' : '1';
    elements.essayNextBtn.style.cursor = essayCurrentPage >= essayTotalPages ? 'not-allowed' : 'pointer';
  }
}

function changeEssayPage(delta) {
  const newPage = essayCurrentPage + delta;
  if (newPage >= 1 && newPage <= essayTotalPages) {
    essayCurrentPage = newPage;
    renderEssayPage(essayCurrentPage);
    elements.essayCard.scrollTop = 0; // Scroll to top of card
  }
}

function createDialogLine(line, isTarget) {
  const div = document.createElement('div');
  div.className = `dialog-line speaker-${line.speaker.toLowerCase()}${isTarget ? ' highlight' : ''}`;

  div.innerHTML = `
    <div class="speaker-badge">${line.speaker}</div>
    <div class="line-text">${line.text}</div>
    ${isTarget ? '<span class="key-badge">KEY</span>' : ''}
  `;

  // Add tooltip functionality
  div.addEventListener('mouseenter', (e) => showTooltip(e, line.translation));
  div.addEventListener('mousemove', (e) => moveTooltip(e));
  div.addEventListener('mouseleave', hideTooltip);

  return div;
}

function showTooltip(e, text) {
  elements.tooltip.textContent = text;
  elements.tooltip.classList.add('visible');
  // Force a reflow to get accurate tooltip dimensions before positioning
  elements.tooltip.offsetHeight;
  moveTooltip(e);
}

function moveTooltip(e) {
  const tooltip = elements.tooltip;
  const tooltipRect = tooltip.getBoundingClientRect();
  
  // Get the element that triggered the tooltip (the sentence element)
  const targetElement = e.target;
  const elementRect = targetElement.getBoundingClientRect();
  
  // X축: 화면의 정가운데
  const viewportWidth = window.innerWidth;
  const x = (viewportWidth - tooltipRect.width) / 2;
  
  // Y축: 해당 문장의 마지막 줄 바로 아래 (element의 bottom 위치)
  const y = elementRect.bottom + 8; // 8px 간격
  
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function hideTooltip() {
  elements.tooltip.classList.remove('visible');
}

function showLoading(show) {
  if (show) {
    elements.loadingOverlay.classList.add('active');
    // Update loading text based on current mode
    const loadingText = elements.loadingOverlay.querySelector('.loading-text');
    if (loadingText) {
      loadingText.textContent = currentMode === 'essay' ? 'Generating Essay...' : 'Generating Dialog...';
    }
  } else {
    elements.loadingOverlay.classList.remove('active');
  }
}

function openModal(modal) {
  modal.classList.add('active');
}

function closeModal(modal) {
  modal.classList.remove('active');
}

// Storage functions
async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
      resolve(result.geminiApiKey || '');
    });
  });
}

async function saveSettings() {
  const apiKey = elements.apiKeyInput.value.trim();

  chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
    showToast('Settings saved!');
    closeModal(elements.settingsModal);
  });
}

async function loadSettings() {
  chrome.storage.sync.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
      elements.apiKeyInput.value = result.geminiApiKey;
    }
  });
}

function saveCurrentDialog() {
  if (!currentDialog) {
    const contentType = currentMode === 'essay' ? 'essay' : 'dialog';
    showToast(`No ${contentType} to save`);
    return;
  }

  const storageKey = currentMode === 'essay' ? 'savedEssays' : 'savedDialogs';
  const savedItemsKey = currentMode === 'essay' ? 'savedEssays' : 'savedDialogs';
  
  chrome.storage.local.get([storageKey], (result) => {
    const items = result[storageKey] || [];

    // Check for duplicates (same input sentence or input topic)
    const checkKey = currentMode === 'essay' ? 'inputTopic' : 'inputSentence';
    const exists = items.some(item => item[checkKey] === currentDialog[checkKey] && item[checkKey]);
    if (exists) {
      const contentType = currentMode === 'essay' ? 'essay' : 'dialog';
      showToast(`This ${contentType} is already saved`);
      return;
    }

    items.unshift(currentDialog);

    // Keep only last 50 items
    if (items.length > 50) {
      items.pop();
    }

    chrome.storage.local.set({ [storageKey]: items }, () => {
      if (currentMode === 'essay') {
        savedEssays = items;
      } else {
        savedDialogs = items;
      }
      const contentType = currentMode === 'essay' ? 'Essay' : 'Dialog';
      showToast(`${contentType} saved!`);
    });
  });
}

function loadSavedDialogs() {
  chrome.storage.local.get(['savedDialogs', 'savedEssays'], (result) => {
    savedDialogs = result.savedDialogs || [];
    savedEssays = result.savedEssays || [];
  });
}

function saveLastContent(mode, content) {
  if (mode === 'essay') {
    chrome.storage.local.set({ lastEssay: content });
  } else {
    chrome.storage.local.set({ lastDialog: content });
  }
}

function loadLastContent(mode) {
  const storageKey = mode === 'essay' ? 'lastEssay' : 'lastDialog';
  chrome.storage.local.get([storageKey], (result) => {
    if (result[storageKey]) {
      currentDialog = result[storageKey];
      if (mode === 'essay') {
        displayEssay(currentDialog);
      } else {
        displayDialog(currentDialog);
      }
    } else {
      // Show sample content
      if (mode === 'essay') {
        displaySampleEssay();
      } else {
        displaySampleDialog();
      }
    }
  });
}

function displaySampleDialog() {
  const sampleDialog = {
    title_line1: "The flowers are lovely,",
    title_line2: "but you were the highlight.",
    target_index: 5,
    dialog: [
      { speaker: "A", text: "What a relief! The presentation went perfectly.", translation: "다행이다! 프레젠테이션이 완벽하게 끝났어." },
      { speaker: "B", text: "I'm just glad it's finally over.", translation: "드디어 끝나서 다행이야." },
      { speaker: "A", text: "Look at the view outside. The camellias are blooming.", translation: "밖을 봐. 동백꽃이 피고 있어." },
      { speaker: "B", text: "Wow, it really is a beautiful backdrop.", translation: "와, 정말 아름다운 배경이다." },
      { speaker: "A", text: "It's the perfect end to a stressful day.", translation: "스트레스 받은 하루의 완벽한 마무리네." },
      { speaker: "B", text: "The flowers are lovely, but you were the real highlight today.", translation: "꽃도 예쁘지만, 오늘 진짜 빛난 건 너야." },
      { speaker: "A", text: "Oh stop, you're making me blush.", translation: "그만해, 얼굴 빨개지잖아." },
      { speaker: "B", text: "I mean it. Your hard work really paid off.", translation: "진심이야. 네 노력이 정말 빛을 발했어." }
    ],
    vocab: {
      word: "Highlight",
      meaning: "(행사 등의) 가장 빛나는 부분, 압권"
    }
  };

  currentDialog = sampleDialog;
  displayDialog(sampleDialog);
}

function displaySampleEssay() {
  const sampleEssay = {
    title_line1: "Cultivating Future Growth",
    title_line2: "Strategic Vision from the Home Office",
    situation: "비즈니스 목표와 성장에 대한 주제",
    essay: "In today's rapidly evolving business landscape, strategic planning has become more crucial than ever. Organizations that fail to adapt risk falling behind in an increasingly competitive market.\n\nEffective leadership requires a clear vision that aligns with both short-term objectives and long-term aspirations. This vision must be communicated consistently across all levels of the organization to ensure everyone moves in the same direction.\n\nThe most successful companies understand that growth is not just about increasing revenue, but about building sustainable practices that create value for all stakeholders. This holistic approach to business development ensures longevity and relevance in an ever-changing world.",
    vocab: {
      word: "Strategic Vision",
      meaning: "전략적 비전"
    }
  };

  currentDialog = sampleEssay;
  displayEssay(sampleEssay);
}

function showSavedDialogs() {
  loadSavedDialogs();

  elements.savedList.innerHTML = '';

  if (savedDialogs.length === 0) {
    elements.savedList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21Z" stroke="currentColor" stroke-width="2"/>
          <path d="M9 7H15M9 11H15M9 15H12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p>No saved dialogs yet</p>
      </div>
    `;
  } else {
    savedDialogs.forEach((dialog, index) => {
      const item = document.createElement('div');
      item.className = 'saved-item';

      const date = new Date(dialog.createdAt);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

      item.innerHTML = `
        <span class="saved-item-title">${dialog.inputSentence || dialog.title_line1}</span>
        <span class="saved-item-date">${dateStr}</span>
        <button class="saved-item-delete" data-index="${index}" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      `;

      // Click to load dialog
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.saved-item-delete')) {
          currentDialog = dialog;
          if (currentMode === 'essay' && dialog.essay) {
            displayEssay(dialog);
            saveLastContent('essay', dialog);
          } else if (currentMode === 'dialog' && dialog.dialog) {
            displayDialog(dialog);
            saveLastContent('dialog', dialog);
          }
          closeModal(elements.savedModal);
          showToast('Content loaded');
        }
      });

      // Delete button
      const deleteBtn = item.querySelector('.saved-item-delete');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSavedDialog(index);
      });

      elements.savedList.appendChild(item);
    });
  }

  openModal(elements.savedModal);
}

function deleteSavedDialog(index) {
  const storageKey = currentMode === 'essay' ? 'savedEssays' : 'savedDialogs';
  const items = currentMode === 'essay' ? savedEssays : savedDialogs;
  
  items.splice(index, 1);
  
  chrome.storage.local.set({ [storageKey]: items }, () => {
    if (currentMode === 'essay') {
      savedEssays = items;
    } else {
      savedDialogs = items;
    }
    loadSavedDialogs();
    showSavedDialogs();
    const contentType = currentMode === 'essay' ? 'Essay' : 'Dialog';
    showToast(`${contentType} deleted`);
  });
}

// Toast notification
function showToast(message) {
  // Remove existing toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  // Show toast
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  // Hide and remove toast
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
