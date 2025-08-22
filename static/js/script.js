// Set dark mode as default
if (localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
} else {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
}

// --- DOM Element References ---
const chatWindow = document.getElementById('chat-window');
const welcomeScreen = document.getElementById('welcome-screen');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const themeToggle = document.getElementById('theme-toggle');
const historyBtnMobile = document.getElementById('history-btn-mobile');
const historyPanelMobile = document.getElementById('history-panel-mobile');
const historyOverlay = document.getElementById('history-overlay');
const closeHistoryBtn = document.getElementById('close-history-btn');
const historyList = document.getElementById('history-list');
const historyListMobile = document.getElementById('history-list-mobile');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const clearHistoryBtnMobile = document.getElementById('clear-history-btn-mobile');
const languageSelect = document.getElementById('language-select');

// --- State Management ---
let isApiBusy = false;
let searchHistory = [];
let currentLanguage = 'en';

// --- Initialization ---
window.onload = () => {
    setUiReady();
    updateThemeIcon();
    loadHistory();
};

// --- Event Listeners ---
sendBtn.addEventListener('click', handleSendMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});
themeToggle.addEventListener('click', toggleTheme);
historyBtnMobile.addEventListener('click', openHistoryPanel);
closeHistoryBtn.addEventListener('click', closeHistoryPanel);
historyOverlay.addEventListener('click', closeHistoryPanel);
clearHistoryBtn.addEventListener('click', clearHistory);
clearHistoryBtnMobile.addEventListener('click', clearHistory);
languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
});

// --- Theme Management ---
function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    document.documentElement.classList.toggle('light');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    const isDark = document.documentElement.classList.contains('dark');
    document.getElementById('theme-icon-light').classList.toggle('hidden', isDark);
    document.getElementById('theme-icon-dark').classList.toggle('hidden', !isDark);
}

// --- History Management ---
function openHistoryPanel() {
    historyPanelMobile.classList.remove('-translate-x-full');
    historyOverlay.classList.remove('hidden');
}

function closeHistoryPanel() {
    historyPanelMobile.classList.add('-translate-x-full');
    historyOverlay.classList.add('hidden');
}

function loadHistory() {
    searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
    renderHistory();
}

function saveHistory(query) {
    const historyItem = {
        query: query,
        timestamp: new Date().toISOString()
    };
    const existingIndex = searchHistory.findIndex(item => item.query === query);
    if (existingIndex > -1) {
        searchHistory.splice(existingIndex, 1);
    }
    
    searchHistory.unshift(historyItem);
    if (searchHistory.length > 50) searchHistory.pop();
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    renderHistory();
}

function renderHistory() {
    const lists = [historyList, historyListMobile];
    lists.forEach(list => {
        list.innerHTML = '';
        if (searchHistory.length === 0) {
            list.innerHTML = '<p class="text-center text-slate-500 p-4">No history yet.</p>';
            return;
        }
        searchHistory.forEach(item => {
            const button = document.createElement('button');
            button.className = 'w-full text-left p-2 sm:p-3 rounded-lg hover:bg-[var(--secondary)] transition-colors text-sm sm:text-base';
            button.innerHTML = `
                <p class="font-medium text-[var(--card-foreground)] truncate">${item.query}</p>
                <p class="text-xs text-slate-500 mt-1">${new Date(item.timestamp).toLocaleString()}</p>
            `;
            button.onclick = () => {
                chatInput.value = item.query;
                handleSendMessage();
                closeHistoryPanel();
            };
            list.appendChild(button);
        });
    });
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
        searchHistory = [];
        localStorage.removeItem('searchHistory');
        renderHistory();
    }
}

// --- UI State ---
function setUiBusy() {
    isApiBusy = true;
    chatInput.disabled = true;
    sendBtn.disabled = true;
    sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
}

function setUiReady() {
    isApiBusy = false;
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.focus();
    sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
}

