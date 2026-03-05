// background.js: CodeSurfer Pro - ANTI-BLOCK ENGINE
// default fallback (old hardcoded OpenRouter values)
const OPENROUTER_API_KEY = ""; // USER MUST PROVIDE THIS KEY
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// helper to send request to AI based on provider config
function fetchAI(prompt, providerId, cfg, callback) {
    const endpoint = cfg.endpoint || OPENROUTER_ENDPOINT;
    const apiKey = cfg.apiKey || OPENROUTER_API_KEY;
    const modelName = cfg.model || "openai/gpt-3.5-turbo";

    const systemPrompt = `You are an elite, highly creative web automation and JS expert. 
                        Your job: Translate ANY user request (whether in English, Hindi, or Hinglish) into raw, executable JavaScript.
                        Rules:
                        1. Output ONLY pure JavaScript code. 
                        2. No explanations, no markdown, no comments.
                        3. NEVER say 'Action not possible' or output an alert that you can't do it! Always try to write a creative JS script that attempts to fulfill the user's request (e.g., if they ask to spin the page 360 degrees, write the CSS/JS animation for the body tag).
                        4. Support DOM manipulation, style changes, CSS animations, and element removal.
                        5. MUST UNDERSTAND HINGLISH: The user will frequently ask in Hindi/Hinglish (e.g., 'ye web 360 digree gumata rahe loop main?'). You must translate this intent into the correct JS.
                        6. Always use document.querySelector or document.querySelectorAll for selecting elements.
                        7. Ensure the code runs in the context of the webpage.
                        8. Do not use any external libraries.
                        9. Keep the code concise but fully functional.
                        10. CRITICAL: ALWAYS check if an element exists before accessing its properties or styling it (e.g. use \`if (el)\` or optional chaining \`el?.style\`).
                        11. CRITICAL DOM RULE: When inserting new elements (like a Hacker Button), NEVER use \`insertBefore\` or assume complex DOM hierarchies because they cause 'NotFoundError'. Always use \`document.body.appendChild(el)\` and style the element with \`position: fixed; z-index: 999999;\` so it floats on top of everything.`;

    let requestOptions = {};
    let targetEndpoint = endpoint;

    if (endpoint.includes('generativelanguage.googleapis.com')) {
        // Gemini Format
        targetEndpoint = `${endpoint}?key=${apiKey}`;
        requestOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts: [{ text: `Write JS code for this: ${prompt}` }] }]
            })
        };
    } else if (endpoint.includes('api.anthropic.com')) {
        // Claude Format
        requestOptions = {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
                "anthropic-dangerously-allow-custom-urls": "true"
            },
            body: JSON.stringify({
                model: modelName,
                max_tokens: 2000,
                system: systemPrompt,
                messages: [
                    { role: "user", content: `Write JS code for this: ${prompt}` }
                ]
            })
        };
    } else {
        // General OpenAI Compatible Format (OpenRouter, Deepseek, Groq, AI.CC)
        requestOptions = {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Write JS code for this: ${prompt}` }
                ]
            })
        };
    }

    fetch(targetEndpoint, requestOptions)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                let errMsg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
                return callback(new Error(errMsg));
            }
            let code = '';
            if (data.choices && data.choices[0] && data.choices[0].message) {
                // OpenAI format
                code = data.choices[0].message.content;
            } else if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                // Gemini format
                code = data.candidates[0].content.parts[0].text;
            } else if (data.content && data.content[0] && data.content[0].text) {
                // Claude format
                code = data.content[0].text;
            } else {
                return callback(new Error("Unknown API response format: " + JSON.stringify(data).substring(0, 100)));
            }
            callback(null, { choices: [{ message: { content: code } }] });
        })
        .catch(err => callback(err));
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // 1. Element Selector (Jo pehle se tha)
    if (request.action === 'elementSelected') {
        chrome.storage.local.set({
            elementSelector: request.selector,
            elementTag: request.tag,
            openElementEditor: true
        }, () => sendResponse({ status: 'Saved' }));
        return true;
    }

    // 2. Execute Code (CSP & Trusted Types Bypass Fix)
    if (request.action === 'executeCode') {
        chrome.scripting.executeScript({
            target: { tabId: request.tabId },
            world: 'MAIN', // Ye sabse important hai security bypass ke liye
            func: (codeToRun) => {
                // 1. Trusted Types Policy create karke bypass karna
                let policy = window.trustedTypes ? window.trustedTypes.defaultPolicy : null;
                if (window.trustedTypes && !policy) {
                    try {
                        policy = window.trustedTypes.createPolicy('default', {
                            createHTML: (s) => s,
                            createScriptURL: (s) => s,
                            createScript: (s) => s,
                        });
                    } catch (e) { }
                }

                const finalCode = `(function(){ try { ${codeToRun} } catch(e){ console.error('Script Error:', e); } })();`;

                // 2. CSP Bypass - Steal Nonce (Website ki Content Security Policy 'unsafe-inline' allow nahi karti thi)
                const existingScript = document.querySelector('script[nonce]');
                const pageNonce = existingScript ? existingScript.nonce || existingScript.getAttribute('nonce') : '';

                // 3. Script inject karke execute karna
                const script = document.createElement('script');
                if (pageNonce) {
                    script.setAttribute('nonce', pageNonce); // Chutiya CSP ko bypass karna nonce attach karke
                }
                script.textContent = policy ? policy.createScript(finalCode) : finalCode;
                (document.head || document.documentElement).appendChild(script);
                script.remove();
            },
            args: [request.code]
        }).then(() => sendResponse({ status: 'Success' }))
            .catch(err => sendResponse({ status: 'Error', error: err.message }));
        return true;
    }

    // 3. AI Generation Logic (Universal Script Generator)
    if (request.action === 'generateCode') {
        fetchAI(request.prompt, request.provider, request.config, (err, data) => {
            if (err) {
                sendResponse({ error: err.message });
                return;
            }
            let code = data.choices?.[0]?.message?.content?.trim() || '';
            // Cleaning any extra symbols if AI ignores system prompt
            code = code.replace(/```(javascript|js)?\n/g, '').replace(/```/g, '').trim();
            sendResponse({ code: code });
        });
        return true;
    }
});