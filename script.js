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
const questionMetadata = {
    location: { elementIndex: 0, attribute: 'availableIn', isArray: true },
    skinType: { elementIndex: 1, attribute: 'skinTypes', isArray: true },
    fragranceFree: { elementIndex: 2, attribute: 'isFragranceFree', isArray: false },
    forKids: { elementIndex: 3, attribute: 'forKids', isArray: false },
    formFactor: { elementIndex: 4, attribute: 'formFactors', isArray: true },
    waterResistant: { elementIndex: 5, attribute: 'waterResistant', isArray: false },
    specialFeatures: { elementIndex: 6, attribute: 'specialFeatures', isArray: true }
};

const appState = {
    currentView: 'welcome',
    mode: 'wizard', // 'wizard' or 'viewall'
    currentQuestionKey: null, // Current question key (e.g., 'location', 'skinType')
    questionHistory: [], // Track order of questions shown (for back button)
    totalQuestions: 7,
    selections: {
        location: null,
        skinType: null,
        fragranceFree: null,
        forKids: null,
        formFactor: null,
        waterResistant: null,
        specialFeatures: []
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

    // Update specific UI elements
    updateUITranslations();
}

function updateUITranslations() {
    // This function is called after language change and will re-render dynamic content
    // Update live count
    if (elements.liveCount && appState.currentView === 'questions') {
        updateLiveCount();
    }

    // Update progress text
    if (elements.currentQuestionSpan) {
        updateProgress();
    }

    // Re-render results if on results view
    if (appState.currentView === 'results' && appState.filteredResults.length >= 0) {
        renderResults(appState.filteredResults);
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
// Initialization
// ===================================

async function init() {
    try {
        // Show loading overlay
        const loadingOverlay = document.getElementById('loading-overlay');

        // Detect and load language
        await initializeLanguage();

        // Load sunscreen data
        await loadSunscreenData();

        // Hide loading overlay
        loadingOverlay.classList.add('hidden');
        setTimeout(() => loadingOverlay.style.display = 'none', 300);

        // Check for URL parameters and pre-populate
        checkURLParameters();

        // Setup event listeners
        setupEventListeners();

        // Initialize view
        showView('welcome');

        // Set initial progress and live count
        updateProgress();
        updateLiveCount();
    } catch (error) {
        console.error('Initialization error:', error);
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.querySelector('.loading-text').textContent = t('loading.error');
        loadingOverlay.querySelector('.spinner').style.display = 'none';
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
// Data Loading
// ===================================

/**
 * Validate sunscreen data structure
 * @param {Object} data - Parsed YAML data
 * @throws {Error} If validation fails
 */
function validateSunscreenData(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid data: must be an object');
    }

    if (!Array.isArray(data.sunscreens)) {
        throw new Error('Invalid data: sunscreens must be an array');
    }

    if (data.sunscreens.length === 0) {
        throw new Error('Invalid data: sunscreens array is empty');
    }

    // Validate each sunscreen entry
    data.sunscreens.forEach((sunscreen, index) => {
        const required = ['id', 'name', 'brand', 'spf', 'skinTypes', 'formFactors', 'availableIn'];
        required.forEach(field => {
            if (!(field in sunscreen)) {
                throw new Error(`Invalid sunscreen at index ${index}: missing required field '${field}'`);
            }
        });

        // Validate types
        if (typeof sunscreen.id !== 'number') {
            throw new Error(`Invalid sunscreen at index ${index}: 'id' must be a number`);
        }
        if (typeof sunscreen.name !== 'string' || sunscreen.name.length === 0) {
            throw new Error(`Invalid sunscreen at index ${index}: 'name' must be a non-empty string`);
        }
        if (typeof sunscreen.brand !== 'string' || sunscreen.brand.length === 0) {
            throw new Error(`Invalid sunscreen at index ${index}: 'brand' must be a non-empty string`);
        }
        if ((typeof sunscreen.spf !== 'number' && typeof sunscreen.spf !== 'string') || !sunscreen.spf) {
            throw new Error(`Invalid sunscreen at index ${index}: 'spf' must be a number or string`);
        }
        if (!Array.isArray(sunscreen.skinTypes) || sunscreen.skinTypes.length === 0) {
            throw new Error(`Invalid sunscreen at index ${index}: 'skinTypes' must be a non-empty array`);
        }
        if (!Array.isArray(sunscreen.formFactors) || sunscreen.formFactors.length === 0) {
            throw new Error(`Invalid sunscreen at index ${index}: 'formFactors' must be a non-empty array`);
        }
        if (!Array.isArray(sunscreen.availableIn) || sunscreen.availableIn.length === 0) {
            throw new Error(`Invalid sunscreen at index ${index}: 'availableIn' must be a non-empty array`);
        }
        if (typeof sunscreen.isFragranceFree !== 'boolean') {
            throw new Error(`Invalid sunscreen at index ${index}: 'isFragranceFree' must be a boolean`);
        }
        if (typeof sunscreen.forKids !== 'boolean') {
            throw new Error(`Invalid sunscreen at index ${index}: 'forKids' must be a boolean`);
        }
        if (typeof sunscreen.waterResistant !== 'boolean') {
            throw new Error(`Invalid sunscreen at index ${index}: 'waterResistant' must be a boolean`);
        }

        // Validate URL if present
        if (sunscreen.url && typeof sunscreen.url !== 'string') {
            throw new Error(`Invalid sunscreen at index ${index}: 'url' must be a string`);
        }
    });

    console.log(`✓ Validated ${data.sunscreens.length} sunscreens`);
}

async function loadSunscreenData() {
    try {
        const response = await fetch('data/sunscreens.yaml');

        if (!response.ok) {
            throw new Error(`Failed to load sunscreen data: ${response.status} ${response.statusText}`);
        }

        const yamlText = await response.text();
        const data = jsyaml.load(yamlText);

        // Validate data structure
        validateSunscreenData(data);

        appState.sunscreens = data.sunscreens;
        console.log(`✓ Loaded ${appState.sunscreens.length} sunscreens`);

        // Filter region options based on available products
        filterAvailableRegions();
    } catch (error) {
        console.error('Error loading sunscreen data:', error);
        // Show user-friendly error message
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.querySelector('.loading-text').textContent =
                'Failed to load sunscreen data. Please refresh the page or try again later.';
            loadingOverlay.querySelector('.spinner').style.display = 'none';
        }
        throw error;
    }
}

function filterAvailableRegions() {
    // Collect all unique regions from sunscreen data
    const availableRegions = new Set();

    appState.sunscreens.forEach(sunscreen => {
        if (sunscreen.availableIn && Array.isArray(sunscreen.availableIn)) {
            sunscreen.availableIn.forEach(region => {
                availableRegions.add(region);
            });
        }
    });

    // Hide region options that have no products
    const locationInputs = document.querySelectorAll('input[name="location"]');
    locationInputs.forEach(input => {
        const regionValue = input.value;
        const optionContainer = input.closest('.option');

        if (!availableRegions.has(regionValue) && regionValue !== 'Global') {
            // Hide this region option
            if (optionContainer) {
                optionContainer.classList.add('hidden');
            }
        } else {
            // Make sure it's visible
            if (optionContainer) {
                optionContainer.classList.remove('hidden');
            }
        }
    });
}

// ===================================
// URL Parameter Handling
// ===================================

function checkURLParameters() {
    const params = new URLSearchParams(window.location.search);
    let hasParams = false;

    // Validate and sanitize URL parameters
    if (params.has('location')) {
        const value = validateURLParam('location', params.get('location'));
        if (value) {
            appState.selections.location = value;
            selectRadioByValue('location', value);
            hasParams = true;
        }
    }
    if (params.has('skin')) {
        const value = validateURLParam('skin', params.get('skin'));
        if (value) {
            appState.selections.skinType = value;
            selectRadioByValue('skinType', value);
            hasParams = true;
        }
    }
    if (params.has('fragrance')) {
        const value = validateURLParam('fragrance', params.get('fragrance'));
        if (value) {
            appState.selections.fragranceFree = value;
            selectRadioByValue('fragranceFree', value);
            hasParams = true;
        }
    }
    if (params.has('kids')) {
        const value = validateURLParam('kids', params.get('kids'));
        if (value) {
            appState.selections.forKids = value;
            selectRadioByValue('forKids', value);
            hasParams = true;
        }
    }
    if (params.has('form')) {
        const value = validateURLParam('form', params.get('form'));
        if (value) {
            appState.selections.formFactor = value;
            selectRadioByValue('formFactor', value);
            hasParams = true;
        }
    }
    if (params.has('water')) {
        const value = validateURLParam('water', params.get('water'));
        if (value) {
            appState.selections.waterResistant = value;
            selectRadioByValue('waterResistant', value);
            hasParams = true;
        }
    }
    if (params.has('features')) {
        // Features can be comma-separated
        const featuresParam = params.get('features');
        const features = featuresParam.split(',').map(f => f.trim());
        const validFeatures = features.filter(f => validateURLParam('features', f));
        if (validFeatures.length > 0) {
            appState.selections.specialFeatures = validFeatures;
            selectCheckboxesByValues('specialFeatures', validFeatures);
            hasParams = true;
        }
    }

    // If any params exist, show results directly
    if (hasParams) {
        showSharedSelectionsNotification();

        // Build question history from answered questions
        Object.keys(appState.selections).forEach(key => {
            if (appState.selections[key] !== null) {
                appState.questionHistory.push(key);
            }
        });

        setTimeout(() => {
            showResults();
        }, 500);
    }
}

function selectRadioByValue(name, value) {
    const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (radio) {
        radio.checked = true;
    }
}

function selectCheckboxesByValues(name, values) {
    values.forEach(value => {
        const checkbox = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
}

function showSharedSelectionsNotification() {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'shared-notification';
    notification.setAttribute('role', 'status');
    notification.setAttribute('aria-live', 'polite');
    notification.innerHTML = `
        <div class="shared-notification-content">
            <span class="shared-icon">🔗</span>
            <p>You're viewing shared sunscreen preferences</p>
            <button id="start-fresh-btn" class="btn btn-secondary btn-small">Start Fresh</button>
            <button id="dismiss-notification-btn" class="btn-icon" aria-label="Dismiss notification">✕</button>
        </div>
    `;

    // Insert at top of questions view
    elements.questionsView.insertBefore(notification, elements.questionsView.firstChild);

    // Add event listeners
    document.getElementById('start-fresh-btn').addEventListener('click', () => {
        restart();
        notification.remove();
    });

    document.getElementById('dismiss-notification-btn').addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }
    }, 10000);
}

function generateShareURL() {
    const params = new URLSearchParams();
    if (appState.selections.location) params.set('location', appState.selections.location);
    if (appState.selections.skinType) params.set('skin', appState.selections.skinType);
    if (appState.selections.fragranceFree) params.set('fragrance', appState.selections.fragranceFree);
    if (appState.selections.forKids) params.set('kids', appState.selections.forKids);
    if (appState.selections.formFactor) params.set('form', appState.selections.formFactor);
    if (appState.selections.waterResistant) params.set('water', appState.selections.waterResistant);
    if (appState.selections.specialFeatures && appState.selections.specialFeatures.length > 0) {
        params.set('features', appState.selections.specialFeatures.join(','));
    }

    const baseURL = window.location.origin + window.location.pathname;
    return params.toString() ? `${baseURL}?${params.toString()}` : baseURL;
}

// ===================================
// Event Listeners
// ===================================

function setupEventListeners() {
    // Language selector
    elements.languageSelect.addEventListener('change', (e) => {
        changeLanguage(e.target.value);
    });

    // Start quiz
    elements.startQuizBtn.addEventListener('click', () => {
        // Determine first question dynamically
        const firstQuestion = determineNextQuestion();
        if (firstQuestion) {
            appState.currentQuestionKey = firstQuestion;
            appState.questionHistory = [firstQuestion];
        }

        showView('questions');
        updateQuestionDisplay();
        updateNavigationButtons();
        checkCurrentQuestionAnswered();
    });

    // Toggle mode
    elements.toggleModeBtn.addEventListener('click', toggleMode);

    // Navigation
    elements.prevBtn.addEventListener('click', previousQuestion);
    elements.nextBtn.addEventListener('click', nextQuestion);
    elements.showResultsBtn.addEventListener('click', showResults);

    // Restart
    elements.restartBtn.addEventListener('click', restart);

    // Form inputs
    elements.questionsForm.addEventListener('change', handleFormChange);

    // Share buttons
    elements.shareWhatsApp.addEventListener('click', shareWhatsApp);
    elements.shareFacebook.addEventListener('click', shareFacebook);
    elements.shareTwitter.addEventListener('click', shareTwitter);
    elements.shareCopy.addEventListener('click', copyLink);

    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboard);
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
        // Focus first question
        const firstInput = elements.questions[0].querySelector('input');
        if (firstInput) firstInput.focus();
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
        updateNavigationButtons();

        // Show only current question
        updateQuestionDisplay();
    }

    // Update button states for new mode
    checkCurrentQuestionAnswered();

    announceToScreenReader(t('screenReader.switchedMode', { mode: appState.mode }));
}

