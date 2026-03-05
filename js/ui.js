// ui.js - Central UI State & View Controller

// Shared Global UI Elements
const views = {
    main: document.getElementById('mainView'),
    element: document.getElementById('elementEditorView'),
    history: document.getElementById('historyView'),
    agent: document.getElementById('agentView'),
    library: document.getElementById('libraryView')
};

const editor = document.getElementById('codeEditor');
const statusMessage = document.getElementById('statusMessage');

// Core Utilities
function showSection(name) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[name].classList.remove('hidden');
    // We defer renderHistory check here or do it externally
    if (name === 'history' && typeof renderHistory === 'function') {
        renderHistory();
    }
}

function setStatus(msg, type = 'neutral') {
    if (!statusMessage) return;
    statusMessage.textContent = msg;
    statusMessage.className = `status-bar ${type}`;
    statusMessage.classList.remove('hidden');
    setTimeout(() => statusMessage.classList.add('hidden'), 4000);
}

// Global Provider UI State Updater
function updateSelectColor() {
    const selectEl = document.getElementById('simpleProviderSelect');
    if (!selectEl) return;
    const selectedOpt = selectEl.options[selectEl.selectedIndex];
    if (selectedOpt) {
        selectEl.style.color = selectedOpt.style.color || '#00ff41';
    }
}
