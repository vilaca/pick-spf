// ===================================
// PickSPF - Sunscreen Chooser
// Main Script (Critical Page-Load Code)
// ===================================
// This file contains only the essential code needed for initial page load.
// Quiz logic is loaded lazily from quiz.js when user clicks "Start Quiz".

// ===================================
// Security Utilities
// ===================================

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for HTML
 */
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Sanitize URL to prevent XSS
 * @param {string} url - URL to sanitize
 * @returns {string} Safe URL or empty string
 */
function sanitizeURL(url) {
    if (!url) return '';
    try {
        const parsed = new URL(url);
        // Only allow http and https protocols
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return url;
        }
    } catch (e) {
        console.warn('Invalid URL:', url);
    }
    return '';
}

/**
 * Validate URL parameter against allowed values
 * @param {string} param - Parameter name
 * @param {string} value - Parameter value
 * @returns {string|null} Valid value or null
 */
function validateURLParam(param, value) {
    const allowedValues = {
        location: ['US', 'EU', 'UK', 'Canada', 'Australia', 'Japan', 'Global'],
        skin: ['oily', 'dry', 'combination', 'sensitive', 'all'],
        fragrance: ['true', 'false', 'any'],
        kids: ['true', 'false', 'any'],
        form: ['cream', 'lotion', 'spray', 'stick', 'gel', 'any'],
        water: ['true', 'false', 'any'],
        features: ['oil-control', 'hydrating', 'anti-aging', 'anti-dark-spots', 'tinted', 'invisible-finish', 'for-atopic-skin', 'eco-friendly-packaging', 'wet-skin-application']
    };

    if (allowedValues[param] && allowedValues[param].includes(value)) {
        return value;
    }
    console.warn(`Invalid URL parameter: ${param}=${value}`);
    return null;
}

// ===================================
// State Management
// ===================================

// Question metadata for dynamic ordering
// Loaded lazily from data/questions-metadata.yaml when quiz starts
let questionMetadata = {};

// Mutually exclusive features configuration
// Loaded lazily from data/questions-metadata.yaml when quiz starts
let mutuallyExclusiveFeatures = {};

// Application configuration (timings, thresholds, etc.)
// Loaded lazily from data/questions-metadata.yaml when quiz starts
let appConfig = {
    timings: {
        notificationFadeOut: 300,
        autoAdvanceDelay: 400,
        notificationAutoDismiss: 10000,
        transitionBase: 300,
        transitionSlow: 400
    },
    algorithm: {
        minDiscriminatingPower: 0.01
    },
    sharePopup: {
        width: 600,
        height: 400
    }
};

const appState = {
    currentView: 'welcome',
    mode: 'wizard', // 'wizard' or 'viewall'
    currentQuestionKey: null, // Current question key (e.g., 'location', 'skinType')
    questionHistory: [], // Track order of questions shown (for back button)
    totalQuestions: 0, // Calculated dynamically after loading question metadata
    selections: {
        location: null,
        skinType: null,
        fragranceFree: null,
        forKids: null,
        formFactor: null,
        waterResistant: null,
        specialFeatures: null
    },
    sunscreens: [],
    filteredResults: [],
    currentLanguage: 'en',
    translations: {}
};

// ===================================
// Internationalization (i18n)
// ===================================

const availableLanguages = {
    'en': 'English',
    'pt-PT': 'Português',
    'de': 'Deutsch',
    'fr': 'Français',
    'es': 'Español',
    'it': 'Italiano',
    'pl': 'Polski'
};

async function loadTranslation(lang) {
    try {
        const response = await fetch(`translations/${lang}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load translation: ${lang}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error loading translation ${lang}:`, error);
        // Fallback to English if translation fails
        if (lang !== 'en') {
            return await loadTranslation('en');
        }
        throw error;
    }
}