// --- Input Validation ---
function isNonsensicalInput(text) {
    // Check for very short inputs
    if (text.trim().length < 3) return true;
    
    // Check for repeated characters or patterns
    const repeatedPattern = /(.)\1{3,}/; // Matches 4 or more repeated characters
    if (repeatedPattern.test(text)) return true;
    
    // Check for lack of vowels (for English-like inputs)
    const vowelCount = (text.match(/[aeiou]/gi) || []).length;
    const consonantCount = (text.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
    
    // If there are no vowels but several consonants, likely nonsensical
    if (vowelCount === 0 && consonantCount > 3) return true;
    
    // Check for high ratio of non-alphanumeric characters
    const nonAlphaNumericCount = (text.match(/[^a-z0-9\s]/gi) || []).length;
    if (nonAlphaNumericCount / text.length > 0.4) return true;
    
    return false;
}

// --- Core Chat Logic ---
async function handleSendMessage() {
    if (isApiBusy) return;
    const userInput = chatInput.value.trim();
    if (!userInput) return;

    welcomeScreen.classList.add('hidden');
    chatWindow.classList.remove('hidden');

    setUiBusy();
    displayUserMessage(userInput);
    saveHistory(userInput);
    chatInput.value = '';
    const botMessageContainer = displayTypingIndicator();

    // Check for nonsensical input
    if (isNonsensicalInput(userInput)) {
        setTimeout(() => {
            renderUnrecognizedInput(botMessageContainer);
            setUiReady();
        }, 800);
        return;
    }

    try {
        const apiResponse = await getGrammarCorrection(userInput, currentLanguage);
        if (apiResponse && apiResponse.corrected) {
            renderBotResponse(botMessageContainer, apiResponse, currentLanguage);
        } else {
            throw new Error("Invalid response format from API.");
        }
    } catch (error) {
        console.error("Error fetching grammar correction:", error);
        renderErrorMessage(botMessageContainer, "Sorry, I encountered an error. Please try again.");
    } finally {
        setUiReady();
    }
}

async function handleLanguageChange(selectElement, originalText) {
    if (isApiBusy) {
        selectElement.value = selectElement.dataset.currentLang;
        return;
    }
    
    const newLang = selectElement.value;
    const botMessageContainer = selectElement.closest('.bot-message-container');
    const responseContainer = botMessageContainer.querySelector('.response-content');
    
    setUiBusy();
    responseContainer.innerHTML = createLoaderHtml('Translating explanations...');

    try {
        const apiResponse = await getGrammarCorrection(originalText, newLang);
        if (apiResponse && apiResponse.corrected) {
            renderBotResponse(botMessageContainer, apiResponse, newLang);
        } else {
            throw new Error("Invalid response format from API.");
        }
    } catch (error) {
        console.error("Error during translation:", error);
        renderErrorMessage(botMessageContainer, "Sorry, translation failed. Please try again.");
    } finally {
        setUiReady();
    }
}

// --- Message Rendering ---
function displayUserMessage(message) {
    const messageHtml = `
        <div class="message flex justify-end gap-3">
            <div class="flex-1 max-w-[90%] sm:max-w-[85%] md:max-w-[80%]">
                <div class="bg-[var(--primary)] text-[var(--primary-foreground)] p-3 md:p-4 rounded-2xl rounded-br-none shadow-sm">
                    <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
                </div>
            </div>
            <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xl shrink-0 shadow-md avatar">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            </div>
        </div>`;
    chatWindow.insertAdjacentHTML('beforeend', messageHtml);
    scrollToBottom();
}

function displayTypingIndicator() {
    const loaderHtml = createLoaderHtml('Analyzing verb tenses...');
    const messageId = `bot-message-${Date.now()}`;
    const messageHtml = `
        <div id="${messageId}" class="message flex gap-3 bot-message-container">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-md avatar">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
            </div>
            <div class="flex-1 max-w-[90%] sm:max-w-[85%] md:max-w-[80%]">
                <div class="bg-[var(--secondary)] text-[var(--secondary-foreground)] p-3 md:p-4 rounded-2xl rounded-tl-none space-y-3 sm:space-y-4 shadow-sm response-content">
                    ${loaderHtml}
                </div>
            </div>
        </div>`;
    chatWindow.insertAdjacentHTML('beforeend', messageHtml);
    scrollToBottom();
    return document.getElementById(messageId);
}

function renderBotResponse(container, response, currentLang) {
    const responseContainer = container.querySelector('.response-content');
    const highlightedSentence = generateHighlightedSentence(response.original, response.corrected);
    const explanationsHtml = generateExplanationsHtml(response.errors);
    const actionButtonsHtml = generateActionButtonsHtml(response.rewrites, response.prediction);
    const translationHtml = generateTranslationHtml(response.translation, currentLang);
    
    const languageNames = {
        en: 'English',
        es: 'Spanish',
        fr: 'French',
        de: 'German',
        bn: 'Bengali'
    };

    const botHtml = `
        <div>
            <p class="font-semibold mb-2 text-[var(--card-foreground)] text-sm sm:text-base">Correction:</p>
            <div class="text-base sm:text-lg bg-[var(--card)] p-3 rounded-lg border border-[var(--border)]">${highlightedSentence}</div>
        </div>
        <div class="border-t border-[var(--border)] pt-3 sm:pt-4">
            <div class="flex justify-between items-center mb-2">
                <p class="font-semibold text-[var(--card-foreground)] text-sm sm:text-base">Explanations:</p>
                <select onchange="handleLanguageChange(this, '${escapeHtml(response.original)}')" data-current-lang="${currentLang}" class="text-xs sm:text-sm bg-transparent custome-option border border-[var(--border)] rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    ${Object.entries(languageNames).map(([code, name]) => 
                        `<option value="${code}" ${currentLang === code ? 'selected' : ''}>${name}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="explanations-container">
                ${explanationsHtml}
            </div>
        </div>
        ${translationHtml}
        <div class="border-t border-[var(--border)] pt-3 sm:pt-4">
            <p class="font-semibold mb-2 text-[var(--card-foreground)] text-sm sm:text-base">More Options:</p>
            <div class="action-buttons flex flex-wrap gap-2">
                ${actionButtonsHtml}
            </div>
        </div>`;
    
    responseContainer.innerHTML = botHtml;
    
    responseContainer.querySelectorAll('.rewrite-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const newText = btn.dataset.text;
            displayUserMessage(`Rewrite: ${btn.textContent}`);
            const newBotMsg = displayTypingIndicator();
            renderSimpleBotMessage(newBotMsg, newText);
            setUiReady();
        });
    });
}

function renderUnrecognizedInput(container) {
    const responseContainer = container.querySelector('.response-content');
    
    const unrecognizedHtml = `
        <div class="unrecognized-container">
            <div class="unrecognized-icon">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
            </div>
            <h3 class="text-lg sm:text-xl font-bold text-[var(--card-foreground)] mb-2">I Didn't Understand That</h3>
            <p class="text-slate-400 mb-4">It looks like you entered text that doesn't form a coherent sentence.</p>
            <div class="text-left">
                <p class="font-medium mb-2">Tips for better analysis:</p>
                <ul class="list-disc pl-5 space-y-1 text-sm text-slate-400">
                    <li>Ensure your text has proper words and sentence structure</li>
                    <li>Avoid random characters or keyboard smashing</li>
                    <li>Use complete sentences with subjects and verbs</li>
                    <li>Check for typos before submitting</li>
                </ul>
            </div>
        </div>
    `;
    
    responseContainer.innerHTML = unrecognizedHtml;
}

function renderErrorMessage(container, message) {
    const responseContainer = container.querySelector('.response-content');
    responseContainer.innerHTML = `<p class="text-red-500 font-medium text-sm sm:text-base">${message}</p>`;
}

function renderSimpleBotMessage(container, text) {
     const responseContainer = container.querySelector('.response-content');
     responseContainer.innerHTML = `<div class="bg-[var(--card)] p-3 rounded-lg border border-[var(--border)]">${escapeHtml(text)}</div>`;
}

// --- API Call ---
// ... (keep your existing code, replace getGrammarCorrection with this)

async function getGrammarCorrection(text, language) {
    try {
        const response = await fetch('/check-grammar/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `text=${encodeURIComponent(text)}&language=${language}`
        });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Server fetch error:", error);
        throw error;
    }
}

// Remove CONFIG.GEMINI_API_KEY and the direct fetch - it's now server-side


// --- HTML Generation ---
function generateHighlightedSentence(original, corrected) {
    if (original.toLowerCase() === corrected.toLowerCase()) return escapeHtml(corrected);
    return `<span class="error-highlight">${escapeHtml(original)}</span> <span class="text-slate-500 mx-2">→</span> <span class="correction-highlight">${escapeHtml(corrected)}</span>`;
}

function generateExplanationsHtml(errors) {
    if (!errors || errors.length === 0) {
        return '<p class="text-sm sm:text-base text-green-500 font-medium">✅ Looks great! No errors found.</p>';
    }
    
    let html = '<ul class="space-y-3 sm:space-y-4">';
    
    errors.forEach(error => {
        html += `
            <li class="explanation-card">
                <div class="flex items-baseline gap-2">
                    <span class="font-semibold text-red-400 text-sm sm:text-base">Incorrect:</span>
                    <span class="text-[var(--card-foreground)] text-sm sm:text-base">${escapeHtml(error.wrong)}</span>
                </div>
                <div class="flex items-baseline gap-2 mt-1">
                    <span class="font-semibold text-green-400 text-sm sm:text-base">Correct:</span>
                    <span class="text-[var(--card-foreground)] text-sm sm:text-base">${escapeHtml(error.correct)}</span>
                </div>
                <div class="mt-2">
                    <span class="font-medium text-[var(--card-foreground)] text-sm sm:text-base">Explanation:</span>
                    <p class="text-sm sm:text-base">${escapeHtml(error.explanation)}</p>
                </div>`;
        
        if (error.tenseExplanation) {
            html += `
                <div class="verb-tense-explanation mt-3">
                    <div class="tense-header">
                        <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                        <span class="text-amber-400 text-sm sm:text-base">Verb Tense Explanation</span>
                    </div>
                    <p class="text-sm sm:text-base">${escapeHtml(error.tenseExplanation)}</p>
                </div>`;
        }
        
        html += `</li>`;
    });
    
    html += '</ul>';
    return html;
}

function generateActionButtonsHtml(rewrites, prediction) {
    let html = '';
    if (rewrites) {
        html += `<button class="rewrite-btn text-xs sm:text-sm bg-[var(--card)] border border-[var(--border)] rounded-full px-3 py-1 sm:px-4 sm:py-1.5 hover:bg-[var(--secondary)] transition" data-text="${escapeHtml(rewrites.formal)}">Formal</button>`;
        html += `<button class="rewrite-btn text-xs sm:text-sm bg-[var(--card)] border border-[var(--border)] rounded-full px-3 py-1 sm:px-4 sm:py-1.5 hover:bg-[var(--secondary)] transition" data-text="${escapeHtml(rewrites.informal)}">Informal</button>`;
        html += `<button class="rewrite-btn text-xs sm:text-sm bg-[var(--card)] border border-[var(--border)] rounded-full px-3 py-1 sm:px-4 sm:py-1.5 hover:bg-[var(--secondary)] transition" data-text="${escapeHtml(rewrites.polite)}">Polite</button>`;
    }
    if (prediction) {
        html += `<button class="rewrite-btn text-xs sm:text-sm bg-[var(--card)] border border-[var(--border)] rounded-full px-3 py-1 sm:px-4 sm:py-1.5 hover:bg-[var(--secondary)] transition" data-text="${escapeHtml(prediction)}">Suggest Next</button>`;
    }
    return html;
}

function generateTranslationHtml(translation, language) {
    if (!translation) return '';
    
    const languageNames = {
        en: 'English',
        es: 'Spanish',
        fr: 'French',
        de: 'German',
        bn: 'Bengali'
    };
    
    const langName = languageNames[language] || 'the selected language';
    
    return `
        <div class="translation-container">
            <div class="translation-header">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                </svg>
                <span>Full Meaning in ${langName}</span>
            </div>
            <div class="translation-content">
                <p>${escapeHtml(translation)}</p>
            </div>
        </div>`;
}

function createLoaderHtml(text) {
    return `<div class="flex flex-col items-center justify-center p-3 sm:p-4">
        <div class="loader-dots flex items-center gap-1.5">
            <span class="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-slate-400 rounded-full"></span>
            <span class="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-slate-400 rounded-full"></span>
            <span class="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-slate-400 rounded-full"></span>
        </div>
        <p class="text-xs sm:text-sm text-slate-500 mt-2">${escapeHtml(text)}</p>
    </div>`;
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function scrollToBottom() {
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Expose function to global scope for select element
window.handleLanguageChange = handleLanguageChange;