// ===================================
// Question Navigation
// ===================================

function previousQuestion() {
    if (appState.questionHistory.length > 0) {
        // Pop the last question from history
        appState.questionHistory.pop();

        // Get the previous question (last in history)
        if (appState.questionHistory.length > 0) {
            const prevQuestionKey = appState.questionHistory[appState.questionHistory.length - 1];
            appState.currentQuestionKey = prevQuestionKey;
        } else {
            // No more history, go to first question
            appState.currentQuestionKey = determineNextQuestion();
        }

        updateQuestionDisplay();
        updateProgress();
        updateNavigationButtons();
        checkCurrentQuestionAnswered();
    }
}

function nextQuestion() {
    // Button should be disabled if not answered, but double-check
    if (appState.currentQuestionKey) {
        const metadata = questionMetadata[appState.currentQuestionKey];
        const currentQ = elements.questions[metadata.elementIndex];
        const inputs = currentQ.querySelectorAll('input');
        let answered = false;

        inputs.forEach(input => {
            if (input.checked) answered = true;
        });

        if (!answered) {
            return; // Button should already be disabled
        }
    }

    // Check if we should show results (early termination)
    if (shouldShowResults()) {
        showResults();
        return;
    }

    // Determine next question dynamically
    const nextQuestionKey = determineNextQuestion();

    if (nextQuestionKey) {
        appState.currentQuestionKey = nextQuestionKey;
        appState.questionHistory.push(nextQuestionKey);
        updateQuestionDisplay();
        updateProgress();
        updateNavigationButtons();
    } else {
        showResults();
    }
}

