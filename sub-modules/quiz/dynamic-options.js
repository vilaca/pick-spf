// ===================================
// Dynamic Option Availability
// ===================================
// Disables options that would result in 0 products across all question types

import { testFilterSunscreens } from './filters.js';

/**
 * Update option availability for the current question
 * Disables options that would result in 0 products and adds tooltips
 * Returns the count of available options
 *
 * @param {Object} appState - Application state
 * @param {Object} questionMetadata - Question metadata
 * @param {Function} t - Translation function
 * @returns {number} Number of available (non-disabled) options
 */
export function updateOptionAvailability(appState, questionMetadata, t) {
    const currentKey = appState.currentQuestionKey;
    if (!currentKey) return 0;

    const metadata = questionMetadata[currentKey];
    if (!metadata) return 0;

    const questionElement = document.querySelectorAll('.question')[metadata.elementIndex];
    if (!questionElement) return 0;

    const inputs = questionElement.querySelectorAll('input');
    if (!inputs.length) return 0;

    const inputType = inputs[0].type; // 'radio' or 'checkbox'
    const currentSelections = { ...appState.selections };
    const currentValue = currentSelections[currentKey];

    let availableCount = 0;

    inputs.forEach(input => {
        const value = input.value;
        const label = input.closest('.option');
        if (!label) return;

        // Skip if this option is already selected
        if (inputType === 'radio' && currentValue === value) {
            label.classList.remove('option-disabled');
            label.removeAttribute('data-tooltip');
            input.disabled = false;
            availableCount++;
            return;
        }

        if (inputType === 'checkbox' && Array.isArray(currentValue) && currentValue.includes(value)) {
            label.classList.remove('option-disabled');
            label.removeAttribute('data-tooltip');
            input.disabled = false;
            availableCount++;
            return;
        }

        // Test if selecting this option would give 0 results
        const testSelections = { ...currentSelections };

        if (inputType === 'checkbox') {
            // For checkboxes, add this value to the array
            const currentArray = Array.isArray(currentValue) ? currentValue : [];
            testSelections[currentKey] = [...currentArray, value];
        } else {
            // For radio buttons, set this value
            testSelections[currentKey] = value;
        }

        const testResults = testFilterSunscreens(appState, testSelections);

        if (testResults.length === 0) {
            // Would result in 0 products - disable it
            label.classList.add('option-disabled');
            const tooltipText = t ? t('navigation.noProductsAvailable') : 'No products available with this combination';
            label.setAttribute('data-tooltip', tooltipText);
            input.disabled = true;
        } else {
            // Would give results - enable it
            label.classList.remove('option-disabled');
            label.removeAttribute('data-tooltip');
            input.disabled = false;
            availableCount++;
        }
    });

    return availableCount;
}

/**
 * Check if current question should be auto-skipped (only one available option)
 * If yes, auto-selects that option and triggers auto-advance
 * Question remains in history and user can navigate back to it
 *
 * @param {Object} appState - Application state
 * @param {Object} questionMetadata - Question metadata
 * @param {Function} t - Translation function
 * @returns {boolean} True if question was auto-selected
 */
export function checkAndAutoSkip(appState, questionMetadata, t) {
    const currentKey = appState.currentQuestionKey;
    if (!currentKey) return false;

    // Don't auto-skip special features (checkbox question - user may want to select multiple or none)
    if (currentKey === 'specialFeatures') return false;

    const metadata = questionMetadata[currentKey];
    if (!metadata) return false;

    const questionElement = document.querySelectorAll('.question')[metadata.elementIndex];
    if (!questionElement) return false;

    const inputs = questionElement.querySelectorAll('input:not(:disabled)');

    // If exactly one option is available (not disabled)
    if (inputs.length === 1) {
        const input = inputs[0];
        const value = input.value;

        // Auto-select it
        input.checked = true;
        appState.selections[currentKey] = value;

        // Mark that this was auto-selected (for UI feedback)
        questionElement.setAttribute('data-auto-selected', 'true');

        // Trigger change event to auto-advance (but question stays in history)
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);

        return true;
    }

    return false;
}
