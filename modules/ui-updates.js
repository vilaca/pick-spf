// ===================================
// UI Updates (Progress, Buttons, Live Count)
// ===================================

import { filterSunscreens } from './quiz/filters.js';
import { shouldShowResults } from './quiz/navigation.js';

let elements;
let appState;
let questionMetadata;
let t;

/**
 * Initialize UI updates module with dependencies
 */
export function initUIUpdates(deps) {
    elements = deps.elements;
    appState = deps.appState;
    questionMetadata = deps.questionMetadata;
    t = deps.t;
}

/**
 * Update progress bar and counter
 */
export function updateProgress() {
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

/**
 * Update navigation buttons (prev/next/show results)
 */
export function updateNavigationButtons() {
    // Hide Previous button only on the first question (history length = 1)
    if (appState.questionHistory.length <= 1) {
        elements.prevBtn.classList.add('hidden');
    } else {
        elements.prevBtn.classList.remove('hidden');
    }

    // Check if we're at the end (should show results)
    if (shouldShowResults(appState, questionMetadata)) {
        elements.nextBtn.classList.add('hidden');
        elements.showResultsBtn.classList.remove('hidden');
    } else {
        elements.nextBtn.classList.remove('hidden');
        elements.showResultsBtn.classList.add('hidden');
    }

    // Update restart button visibility
    updateRestartButtonVisibility();
}

/**
 * Update restart button visibility based on selections
 */
export function updateRestartButtonVisibility() {
    // Check if any selections have been made
    const hasSelections = Object.values(appState.selections).some(val => {
        if (val === null) return false;
        if (Array.isArray(val)) return val.length > 0;
        return true;
    });

    // Show/hide restart buttons based on whether selections exist
    if (hasSelections) {
        elements.restartBtnQuestions.classList.remove('hidden');
        elements.restartBtn.classList.remove('hidden');
    } else {
        elements.restartBtnQuestions.classList.add('hidden');
        elements.restartBtn.classList.add('hidden');
    }
}

export function checkCurrentQuestionAnswered() {
    // Next button is always enabled - will auto-select "no preference" if nothing chosen
    elements.nextBtn.disabled = false;
    elements.nextBtn.removeAttribute('data-tooltip');

    // Check if we should show results for "Show Results" button
    if (shouldShowResults(appState, questionMetadata)) {
        elements.showResultsBtn.disabled = false;
        elements.showResultsBtn.removeAttribute('data-tooltip');
    } else {
        elements.showResultsBtn.disabled = true;
        elements.showResultsBtn.setAttribute('data-tooltip', t('navigation.answerAll'));
    }
}

/**
 * Update live count of matching products
 */
export function updateLiveCount() {
    const results = filterSunscreens(appState);
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
