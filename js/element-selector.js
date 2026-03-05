// element-selector.js - UI Element selector logic

let currentSelector = "";

// --- ELEMENT SELECTOR ---
document.addEventListener('DOMContentLoaded', () => {
    const selectBtn = document.getElementById('selectBtn');
    if (selectBtn) {
        selectBtn.addEventListener('click', async () => {
            let tabs;
            try {
                tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            } catch (e) {
                return setStatus("TAB_ERROR", "error");
            }
            if (!tabs || tabs.length === 0) return;
            let tab = tabs[0];

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    let lastEl = null;
                    const mover = (e) => {
                        if (lastEl) lastEl.style.outline = '';
                        lastEl = e.target;
                        lastEl.style.outline = '2px solid #00ff41';
                    };
                    const clicker = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        document.removeEventListener('mouseover', mover);
                        document.removeEventListener('click', clicker);
                        if (lastEl) lastEl.style.outline = '';
                        const selector = e.target.id ? `#${e.target.id}` : `${e.target.tagName.toLowerCase()}.${e.target.className.split(' ').join('.')}`;
                        chrome.runtime.sendMessage({ action: 'elementSelected', selector: selector, tag: e.target.tagName });
                        alert('TARGET_LOCKED: ' + selector);
                    };
                    document.addEventListener('mouseover', mover);
                    document.addEventListener('click', clicker, { capture: true, once: true });
                }
            });
            window.close();
        });
    }

    // --- STORAGE MONITORING FOR ELEMENT SELECTOR ---
    setInterval(() => {
        chrome.storage.local.get(['elementSelector', 'openElementEditor'], (data) => {
            if (data.openElementEditor) {
                currentSelector = data.elementSelector;
                const csEl = document.getElementById('currentSelector');
                if (csEl) csEl.textContent = `TARGET: ${currentSelector}`;
                chrome.storage.local.remove('openElementEditor');
                showSection('element');
            }
        });
    }, 1000);
});
