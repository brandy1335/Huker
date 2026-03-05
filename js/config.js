// config.js - Global configuration and API Presets

const PRESET_PROVIDERS = {
    huker_ai: {
        endpoint: 'self_learning',
        model: 'huker-memory-v1',
        apiKey: 'huker-private-key'
    },
    openrouter: {
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'openai/gpt-3.5-turbo',
        apiKey: '' // USER MUST PROVIDE THIS KEY
    },
    openrouter_gpt4: {
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'openai/gpt-4o',
        apiKey: '' // USER MUST PROVIDE THIS KEY
    },
    deepseek: {
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        model: 'deepseek-chat',
        apiKey: '' // USER MUST PROVIDE THIS KEY
    },
    gemini: {
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        model: 'gemini-2.5-flash',
        apiKey: '' // USER MUST PROVIDE THIS KEY
    },
    claude: {
        endpoint: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-haiku-20240307',
        apiKey: '' // USER MUST PROVIDE THIS KEY
    },
    groq: {
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.1-8b-instant',
        apiKey: '' // USER MUST PROVIDE THIS KEY
    },
    ai_cc: {
        endpoint: 'https://api.ai.cc/v1/chat/completions',
        model: 'claude-3-sonnet-20240229',
        apiKey: '' // USER MUST PROVIDE THIS KEY
    }
};

const GROQ_SUGGESTION_KEY = ""; // USER MUST PROVIDE THIS KEY