function t(key, replacements = {}) {
    // Get translation value from nested object using dot notation
    const keys = key.split('.');
    let value = appState.translations;

    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            console.warn(`Translation key not found: ${key}`);
            return key;
        }
    }

    // Replace placeholders like {count}, {value}, etc.
    if (typeof value === 'string') {
        return value.replace(/\{(\w+)\}/g, (match, placeholder) => {
            return replacements[placeholder] !== undefined ? replacements[placeholder] : match;
        });
    }

    return value;
}

async function changeLanguage(lang) {
    if (!availableLanguages[lang]) {
        console.error(`Language not supported: ${lang}`);
        return;
    }

    // Load translations
    appState.translations = await loadTranslation(lang);
    appState.currentLanguage = lang;

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Apply translations to the page
    applyTranslations();

    // Store preference
    localStorage.setItem('preferredLanguage', lang);

    // Update URL parameter
    const url = new URL(window.location);
    url.searchParams.set('lang', lang);
    history.replaceState({}, '', url);
}

function applyTranslations() {
    // Update meta tags
    document.title = t('meta.title');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
    document.querySelector('meta[name="keywords"]')?.setAttribute('content', t('meta.keywords'));

    // Update Open Graph tags
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', t('meta.title'));
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', t('meta.description'));
    document.querySelector('meta[property="twitter:title"]')?.setAttribute('content', t('meta.title'));
    document.querySelector('meta[property="twitter:description"]')?.setAttribute('content', t('meta.description'));

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = t(key);
    });

    // Update all elements with data-i18n-aria attribute (for aria-label)
    document.querySelectorAll('[data-i18n-aria]').forEach(element => {
        const key = element.getAttribute('data-i18n-aria');
        element.setAttribute('aria-label', t(key));
    });

    // Update specific UI elements if quiz is loaded
    if (quizModule && appState.currentView !== 'welcome') {
        updateUITranslations();
    }
}

function updateUITranslations() {
    // This function is called after language change and will re-render dynamic content
    if (!quizModule) return;

    // Update live count
    if (elements.liveCount && appState.currentView === 'questions') {
        quizModule.updateLiveCount();
    }

    // Update progress text
    if (elements.currentQuestionSpan) {
        quizModule.updateProgress();
    }

    // Re-render results if on results view
    if (appState.currentView === 'results' && appState.filteredResults.length >= 0) {
        quizModule.showResults();
    }
}

// ===================================
// DOM Elements
// ===================================

