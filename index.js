// Direction 확장 - 탭 기반 플레이스홀더 관리
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";
import { SlashCommand } from "../../../slash-commands/SlashCommand.js";
import { SlashCommandParser } from "../../../slash-commands/SlashCommandParser.js";
import { ARGUMENT_TYPE, SlashCommandNamedArgument } from "../../../slash-commands/SlashCommandArgument.js";
import { POPUP_RESULT, POPUP_TYPE, Popup } from "../../../popup.js";

// 확장 설정
const extensionName = "Direction";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const extensionSettings = extension_settings[extensionName];
const defaultSettings = {
    placeholders: []
};

// SillyTavern 시스템 예약어 목록
const RESERVED_WORDS = [
    // System-wide Replacement Macros
    'pipe', 'newline', 'trim', 'noop', 'original', 'input', 'lastGenerationType',
    'charPrompt', 'charInstruction', 'description', 'personality', 'scenario', 'persona',
    'mesExamples', 'mesExamplesRaw', 'summary', 'user', 'char', 'version', 'charDepthPrompt',
    'group', 'charIfNotGroup', 'groupNotMuted', 'model', 'lastMessage', 'lastUserMessage',
    'lastCharMessage', 'lastMessageId', 'firstIncludedMessageId', 'firstDisplayedMessageId',
    'currentSwipeId', 'lastSwipeId', 'reverse', 'time', 'date', 'weekday', 'isotime',
    'isodate', 'datetimeformat', 'time_UTC', 'timeDiff', 'idle_duration', 'bias', 'roll',
    'random', 'pick', 'banned', 'isMobile',
    
    // Instruct Mode and Context Template Macros
    'maxPrompt', 'exampleSeparator', 'chatStart', 'systemPrompt', 'defaultSystemPrompt',
    'instructSystemPromptPrefix', 'instructSystemPromptSuffix', 'instructUserPrefix',
    'instructUserSuffix', 'instructAssistantPrefix', 'instructAssistantSuffix',
    'instructFirstAssistantPrefix', 'instructLastAssistantPrefix', 'instructSystemPrefix',
    'instructSystemSuffix', 'instructSystemInstructionPrefix', 'instructUserFiller',
    'instructStop', 'instructFirstUserPrefix', 'instructLastUserPrefix',
    
    // Chat variables Macros
    'getvar', 'setvar', 'addvar', 'incvar', 'decvar', 'getglobalvar', 'setglobalvar',
    'addglobalvar', 'incglobalvar', 'decglobalvar', 'var'
];

// 현재 선택된 탭 인덱스
let selectedTabIndex = 0;

// 설정 로드
async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }
}

// 고유 ID 생성
function generateId() {
    return 'placeholder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 변수명 입력 팝업 표시
async function showVariableNamePopup() {
    let success = false;
    
    while (!success) {
        const variableNameHtml = `
            <div class="flex-container flexFlowColumn">
                <p>플레이스홀더 변수명을 입력하세요:</p>
                <input type="text" id="variable-name-input" placeholder="예: character, setting, mood" maxlength="50" class="text_pole">
                <small style="color: var(--SmartThemeQuoteColor); opacity: 0.8; margin-top: 5px;">영문, 숫자, 언더스코어(_)만 사용 가능하며 숫자로 시작할 수 없습니다.</small>
            </div>
        `;
        
        const template = $(variableNameHtml);
        const popup = new Popup(template, POPUP_TYPE.CONFIRM, '변수명 입력', { 
            okButton: '확인', 
            cancelButton: '취소'
        });
        
        const result = await popup.show();
        
        if (!result) {
            // 취소 버튼을 눌렀거나 ESC로 닫았을 때
            return false;
        }
        
        const variableName = template.find('#variable-name-input').val().trim();
        
        // 변수명 유효성 검사
        if (!variableName) {
            alert('변수명을 입력해주세요.');
            continue; // 다시 입력 받기
        }
        
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variableName)) {
            alert('변수명 형식이 올바르지 않습니다.\n영문, 숫자, 언더스코어(_)만 사용 가능하며\n숫자로 시작할 수 없습니다.');
            continue; // 다시 입력 받기
        }
        
        // 시스템 예약어 검사
        if (RESERVED_WORDS.includes(variableName.toLowerCase())) {
            alert(`'${variableName}'는 SillyTavern 시스템 예약어입니다.\n다른 이름을 사용해주세요.`);
            continue; // 다시 입력 받기
        }
        
        // 중복 검사
        const existingVariables = extension_settings[extensionName].placeholders.map(p => p.variable);
        if (existingVariables.includes(variableName)) {
            alert('이미 존재하는 변수명입니다.\n다른 이름을 사용해주세요.');
            continue; // 다시 입력 받기
        }
        
        // 새 플레이스홀더 생성
        const newPlaceholder = { 
            id: generateId(), 
            name: "새 플레이스홀더", 
            variable: variableName, 
            content: "" 
        };
        
        extension_settings[extensionName].placeholders.push(newPlaceholder);
        
        // 시스템에 즉시 적용
        applyPlaceholderToSystem(newPlaceholder);
        
        saveSettingsDebounced();
        success = true;
    }
    
    return true;
}