function updateQuestionDisplay() {
    if (!appState.currentQuestionKey) {
        // Determine first question
        const firstQuestion = determineNextQuestion();
        if (firstQuestion) {
            appState.currentQuestionKey = firstQuestion;
            appState.questionHistory = [firstQuestion];
        }
    }

    if (appState.currentQuestionKey) {
        const metadata = questionMetadata[appState.currentQuestionKey];

        elements.questions.forEach((q, index) => {
            q.classList.remove('active');
            if (index === metadata.elementIndex) {
                q.classList.add('active');
                // Focus first input in new question
                const firstInput = q.querySelector('input');
                if (firstInput) firstInput.focus();
            }
        });
    }

    checkCurrentQuestionAnswered();
}

function checkCurrentQuestionAnswered() {
    // In wizard mode, check current question
    if (appState.mode === 'wizard' && appState.currentQuestionKey) {
        const metadata = questionMetadata[appState.currentQuestionKey];
        const currentQ = elements.questions[metadata.elementIndex];
        const inputs = currentQ.querySelectorAll('input');
        let answered = false;

        // Special features question is optional (checkboxes)
        if (appState.currentQuestionKey === 'specialFeatures') {
            answered = true; // Always considered answered (optional)
        } else {
            inputs.forEach(input => {
                if (input.checked) answered = true;
            });
        }

        // Update next button
        if (answered) {
            elements.nextBtn.disabled = false;
            elements.nextBtn.removeAttribute('data-tooltip');
        } else {
            elements.nextBtn.disabled = true;
            elements.nextBtn.setAttribute('data-tooltip', t('navigation.pleaseSelect'));
        }
    }

    // Check if we should show results for "Show Results" button
    if (shouldShowResults()) {
        elements.showResultsBtn.disabled = false;
        elements.showResultsBtn.removeAttribute('data-tooltip');
    } else {
        elements.showResultsBtn.disabled = true;
        elements.showResultsBtn.setAttribute('data-tooltip', t('navigation.answerAll'));
    }
}

