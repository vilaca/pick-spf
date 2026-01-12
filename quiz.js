// ===================================
// Quiz Module - Lazy Loaded
// ===================================
// This module orchestrates all quiz-related logic that is only needed
// when the user clicks "Start Quiz". It is loaded dynamically to
// reduce initial page load time.

// Import modules
import { filterSunscreens } from './sub-modules/quiz/filters.js';
import { updateSpecialFeaturesAvailability } from './sub-modules/quiz/special-features.js';
import { determineNextQuestion, shouldShowResults } from './sub-modules/quiz/navigation.js';
import { initResults, showResults, generateShareURL } from './sub-modules/results/display.js';
import { initShare, shareWhatsApp, shareFacebook, shareTwitter, copyLink } from './sub-modules/results/share.js';
import { initUIUpdates, updateProgress, updateNavigationButtons, updateRestartButtonVisibility, checkCurrentQuestionAnswered, updateLiveCount } from './sub-modules/ui-updates.js';
import { initDataLoader, loadQuizResources } from './sub-modules/data-loader.js';
import { initURLParams, checkURLParameters } from './sub-modules/url-params.js';

// ===================================
// Shared state (passed from main script)
// ===================================
let appState;
let appConfig;
let questionMetadata;
let mutuallyExclusiveFeatures;
let elements;
let t; // Translation function
let escapeHTML; // Security utility
let sanitizeURL; // Security utility
let validateURLParam; // URL validation
let announceToScreenReader; // Accessibility helper
let showLoadingError; // Error handler
let showView; // View management

// ===================================
// Initialization
// ===================================

/**
 * Initialize the quiz module with dependencies from main script
 * @param {Object} deps - Dependencies from main script
 */
export function initQuiz(deps) {
    appState = deps.appState;
    appConfig = deps.appConfig;
    questionMetadata = deps.questionMetadata;
    mutuallyExclusiveFeatures = deps.mutuallyExclusiveFeatures;
    elements = deps.elements;
    t = deps.t;
    escapeHTML = deps.escapeHTML;
    sanitizeURL = deps.sanitizeURL;
    validateURLParam = deps.validateURLParam;
    announceToScreenReader = deps.announceToScreenReader;
    showLoadingError = deps.showLoadingError;
    showView = deps.showView;

    // Initialize all modules with their dependencies
    initDataLoader({
        appState,
        appConfig,
        questionMetadata,
        mutuallyExclusiveFeatures,
        showLoadingError
    });

    initURLParams({
        appState,
        appConfig,
        validateURLParam,
        showView,
        announceToScreenReader
    });

    initUIUpdates({
        elements,
        appState,
        questionMetadata,
        t
    });

    initResults({
        escapeHTML,
        sanitizeURL,
        announceToScreenReader,
        showView,
        elements,
        appState,
        questionMetadata,
        t,
        updateRestartButtonVisibility
    });

    initShare({
        appState,
        appConfig,
        elements,
        t,
        announceToScreenReader
    });

    // Expose functions for URL params module to call
    window.quizRestart = restart;
    window.quizDetermineNextQuestion = () => determineNextQuestion(appState, questionMetadata);
    window.quizUpdateQuestionDisplay = updateQuestionDisplay;
    window.quizUpdateNavigationButtons = updateNavigationButtons;
}

// ===================================
// Re-export functions for main script
// ===================================
export { loadQuizResources };
export { generateShareURL, shareWhatsApp, shareFacebook, shareTwitter, copyLink };

/**
 * Check URL parameters and show results if present
 */
export function checkURLParametersAndShowResults() {
    checkURLParameters(showResults);
}

// ===================================
// Question Navigation
// ===================================

export function previousQuestion() {
    if (appState.questionHistory.length > 1) {
        // Pop the current question from history
        appState.questionHistory.pop();

        // Get the previous question (last in history)
        const prevQuestionKey = appState.questionHistory[appState.questionHistory.length - 1];
        appState.currentQuestionKey = prevQuestionKey;

        updateQuestionDisplay();
        updateProgress();
        updateNavigationButtons();
        checkCurrentQuestionAnswered();
    }
}