const elements = {
    // Views
    welcomeView: document.getElementById('welcome-view'),
    questionsView: document.getElementById('questions-view'),
    resultsView: document.getElementById('results-view'),

    // Buttons
    startQuizBtn: document.getElementById('start-quiz-btn'),
    toggleModeBtn: document.getElementById('toggle-mode-btn'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    showResultsBtn: document.getElementById('show-results-btn'),
    restartBtn: document.getElementById('restart-btn'),
    restartBtnQuestions: document.getElementById('restart-btn-questions'),

    // Share buttons
    shareWhatsApp: document.getElementById('share-whatsapp'),
    shareFacebook: document.getElementById('share-facebook'),
    shareTwitter: document.getElementById('share-twitter'),
    shareCopy: document.getElementById('share-copy'),
    copyConfirmation: document.getElementById('copy-confirmation'),

    // Form elements
    questionsForm: document.getElementById('questions-form'),
    questions: document.querySelectorAll('.question'),

    // Progress
    progressBar: document.querySelector('.progress-bar'),
    currentQuestionSpan: document.getElementById('current-question'),
    totalQuestionsSpan: document.getElementById('total-questions'),

    // Live count
    liveCount: document.getElementById('live-count'),

    // Results
    resultsSummary: document.getElementById('results-summary'),
    resultsContainer: document.getElementById('results-container'),

    // Mode text
    modeText: document.getElementById('mode-text'),

    // Language selector
    languageSelect: document.getElementById('language-select')
};

// ===================================
// Quiz Module (Lazy Loaded)
// ===================================

let quizModule = null;
let quizResourcesLoaded = false;

/**
 * Dynamically import and initialize quiz module
 * Only called when user clicks "Start Quiz" or loads page with URL params
 */
async function loadQuizModule() {
    if (quizModule) {
        return; // Already loaded
    }

    console.log('Loading quiz module...');

    // Dynamically import quiz.js
    quizModule = await import('./quiz.js');

    // Initialize quiz module with dependencies
    quizModule.initQuiz({
        appState,
        appConfig,
        questionMetadata,
        mutuallyExclusiveFeatures,
        elements,
        t,
        escapeHTML,
        sanitizeURL,
        validateURLParam,
        announceToScreenReader,
        showLoadingError,
        showView
    });

    // Load quiz resources if not already loaded
    if (!quizResourcesLoaded) {
        await quizModule.loadQuizResources();
        quizResourcesLoaded = true;
    }

    console.log('Quiz module loaded successfully');
}

// ===================================
// Initialization
// ===================================

async function init() {
    try {
        // Show loading overlay
        const loadingOverlay = document.getElementById('loading-overlay');

        // Detect and load language
        await initializeLanguage();

        // Hide loading overlay
        loadingOverlay.classList.add('hidden');
        setTimeout(() => loadingOverlay.style.display = 'none', appConfig.timings.notificationFadeOut);

        // Check for URL parameters - if present, need to load quiz immediately
        const urlParams = new URLSearchParams(window.location.search);
        const hasQuizParams = ['location', 'skin', 'fragrance', 'kids', 'form', 'water', 'features']
            .some(param => urlParams.has(param));

        if (hasQuizParams) {
            // Load quiz module and handle URL parameters
            await loadQuizModule();
            quizModule.checkURLParameters();
        }

        // Setup event listeners
        setupEventListeners();

        // Initialize view
        showView('welcome');
    } catch (error) {
        console.error('Initialization error:', error);
        showLoadingError(t('loading.error') || 'Failed to initialize the application. Please refresh the page.');
    }
}

async function initializeLanguage() {
    // Detect language from: URL param > localStorage > browser language > default (en)
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    const storedLang = localStorage.getItem('preferredLanguage');
    const browserLang = navigator.language || navigator.userLanguage;

    // Normalize browser language (e.g., 'pt-BR' -> 'pt-PT', 'en-US' -> 'en')
    const normalizedBrowserLang = browserLang.startsWith('pt') ? 'pt-PT' : browserLang.split('-')[0];

    // Priority: URL > stored > browser > default
    const detectedLang = urlLang || storedLang ||
        (availableLanguages[normalizedBrowserLang] ? normalizedBrowserLang :
         (availableLanguages[browserLang] ? browserLang : 'en'));

    // Load and apply translation
    await changeLanguage(detectedLang);

    // Update language selector
    if (elements.languageSelect) {
        elements.languageSelect.value = detectedLang;
    }
}

// ===================================
// Error Handling
// ===================================

/**
 * Show error in loading overlay (for critical early-stage errors)
 * @param {string} message - Error message to display
 */
function showLoadingError(message) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        // Clear existing content
        loadingOverlay.innerHTML = `
            <div class="error-box">
                <div class="error-content">
                    <span class="error-icon">⚠️</span>
                    <span class="error-message">${escapeHTML(message)}</span>
                </div>
                <button class="error-close-btn" onclick="location.reload()" aria-label="Reload page">
                    Reload
                </button>
            </div>
        `;

        // Make sure overlay is visible
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.style.display = 'flex';
    }
}

// ===================================
// Event Listeners
// ===================================

