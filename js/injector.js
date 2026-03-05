// injector.js - Execution bridge for chrome scripting

// --- CORE EXECUTION (Main Bridge) ---
async function runPayload(codeToRun) {
    if (!codeToRun.trim()) return setStatus('EMPTY_PAYLOAD', 'error');

    let tabs;
    try {
        tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    } catch (e) {
        return setStatus('TAB_ERROR', 'error');
    }

    if (!tabs || tabs.length === 0) return setStatus('NO_ACTIVE_TAB', 'error');
    let tab = tabs[0];

    setStatus('INJECTING...', 'neutral');
    chrome.runtime.sendMessage({
        action: 'executeCode',
        code: codeToRun,
        tabId: tab.id
    }, (res) => {
        if (res?.status === 'Success') {
            setStatus('DEPLOYED_SUCCESSFULLY', 'success');
            if (typeof saveToHistory === 'function') {
                saveToHistory(codeToRun, tab.url);
            }
            // --- AUTO-LEARNING PROCESS ---
            if (typeof HukerAIEngine !== 'undefined') {
                // Determine active prompt box based on which is visible or has value
                let queryVal = '';
                const mainQuery = document.getElementById('aiQuery');
                const elQuery = document.getElementById('elementAiQuery');
                if (mainQuery && !mainQuery.closest('.hidden')) queryVal = mainQuery.value;
                else if (elQuery && !elQuery.closest('.hidden')) queryVal = elQuery.value;

                if (queryVal.trim()) {
                    HukerAIEngine.learn(queryVal, codeToRun, tab.url);
                }
            }
        } else {
            setStatus('ERROR: ' + res?.error, 'error');
        }
    });
}
