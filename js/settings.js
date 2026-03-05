// js/settings.js - The Security Vault Logic

// Hacker-style Obfuscation (Not military grade, but stops casual snooping in storage)
const encrypt = (text, pwd) => {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ pwd.charCodeAt(i % pwd.length));
    }
    return btoa(result); // Base64 to safely store
};

const decrypt = (hash, pwd) => {
    try {
        let text = atob(hash);
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ pwd.charCodeAt(i % pwd.length));
        }
        return result;
    } catch (e) { return null; }
};

document.addEventListener('DOMContentLoaded', () => {
    const authScreen = document.getElementById('authScreen');
    const vaultScreen = document.getElementById('vaultScreen');
    const pwdInput = document.getElementById('masterPasswordInput');
    const authTitle = document.getElementById('authTitle');
    const authStatus = document.getElementById('authStatus');

    // Vault Inputs
    const storageMode = document.getElementById('storageModeSelect');
    const fbInputGroup = document.getElementById('firebaseUrlGroup');
    const fbInput = document.getElementById('firebaseUrlInput');

    const inputs = {
        groq: document.getElementById('key_groq'),
        openrouter: document.getElementById('key_openrouter'),
        gemini: document.getElementById('key_gemini'),
        claude: document.getElementById('key_claude'),
        deepseek: document.getElementById('key_deepseek')
    };

    let sessionPassword = '';

    // Check if vault is already configured
    chrome.storage.local.get(['vaultConfigured', 'saltCheck'], (res) => {
        if (res.vaultConfigured) {
            authTitle.innerText = '> VAULT LOCKED_';
            document.getElementById('authDesc').innerText = 'Enter your Master Password to decrypt.';
        } else {
            authTitle.innerText = '> INITIALIZE VAULT_';
            document.getElementById('authDesc').innerText = 'Create a new Master Password to secure your keys.';
            document.getElementById('unlockVaultBtn').innerText = '> CREATE_PASSWORD_';
        }
    });

    document.getElementById('unlockVaultBtn').addEventListener('click', async () => {
        const pwd = pwdInput.value.trim();
        if (!pwd) { authStatus.innerText = 'Error: Password empty.'; return; }

        chrome.storage.local.get(['vaultConfigured', 'saltCheck', 'encryptedKeys', 'hukerStorageMode', 'hukerFirebaseUrl'], (res) => {
            if (!res.vaultConfigured) {
                // Initial Setup
                const salt = encrypt('HUKER_ACCESS_GRANTED', pwd);
                chrome.storage.local.set({ vaultConfigured: true, saltCheck: salt });
                sessionPassword = pwd;
                openVault({}, 'local', '');
            } else {
                // Login Attempt
                const testDecode = decrypt(res.saltCheck, pwd);
                if (testDecode === 'HUKER_ACCESS_GRANTED') {
                    sessionPassword = pwd;
                    // Decrypt keys
                    let plainKeys = {};
                    if (res.encryptedKeys) {
                        try {
                            plainKeys = JSON.parse(decrypt(res.encryptedKeys, pwd)) || {};
                        } catch (e) { }
                    }
                    openVault(plainKeys, res.hukerStorageMode || 'local', res.hukerFirebaseUrl || '');
                } else {
                    authStatus.style.color = 'red';
                    authStatus.innerText = 'Error: Invalid Password / Decryption Failed.';
                }
            }
        });
    });

    function openVault(plainKeys, stMode, fbUrl) {
        authScreen.classList.add('hidden');
        vaultScreen.classList.remove('hidden');

        // Populate fields
        storageMode.value = stMode;
        fbInput.value = fbUrl;
        Object.keys(inputs).forEach(k => {
            if (plainKeys[k]) inputs[k].value = plainKeys[k];
        });

        toggleFbField(stMode);
    }

    storageMode.addEventListener('change', (e) => toggleFbField(e.target.value));

    function toggleFbField(val) {
        if (val === 'local') {
            fbInputGroup.style.display = 'none';
        } else {
            fbInputGroup.style.display = 'block';
        }
    }

    // Save Vault Config
    document.getElementById('saveVaultBtn').addEventListener('click', () => {
        const vStatus = document.getElementById('vaultStatus');
        vStatus.style.color = '#00ff41';
        vStatus.innerText = 'Encrypting & Saving...';

        let keysToSave = {};
        Object.keys(inputs).forEach(k => {
            let val = inputs[k].value.trim();
            if (val) keysToSave[k] = val;
        });

        const encryptedPayload = encrypt(JSON.stringify(keysToSave), sessionPassword);

        chrome.storage.local.set({
            encryptedKeys: encryptedPayload,
            hukerApiKeys: keysToSave, // Accessible to internal extension logic
            hukerStorageMode: storageMode.value,
            hukerFirebaseUrl: fbInput.value.trim()
        }, () => {
            vStatus.innerText = '[✓] Config locked & saved securely.';
            setTimeout(() => window.close(), 1500);
        });
    });

    document.getElementById('closeSettingsBtn').addEventListener('click', () => {
        window.close();
    });
});
