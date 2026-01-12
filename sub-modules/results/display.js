// ===================================
// Results Display
// ===================================

import { filterSunscreens } from '../quiz/filters.js';

let escapeHTML;
let sanitizeURL;
let announceToScreenReader;
let showView;
let elements;
let appState;
let questionMetadata;
let t;
let updateRestartButtonVisibility;

/**
 * Initialize results module with dependencies
 */
export function initResults(deps) {
    escapeHTML = deps.escapeHTML;
    sanitizeURL = deps.sanitizeURL;
    announceToScreenReader = deps.announceToScreenReader;
    showView = deps.showView;
    elements = deps.elements;
    appState = deps.appState;
    questionMetadata = deps.questionMetadata;
    t = deps.t;
    updateRestartButtonVisibility = deps.updateRestartButtonVisibility;
}

/**
 * Generate share URL from current selections
 */
export function generateShareURL() {
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

/**
 * Show results view
 */
export function showResults() {
    // Filter sunscreens
    const results = filterSunscreens(appState);

    // Update URL
    history.pushState({}, '', generateShareURL());

    // Render results
    renderResults(results);

    // Show results view
    showView('results');

    // Show restart button
    updateRestartButtonVisibility();

    // Announce to screen reader
    announceToScreenReader(`Found ${results.length} matching sunscreens`);
}

/**
 * Render results HTML
 */
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
        renderNoResults();
    } else {
        elements.resultsContainer.innerHTML = results.map(renderResultCard).join('');
    }
}

/**
 * Render no results message with suggestions
 */
function renderNoResults() {
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
        // Import restart function dynamically to avoid circular dependency
        noResultsRestartBtn.addEventListener('click', () => {
            // This will be wired up by quiz.js
            if (window.quizRestart) window.quizRestart();
        });
    }
}

/**
 * Render a single result card
 */
function renderResultCard(sunscreen) {
    // Escape all user-controlled data to prevent XSS
    const name = escapeHTML(sunscreen.name);
    const brand = escapeHTML(sunscreen.brand);
    const spf = escapeHTML(sunscreen.spf || ''); // Keep as string to preserve "50+" format
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

                // Handle synonyms (e.g., "AQUA / WATER / EAU" or "CI 77891 / TITANIUM DIOXIDE")
                // Use the most common/standard name (usually the English name)
                let cleaned = trimmed;
                if (trimmed.includes(' / ')) {
                    const parts = trimmed.split(' / ').map(p => p.trim());
                    // Prefer the longest non-code part (usually the English name)
                    // Skip short codes like "CI 77891" or "AQUA" in favor of full names
                    cleaned = parts.reduce((best, current) => {
                        const currentNoCode = current.replace(/^(CI|C\.I\.)\s*\d+/i, '').trim();
                        const bestNoCode = best.replace(/^(CI|C\.I\.)\s*\d+/i, '').trim();
                        return (currentNoCode.length > bestNoCode.length) ? current : best;
                    }, parts[0]);
                }

                // Remove parenthetical content and color codes
                cleaned = cleaned
                    .replace(/\([^)]*\)/g, '')                    // Remove (parentheses)
                    .replace(/^(CI|C\.I\.)\s*\d+\s*\/?\s*/i, '') // Remove CI codes at start
                    .trim();

                const slug = cleaned.toLowerCase()
                    .replace(/\s+/g, '-')           // spaces to hyphens
                    .replace(/[^a-z0-9-]/g, '')     // keep only letters, numbers, hyphens
                    .replace(/--+/g, '-')            // collapse multiple hyphens
                    .replace(/^-+|-+$/g, '');       // trim leading/trailing hyphens
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
            .join('<br>');

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

/**
 * Go back to questions view
 */
function goBackToQuestions(questionKey = null) {
    // This will need to import determineNextQuestion
    // For now, we'll expose it via quiz.js
    showView('questions');

    // Go to specified question or determine next unanswered question
    if (questionKey && questionMetadata[questionKey]) {
        appState.currentQuestionKey = questionKey;
        // Don't add to history since we're going back
    } else {
        // This needs to be called from quiz.js
        if (window.quizDetermineNextQuestion) {
            const nextQuestion = window.quizDetermineNextQuestion();
            if (nextQuestion) {
                appState.currentQuestionKey = nextQuestion;
            }
        }
    }
    // These need to be called from quiz.js
    if (window.quizUpdateQuestionDisplay) window.quizUpdateQuestionDisplay();
    if (window.quizUpdateNavigationButtons) window.quizUpdateNavigationButtons();

    announceToScreenReader('Back to questions');
}