// 플레이스홀더 창 열기
async function openDirectionPopup() {
    // 기존 패널이 있으면 제거
    $("#placeholderPanel").remove();
    
    // 템플릿 로드
    const templateHtml = await $.get(`${extensionFolderPath}/template.html`);
    
    // movingDivs에 패널 추가 (노트북 확장과 같은 방식)
    const movingDivs = document.getElementById('movingDivs');
    if (movingDivs) {
        $(movingDivs).append(templateHtml);
    } else {
        // fallback - movingDivs가 없으면 body에 추가
        $("body").append(templateHtml);
    }
    
    const panel = $("#placeholderPanel");
    
    // 탭과 내용 렌더링
    renderTabs(panel);
    renderTabContent(panel);
    
    // 이벤트 리스너 추가
    setupEventListeners(panel);
    
    // 패널 표시 (SillyTavern 애니메이션 시스템 사용)
    await animatePlaceholderPanel(false);
    
    // 닫기 버튼 이벤트
    panel.find('#placeholderPanelClose').on('click', function() {
        closeDirectionPanel();
    });
    
    // ESC 키로 닫기
    $(document).on('keydown.placeholder-panel', function(e) {
        if (e.which === 27) {
            closeDirectionPanel();
        }
    });
    
    // 패널 외부 클릭으로 닫기
    panel.on('click', function(e) {
        if (e.target === this) {
            closeDirectionPanel();
        }
    });
}

// SillyTavern 애니메이션 설정 가져오기
async function getAnimationSettings() {
    try {
        const animation_duration = window.animation_duration || 125;
        const animation_easing = window.animation_easing || 'ease-in-out';
        return { animation_duration, animation_easing };
    } catch (err) {
        return { animation_duration: 125, animation_easing: 'ease-in-out' };
    }
}

// 플레이스홀더 패널 애니메이션
async function animatePlaceholderPanel(alreadyVisible) {
    const panel = document.getElementById('placeholderPanel');
    if (!panel) return;
    
    const { animation_duration, animation_easing } = await getAnimationSettings();

    const keyframes = [
        { opacity: alreadyVisible ? 1 : 0 },
        { opacity: alreadyVisible ? 0 : 1 },
    ];
    const options = {
        duration: animation_duration,
        easing: animation_easing,
    };

    const animation = panel.animate(keyframes, options);

    if (alreadyVisible) {
        await animation.finished;
        panel.classList.toggle('flex');
    } else {
        panel.classList.toggle('flex');
        await animation.finished;
    }
}

// 패널 닫기
async function closeDirectionPanel() {
    try {
        await animatePlaceholderPanel(true);
        $("#placeholderPanel").remove();
        $(document).off('keydown.placeholder-panel');
    } catch (err) {
        // fallback - 애니메이션 실패시 바로 제거
        const panel = $("#placeholderPanel");
        panel.removeClass('flex');
        setTimeout(() => {
            panel.remove();
            $(document).off('keydown.placeholder-panel');
        }, 200);
    }
}

