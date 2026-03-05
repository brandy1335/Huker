// ai-agent.js - DOM Scanning and smart agent interactions

let currentWebsiteContext = "";

document.addEventListener('DOMContentLoaded', () => {
    const scanBtn = document.getElementById('scanBtn');
    const agentSendBtn = document.getElementById('agentSendBtn');

    if (scanBtn) {
        scanBtn.addEventListener('click', async () => {
            showSection('agent');
            let tabs;
            try {
                tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            } catch (e) {
                return setStatus('TAB_ERROR', 'error');
            }
            if (!tabs || tabs.length === 0) return;
            let tab = tabs[0];

            setStatus('SCANNING_DOM...', 'neutral');

            const agentPageTitle = document.getElementById('agentPageTitle');
            if (agentPageTitle) agentPageTitle.textContent = `Target: ${tab.title.substring(0, 20)}...`;

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    return JSON.stringify(Array.from(document.querySelectorAll('input, button, a, [role="button"]'))
                        .map(el => ({
                            tag: el.tagName,
                            id: el.id || 'no-id',
                            name: el.name || 'no-name',
                            placeholder: el.placeholder || '',
                            text: el.innerText?.substring(0, 20).trim() || '',
                            type: el.type || ''
                        })).slice(0, 20)); // Top 20 elements kafi hain context ke liye
                }
            }, (results) => {
                currentWebsiteContext = results && results[0] ? results[0].result : "No elements found";
                const chatArea = document.getElementById('agentChatArea');
                if (chatArea) {
                    chatArea.innerHTML += `
                        <div class="log-entry system-log">
                            <span class="prefix">SYS:</span> Website structure analyzed. I know about the buttons and inputs here. Ready for commands.
                        </div>
                    `;
                }
                setStatus('SCAN_COMPLETE', 'success');
            });
        });
    }

    if (agentSendBtn) {
        agentSendBtn.addEventListener('click', async () => {
            const agentInput = document.getElementById('agentInput');
            if (!agentInput) return;
            const query = agentInput.value.trim();
            if (!query) return setStatus('PLEASE_ENTER_COMMAND', 'error');

            // Log user chat
            const chatArea = document.getElementById('agentChatArea');
            if (chatArea) {
                chatArea.innerHTML += `
                    <div class="log-entry" style="color: #bc13fe; margin-top:5px;">
                        <span class="prefix">USER:</span> ${query}
                    </div>
                `;
            }

            // Smart Prompt with HTML Snippet Context already gathered during scan
            const fullPrompt = `ACT AS A WEB AGENT. 
CURRENT_PAGE_HTML_SNIPPET: ${currentWebsiteContext}
USER_REQUEST: ${query}
INSTRUCTION: Based on the snippet, write JS to perform the request. Return ONLY code. 
CRITICAL RULE: If creating NEW overlay elements (like floating popups or buttons), simply use document.body.appendChild. DO NOT try to insert them relative to elements in the snippet using insertBefore because it causes errors.`;

            // AI ko code generate karne bhejte hain
            const agentCodeEditor = document.getElementById('agentCodeEditor');
            if (typeof handleGeneration === 'function' && agentCodeEditor) {
                handleGeneration(fullPrompt, agentCodeEditor);
            }

            // Preview panel ko show karte hain
            const previewPanel = document.getElementById('agentCodePreview');
            if (previewPanel) previewPanel.classList.remove('hidden');
        });
    }

    const agentExecuteBtn = document.getElementById('agentExecuteBtn');
    if (agentExecuteBtn) {
        agentExecuteBtn.addEventListener('click', () => {
            const agentCodeEditor = document.getElementById('agentCodeEditor');
            if (agentCodeEditor && typeof runPayload === 'function') {
                runPayload(agentCodeEditor.value);
            }
        });
    }
});
