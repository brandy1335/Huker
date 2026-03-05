// prompt_library.js
// This file stores prompts used for generating AI responses for future reference.

const promptLibrary = {};

function savePromptToLibrary(title, prompt) {
    chrome.storage.local.get(['savedPromptLibrary'], (res) => {
        let library = res.savedPromptLibrary || {};
        library[title] = prompt;
        chrome.storage.local.set({ savedPromptLibrary: library }, () => {
            console.log("Prompt saved to library:", title);
        });
    });
}

function getPromptFromLibrary(title, callback) {
    chrome.storage.local.get(['savedPromptLibrary'], (res) => {
        let library = res.savedPromptLibrary || {};
        callback(library[title]);
    });
}

// Example of saving a prompt
// savePromptToLibrary('Hide any element quickly', 'Generate code to completely remove the selected element from the DOM with ID "delete_btn".');