function setupEventListeners() {
    // Language selector
    elements.languageSelect.addEventListener('change', (e) => {
        changeLanguage(e.target.value);
    });

    // Start quiz - lazy load quiz module
    elements.startQuizBtn.addEventListener('click', async () => {
        // Disable button to prevent double-click
        elements.startQuizBtn.disabled = true;
        elements.startQuizBtn.textContent = t('loading.text') || 'Loading...';

        try {
            // Load quiz module dynamically
            await loadQuizModule();

            // Debug: Check data loaded
            console.log(`Quiz resources loaded. Total sunscreens: ${appState.sunscreens.length}`);

            // Determine first question dynamically
            const firstQuestion = quizModule.determineNextQuestion(appState, questionMetadata);
            console.log(`First question determined: ${firstQuestion}`);

            if (firstQuestion) {
                appState.currentQuestionKey = firstQuestion;
                appState.questionHistory = [firstQuestion]; // Track first question in history
            }

            showView('questions');
            quizModule.updateQuestionDisplay();
            quizModule.updateNavigationButtons();
            quizModule.updateLiveCount(); // Update count on quiz start
            quizModule.checkCurrentQuestionAnswered();
        } catch (error) {
            console.error('Error loading quiz:', error);
            showErrorNotification(t('loading.error') || 'Failed to load quiz. Please refresh and try again.');
            elements.startQuizBtn.disabled = false;
            elements.startQuizBtn.textContent = t('welcome.startButton') || 'Start Quiz';
        }
    });

    // Toggle mode
    elements.toggleModeBtn.addEventListener('click', toggleMode);

    // Navigation - delegate to quiz module
    elements.prevBtn.addEventListener('click', () => {
        if (quizModule) quizModule.previousQuestion();
    });
    elements.nextBtn.addEventListener('click', () => {
        if (quizModule) quizModule.nextQuestion();
    });
    elements.showResultsBtn.addEventListener('click', () => {
        if (quizModule) quizModule.showResults();
    });

    // Restart - delegate to quiz module
    elements.restartBtn.addEventListener('click', () => {
        if (quizModule) quizModule.restart();
    });
    elements.restartBtnQuestions.addEventListener('click', () => {
        if (quizModule) quizModule.restart();
    });

    // Form inputs - delegate to quiz module
    elements.questionsForm.addEventListener('change', (event) => {
        if (quizModule) quizModule.handleFormChange(event);
    });

    // Share buttons - delegate to quiz module
    elements.shareWhatsApp.addEventListener('click', () => {
        if (quizModule) quizModule.shareWhatsApp();
    });
    elements.shareFacebook.addEventListener('click', () => {
        if (quizModule) quizModule.shareFacebook();
    });
    elements.shareTwitter.addEventListener('click', () => {
        if (quizModule) quizModule.shareTwitter();
    });
    elements.shareCopy.addEventListener('click', () => {
        if (quizModule) quizModule.copyLink();
    });

    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboard);
}

/**
 * Show error notification in-app
 * @param {string} message - Error message to display
 */
function showErrorNotification(message) {
    // Remove any existing error notifications
    const existingError = document.querySelector('.error-notification');
    if (existingError) {
        existingError.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'error-notification shared-notification';
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    notification.innerHTML = `
        <div class="shared-notification-content">
            <span class="shared-icon" style="color: #d32f2f;">⚠️</span>
            <p>${escapeHTML(message)}</p>
            <button class="dismiss-error-btn btn-icon" aria-label="Dismiss">✕</button>
        </div>
    `;

    // Insert at top of current view or body
    const targetView = document.querySelector('.view.active') || document.body;
    if (targetView.firstChild) {
        targetView.insertBefore(notification, targetView.firstChild);
    } else {
        targetView.appendChild(notification);
    }

    // Add dismiss event listener
    notification.querySelector('.dismiss-error-btn').addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), appConfig.timings.notificationFadeOut);
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), appConfig.timings.notificationFadeOut);
        }
    }, appConfig.timings.notificationAutoDismiss);
}

// ===================================
// View Management
// ===================================

function showView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    // Show target view
    appState.currentView = viewName;

    if (viewName === 'welcome') {
        elements.welcomeView.classList.add('active');
        elements.startQuizBtn.focus();
    } else if (viewName === 'questions') {
        elements.questionsView.classList.add('active');
    } else if (viewName === 'results') {
        elements.resultsView.classList.add('active');
        elements.resultsContainer.focus();
    }
}

