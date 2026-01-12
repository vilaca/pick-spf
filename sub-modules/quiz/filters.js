// ===================================
// Filtering Logic
// ===================================

/**
 * Filter sunscreens based on current selections
 * @param {Object} appState - Application state
 * @returns {Array} Filtered sunscreen results
 */
export function filterSunscreens(appState) {
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

/**
 * Helper to filter sunscreens with custom selections (for testing)
 * Used by special features dynamic disabling
 * @param {Object} appState - Application state
 * @param {Object} testSelections - Test selections to apply
 * @returns {Array} Filtered results
 */
export function testFilterSunscreens(appState, testSelections) {
    let filtered = [...appState.sunscreens];

    // Location
    if (testSelections.location) {
        filtered = filtered.filter(s =>
            s.availableIn && s.availableIn.includes(testSelections.location)
        );
    }

    // Skin Type
    if (testSelections.skinType) {
        filtered = filtered.filter(s =>
            s.skinTypes && (
                s.skinTypes.includes('all') ||
                s.skinTypes.includes(testSelections.skinType)
            )
        );
    }

    // Fragrance Free
    if (testSelections.fragranceFree === 'true') {
        filtered = filtered.filter(s => s.isFragranceFree === true);
    }

    // For Kids
    if (testSelections.forKids === 'true') {
        filtered = filtered.filter(s => s.forKids === true);
    }

    // Form Factor
    if (testSelections.formFactor && testSelections.formFactor !== 'any') {
        filtered = filtered.filter(s =>
            s.formFactors && s.formFactors.includes(testSelections.formFactor)
        );
    }

    // Water Resistant
    if (testSelections.waterResistant === 'true') {
        filtered = filtered.filter(s => s.waterResistant === true);
    }

    // Special Features (all selected features must be present)
    if (testSelections.specialFeatures && testSelections.specialFeatures.length > 0) {
        filtered = filtered.filter(s => {
            if (!s.specialFeatures || !Array.isArray(s.specialFeatures)) {
                return false;
            }
            return testSelections.specialFeatures.every(feature =>
                s.specialFeatures.includes(feature)
            );
        });
    }

    return filtered;
}