// 탭 목록 렌더링
function renderTabs(panel) {
    const placeholders = extension_settings[extensionName].placeholders || [];
    const tabList = panel.find('#placeholder-tab-list');
    
    let tabsHtml = '';
    
    // 각 플레이스홀더에 대한 탭 생성
    placeholders.forEach((placeholder, index) => {
        const isActive = index === selectedTabIndex;
        const displayName = placeholder.name || `{{${placeholder.variable}}}`;
        tabsHtml += `
            <div class="placeholder-tab ${isActive ? 'active' : ''}" data-index="${index}" title="${displayName}">
                ${displayName}
            </div>
        `;
    });
    
    // + 탭 추가
    tabsHtml += `
        <div class="placeholder-tab add-tab" data-action="add" title="새 플레이스홀더 추가">
            <i class="fa-solid fa-plus"></i>
        </div>
    `;
    
    tabList.html(tabsHtml);
}

// 탭 내용 렌더링
function renderTabContent(panel) {
    const placeholders = extension_settings[extensionName].placeholders || [];
    const contentArea = panel.find('#placeholder-tab-content');
    
    if (placeholders.length === 0 || selectedTabIndex >= placeholders.length) {
        // 플레이스홀더가 없거나 선택된 탭이 범위를 벗어난 경우
        contentArea.html(`
            <div class="no-placeholders-message">
                <h3>+ 버튼을 클릭하여 새로운 플레이스홀더를 만들어보세요.</h3>
                <p>플레이스홀더를 사용하면 반복되는 텍스트를 효율적으로 관리할 수 있습니다.</p>
            </div>
        `);
        return;
    }
    
    const placeholder = placeholders[selectedTabIndex];
    
    const editorHtml = `
        <div class="placeholder-editor">
            <div class="placeholder-header-row">
                <input type="text" 
                       class="placeholder-title-input" 
                       placeholder="플레이스홀더 제목을 입력하세요" 
                       value="${placeholder.name}"
                       data-index="${selectedTabIndex}">
                <div class="placeholder-variable-display">{{${placeholder.variable}}}</div>
                <button class="placeholder-delete-btn" data-index="${selectedTabIndex}" title="플레이스홀더 삭제">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            <div class="placeholder-content-area">
                <textarea class="placeholder-textarea" 
                          placeholder="여기에 내용을 입력하세요..." 
                          data-index="${selectedTabIndex}">${placeholder.content}</textarea>
            </div>
        </div>
    `;
    
    contentArea.html(editorHtml);
}

// 탭 선택
function selectTab(panel, index) {
    const placeholders = extension_settings[extensionName].placeholders || [];
    
    if (index >= 0 && index < placeholders.length) {
        selectedTabIndex = index;
        renderTabs(panel);
        renderTabContent(panel);
        setupEventListeners(panel);
    }
}

// 이벤트 리스너 설정
function setupEventListeners(panel) {
    // 탭 클릭 이벤트
    panel.find('.placeholder-tab:not(.add-tab)').off('click').on('click', function() {
        const index = parseInt($(this).data('index'));
        selectTab(panel, index);
    });
    
    // + 탭 클릭 이벤트
    panel.find('.placeholder-tab.add-tab').off('click').on('click', async function() {
        const success = await showVariableNamePopup();
        if (success) {
            // 새로 추가된 플레이스홀더로 이동
            selectedTabIndex = extension_settings[extensionName].placeholders.length - 1;
            renderTabs(panel);
            renderTabContent(panel);
            setupEventListeners(panel);
        }
    });
    
    // 제목 입력 필드 변경 이벤트
    panel.find('.placeholder-title-input').off('input').on('input', function() {
        const index = parseInt($(this).data('index'));
        const newTitle = $(this).val();
        updatePlaceholderTitle(index, newTitle);
        // 탭 제목 즉시 업데이트
        renderTabs(panel);
        setupEventListeners(panel);
    });
    
    // 내용 텍스트 에리어 변경 이벤트
    panel.find('.placeholder-textarea').off('input').on('input', function() {
        const index = parseInt($(this).data('index'));
        const newContent = $(this).val();
        updatePlaceholderContent(index, newContent);
    });
    
    // 삭제 버튼 클릭 이벤트
    panel.find('.placeholder-delete-btn').off('click').on('click', function() {
        const index = parseInt($(this).data('index'));
        if (confirm('이 플레이스홀더를 삭제하시겠습니까?')) {
            deletePlaceholder(panel, index);
        }
    });
}

// 플레이스홀더 제목 업데이트
function updatePlaceholderTitle(index, newTitle) {
    const placeholders = extension_settings[extensionName].placeholders;
    if (placeholders && placeholders[index]) {
        placeholders[index].name = newTitle;
        saveSettingsDebounced();
    }
}

