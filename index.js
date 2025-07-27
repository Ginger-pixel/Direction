// Direction 확장 - 다중 플레이스홀더 관리
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";
import { SlashCommand } from "../../../slash-commands/SlashCommand.js";
import { SlashCommandParser } from "../../../slash-commands/SlashCommandParser.js";
import { ARGUMENT_TYPE, SlashCommandNamedArgument } from "../../../slash-commands/SlashCommandArgument.js";

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
function showVariableNamePopup() {
    // 기존 팝업이 있으면 제거
    $("#variable-name-popup").remove();
    
    const popupHtml = `
        <div id="variable-name-popup" class="direction-popup">
            <div class="variable-name-popup-content">
                <div class="variable-name-popup-header">
                    <h3>변수명 입력</h3>
                </div>
                <div class="variable-name-popup-body">
                    <p>플레이스홀더 변수명을 입력하세요:</p>
                    <input type="text" id="variable-name-input" placeholder="예: character, setting, mood" maxlength="50">
                    <small>영문, 숫자, 언더스코어(_)만 사용 가능하며 숫자로 시작할 수 없습니다.</small>
                    <div class="variable-name-popup-buttons">
                        <button id="variable-name-cancel" class="popup-btn cancel-btn">취소</button>
                        <button id="variable-name-confirm" class="popup-btn confirm-btn">확인</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    $("body").append(popupHtml);
    
    // 이벤트 리스너
    $("#variable-name-cancel").on("click", closeVariableNamePopup);
    $("#variable-name-confirm").on("click", confirmVariableName);
    
    // Enter 키로 확인
    $("#variable-name-input").on("keypress", function(e) {
        if (e.which === 13) {
            confirmVariableName();
        }
    });
    
    // ESC 키로 취소
    $(document).on("keydown.variable-popup", function(e) {
        if (e.which === 27) {
            closeVariableNamePopup();
        }
    });
    
    // 입력 필드에 포커스
    setTimeout(() => $("#variable-name-input").focus(), 100);
}

// 변수명 확인
function confirmVariableName() {
    const variableName = $("#variable-name-input").val().trim();
    
    if (!variableName) {
        $("#variable-name-input").focus();
        return;
    }
    
    // 영문, 숫자, 언더스코어만 허용
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variableName)) {
        $("#variable-name-input").val('').focus();
        return;
    }
    
    // 중복 검사
    const existingVariables = extension_settings[extensionName].placeholders.map(p => p.variable);
    if (existingVariables.includes(variableName)) {
        $("#variable-name-input").val('').focus();
        return;
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
    
    // UI 새로고침
    refreshPlaceholdersContainer();
    saveSettingsDebounced();
    
    // 팝업 닫기
    closeVariableNamePopup();
}

// 변수명 팝업 닫기
function closeVariableNamePopup() {
    $("#variable-name-popup").remove();
    $(document).off("keydown.variable-popup");
}

// 플레이스홀더 창 열기
function openDirectionPopup() {
    // 기존 팝업이 있으면 제거
    $("#direction-popup").remove();
    
    // 팝업 HTML 생성
    const popupHtml = `
        <div id="direction-popup" class="direction-popup">
            <div class="direction-popup-content">
                <div class="direction-popup-header">
                    <h3>플레이스홀더 관리</h3>
                    <button class="direction-close-btn">&times;</button>
                </div>
                <div class="direction-popup-body">
                    <div id="placeholders-container">
                        ${renderPlaceholders()}
                    </div>
                    <div class="direction-popup-buttons">
                        <button id="add-new-placeholder" class="menu_button add-btn">추가</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 팝업을 body에 추가
    $("body").append(popupHtml);
    
    // 이벤트 리스너 추가
    setupEventListeners();
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
function setupEventListeners() {
    // 팝업 닫기
    $("#direction-popup .direction-close-btn").on("click", closeDirectionPopup);
    $("#direction-popup").on("click", function(e) {
        if (e.target === this) {
            closeDirectionPopup();
        }
    });
    
    // 새 플레이스홀더 추가 (변수명 입력 팝업 표시)
    $("#add-new-placeholder").on("click", showVariableNamePopup);
    
    // 각 플레이스홀더 항목의 이벤트
    $(document).on("click", ".remove-placeholder", function() {
        const itemId = $(this).closest('.placeholder-item').data('id');
        removePlaceholder(itemId);
    });
    
    $(document).on("click", ".clean-placeholder", function() {
        const itemId = $(this).closest('.placeholder-item').data('id');
        cleanPlaceholder(itemId);
    });
    
    // 입력 필드 변경 감지 (실시간 시스템 적용)
    $(document).on("input", ".placeholder-name, .placeholder-textarea", function() {
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
    refreshPlaceholdersContainer();
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

// 플레이스홀더 컨테이너 새로고침
function refreshPlaceholdersContainer() {
    $("#placeholders-container").html(renderPlaceholders());
}

// 팝업 닫기
function closeDirectionPopup() {
    $("#direction-popup").remove();
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