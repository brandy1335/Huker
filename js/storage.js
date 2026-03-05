// storage.js - History and Prompt/Code Library logic

// --- HISTORY LOGIC ---
function saveToHistory(code, url) {
    chrome.storage.local.get(['codeSurferHistory'], (res) => {
        let h = res.codeSurferHistory || [];
        h.unshift({ code, url, time: new Date().toLocaleTimeString() });
        chrome.storage.local.set({ codeSurferHistory: h.slice(0, 10) });
    });
}

function renderHistory() {
    chrome.storage.local.get(['codeSurferHistory'], (res) => {
        const h = res.codeSurferHistory || [];
        document.getElementById('historyCount').textContent = `Entries: ${h.length}`;
        const deleteBtn = document.getElementById('deleteAllBtn');
        if (deleteBtn) deleteBtn.disabled = h.length === 0;

        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        historyList.innerHTML = h.map((item, index) => `
            <div style="border-bottom:1px solid #333; padding:8px; font-size:11px;">
                <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                    <div style="color:#666">${item.time} | ${item.url.substring(0, 25)}</div>
                    <button class="btn btn-outline btn-small load-history-btn" data-index="${index}" style="padding: 2px 6px; font-size: 0.6rem;">LOAD</button>
                </div>
                <div style="color:#00ff41; overflow:hidden;">${item.code.substring(0, 60)}...</div>
            </div>
        `).join('') || '<p class="sub-text text-center">No logs found.</p>';

        document.querySelectorAll('.load-history-btn').forEach(b => {
            b.onclick = (e) => {
                const index = e.target.getAttribute('data-index');
                const logItem = h[index];
                if (logItem && typeof editor !== 'undefined' && editor) {
                    editor.value = logItem.code;
                    showSection('main');
                    setStatus('LOG_LOADED', 'success');
                }
            };
        });
    });
}

// Ensure the clear history button is bound if available on load
document.addEventListener('DOMContentLoaded', () => {
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', () => {
            chrome.storage.local.set({ codeSurferHistory: [] }, () => {
                renderHistory();
                setStatus('HISTORY PURGED', 'success');
            });
        });
    }
});

// --- LIBRARY LOGIC ---
function renderLibraryCode() {
    const libraryList = document.getElementById('libraryList');
    if (!libraryList) return;

    chrome.storage.local.get(['savedCodeLibrary'], (res) => {
        const lib = res.savedCodeLibrary || {};
        const entries = Object.keys(lib);

        if (entries.length === 0) {
            libraryList.innerHTML = '<p class="sub-text text-center">No stored code snippets.</p>';
            return;
        }

        libraryList.innerHTML = entries.map(title => `
            <div class="library-item" style="border-bottom:1px solid #333; padding:8px; margin-bottom:5px;">
                <h4 style="color:#00ff41; margin-bottom: 4px;">${title}</h4>
                <div style="font-size:11px; color:#aaa; margin-bottom: 6px; overflow:hidden;">${lib[title].code.substring(0, 80)}...</div>
                <button class="btn btn-outline btn-small use-code-btn" data-title="${title}">LOAD</button>
                <button class="btn btn-danger-outline btn-small del-code-btn" data-title="${title}" style="margin-left:5px;">DEL</button>
            </div>
        `).join('');

        document.querySelectorAll('.use-code-btn').forEach(b => {
            b.onclick = (e) => {
                const title = e.target.getAttribute('data-title');
                if (editor) editor.value = lib[title].code;
                showSection('main');
                setStatus('CODE_LOADED', 'success');
            }
        });
        document.querySelectorAll('.del-code-btn').forEach(b => {
            b.onclick = (e) => {
                const title = e.target.getAttribute('data-title');
                delete lib[title];
                chrome.storage.local.set({ savedCodeLibrary: lib }, renderLibraryCode);
            }
        });
    });
}

function renderLibraryPrompts() {
    const libraryList = document.getElementById('libraryList');
    if (!libraryList) return;

    chrome.storage.local.get(['savedPromptLibrary'], (res) => {
        const lib = res.savedPromptLibrary || {};
        const entries = Object.keys(lib);

        if (entries.length === 0) {
            libraryList.innerHTML = '<p class="sub-text text-center">No stored prompts.</p>';
            return;
        }

        libraryList.innerHTML = entries.map(title => `
            <div class="library-item" style="border-bottom:1px solid #333; padding:8px; margin-bottom:5px;">
                <h4 style="color:#bc13fe; margin-bottom: 4px;">${title}</h4>
                <div style="font-size:11px; color:#aaa; margin-bottom: 6px; overflow:hidden;">${lib[title].substring(0, 80)}...</div>
                <button class="btn btn-outline btn-small use-prompt-btn" data-title="${title}">LOAD</button>
                <button class="btn btn-danger-outline btn-small del-prompt-btn" data-title="${title}" style="margin-left:5px;">DEL</button>
            </div>
        `).join('');

        document.querySelectorAll('.use-prompt-btn').forEach(b => {
            b.onclick = (e) => {
                const title = e.target.getAttribute('data-title');
                const queryBox = document.getElementById('aiQuery');
                if (queryBox) queryBox.value = lib[title];
                showSection('main');
                setStatus('PROMPT_LOADED', 'success');
            }
        });
        document.querySelectorAll('.del-prompt-btn').forEach(b => {
            b.onclick = (e) => {
                const title = e.target.getAttribute('data-title');
                delete lib[title];
                chrome.storage.local.set({ savedPromptLibrary: lib }, renderLibraryPrompts);
            }
        });
    });
}