function updateNavigationButtons() {
    if (appState.questionHistory.length === 0) {
        elements.prevBtn.classList.add('hidden');
    } else {
        elements.prevBtn.classList.remove('hidden');
    }

    // Check if we're at the end (should show results)
    if (shouldShowResults()) {
        elements.nextBtn.classList.add('hidden');
        elements.showResultsBtn.classList.remove('hidden');
    } else {
        elements.nextBtn.classList.remove('hidden');
        elements.showResultsBtn.classList.add('hidden');
    }
}

// ===================================
// Progress Tracking
// ===================================

function updateProgress() {
    // Count answered questions
    let answeredCount = 0;
    Object.values(appState.selections).forEach(val => {
        if (val !== null) answeredCount++;
    });

    const percentage = (answeredCount / appState.totalQuestions) * 100;
    elements.progressBar.style.width = `${percentage}%`;
    elements.currentQuestionSpan.textContent = answeredCount;
    elements.totalQuestionsSpan.textContent = appState.totalQuestions;

    // Update progress bar ARIA
    const progressContainer = document.querySelector('.progress-container');
    progressContainer.setAttribute('aria-valuenow', answeredCount);
}

// ===================================
// Form Handling
// ===================================

function handleFormChange(event) {
    const name = event.target.name;
    const value = event.target.value;
    const type = event.target.type;

    // Handle checkboxes differently (for specialFeatures)
    if (type === 'checkbox' && name === 'specialFeatures') {
        // Get all checked checkboxes with this name
        const checkedBoxes = document.querySelectorAll(`input[name="${name}"]:checked`);
        const values = Array.from(checkedBoxes).map(cb => cb.value);
        appState.selections[name] = values;

        // Announce to screen reader
        announceToScreenReader(`${values.length} special features selected`);
    } else {
        // Regular radio button handling
        appState.selections[name] = value;

        // Announce to screen reader
        announceToScreenReader(`Selected ${value}`);
    }

    // Update progress
    updateProgress();

    // Update live count
    updateLiveCount();

    // Check if current question is answered (enable/disable next button)
    checkCurrentQuestionAnswered();

    // Auto-advance in wizard mode (only for non-checkbox questions)
    if (appState.mode === 'wizard' && type !== 'checkbox') {
        autoAdvanceToNextQuestion();
    }
}