// ===================================
// Mode Switching (Wizard / View All)
// ===================================

function toggleMode() {
    if (appState.mode === 'wizard') {
        appState.mode = 'viewall';
        document.body.classList.remove('wizard-mode');
        elements.modeText.textContent = t('questions.toggleModeWizard');
        elements.prevBtn.classList.add('hidden');
        elements.nextBtn.classList.add('hidden');
        elements.showResultsBtn.classList.remove('hidden');

        // Show all questions
        elements.questions.forEach(q => q.classList.add('active'));
    } else {
        appState.mode = 'wizard';
        document.body.classList.add('wizard-mode');
        elements.modeText.textContent = t('questions.toggleMode');
        if (quizModule) {
            quizModule.updateNavigationButtons();
            quizModule.updateQuestionDisplay();
        }
    }

    // Update button states for new mode
    if (quizModule) {
        quizModule.checkCurrentQuestionAnswered();
    }

    announceToScreenReader(t('screenReader.switchedMode', { mode: appState.mode }));
}

// ===================================
// Keyboard Navigation
// ===================================

function handleKeyboard(event) {
    // Escape key: go back or restart
    if (event.key === 'Escape') {
        if (appState.currentView === 'questions' && appState.questionHistory.length > 0 && appState.mode === 'wizard') {
            if (quizModule) quizModule.previousQuestion();
        } else if (appState.currentView === 'results') {
            if (quizModule) quizModule.restart();
        }
    }

    // Enter key on buttons
    if (event.key === 'Enter' && event.target.tagName === 'BUTTON') {
        event.target.click();
    }
}

// ===================================
// Accessibility: Screen Reader Announcements
// ===================================

function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';

    document.body.appendChild(announcement);

    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// ===================================
// Initialize App
// ===================================

