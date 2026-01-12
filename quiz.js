// ===================================
// Quiz Module - Lazy Loaded
// ===================================
// This module orchestrates all quiz-related logic that is only needed
// when the user clicks "Start Quiz". It is loaded dynamically to
// reduce initial page load time.

// Import modules
import { filterSunscreens } from './modules/quiz/filters.js';
import { updateSpecialFeaturesAvailability } from './modules/quiz/special-features.js';
import { determineNextQuestion, shouldShowResults } from './modules/quiz/navigation.js';
import { initResults, showResults, generateShareURL } from './modules/results/display.js';
import { initShare, shareWhatsApp, shareFacebook, shareTwitter, copyLink } from './modules/results/share.js';
import { initUIUpdates, updateProgress, updateNavigationButtons, updateRestartButtonVisibility, checkCurrentQuestionAnswered, updateLiveCount } from './modules/ui-updates.js';
import { initDataLoader, loadQuizResources } from './modules/data-loader.js';
import { initURLParams, checkURLParameters } from './modules/url-params.js';
import { updateOptionAvailability, checkAndAutoSkip } from './modules/quiz/dynamic-options.js';

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
    // Auto-select "no preference" if user hasn't made a choice
    if (appState.currentQuestionKey) {
        const metadata = questionMetadata[appState.currentQuestionKey];
        const currentQ = elements.questions[metadata.elementIndex];
        const inputs = currentQ.querySelectorAll('input');
        let answered = false;

        inputs.forEach(input => {
            if (input.checked) answered = true;
        });

        // If not answered, auto-select the "no preference" option
        if (!answered) {
            // Define "no preference" values for each question
            const noPreferenceValues = {
                location: 'Global',
                skinType: 'all',
                fragranceFree: 'any',
                forKids: 'any',
                formFactor: 'any',
                waterResistant: 'any',
                specialFeatures: []
            };

            const noPreferenceValue = noPreferenceValues[appState.currentQuestionKey];

            if (noPreferenceValue !== undefined) {
                // Auto-select the no preference option
                if (appState.currentQuestionKey === 'specialFeatures') {
                    // For checkboxes, just set empty array
                    appState.selections.specialFeatures = [];
                    answered = true;
                } else {
                    // For radio buttons, find and check the input
                    const noPreferenceInput = currentQ.querySelector(`input[value="${noPreferenceValue}"]`);
                    if (noPreferenceInput) {
                        noPreferenceInput.checked = true;
                        // Trigger change event to update selections
                        noPreferenceInput.dispatchEvent(new Event('change', { bubbles: true }));
                        answered = true;
                    }
                }
            }
        }

        // If still not answered (auto-select failed), don't proceed
        if (!answered) {
            return;
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

        // Update option availability for current question
        // This disables options that would result in 0 products
        setTimeout(() => {
            updateOptionAvailability(appState, questionMetadata, t);

            // Always check if current question is answered
            checkCurrentQuestionAnswered();

            // Check if we should auto-skip this question (only one available option)
            // This happens after a slight delay so user can see what was auto-selected
            setTimeout(() => {
                checkAndAutoSkip(appState, questionMetadata);
            }, 300);
        }, 0);
    } else {
        checkCurrentQuestionAnswered();
    }
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
export { calculateDiscriminatingPower } from './modules/quiz/navigation.js';
