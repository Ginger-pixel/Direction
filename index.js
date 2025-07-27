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
                    <p>변수명을 입력하세요:</p>
                    <input type="text" id="variable-name-input" placeholder="예: character, setting, mood" maxlength="50">
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
        alert("변수명을 입력해주세요.");
        return;
    }
    
    // 영문, 숫자, 언더스코어만 허용
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variableName)) {
        alert("변수명은 영문, 숫자, 언더스코어(_)만 사용하고 숫자로 시작할 수 없습니다.");
        return;
    }
    
    // 중복 검사
    const existingVariables = extension_settings[extensionName].placeholders.map(p => p.variable);
    if (existingVariables.includes(variableName)) {
        alert("이미 존재하는 변수명입니다.");
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
            console.log(`플레이스홀더 등록: ${placeholderPattern} = "${placeholder.content}"`);
        }
        
        console.log(`플레이스홀더 적용됨: {{${variableName}}} = "${placeholder.content}"`);
    }
}

// 시스템에서 플레이스홀더 제거
function removePlaceholderFromSystem(placeholder) {
    if (placeholder.variable && placeholder.variable.trim()) {
        const variableName = placeholder.variable.trim();
        
        // 전역 변수 제거
        if (window[`${variableName}Value`]) {
            delete window[`${variableName}Value`];
            console.log(`전역 변수 제거됨: ${variableName}Value`);
        }
        
        // getContext를 통한 제거 시도
        const context = getContext();
        if (context && context.setExtensionPrompt) {
            context.setExtensionPrompt(`${extensionName}_${variableName}`, "", 1, 0);
            console.log(`컨텍스트에서 제거됨: ${extensionName}_${variableName}`);
        }
        
        console.log(`플레이스홀더 시스템에서 제거됨: {{${variableName}}}`);
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
    
    console.log(`플레이스홀더 완전 제거 완료: ${placeholderToRemove?.variable || 'unknown'}`);
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

// 슬래시 커맨드 등록 (개선된 버전)
function registerSlashCommands() {
    console.log("registerSlashCommands 함수 호출됨");
    console.log("SlashCommandParser:", typeof SlashCommandParser);
    console.log("SlashCommand:", typeof SlashCommand);
    
    // 방법 1: 직접 임포트한 클래스 사용
    if (typeof SlashCommandParser !== 'undefined' && typeof SlashCommand !== 'undefined') {
        try {
            SlashCommandParser.addCommandObject(SlashCommand.fromProps({
                name: 'placeholder',
                callback: async (parsedArgs) => {
                    console.log("슬래시 커맨드 /placeholder 실행됨");
                    openDirectionPopup();
                    return '';
                },
                helpString: '플레이스홀더 관리 창을 엽니다.\n사용법: /placeholder',
                namedArgumentList: [],
                returns: '플레이스홀더 관리 창 열기',
            }));
            
            console.log("플레이스홀더 슬래시 커맨드가 성공적으로 등록되었습니다: /placeholder");
            return;
        } catch (error) {
            console.error("임포트된 클래스로 슬래시 커맨드 등록 실패:", error);
        }
    }
    
    // 방법 2: window 객체에서 찾기 (fallback)
    if (window.SlashCommandParser && window.SlashCommand) {
        try {
            window.SlashCommandParser.addCommandObject(window.SlashCommand.fromProps({
                name: 'placeholder',
                callback: async (parsedArgs) => {
                    console.log("슬래시 커맨드 /placeholder 실행됨");
                    openDirectionPopup();
                    return '';
                },
                helpString: '플레이스홀더 관리 창을 엽니다.\n사용법: /placeholder',
                namedArgumentList: [],
                returns: '플레이스홀더 관리 창 열기',
            }));
            
            console.log("플레이스홀더 슬래시 커맨드가 성공적으로 등록되었습니다 (fallback): /placeholder");
            return;
        } catch (error) {
            console.error("window 객체로 슬래시 커맨드 등록 실패:", error);
        }
    }
    
    // 방법 3: 구식 addCommand 방법 시도
    if (window.SlashCommandParser && typeof window.SlashCommandParser.addCommand === 'function') {
        try {
            window.SlashCommandParser.addCommand('placeholder', function() {
                console.log("슬래시 커맨드 /placeholder 실행됨 (구식 방법)");
                openDirectionPopup();
                return '';
            }, [], '<span class="monospace">/placeholder</span> – 플레이스홀더 관리 창을 엽니다', true, true);
            
            console.log("플레이스홀더 슬래시 커맨드가 성공적으로 등록되었습니다 (구식 방법): /placeholder");
            return;
        } catch (error) {
            console.error("구식 addCommand로 슬래시 커맨드 등록 실패:", error);
        }
    }
    
    console.log("모든 슬래시 커맨드 등록 방법이 실패했습니다. 5초 후 재시도...");
    setTimeout(registerSlashCommands, 5000);
}

// 요술봉메뉴에 버튼 추가
async function addToWandMenu() {
    try {
        const buttonHtml = await $.get(`${extensionFolderPath}/button.html`);
        
        const extensionsMenu = $("#extensionsMenu");
        if (extensionsMenu.length > 0) {
            extensionsMenu.append(buttonHtml);
            $("#direction_button").on("click", openDirectionPopup);
            console.log("Direction 버튼이 요술봉메뉴에 추가되었습니다.");
        } else {
            console.log("요술봉메뉴를 찾을 수 없습니다. 다시 시도합니다...");
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
    
    console.log("Direction 확장이 로드되었습니다.");
    
    // SillyTavern이 완전히 로드된 후 슬래시 커맨드 등록
    // 여러 방법으로 적절한 타이밍을 찾음
    if (document.readyState === 'complete') {
        setTimeout(registerSlashCommands, 2000); // 2초 후
    } else {
        window.addEventListener('load', () => {
            setTimeout(registerSlashCommands, 3000); // 로드 완료 후 3초
        });
    }
    
    // 추가 안전장치: 10초 후 한 번 더 시도
    setTimeout(registerSlashCommands, 10000);
}); 