function updateLiveCount() {
    const results = filterSunscreens();
    const count = results.length;
    const countNumber = elements.liveCount.querySelector('.count-number');
    const countText = elements.liveCount.querySelector('.count-text');

    // Trigger animation by removing and re-adding
    countNumber.style.animation = 'none';
    setTimeout(() => {
        countNumber.textContent = count;
        countNumber.style.animation = 'countUpdate 0.4s ease';
    }, 10);

    countText.textContent = count === 1 ? t('liveCount.singular') : t('liveCount.plural');
}

function autoAdvanceToNextQuestion() {
    // Wait a moment so user sees their selection, then advance
    setTimeout(() => {
        // Check if we should show results (early termination)
        if (shouldShowResults()) {
            showResults();
            return;
        }

        // Determine next question dynamically
        const nextQuestionKey = determineNextQuestion();

        if (nextQuestionKey) {
            appState.currentQuestionKey = nextQuestionKey;
            appState.questionHistory.push(nextQuestionKey);
            updateQuestionDisplay();
            updateProgress();
            updateNavigationButtons();
        } else {
            // No more questions - show results
            showResults();
        }
    }, 400); // 400ms delay for visual feedback
}

// ===================================
// Filtering Logic
// ===================================

function filterSunscreens() {
    let results = [...appState.sunscreens];

    // Filter by location/region
    if (appState.selections.location && appState.selections.location !== 'Global') {
        results = results.filter(s =>
            s.availableIn && (
                s.availableIn.includes(appState.selections.location) ||
                s.availableIn.includes('Global')
            )
        );
    }

    // Filter by skin type
    if (appState.selections.skinType && appState.selections.skinType !== 'all') {
        results = results.filter(s =>
            s.skinTypes.includes(appState.selections.skinType) ||
            s.skinTypes.includes('all')
        );
    }

    // Filter by fragrance-free
    if (appState.selections.fragranceFree === 'true') {
        results = results.filter(s => s.isFragranceFree === true);
    } else if (appState.selections.fragranceFree === 'false') {
        results = results.filter(s => s.isFragranceFree === false);
    }

    // Filter by kids
    if (appState.selections.forKids === 'true') {
        results = results.filter(s => s.forKids === true);
    } else if (appState.selections.forKids === 'false') {
        results = results.filter(s => s.forKids === false);
    }

    // Filter by form factor
    if (appState.selections.formFactor && appState.selections.formFactor !== 'any') {
        results = results.filter(s => s.formFactors.includes(appState.selections.formFactor));
    }

    // Filter by water resistant
    if (appState.selections.waterResistant === 'true') {
        results = results.filter(s => s.waterResistant === true);
    } else if (appState.selections.waterResistant === 'false') {
        results = results.filter(s => s.waterResistant === false);
    }

    // Filter by special features (must have ALL selected features)
    if (appState.selections.specialFeatures && appState.selections.specialFeatures.length > 0) {
        results = results.filter(s => {
            if (!s.specialFeatures || !Array.isArray(s.specialFeatures)) {
                return false;
            }
            // Product must have ALL selected features
            return appState.selections.specialFeatures.every(feature =>
                s.specialFeatures.includes(feature)
            );
        });
    }

    appState.filteredResults = results;
    return results;
}

