// Direction 확장 - 다중 플레이스홀더 관리
import { extension_settings, getContext, loadExtensionSettings, renderExtensionTemplateAsync } from "../../../extensions.js";
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
    
    if (result) {
        const variableName = template.find('#variable-name-input').val().trim();
        return await confirmVariableName(variableName);
    }
    
    return false;
}

// 변수명 확인
async function confirmVariableName(variableName) {
    if (!variableName) {
        return false;
    }
    
    // 영문, 숫자, 언더스코어만 허용
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variableName)) {
        await Popup.show('변수명 형식이 올바르지 않습니다.', '오류');
        return false;
    }
    
    // 중복 검사
    const existingVariables = extension_settings[extensionName].placeholders.map(p => p.variable);
    if (existingVariables.includes(variableName)) {
        await Popup.show('이미 존재하는 변수명입니다.', '오류');
        return false;
    }
    
    // 새 플레이스홀더 생성
    const newPlaceholder = { 
        id: generateId(), 
        name: "", 
        variable: variableName, 
        content: "" 
    };
    
    extension_settings[extensionName].placeholders.push(newPlaceholder);
    
    // 시스템에 즉시 적용
    applyPlaceholderToSystem(newPlaceholder);
    
    saveSettingsDebounced();
    return true;
}

// 플레이스홀더 창 열기
async function openDirectionPopup() {
    const template = $(await renderExtensionTemplateAsync(`third-party/${extensionName}`, 'template'));
    
    // 플레이스홀더 목록 렌더링
    template.find('#placeholders-container').html(renderPlaceholders());
    
    // 이벤트 리스너 추가
    setupEventListeners(template);
    
    const popup = new Popup(template, POPUP_TYPE.CONFIRM, '플레이스홀더 관리', { 
        wide: true, 
        large: true,
        okButton: '저장', 
        cancelButton: '취소'
    });
    
    const result = await popup.show();
    
    if (result) {
        // 저장 처리는 실시간으로 이미 적용되므로 별도 처리 불필요
        console.log("플레이스홀더 설정이 저장되었습니다.");
    }
}

// 플레이스홀더들을 HTML로 렌더링
function renderPlaceholders() {
    const placeholders = extension_settings[extensionName].placeholders || [];
    
    // 플레이스홀더가 없을 때 안내 메시지 표시
    if (placeholders.length === 0) {
        return `
            <div class="no-placeholders-message">
                <p>아직 생성된 플레이스홀더가 없습니다.</p>
                <p>"추가" 버튼을 클릭하여 새로운 플레이스홀더를 만들어보세요.</p>
            </div>
        `;
    }
    
    return placeholders.map(placeholder => `
        <div class="placeholder-item" data-id="${placeholder.id}">
            <div class="placeholder-row">
                <input type="text" placeholder="제목" class="placeholder-name" value="${placeholder.name}">
                <input type="text" class="placeholder-variable" value="${placeholder.variable}" readonly>
                <div class="placeholder-buttons">
                    <button class="clean-placeholder" title="내용 제거">Clean</button>
                    <button class="remove-placeholder" title="플레이스홀더 삭제">Delete</button>
                </div>
            </div>
            <div class="placeholder-content">
                <textarea placeholder="여기에 내용을 입력하세요" class="placeholder-textarea">${placeholder.content}</textarea>
            </div>
        </div>
    `).join('');
}

// 이벤트 리스너 설정
function setupEventListeners(template) {
    // 새 플레이스홀더 추가 (변수명 입력 팝업 표시)
    template.find("#add-new-placeholder").on("click", async function() {
        const success = await showVariableNamePopup();
        if (success) {
            // UI 새로고침
            template.find('#placeholders-container').html(renderPlaceholders());
            setupEventListeners(template); // 이벤트 리스너 재설정
        }
    });
    
    // 각 플레이스홀더 항목의 이벤트
    template.find(".remove-placeholder").on("click", function() {
        const itemId = $(this).closest('.placeholder-item').data('id');
        removePlaceholder(itemId);
        // UI 새로고침
        template.find('#placeholders-container').html(renderPlaceholders());
        setupEventListeners(template); // 이벤트 리스너 재설정
    });
    
    template.find(".clean-placeholder").on("click", function() {
        const itemId = $(this).closest('.placeholder-item').data('id');
        cleanPlaceholder(itemId);
    });
    
    // 입력 필드 변경 감지 (실시간 시스템 적용)
    template.find(".placeholder-name, .placeholder-textarea").on("input", function() {
        const itemId = $(this).closest('.placeholder-item').data('id');
        updatePlaceholderAndApply(itemId);
    });
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

// 플레이스홀더 제거
function removePlaceholder(itemId) {
    // 삭제할 플레이스홀더 찾기
    const placeholderToRemove = extension_settings[extensionName].placeholders.find(p => p.id === itemId);
    
    // 시스템에서 먼저 제거
    if (placeholderToRemove) {
        removePlaceholderFromSystem(placeholderToRemove);
    }
    
    // 배열에서 제거
    extension_settings[extensionName].placeholders = extension_settings[extensionName].placeholders.filter(p => p.id !== itemId);
    saveSettingsDebounced();
}

// 플레이스홀더 내용 지우기
function cleanPlaceholder(itemId) {
    const placeholder = extension_settings[extensionName].placeholders.find(p => p.id === itemId);
    if (placeholder) {
        placeholder.content = "";
        $(`[data-id="${itemId}"] .placeholder-textarea`).val("");
        saveSettingsDebounced();
        
        // 빈 값으로 시스템에 적용
        applyPlaceholderToSystem(placeholder);
    }
}

// 플레이스홀더 업데이트 및 실시간 시스템 적용
function updatePlaceholderAndApply(itemId) {
    const item = $(`[data-id="${itemId}"]`);
    const placeholder = extension_settings[extensionName].placeholders.find(p => p.id === itemId);
    
    if (placeholder) {
        placeholder.name = item.find('.placeholder-name').val();
        placeholder.content = item.find('.placeholder-textarea').val();
        
        // 즉시 시스템에 적용
        applyPlaceholderToSystem(placeholder);
        
        saveSettingsDebounced();
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