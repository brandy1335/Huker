// ai-engine.js - Handles communication with background AI handler and Groq prompt suggestions

// --- PROMPT SUGGESTIONS (Hacker Style via Live AI) ---
async function loadPromptSuggestions() {
    const chipContainer = document.getElementById('suggestionChips');
    if (!chipContainer) return;

    chrome.storage.local.get(['hukerApiKeys'], async (res) => {
        const groqKey = res.hukerApiKeys?.groq;
        if (!groqKey) {
            chipContainer.innerHTML = '<span style="color: #ff003c; font-size: 0.65rem;">[!] Groq API Key missing in Settings Vault.</span>';
            return;
        }

        chipContainer.innerHTML = '<span style="color: #bc13fe; font-size: 0.65rem;">[*] Syncing live ideas from Groq AI...</span>';

        try {
            const fetchRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [{
                        role: "user",
                        content: "Generate exactly 3 short, unique, creative ideas for modifying a webpage using JavaScript (e.g., 'Change background to neon', 'Remove all ads'). Make them sound like hacker tasks. Provide ONLY a JSON array of 3 strings, with no markdown, backticks, or extra text. Example: [\"idea 1\", \"idea 2\", \"idea 3\"]"
                    }],
                    temperature: 0.9,
                    max_tokens: 100
                })
            });

            const data = await fetchRes.json();
            let suggestions = [];
            try {
                const content = data.choices[0].message.content.trim();
                suggestions = JSON.parse(content);
                if (!Array.isArray(suggestions)) throw new Error('Not an array');
            } catch (parseErr) {
                // Fallback if AI fails to return strict JSON
                suggestions = [
                    "Remove all ad banners and sidebars",
                    "Highlight all password fields in neon red",
                    "Bypass copy-paste restrictions entirely"
                ];
            }

            chipContainer.innerHTML = '';
            suggestions.slice(0, 3).forEach(promptText => {
                const chip = document.createElement('span');
                chip.textContent = promptText.length > 35 ? promptText.substring(0, 35) + '...' : promptText;
                chip.style.cssText = 'background: #1a1a1a; border: 1px solid #bc13fe; color: #bc13fe; font-size: 0.65rem; padding: 3px 6px; cursor: pointer; border-radius: 2px;';
                chip.title = promptText;

                chip.addEventListener('mouseover', () => chip.style.background = '#330a47');
                chip.addEventListener('mouseout', () => chip.style.background = '#1a1a1a');

                chip.addEventListener('click', () => {
                    const queryBox = document.getElementById('aiQuery');
                    if (queryBox) {
                        queryBox.value = promptText;
                        queryBox.focus();
                    }
                });

                chipContainer.appendChild(chip);
            });

        } catch (err) {
            console.error("Groq Suggestions Error:", err);
            chipContainer.innerHTML = '<span style="color: #ff003c; font-size: 0.65rem;">[!] Failed to sync AI suggestions.</span>';
        }
    }); // <-- Close the chrome.storage.local.get callback here
}