// Only auto-initialize if not in test environment
if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
    // Set initial mode
    document.body.classList.add('wizard-mode');

    // Error boundary wrapper for init
    const safeInit = async () => {
        try {
            await init();
        } catch (error) {
            // Fatal error - even the internal error handler failed
            console.error('Fatal error during app initialization:', error);

            // Show user-friendly error message
            const body = document.body;
            body.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; font-family: system-ui, -apple-system, sans-serif;">
                    <h1 style="color: #d32f2f; margin-bottom: 16px;">Failed to Load Application</h1>
                    <p style="color: #666; margin-bottom: 24px; max-width: 500px;">
                        We encountered an error while loading PickSPF. This might be due to a network issue or browser compatibility problem.
                    </p>
                    <button onclick="window.location.reload()" style="background: #1976d2; color: white; border: none; padding: 12px 24px; border-radius: 4px; font-size: 16px; cursor: pointer;">
                        Refresh Page
                    </button>
                    <details style="margin-top: 24px; text-align: left; max-width: 600px;">
                        <summary style="cursor: pointer; color: #666;">Technical Details</summary>
                        <pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; overflow: auto; font-size: 12px; margin-top: 8px;">${error.message}\n\n${error.stack || ''}</pre>
                    </details>
                </div>
            `;
        }
    };

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', safeInit);
    } else {
        safeInit();
    }
}

// ===================================
// Exports for Testing
// ===================================

// Export testable versions of functions for backwards compatibility with tests
export function filterProducts(products, selections) {
    return products.filter(product => {
        // Location
        if (selections.location && product.availableIn) {
            if (!product.availableIn.includes(selections.location) &&
                !product.availableIn.includes('Global')) {
                return false;
            }
        }

        // Skin type
        if (selections.skinType && selections.skinType !== 'all' && product.skinTypes) {
            if (!product.skinTypes.includes(selections.skinType) &&
                !product.skinTypes.includes('all')) {
                return false;
            }
        }

        // Fragrance free
        if (selections.fragranceFree && selections.fragranceFree !== 'any') {
            const fragranceFreeBool = selections.fragranceFree === 'true';
            if (product.isFragranceFree !== fragranceFreeBool) {
                return false;
            }
        }

        // For kids
        if (selections.forKids && selections.forKids !== 'any') {
            const forKidsBool = selections.forKids === 'true';
            if (product.forKids !== forKidsBool) {
                return false;
            }
        }

        // Form factor
        if (selections.formFactor && selections.formFactor !== 'any' && product.formFactors) {
            if (!product.formFactors.includes(selections.formFactor)) {
                return false;
            }
        }

        // Water resistant
        if (selections.waterResistant && selections.waterResistant !== 'any') {
            const waterResistantBool = selections.waterResistant === 'true';
            if (product.waterResistant !== waterResistantBool) {
                return false;
            }
        }

        return true;
    });
}

export { questionMetadata };

export function calculateDiscriminatingPower(questionKey, currentProducts) {
    // Validate question key
    if (!questionMetadata[questionKey]) {
        console.error(`Invalid question key: ${questionKey}`);
        return 0;
    }

    // Validate products array
    if (!Array.isArray(currentProducts) || currentProducts.length === 0) {
        return 0;
    }

    const metadata = questionMetadata[questionKey];

    // Get all possible values for this question from remaining products
    const valueGroups = {};

    currentProducts.forEach(product => {
        const productValue = product[metadata.attribute];

        if (metadata.isArray) {
            // For array attributes, each value in array creates a group
            if (Array.isArray(productValue)) {
                productValue.forEach(val => {
                    if (!valueGroups[val]) valueGroups[val] = 0;
                    valueGroups[val]++;
                });
            }
        } else {
            // For boolean/string attributes
            const key = String(productValue);
            if (!valueGroups[key]) valueGroups[key] = 0;
            valueGroups[key]++;
        }
    });

    const groups = Object.values(valueGroups);

    // If all products have the same value, this question has no discriminating power
    if (groups.length <= 1) {
        return 0;
    }

    // Calculate entropy (information gain)
    // Higher entropy = better split
    const total = currentProducts.length;
    let entropy = 0;

    groups.forEach(count => {
        const proportion = count / total;
        entropy -= proportion * Math.log2(proportion);
    });

    return entropy;
}

export function getNextQuestion(selections, currentProducts) {
    const unansweredQuestions = Object.keys(questionMetadata).filter(
        key => !selections[key]
    );

    if (unansweredQuestions.length === 0) return null;
    if (currentProducts.length <= 1) return null;

    let bestQuestion = null;
    let maxPower = 0;

    unansweredQuestions.forEach(question => {
        const power = calculateDiscriminatingPower(question, currentProducts);
        if (power > maxPower) {
            maxPower = power;
            bestQuestion = question;
        }
    });

    // If max power is very low, no question provides value
    if (maxPower < appConfig.algorithm.minDiscriminatingPower) return null;

    return bestQuestion;
}

// Export with alias to avoid conflict with internal function
export function shouldShowResultsTest(selections, currentProducts) {
    // Show results if 0 or 1 products remain
    if (currentProducts.length <= 1) return true;

    // Show results if all questions answered
    const totalQuestions = Object.keys(questionMetadata).length;
    const answeredQuestions = Object.keys(selections).filter(key => selections[key]).length;
    if (answeredQuestions >= totalQuestions) return true;

    // Show results if no more questions provide discriminating power
    const nextQuestion = getNextQuestion(selections, currentProducts);
    if (!nextQuestion) return true;

    return false;
}

// Re-export with expected name for tests
export { shouldShowResultsTest as shouldShowResults };

// Export security utilities for testing
export { escapeHTML, sanitizeURL, validateURLParam };

// Export i18n for testing
export { t, availableLanguages, loadTranslation, changeLanguage };

// Export UI functions for testing
export { showView, toggleMode, announceToScreenReader, showErrorNotification, showLoadingError, handleKeyboard };

// Export app state and config for testing
export { appState, appConfig, elements };
