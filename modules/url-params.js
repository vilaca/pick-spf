// ===================================
// URL Parameter Handling
// ===================================

let appState;
let appConfig;
let validateURLParam;

/**
 * Initialize URL params module with dependencies
 */
export function initURLParams(deps) {
    appState = deps.appState;
    appConfig = deps.appConfig;
    validateURLParam = deps.validateURLParam;
}

/**
 * Check and apply URL parameters to selections
 * @param {Function} showResults - Callback to show results
 */
export function checkURLParameters(showResults) {
    try {
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
                const value = appState.selections[key];
                // Consider answered if not null, or if it's an array with items
                if (value !== null && (Array.isArray(value) ? value.length > 0 : true)) {
                    appState.questionHistory.push(key);
                }
            });

            setTimeout(() => {
                try {
                    showResults();
                } catch (resultError) {
                    console.error('Error showing results:', resultError);
                    throw resultError; // Re-throw to be caught by outer try-catch
                }
            }, 500);
        }
    } catch (error) {
        console.error('Error processing URL parameters:', error);
        // Re-throw to let calling code handle it
        throw new Error(`Failed to process URL parameters: ${error.message}`);
    }
}

/**
 * Select radio button by value
 */
function selectRadioByValue(name, value) {
    try {
        const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (radio) {
            radio.checked = true;
        } else {
            console.warn(`Radio button not found: name="${name}" value="${value}"`);
        }
    } catch (error) {
        console.error(`Error selecting radio button: name="${name}" value="${value}"`, error);
    }
}

/**
 * Select checkboxes by values
 */
function selectCheckboxesByValues(name, values) {
    try {
        values.forEach(value => {
            const checkbox = document.querySelector(`input[name="${name}"][value="${value}"]`);
            if (checkbox) {
                checkbox.checked = true;
            } else {
                console.warn(`Checkbox not found: name="${name}" value="${value}"`);
            }
        });
    } catch (error) {
        console.error(`Error selecting checkboxes: name="${name}"`, error);
    }
}

/**
 * Show notification that user is viewing shared selections
 */
function showSharedSelectionsNotification() {
    const elements = document.getElementById('questions-view');

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
    elements.insertBefore(notification, elements.firstChild);

    // Add event listeners
    document.getElementById('start-fresh-btn').addEventListener('click', () => {
        // This will be wired up by quiz.js
        if (window.quizRestart) window.quizRestart();
        notification.remove();
    });

    document.getElementById('dismiss-notification-btn').addEventListener('click', () => {
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
