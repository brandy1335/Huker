// popup.js - (MAIN CONTROLLER HUB)
// All specific logic is moved to respective files in js/ folder to keep it clean!

window.addEventListener('DOMContentLoaded', () => {
    // === PROVIDER DROPDOWN ===
    const selectEl = document.getElementById('simpleProviderSelect');
    if (selectEl) {
        chrome.storage.local.get(['selectedProvider', 'deadProviders'], (res) => {
            if (res.selectedProvider) {
                selectEl.value = res.selectedProvider;
            }
            // Mark previously dead providers as red
            const deadProv = res.deadProviders || {};
            Array.from(selectEl.options).forEach(opt => {
                if (deadProv[opt.value]) {
                    opt.style.color = '#ff003c'; // Red for dead
                } else {
                    opt.style.color = '#00ff41'; // Green for working
                }
            });
            updateSelectColor();
        });

        selectEl.addEventListener('change', (e) => {
            chrome.storage.local.set({ selectedProvider: e.target.value });
            updateSelectColor();
        });
    }

    // === LOAD INITIAL AUTO-PROMPT SUGGESTIONS ===
    if (typeof loadPromptSuggestions === 'function') {
        loadPromptSuggestions();
    }
});

// === GLOBAL EVENT BINDING ===
document.addEventListener('DOMContentLoaded', () => {
    // UI Suggestions Refresh
    const refreshBtn = document.getElementById('refreshSuggestionsBtn');
    if (refreshBtn && typeof loadPromptSuggestions === 'function') {
        refreshBtn.addEventListener('click', loadPromptSuggestions);
    }

    // Settings Vault Entry
    const settingsBtn = document.getElementById('openSettingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
        });
    }

    // --- EVENT LISTENERS (Main App View) ---
    document.getElementById('executeBtn').addEventListener('click', () => {
        if (typeof runPayload === 'function' && editor) runPayload(editor.value);
    });
    document.getElementById('generateBtn').addEventListener('click', () => {
        if (typeof handleGeneration === 'function') handleGeneration(document.getElementById('aiQuery'), editor);
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        if (editor) editor.value = '';
        setStatus('EDITOR_CLEARED', 'neutral');
    });

    // Save To Library Listeners
    document.getElementById('saveLibraryBtn').addEventListener('click', () => {
        const code = editor.value.trim();
        const promptText = document.getElementById('aiQuery').value.trim();
        if (!code) return setStatus('NOTHING TO SAVE', 'error');

        const title = prompt("Enter a title for this snippet:");
        if (!title) return;

        chrome.storage.local.get(['savedCodeLibrary'], (res) => {
            let lib = res.savedCodeLibrary || {};
            lib[title] = { code, time: new Date().toLocaleTimeString() };
            chrome.storage.local.set({ savedCodeLibrary: lib }, () => {
                setStatus('SAVED TO LIBRARY', 'success');
                // HUKER AI LEARNING PROCESS
                if (typeof HukerAIEngine !== 'undefined' && promptText) {
                    HukerAIEngine.learn(promptText, code, "code_library");
                }
            });
        });
    });

    document.getElementById('savePromptBtn').addEventListener('click', () => {
        const promptText = document.getElementById('aiQuery').value.trim();
        const code = editor.value.trim();
        if (!promptText) return setStatus('NO PROMPT TO SAVE', 'error');
        const title = prompt("Enter a title for this prompt:");
        if (!title) return;

        chrome.storage.local.get(['savedPromptLibrary'], (res) => {
            let lib = res.savedPromptLibrary || {};
            lib[title] = promptText;
            chrome.storage.local.set({ savedPromptLibrary: lib }, () => {
                setStatus('PROMPT SAVED', 'success');
                // HUKER AI LEARNING PROCESS
                if (typeof HukerAIEngine !== 'undefined' && code) {
                    HukerAIEngine.learn(promptText, code, "prompt_library");
                }
            });
        });
    });

    // --- EVENT LISTENERS (Element Editor View) ---
    const elementExecuteBtn = document.getElementById('elementExecuteBtn');
    if (elementExecuteBtn) {
        elementExecuteBtn.addEventListener('click', () => {
            if (typeof runPayload === 'function') runPayload(document.getElementById('elementCodeEditor').value);
        });
    }

    const elementGenerateBtn = document.getElementById('elementGenerateBtn');
    if (elementGenerateBtn) {
        elementGenerateBtn.addEventListener('click', () => {
            // Note: currentSelector is defined globally in element-selector.js
            if (typeof currentSelector !== 'undefined') {
                const p = `Selector: ${currentSelector}. Task: ${document.getElementById('elementAiQuery').value}`;
                if (typeof handleGeneration === 'function') handleGeneration(p, document.getElementById('elementCodeEditor'));
            }
        });
    }

    // --- UI NAVIGATION BINDINGS ---
    document.getElementById('historyBtn').addEventListener('click', () => showSection('history'));
    document.getElementById('libraryBtn').addEventListener('click', () => {
        showSection('library');
        if (typeof renderLibraryCode === 'function') renderLibraryCode();
    });

    const showCodesBtn = document.getElementById('showCodesBtn');
    if (showCodesBtn) showCodesBtn.addEventListener('click', () => {
        if (typeof renderLibraryCode === 'function') renderLibraryCode();
    });

    const showPromptsBtn = document.getElementById('showPromptsBtn');
    if (showPromptsBtn) showPromptsBtn.addEventListener('click', () => {
        if (typeof renderLibraryPrompts === 'function') renderLibraryPrompts();
    });

    // View Back Buttons
    const backBtns = ['backToMainBtn', 'backToMainFromAgentBtn', 'backToMainFromHistoryBtn', 'backToMainFromLibraryBtn'];
    backBtns.forEach(id => {
        let btn = document.getElementById(id);
        if (btn) btn.onclick = () => showSection('main');
    });
});