export function nextQuestion() {
    // Button should be disabled if not answered, but double-check
    if (appState.currentQuestionKey) {
        const metadata = questionMetadata[appState.currentQuestionKey];
        const currentQ = elements.questions[metadata.elementIndex];
        const inputs = currentQ.querySelectorAll('input');
        let answered = false;

        inputs.forEach(input => {
            if (input.checked) answered = true;
        });

        // Special handling for optional specialFeatures question
        if (!answered && appState.currentQuestionKey === 'specialFeatures') {
            // Mark as answered with empty array (user chose to skip)
            appState.selections.specialFeatures = [];
            answered = true;
        }

        if (!answered) {
            return; // Button should already be disabled
        }
    }

    // Check if we should show results (early termination)
    if (shouldShowResults(appState, questionMetadata)) {
        showResults();
        return;
    }

    // Determine next question dynamically
    const nextQuestionKey = determineNextQuestion(appState, questionMetadata);

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

export function updateQuestionDisplay() {
    if (!appState.currentQuestionKey) {
        // Determine first question
        const firstQuestion = determineNextQuestion(appState, questionMetadata);
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
            }
        });

        // Update special features availability if showing that question
        if (appState.currentQuestionKey === 'specialFeatures') {
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => updateSpecialFeaturesAvailability(appState), 0);
        }
    }

    checkCurrentQuestionAnswered();
}

// Export for UI updates module
export { updateProgress, updateNavigationButtons, updateRestartButtonVisibility, checkCurrentQuestionAnswered };

// ===================================
// Form Handling
// ===================================

export function handleFormChange(event) {
    const name = event.target.name;
    const value = event.target.value;
    const type = event.target.type;

    // Handle checkboxes differently (for specialFeatures)
    if (type === 'checkbox' && name === 'specialFeatures') {
        // If this checkbox was just checked (not unchecked)
        // Check for mutually exclusive features (loaded from YAML)
        if (event.target.checked && mutuallyExclusiveFeatures[value]) {
            // Uncheck incompatible features
            mutuallyExclusiveFeatures[value].forEach(incompatible => {
                const incompatibleCheckbox = document.querySelector(`input[name="${name}"][value="${incompatible}"]`);
                if (incompatibleCheckbox && incompatibleCheckbox.checked) {
                    incompatibleCheckbox.checked = false;
                }
            });
        }

        // Get all checked checkboxes with this name
        const checkedBoxes = document.querySelectorAll(`input[name="${name}"]:checked`);
        const values = Array.from(checkedBoxes).map(cb => cb.value);
        appState.selections[name] = values;

        // Update which features are available after this selection change
        updateSpecialFeaturesAvailability(appState);

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

    // Update restart button visibility
    updateRestartButtonVisibility();

    // Check if current question is answered (enable/disable next button)
    checkCurrentQuestionAnswered();

    // Auto-advance (only for non-checkbox questions)
    if (type !== 'checkbox') {
        autoAdvanceToNextQuestion();
    }
}

function autoAdvanceToNextQuestion() {
    // Wait a moment so user sees their selection, then advance
    setTimeout(() => {
        // Check if we should show results (early termination)
        if (shouldShowResults(appState, questionMetadata)) {
            showResults();
            return;
        }

        // Determine next question dynamically
        const nextQuestionKey = determineNextQuestion(appState, questionMetadata);

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
    }, appConfig.timings.autoAdvanceDelay); // Delay for visual feedback
}

// ===================================
// Restart
// ===================================

export function restart() {
    // Reset state
    appState.currentQuestionKey = null;
    appState.questionHistory = [];
    appState.selections = {
        location: null,
        skinType: null,
        fragranceFree: null,
        forKids: null,
        formFactor: null,
        waterResistant: null,
        specialFeatures: null
    };
    appState.filteredResults = [];

    // Clear form - reset all radio buttons and checkboxes
    elements.questionsForm.reset();

    // Manually clear all checkboxes (in case reset doesn't work)
    const allCheckboxes = elements.questionsForm.querySelectorAll('input[type="checkbox"]');
    allCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    // Manually clear all radio buttons
    const allRadios = elements.questionsForm.querySelectorAll('input[type="radio"]');
    allRadios.forEach(radio => {
        radio.checked = false;
    });

    // Reset URL
    history.pushState({}, '', window.location.pathname);

    // Update UI
    updateProgress();
    updateNavigationButtons();
    updateLiveCount();

    // Reset start button state
    if (elements.startQuizBtn) {
        elements.startQuizBtn.disabled = false;
        elements.startQuizBtn.textContent = t('welcome.startButton') || 'Start Quiz';
    }

    // Show welcome
    showView('welcome');

    announceToScreenReader('Quiz restarted');
}

// ===================================
// Export for results module and tests
// ===================================
export { filterSunscreens, updateLiveCount, showResults, determineNextQuestion };
export { calculateDiscriminatingPower } from './sub-modules/quiz/navigation.js';
