// ===================================
// Special Features Dynamic Disabling
// ===================================

import { testFilterSunscreens } from './filters.js';

/**
 * Update which special features should be disabled based on current selections
 * Disables features that would result in 0 products
 * @param {Object} appState - Application state
 */
export function updateSpecialFeaturesAvailability(appState) {
    // Only run if we're on the special features question
    if (appState.currentQuestionKey !== 'specialFeatures') return;

    const specialFeatureCheckboxes = document.querySelectorAll('input[name="specialFeatures"]');
    if (!specialFeatureCheckboxes.length) return;

    // Get current selections (without special features)
    const currentSelections = { ...appState.selections };
    const currentSpecialFeatures = currentSelections.specialFeatures || [];

    specialFeatureCheckboxes.forEach(checkbox => {
        const featureValue = checkbox.value;
        const label = checkbox.closest('.option');
        if (!label) return;

        // Skip if this feature is already selected
        if (currentSpecialFeatures.includes(featureValue)) {
            label.classList.remove('option-disabled');
            label.removeAttribute('data-tooltip');
            return;
        }

        // Test if adding this feature would give 0 results
        const testSelections = { ...currentSelections };
        const testFeatures = [...currentSpecialFeatures, featureValue];
        testSelections.specialFeatures = testFeatures;

        // Use the test filter function
        const testResults = testFilterSunscreens(appState, testSelections);

        if (testResults.length === 0) {
            // Would result in 0 products - disable it
            label.classList.add('option-disabled');
            label.setAttribute('data-tooltip', 'No products available with this combination');
            checkbox.disabled = true;
        } else {
            // Would give results - enable it
            label.classList.remove('option-disabled');
            label.removeAttribute('data-tooltip');
            checkbox.disabled = false;
        }
    });
}
