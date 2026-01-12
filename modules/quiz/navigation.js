// ===================================
// Question Navigation and Ordering
// ===================================

import { filterSunscreens } from './filters.js';

/**
 * Calculate discriminating power for a question
 * Returns a score representing how well this question splits the remaining products
 * Higher score = better discrimination
 * @param {string} questionKey - Question key to calculate power for
 * @param {Array} currentProducts - Current filtered products
 * @param {Object} questionMetadata - Question metadata
 * @returns {number} Discriminating power score
 */
export function calculateDiscriminatingPower(questionKey, currentProducts, questionMetadata) {
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
 * @param {Object} appState - Application state
 * @param {Object} questionMetadata - Question metadata
 * @returns {string|null} Next question key or null
 */
export function determineNextQuestion(appState, questionMetadata) {
    // Get unanswered questions (excluding optional questions like specialFeatures)
    const unansweredQuestions = Object.keys(appState.selections).filter(
        key => key !== 'specialFeatures' && appState.selections[key] === null
    );

    // If we have unanswered required questions, prioritize those
    if (unansweredQuestions.length > 0) {
        // Get current filtered products
        const currentProducts = filterSunscreens(appState);

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
            score: calculateDiscriminatingPower(key, currentProducts, questionMetadata)
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
 * @param {Object} appState - Application state
 * @param {Object} questionMetadata - Question metadata
 * @returns {boolean} True if should show results
 */
export function shouldShowResults(appState, questionMetadata) {
    const currentProducts = filterSunscreens(appState);

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
    const nextQuestion = determineNextQuestion(appState, questionMetadata);
    if (nextQuestion === null) {
        return true;
    }

    return false;
}