// 플레이스홀더 내용 업데이트
function updatePlaceholderContent(index, newContent) {
    const placeholders = extension_settings[extensionName].placeholders;
    if (placeholders && placeholders[index]) {
        placeholders[index].content = newContent;
        applyPlaceholderToSystem(placeholders[index]);
        saveSettingsDebounced();
    }
}

// 플레이스홀더 삭제
function deletePlaceholder(panel, index) {
    const placeholders = extension_settings[extensionName].placeholders;
    if (placeholders && placeholders[index]) {
        // 시스템에서 제거
        removePlaceholderFromSystem(placeholders[index]);
        
        // 배열에서 제거
        placeholders.splice(index, 1);
        
        // 선택된 탭 인덱스 조정
        if (selectedTabIndex >= placeholders.length) {
            selectedTabIndex = Math.max(0, placeholders.length - 1);
        }
        
        // UI 업데이트
        renderTabs(panel);
        renderTabContent(panel);
        setupEventListeners(panel);
        
        saveSettingsDebounced();
    }
}

// 플레이스홀더를 시스템에 적용
function applyPlaceholderToSystem(placeholder) {
    if (placeholder.variable && placeholder.variable.trim()) {
        const variableName = placeholder.variable.trim();
        
        // 전역 변수로 설정
        window[`${variableName}Value`] = placeholder.content;
        
        // getContext를 통해서도 설정
        const context = getContext();
        if (context && context.setExtensionPrompt) {
            context.setExtensionPrompt(`${extensionName}_${variableName}`, placeholder.content, 1, 0);
        }
        
        // 추가적인 플레이스홀더 시스템 등록 시도
        if (window.substituteParams) {
            // SillyTavern의 플레이스홀더 시스템에 등록
            const placeholderPattern = `{{${variableName}}}`;
        }
    }
}

// 시스템에서 플레이스홀더 제거
function removePlaceholderFromSystem(placeholder) {
    if (placeholder.variable && placeholder.variable.trim()) {
        const variableName = placeholder.variable.trim();
        
        // 전역 변수 제거
        if (window[`${variableName}Value`]) {
            delete window[`${variableName}Value`];
        }
        
        // getContext를 통한 제거 시도
        const context = getContext();
        if (context && context.setExtensionPrompt) {
            context.setExtensionPrompt(`${extensionName}_${variableName}`, "", 1, 0);
        }
    }
}

// 모든 플레이스홀더 값 업데이트 (초기 로드용)
function updateAllPlaceholders() {
    const placeholders = extension_settings[extensionName].placeholders || [];
    
    // 각 플레이스홀더를 시스템에 적용
    placeholders.forEach(placeholder => {
        if (placeholder.variable && placeholder.variable.trim()) {
            applyPlaceholderToSystem(placeholder);
        }
    });
}

// 슬래시 커맨드 등록
function registerSlashCommands() {
    try {
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'placeholder',
            callback: async (parsedArgs) => {
                openDirectionPopup();
                return '';
            },
            helpString: '플레이스홀더 관리 창을 엽니다.\n사용법: /placeholder',
            namedArgumentList: [],
            returns: '플레이스홀더 관리 창 열기',
        }));
        
        console.log("플레이스홀더 슬래시 커맨드가 등록되었습니다: /placeholder");
    } catch (error) {
        console.error("슬래시 커맨드 등록 실패:", error);
        // 실패 시 5초 후 재시도
        setTimeout(registerSlashCommands, 5000);
    }
}

// 요술봉메뉴에 버튼 추가
async function addToWandMenu() {
    try {
        const buttonHtml = await $.get(`${extensionFolderPath}/button.html`);
        
        const extensionsMenu = $("#extensionsMenu");
        if (extensionsMenu.length > 0) {
            extensionsMenu.append(buttonHtml);
            $("#direction_button").on("click", openDirectionPopup);
        } else {
            setTimeout(addToWandMenu, 1000);
        }
    } catch (error) {
        console.error("button.html 로드 실패:", error);
    }
}

// 확장 초기화
jQuery(async () => {
    await loadSettings();
    await addToWandMenu();
    updateAllPlaceholders();
    
    // SillyTavern 로드 완료 후 슬래시 커맨드 등록
    setTimeout(registerSlashCommands, 2000);
    
    console.log("Direction 확장이 로드되었습니다.");
}); 