// ===================================
// Dynamic Question Ordering
// ===================================

/**
 * Calculate discriminating power for a question
 * Returns a score representing how well this question splits the remaining products
 * Higher score = better discrimination
 */
function calculateDiscriminatingPower(questionKey, currentProducts) {
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

/**
 * Determine the next question to show
 * Returns the question key with highest discriminating power
 * Returns null if all questions answered or no more discriminating questions
 */
function determineNextQuestion() {
    // Get unanswered questions (excluding array-based optional questions like specialFeatures)
    const unansweredQuestions = Object.keys(appState.selections).filter(
        key => appState.selections[key] === null
    );

    // If we have unanswered required questions, prioritize those
    if (unansweredQuestions.length > 0) {
        // Get current filtered products
        const currentProducts = filterSunscreens();

        // If only 0-1 products remain, no point in asking more questions
        if (currentProducts.length <= 1) {
            // But still show specialFeatures if not shown yet
            if (!appState.questionHistory.includes('specialFeatures')) {
                return 'specialFeatures';
            }
            return null;
        }

        // Calculate discriminating power for each unanswered question
        const questionScores = unansweredQuestions.map(key => ({
            key,
            score: calculateDiscriminatingPower(key, currentProducts)
        }));

        // Filter out questions with zero discriminating power (all products same value)
        const discriminatingQuestions = questionScores.filter(q => q.score > 0);

        // If no discriminating questions remain, show specialFeatures if not shown yet
        if (discriminatingQuestions.length === 0) {
            if (!appState.questionHistory.includes('specialFeatures')) {
                return 'specialFeatures';
            }
            return null;
        }

        // Sort by score (highest first) and return the best question
        discriminatingQuestions.sort((a, b) => b.score - a.score);

        return discriminatingQuestions[0].key;
    }

    // All required questions answered - show optional specialFeatures if not shown yet
    if (!appState.questionHistory.includes('specialFeatures')) {
        return 'specialFeatures';
    }

    return null;
}

/**
 * Check if we should show results (early termination)
 */
function shouldShowResults() {
    const currentProducts = filterSunscreens();

    // If 0-1 products, show results
    if (currentProducts.length <= 1) {
        return true;
    }

    // If all questions answered, show results
    const unansweredQuestions = Object.keys(appState.selections).filter(
        key => appState.selections[key] === null
    );
    if (unansweredQuestions.length === 0) {
        return true;
    }

    // Check if remaining questions have any discriminating power
    const nextQuestion = determineNextQuestion();
    if (nextQuestion === null) {
        return true;
    }

    return false;
}

// ===================================
// Show Results
// ===================================

function showResults() {
    // Filter sunscreens
    const results = filterSunscreens();

    // Update URL
    history.pushState({}, '', generateShareURL());

    // Render results
    renderResults(results);

    // Show results view
    showView('results');

    // Announce to screen reader
    announceToScreenReader(`Found ${results.length} matching sunscreens`);
}

function renderResults(results) {
    // Update summary
    if (results.length === 0) {
        elements.resultsSummary.innerHTML = '😕 No sunscreens match all your criteria. Try adjusting your preferences.';
    } else if (results.length === 1) {
        elements.resultsSummary.innerHTML = '🎉 Found <strong>1 perfect match</strong> for you!';
    } else {
        elements.resultsSummary.innerHTML = `🎉 Found <strong>${results.length} great options</strong> for you!`;
    }

    // Render results
    if (results.length === 0) {
        // Generate helpful suggestions and track which question to go back to
        const suggestions = [];
        let firstSuggestionQuestionKey = null;

        // Form Factor
        if (appState.selections.formFactor && appState.selections.formFactor !== 'any') {
            suggestions.push(`Try different form factors (currently: ${appState.selections.formFactor})`);
            if (!firstSuggestionQuestionKey) firstSuggestionQuestionKey = 'formFactor';
        }
        // Fragrance Free
        if (appState.selections.fragranceFree === 'true') {
            suggestions.push('Consider fragrance-free optional');
            if (!firstSuggestionQuestionKey) firstSuggestionQuestionKey = 'fragranceFree';
        }
        // Water Resistant
        if (appState.selections.waterResistant === 'true') {
            suggestions.push('Water resistance might be limiting options');
            if (!firstSuggestionQuestionKey) firstSuggestionQuestionKey = 'waterResistant';
        }

        elements.resultsContainer.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">😔</div>
                <h3>No sunscreens match your criteria</h3>
                <p>We couldn't find any sunscreens matching all your preferences.</p>
                ${suggestions.length > 0 ? `
                    <div class="suggestions">
                        <h4>Try adjusting:</h4>
                        <ul>
                            ${suggestions.map(s => `<li>${escapeHTML(s)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                <div class="no-results-actions">
                    <button id="adjust-filters-btn" data-question="${firstSuggestionQuestionKey || ''}" class="btn btn-secondary">← Adjust Filters</button>
                    <button id="no-results-restart-btn" class="btn btn-primary">Start Over</button>
                </div>
            </div>
        `;

        // Attach event listeners (safer than inline onclick)
        const adjustBtn = document.getElementById('adjust-filters-btn');
        if (adjustBtn) {
            adjustBtn.addEventListener('click', () => {
                const questionKey = adjustBtn.dataset.question;
                goBackToQuestions(questionKey || null);
            });
        }

        const noResultsRestartBtn = document.getElementById('no-results-restart-btn');
        if (noResultsRestartBtn) {
            noResultsRestartBtn.addEventListener('click', restart);
        }
    } else {
        elements.resultsContainer.innerHTML = results.map(renderResultCard).join('');
    }
}

function renderResultCard(sunscreen) {
    // Escape all user-controlled data to prevent XSS
    const name = escapeHTML(sunscreen.name);
    const brand = escapeHTML(sunscreen.brand);
    const spf = parseInt(sunscreen.spf, 10) || 0; // Ensure number
    const price = escapeHTML(sunscreen.price);

    const formFactorsList = sunscreen.formFactors
        .map(f => escapeHTML(f.charAt(0).toUpperCase() + f.slice(1)))
        .join(', ');

    const skinTypesList = sunscreen.skinTypes
        .map(t => escapeHTML(t.charAt(0).toUpperCase() + t.slice(1)))
        .join(', ');

    // Sanitize URL - only allow http/https
    const safeURL = sanitizeURL(sunscreen.url);

    // Parse and link ingredients to INCIDecoder
    let ingredientsHTML = '';
    if (sunscreen.ingredients) {
        const classifications = sunscreen.ingredientClassifications || {};

        const ingredientList = sunscreen.ingredients
            .split(' - ')
            .map(ingredient => {
                const trimmed = ingredient.trim();
                const slug = trimmed.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^\w-]/g, '');
                const escaped = escapeHTML(trimmed);

                // Check if ingredient has a classification
                let badge = '';
                const classification = classifications[trimmed];
                if (classification) {
                    const badgeEmoji = classification === 'superstar' ? '⭐' :
                                     classification === 'goodie' ? '✓' :
                                     classification === 'icky' ? '⚠' : '';
                    badge = `<span class="ingredient-badge ingredient-badge-${classification}" title="${classification}">${badgeEmoji}</span> `;
                }

                return `<a href="https://incidecoder.com/ingredients/${slug}" target="_blank" rel="noopener noreferrer" class="ingredient-link">${badge}${escaped}</a>`;
            })
            .join(', ');

        ingredientsHTML = `
            <details class="ingredients-section">
                <summary>Ingredients</summary>
                <p class="ingredients-list">${ingredientList}</p>
            </details>
        `;
    }

    return `
        <article class="result-card" aria-label="${name} by ${brand}">
            <h3>${name}</h3>
            <p class="brand">${brand}</p>

            <div class="result-details">
                <span class="detail-badge">SPF ${spf}</span>
                <span class="detail-badge">${formFactorsList}</span>
                ${sunscreen.isFragranceFree ? '<span class="detail-badge">Fragrance-Free</span>' : ''}
                ${sunscreen.waterResistant ? '<span class="detail-badge">Water Resistant</span>' : ''}
                ${sunscreen.forKids ? '<span class="detail-badge">For Kids</span>' : ''}
                ${price ? `<span class="detail-badge">${price}</span>` : ''}
            </div>

            <p><strong>Skin Types:</strong> ${skinTypesList}</p>

            ${ingredientsHTML}

            ${safeURL ? `<a href="${safeURL}" target="_blank" rel="noopener noreferrer" class="product-link">Learn More →</a>` : ''}
        </article>
    `;
}

// ===================================
// Share Functionality
// ===================================

function generateShareMessage() {
    const criteria = [];

    // Add skin type
    if (appState.selections.skinType && appState.selections.skinType !== 'all') {
        criteria.push(`${appState.selections.skinType} skin`);
    }

    // Add fragrance-free
    if (appState.selections.fragranceFree === 'true') {
        criteria.push('fragrance-free');
    }

    // Add kids
    if (appState.selections.forKids === 'true') {
        criteria.push('kids');
    }

    // Add form factor
    if (appState.selections.formFactor && appState.selections.formFactor !== 'any') {
        criteria.push(appState.selections.formFactor);
    }

    // Add water resistant
    if (appState.selections.waterResistant === 'true') {
        criteria.push('water-resistant');
    }

    const count = appState.filteredResults.length;

    if (criteria.length > 0) {
        const criteriaText = criteria.join(', ');
        return `I found ${count} sunscreen${count !== 1 ? 's' : ''} tailored for my ${criteriaText} needs! 🌞`;
    } else {
        return `I found ${count} perfect sunscreen${count !== 1 ? 's' : ''}! 🌞`;
    }
}

function shareWhatsApp() {
    const message = generateShareMessage();
    const url = generateShareURL();

    // Add extra line break and make sure URL is clean for WhatsApp to detect
    const fullText = `${message}\n\nCheck it out: ${url}`;

    // Mobile: try WhatsApp app, Desktop: web.whatsapp.com
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const whatsappURL = isMobile
        ? `whatsapp://send?text=${encodeURIComponent(fullText)}`
        : `https://web.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;

    window.open(whatsappURL, '_blank');
}

function shareFacebook() {
    const url = generateShareURL();
    const facebookURL = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookURL, '_blank', 'width=600,height=400');
}

function shareTwitter() {
    const message = generateShareMessage();
    const url = generateShareURL();
    const twitterURL = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`;
    window.open(twitterURL, '_blank', 'width=600,height=400');
}

async function copyLink() {
    const url = generateShareURL();

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url);
            showCopyConfirmation(t('share.copyConfirmation'));
        } else {
            // Fallback for browsers without clipboard API
            fallbackCopyToClipboard(url);
            showCopyConfirmation(t('share.copyConfirmation'));
        }
    } catch (error) {
        console.error('Copy failed:', error);
        showCopyConfirmation(t('share.copyFailed'));
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
    } catch (error) {
        console.error('Fallback copy failed:', error);
    }

    document.body.removeChild(textArea);
}

function showCopyConfirmation(message) {
    elements.copyConfirmation.textContent = message;
    announceToScreenReader(message);

    setTimeout(() => {
        elements.copyConfirmation.textContent = '';
    }, 3000);
}

// ===================================
// Navigation
// ===================================

function goBackToQuestions(questionKey = null) {
    // Go back to questions view without clearing selections
    showView('questions');

    // Make sure we're in the right mode and question
    if (appState.mode === 'viewall') {
        // Stay in view all mode
        elements.questions.forEach(q => q.classList.add('active'));
    } else {
        // Go to specified question or determine next unanswered question
        if (questionKey && questionMetadata[questionKey]) {
            appState.currentQuestionKey = questionKey;
            // Don't add to history since we're going back
        } else {
            // Determine next unanswered question
            const nextQuestion = determineNextQuestion();
            if (nextQuestion) {
                appState.currentQuestionKey = nextQuestion;
            }
        }
        updateQuestionDisplay();
        updateNavigationButtons();
    }

    announceToScreenReader('Back to questions');
}

// ===================================
// Restart
// ===================================

function restart() {
    // Reset state
    appState.currentQuestionKey = null;
    appState.questionHistory = [];
    appState.selections = {
        location: null,
        skinType: null,
        fragranceFree: null,
        forKids: null,
        formFactor: null,
        waterResistant: null
    };
    appState.filteredResults = [];

    // Clear form
    elements.questionsForm.reset();

    // Reset URL
    history.pushState({}, '', window.location.pathname);

    // Reset mode to wizard
    if (appState.mode === 'viewall') {
        toggleMode();
    }

    // Update UI
    updateProgress();
    updateNavigationButtons();

    // Show welcome
    showView('welcome');

    announceToScreenReader('Quiz restarted');
}

// ===================================
// Keyboard Navigation
// ===================================

function handleKeyboard(event) {
    // Escape key: go back or restart
    if (event.key === 'Escape') {
        if (appState.currentView === 'questions' && appState.questionHistory.length > 0 && appState.mode === 'wizard') {
            previousQuestion();
        } else if (appState.currentView === 'results') {
            restart();
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

// Set initial mode
document.body.classList.add('wizard-mode');

// Wait for DOM and jsyaml to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
