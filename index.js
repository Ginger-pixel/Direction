// Direction 확장 - 다중 플레이스홀더 관리
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

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
    
    // 기본 플레이스홀더가 없으면 하나 추가
    if (!extension_settings[extensionName].placeholders || extension_settings[extensionName].placeholders.length === 0) {
        extension_settings[extensionName].placeholders = [
            { id: generateId(), name: "", variable: "", content: "" }
        ];
    }
}

// 고유 ID 생성
function generateId() {
    return 'placeholder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
    return placeholders.map(placeholder => `
        <div class="placeholder-item" data-id="${placeholder.id}">
            <div class="placeholder-row">
                <input type="text" placeholder="이름" class="placeholder-name" value="${placeholder.name}">
                <input type="text" placeholder="변수명" class="placeholder-variable" value="${placeholder.variable}">
                <div class="placeholder-buttons">
                    <button class="clean-placeholder" title="내용 제거">Clean</button>
                    <button class="remove-placeholder" title="플레이스홀더 삭제">삭제</button>
                </div>
            </div>
            <div class="placeholder-content">
                <textarea placeholder="여기에 내용을 입력하세요" class="placeholder-textarea">${placeholder.content}</textarea>
                <div class="placeholder-preview">{{${placeholder.variable || 'variable'}}}</div>
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
    
    // 새 플레이스홀더 추가
    $("#add-new-placeholder").on("click", addNewPlaceholder);
    
    // 각 플레이스홀더 항목의 이벤트
    $(document).on("click", ".remove-placeholder", function() {
        const itemId = $(this).closest('.placeholder-item').data('id');
        removePlaceholder(itemId);
    });
    
    $(document).on("click", ".clean-placeholder", function() {
        const itemId = $(this).closest('.placeholder-item').data('id');
        cleanPlaceholder(itemId);
    });
    
    // 입력 필드 변경 감지
    $(document).on("input", ".placeholder-name, .placeholder-variable, .placeholder-textarea", function() {
        const itemId = $(this).closest('.placeholder-item').data('id');
        updatePlaceholder(itemId);
    });
}

// 새 플레이스홀더 추가
function addNewPlaceholder() {
    const newPlaceholder = { id: generateId(), name: "", variable: "", content: "" };
    extension_settings[extensionName].placeholders.push(newPlaceholder);
    refreshPlaceholdersContainer();
    saveSettingsDebounced();
    updateAllPlaceholders();
}

// 플레이스홀더 제거
function removePlaceholder(itemId) {
    const placeholders = extension_settings[extensionName].placeholders;
    if (placeholders.length <= 1) {
        alert("최소 하나의 플레이스홀더는 있어야 합니다.");
        return;
    }
    
    extension_settings[extensionName].placeholders = placeholders.filter(p => p.id !== itemId);
    refreshPlaceholdersContainer();
    saveSettingsDebounced();
    updateAllPlaceholders();
}

// 플레이스홀더 내용 지우기
function cleanPlaceholder(itemId) {
    const placeholder = extension_settings[extensionName].placeholders.find(p => p.id === itemId);
    if (placeholder) {
        placeholder.content = "";
        $(`[data-id="${itemId}"] .placeholder-textarea`).val("");
        saveSettingsDebounced();
        updateAllPlaceholders();
    }
}

// 플레이스홀더 업데이트
function updatePlaceholder(itemId) {
    const item = $(`[data-id="${itemId}"]`);
    const placeholder = extension_settings[extensionName].placeholders.find(p => p.id === itemId);
    
    if (placeholder) {
        placeholder.name = item.find('.placeholder-name').val();
        placeholder.variable = item.find('.placeholder-variable').val();
        placeholder.content = item.find('.placeholder-textarea').val();
        
        // 변수명 미리보기 업데이트
        item.find('.placeholder-preview').text(`{{${placeholder.variable || 'variable'}}}`);
        
        saveSettingsDebounced();
        updateAllPlaceholders();
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

// 모든 플레이스홀더 값 업데이트
function updateAllPlaceholders() {
    const placeholders = extension_settings[extensionName].placeholders || [];
    
    // 각 플레이스홀더를 전역 변수로 설정
    placeholders.forEach(placeholder => {
        if (placeholder.variable && placeholder.variable.trim()) {
            window[`${placeholder.variable}Value`] = placeholder.content;
            
            // getContext를 통해서도 설정 시도
            const context = getContext();
            if (context && context.setExtensionPrompt) {
                context.setExtensionPrompt(`${extensionName}_${placeholder.variable}`, placeholder.content, 1, 0);
            }
        }
    });
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
}); 