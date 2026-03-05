// huker-ai.js - The Brain of Huker AI (Custom Self-Learning Engine)

class HukerAIEngine {

    // Helper to fetch keys and storage modes dynamically from the Vault
    static async getConfig() {
        return new Promise(resolve => {
            chrome.storage.local.get(['hukerApiKeys', 'hukerStorageMode', 'hukerFirebaseUrl'], (res) => {
                resolve({
                    groqKey: res.hukerApiKeys?.groq || "",
                    storageMode: res.hukerStorageMode || "local",
                    fbUrl: res.hukerFirebaseUrl || ""
                });
            });
        });
    }

    // --- NEW: THE SEMANTIC HASHER ALGORITHM (The "Same Meaning" Checker) ---
    static async getSemanticHash(newPrompt, existingMemories, groqKey) {
        let memoryContext = "EMPTY_MEMORY_LIST (No existing memories yet)";
        let memoryKeys = Object.keys(existingMemories || {});

        if (memoryKeys.length > 0) {
            // Give Groq the exact Hash IDs and the Original Prompt that created them
            memoryContext = memoryKeys.map(hash => `[${hash}]\nOriginal Prompt Example: "${existingMemories[hash].prompt}"`).join('\n\n');
        }

        const sysPrompt = `You are a STRICT Semantic Intent Classifier.
Your ONLY job is to cluster a NEW user request into an EXACT matching existing category Hash, OR create a new one.
Do not pay attention to specific parameter values (like 'red' vs 'blue', '10px' vs '20px'). Focus strictly on the underlying ACTION/PROGRAMMING INTENT.

=== EXISTING HASH CATEGORIES ===
${memoryContext}

=== NEW USER REQUEST ===
"${newPrompt}"

=== OUTPUT INSTRUCTIONS ===
1. Does the NEW USER REQUEST perform the EXACTLY SAME generic programming action as one of the EXISTING Categories? (e.g. Modifying a background color and removing an image are COMPLETELY DIFFERENT and should NEVER share a hash).
2. If YES: Return ONLY the exact Hash string from the existing memories list.
3. If NO or UNCERTAIN: Return "NEW_HASH: CATEGORY_NAME_IN_UPPER_SNAKE_CASE" (e.g. NEW_HASH: BYPASS_PAYWALL).
4. Output NOTHING ELSE. No explanations. No backticks. Just the string.`;

        if (!groqKey) {
            console.error("[HUKER HASHER] Missing Groq API Key.");
            const cleanPromp = newPrompt.replace(/[^a-zA-Z0-9 ]/g, "").split(" ").slice(0, 3).join("_").toUpperCase();
            return `NEW_HASH: ${cleanPromp}`;
        }

        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [{ role: "user", content: sysPrompt }],
                    temperature: 0.1,
                    max_tokens: 20
                })
            });
            const data = await res.json();
            let result = data.choices[0].message.content.trim();
            // Sanitize in case AI added markdown
            result = result.replace(/`/g, '').trim();

            // If the AI gives multiple lines, just take the first line
            result = result.split('\n')[0].trim();

            console.log("[HUKER HASHER] Evaluated Intent:", result);
            return result;
        } catch (e) {
            console.error("[HUKER HASHER] Failed to connect to Groq:", e);
            // Fallback: Generate a simple clean hash from the first 3 words
            const cleanPromp = newPrompt.replace(/[^a-zA-Z0-9 ]/g, "").split(" ").slice(0, 3).join("_").toUpperCase();
            return `NEW_HASH: ${cleanPromp}`;
        }
    }

    // Save (Learning Process - Auto-Optimized & Multi-Tier)
    static async learn(prompt, code, url) {
        try {
            const config = await this.getConfig();
            let currentState = {};

            // 1. Fetch existing Universe of Hashes
            if (config.storageMode === 'cloud' && config.fbUrl) {
                const res = await fetch(config.fbUrl);
                currentState = await res.json() || {};
            } else {
                // local or hybrid (local is primary read source fast)
                const storage = await new Promise(r => chrome.storage.local.get(['hukerLocalBrain'], r));
                currentState = storage.hukerLocalBrain || {};
            }

            // 2. Ask the Groq Hasher to determine the Hash
            const hashResult = await this.getSemanticHash(prompt, currentState, config.groqKey);

            let finalHash = "";
            let isNew = false;

            if (hashResult.startsWith("NEW_HASH:")) {
                finalHash = hashResult.replace("NEW_HASH:", "").trim();
                isNew = true;
            } else {
                finalHash = hashResult.trim(); // It perfectly matched an existing one!

                // --- ALGORITHM OPTIMIZATION: CODE SIZE CHECK ---
                if (currentState[finalHash]) {
                    const existingCode = currentState[finalHash].code;
                    if (!isNew && code.length > existingCode.length + 50) {
                        console.log(`[HUKER AI] Ignored saving. Existing code for [${finalHash}] is smaller and more optimized.`);
                        return; // Stop learning process
                    }
                }
            }

            // 3. Save Memory Object
            const memory = {
                prompt: prompt.toLowerCase().trim(),
                code: code,
                url: url,
                timestamp: Date.now()
            };

            currentState[finalHash] = memory;

            // 4. Dispatch to Correct Storage Modes
            if (config.storageMode === 'local' || config.storageMode === 'hybrid') {
                chrome.storage.local.set({ hukerLocalBrain: currentState });
            }

            if ((config.storageMode === 'cloud' || config.storageMode === 'hybrid') && config.fbUrl) {
                // PUT request to specific Hash ID endpoint in Firebase
                const specificUrl = config.fbUrl.replace(".json", `/${finalHash}.json`);
                fetch(specificUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(memory)
                }).catch(e => console.error("Firebase Sync Error (Hybrid/Cloud):", e));
            }

            console.log(`[HUKER AI] Learned under category: [${finalHash}] via mode: ${config.storageMode}`);
            if (typeof setStatus === 'function') setStatus(`HUKER AI: Learned [${finalHash}]`, 'success');
        } catch (e) {
            console.error("[HUKER AI] Failed to memorize:", e);
        }
    }

    // Recall (Thinking Process - Using Hash Check via Storage Engine)
    static async recall(prompt) {
        try {
            const config = await this.getConfig();
            let data = {};

            if (config.storageMode === 'cloud' && config.fbUrl) {
                const res = await fetch(config.fbUrl);
                data = await res.json() || {};
            } else {
                // Local or hybrid always reads from fast local DB!
                const storage = await new Promise(r => chrome.storage.local.get(['hukerLocalBrain'], r));
                data = storage.hukerLocalBrain || {};
            }

            if (Object.keys(data).length === 0) return null; // No memories yet

            // Use the Hasher to find if this prompt matches an existing DB category
            const hashResult = await this.getSemanticHash(prompt, data, config.groqKey);

            if (hashResult.startsWith("NEW_HASH:")) {
                // It's completely new, we have no memory of this intent at all
                return null;
            } else {
                let finalHash = hashResult.trim();
                let matchedMemory = data[finalHash];

                if (matchedMemory) {
                    // Check if it's an exact match (User typed the exact same words)
                    if (matchedMemory.prompt === prompt.toLowerCase().trim()) {
                        matchedMemory.exact = true;
                    } else {
                        matchedMemory.exact = false; // It's a semantic match (e.g. iframe vs image)
                    }
                    return matchedMemory;
                }
            }
            return null;
        } catch (e) {
            console.error("[HUKER AI] Recall failed:", e);
            return null;
        }
    }
}
