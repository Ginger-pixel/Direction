// Direction 확장 - 전개 지시 기능
import { extension_settings, getContext, loadExtensionSettings, registerSlashCommand } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

// 확장 설정
const extensionName = "Direction";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const extensionSettings = extension_settings[extensionName];
const defaultSettings = {
    direction_text: ""
};

// 설정 로드
async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }
}

// 전개 지시 창 열기
function openDirectionPopup() {
    // 기존 팝업이 있으면 제거
    $("#direction-popup").remove();
    
    // 팝업 HTML 생성
    const popupHtml = `
        <div id="direction-popup" class="direction-popup">
            <div class="direction-popup-content">
                <div class="direction-popup-header">
                    <h3>전개 지시</h3>
                    <button class="direction-close-btn">&times;</button>
                </div>
                <div class="direction-popup-body">
                    <textarea id="direction-text" placeholder="전개 지시 내용을 입력하세요...">${extension_settings[extensionName].direction_text || ""}</textarea>
                    <div class="direction-popup-buttons">
                        <button id="direction-clean-btn" class="menu_button">Clean</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 팝업을 body에 추가
    $("body").append(popupHtml);
    
    // 이벤트 리스너 추가
    $("#direction-popup .direction-close-btn").on("click", closeDirectionPopup);
    $("#direction-popup").on("click", function(e) {
        if (e.target === this) {
            closeDirectionPopup();
        }
    });
    
    $("#direction-clean-btn").on("click", function() {
        $("#direction-text").val("");
        extension_settings[extensionName].direction_text = "";
        saveSettingsDebounced();
        updateDirectionPlaceholder("");
    });
    
    $("#direction-text").on("input", function() {
        const value = $(this).val();
        extension_settings[extensionName].direction_text = value;
        saveSettingsDebounced();
        updateDirectionPlaceholder(value);
    });
    
    // 포커스 설정
    $("#direction-text").focus();
}

// 팝업 닫기
function closeDirectionPopup() {
    $("#direction-popup").remove();
}

// {{direction}} 플레이스홀더 업데이트
function updateDirectionPlaceholder(value) {
    // getContext를 통해 현재 컨텍스트에 direction 값 설정
    const context = getContext();
    if (context && context.setExtensionPrompt) {
        context.setExtensionPrompt(extensionName, value, 1, 0);
    }
    
    // 전역 변수로도 설정 (다른 방식으로 접근할 수 있도록)
    window.directionValue = value;
}

// 요술봉메뉴에 항목 추가
function addToWandMenu() {
    // 요술봉 메뉴 버튼 찾기
    const wandMenu = $("#extensionsMenu, #quickActionMenu, #extensions_settings, .extensions-menu");
    
    if (wandMenu.length === 0) {
        // 다른 방법으로 메뉴에 추가 시도
        setTimeout(addToWandMenu, 1000);
        return;
    }
    
    // 전개 지시 버튼 생성
    const directionButton = $(`
        <div id="direction-menu-item" class="list-group-item flex-container flexGap5" data-i18n="Direction">
            <div class="fa-solid fa-compass extension-menu-icon"></div>
            <span>전개 지시</span>
        </div>
    `);
    
    // 클릭 이벤트 추가
    directionButton.on("click", openDirectionPopup);
    
    // 메뉴에 추가
    wandMenu.first().append(directionButton);
}

// 확장 초기화
jQuery(async () => {
    // 설정 로드
    await loadSettings();
    
    // 요술봉메뉴에 항목 추가
    addToWandMenu();
    
    // {{direction}} 플레이스홀더 등록
    updateDirectionPlaceholder(extension_settings[extensionName].direction_text || "");
    
    console.log("Direction 확장이 로드되었습니다.");
}); 