// --- AI GENERATION ENGINE ---
async function handleGeneration(promptInput, targetEditor) {
    let prompt = (typeof promptInput === 'string') ? promptInput : promptInput.value.trim();
    if (!prompt) return setStatus('INPUT_REQUIRED', 'error');

    // Get selected provider from original constants
    const selectEl = document.getElementById('simpleProviderSelect');
    let providerId = selectEl ? selectEl.value : 'openrouter';

    // Fetch API keys from Vault
    const storeObj = await new Promise(resolve => chrome.storage.local.get(['hukerApiKeys'], resolve));
    const vaultKeys = storeObj.hukerApiKeys || {};

    // === HUKER AI RAG MEMORY CHECK ===
    if (providerId === 'huker_ai' && typeof HukerAIEngine !== 'undefined') {
        setStatus('AI_RECALLING...', 'neutral');
        const memory = await HukerAIEngine.recall(prompt);
        if (memory && memory.code) {
            if (memory.exact) {
                let cleanMemCode = memory.code.replace(/^`+|`+$/g, '').trim();
                targetEditor.value = cleanMemCode;
                setStatus('HUKER AI: Recalled from memory!', 'success');
                return;
            } else {
                setStatus('HUKER AI: Adapting from memory...', 'neutral');
                // Use the memory as context, but pass it to Groq to generate a new variation
                prompt = `CONTEXT: You previously wrote code for a similar task:\nPrevious Task: "${memory.prompt}"\nPrevious Code: ${memory.code}\n\nNEW TASK (Very Important):\n${prompt}\n\nINSTRUCTION: The previous code is just a reference for your coding style. Write NEW code to solve the NEW TASK perfectly. DO NOT include actions from the previous task if they are unrelated to the new task! Return ONLY raw Javascript code, without any markdown formatting or backticks.`;
            }
        } else {
            setStatus('HUKER AI: Formulating thought...', 'neutral');
        }
        // Fallback to real AI to process the thought
        providerId = 'groq';
    }

    const cfg = PRESET_PROVIDERS[providerId] || {};
    // Insert dynamic key from Vault
    cfg.apiKey = vaultKeys[providerId] || '';

    if (!cfg || !cfg.apiKey) {
        setStatus('NO_API_KEY_FOUND', 'error');
        return;
    }

    setStatus('AI_THINKING...', 'neutral');

    // Hacker visual loading animation inside the textarea
    let dots = 0;
    let startTime = Date.now();
    targetEditor.value = `[.] Initializing AI Connection...\n[T] 0.0s elapsed`;
    const loadingInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        let elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        let bar = '#'.repeat(Math.min(20, Math.floor(elapsed * 2))) + '-'.repeat(Math.max(0, 20 - Math.floor(elapsed * 2)));
        let p = `[+] Establishing connection securely...\n[${dots % 2 === 0 ? '*' : '+'}] Generating custom JS payload` + '.'.repeat(dots) + `\n\nProgress: [${bar}]\n[T] Time Elapsed: ${elapsed}s`;
        targetEditor.value = p;
    }, 100);

    chrome.runtime.sendMessage({
        action: 'generateCode',
        prompt: prompt,
        provider: providerId,
        config: cfg
    }, (res) => {
        clearInterval(loadingInterval);

        if (res?.code) {
            // Clean Markdown logic
            let clean = res.code.replace(/```(javascript|js)?\n/g, '').replace(/```/g, '').trim();
            // Clean stray single backticks if AI outputs them
            clean = clean.replace(/^`+|`+$/g, '').trim();
            targetEditor.value = clean;
            setStatus('CODE_READY', 'success');

            // Save working status
            chrome.storage.local.get(['deadProviders'], (storage) => {
                let deadProv = storage.deadProviders || {};
                if (deadProv[providerId]) {
                    delete deadProv[providerId];
                    chrome.storage.local.set({ deadProviders: deadProv });
                }
            });
            if (selectEl) {
                const opt = Array.from(selectEl.options).find(o => o.value === providerId);
                if (opt) opt.style.color = '#00ff41'; // Green
                if (selectEl.value === providerId) selectEl.style.color = '#00ff41';
            }
        } else if (res?.error) {
            targetEditor.value = `// FAILED: AI Engine encountered an error.\n// [ERROR] ${res.error}`;
            setStatus('ERR: ' + res.error.substring(0, 30), 'error');
            console.error('API Error:', res.error);

            // Save dead status
            chrome.storage.local.get(['deadProviders'], (storage) => {
                let deadProv = storage.deadProviders || {};
                deadProv[providerId] = true;
                chrome.storage.local.set({ deadProviders: deadProv });
            });
            if (selectEl) {
                const opt = Array.from(selectEl.options).find(o => o.value === providerId);
                if (opt) opt.style.color = '#ff003c'; // Red
                if (selectEl.value === providerId) selectEl.style.color = '#ff003c';
            }
        } else {
            targetEditor.value = `// ERROR: Engine offline or unreachable.`;
            setStatus('AI_OFFLINE', 'error');
        }
    });
}
