// ===================================
// Data Loading (YAML files and validation)
// ===================================

let appState;
let appConfig;
let questionMetadata;
let mutuallyExclusiveFeatures;
let showLoadingError;

/**
 * Initialize data loader with dependencies
 */
export function initDataLoader(deps) {
    appState = deps.appState;
    appConfig = deps.appConfig;
    questionMetadata = deps.questionMetadata;
    mutuallyExclusiveFeatures = deps.mutuallyExclusiveFeatures;
    showLoadingError = deps.showLoadingError;
}

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

/**
 * Validate question metadata structure
 */
function validateQuestionMetadata(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid question metadata: must be an object');
    }

    if (!data.questions || typeof data.questions !== 'object') {
        throw new Error('Invalid question metadata: must have a questions object');
    }

    const questions = data.questions;
    const requiredQuestions = ['location', 'skinType', 'fragranceFree', 'forKids', 'formFactor', 'waterResistant', 'specialFeatures'];

    // Validate each required question exists
    requiredQuestions.forEach(questionKey => {
        if (!questions[questionKey]) {
            throw new Error(`Invalid question metadata: missing required question '${questionKey}'`);
        }

        const question = questions[questionKey];

        // Validate required fields
        if (typeof question.elementIndex !== 'number') {
            throw new Error(`Invalid question metadata for '${questionKey}': elementIndex must be a number`);
        }
        if (typeof question.attribute !== 'string' || question.attribute.length === 0) {
            throw new Error(`Invalid question metadata for '${questionKey}': attribute must be a non-empty string`);
        }
        if (typeof question.isArray !== 'boolean') {
            throw new Error(`Invalid question metadata for '${questionKey}': isArray must be a boolean`);
        }
    });

    // Validate mutually exclusive features if present
    if (data.mutuallyExclusive) {
        if (typeof data.mutuallyExclusive !== 'object') {
            throw new Error('Invalid question metadata: mutuallyExclusive must be an object');
        }

        Object.entries(data.mutuallyExclusive).forEach(([feature, exclusions]) => {
            if (!Array.isArray(exclusions)) {
                throw new Error(`Invalid mutuallyExclusive for '${feature}': must be an array`);
            }
            exclusions.forEach(exclusion => {
                if (typeof exclusion !== 'string') {
                    throw new Error(`Invalid mutuallyExclusive for '${feature}': exclusions must be strings`);
                }
            });
        });

        console.log(`✓ Validated ${Object.keys(data.mutuallyExclusive).length} mutually exclusive feature rules`);
    }

    // Validate config if present
    if (data.config) {
        if (typeof data.config !== 'object') {
            throw new Error('Invalid question metadata: config must be an object');
        }

        // Validate timings - dynamically validate all timing fields
        if (data.config.timings) {
            if (typeof data.config.timings !== 'object') {
                throw new Error('Invalid config: timings must be an object');
            }
            Object.entries(data.config.timings).forEach(([field, value]) => {
                if (typeof value !== 'number' || value <= 0) {
                    throw new Error(`Invalid config: timings.${field} must be a positive number (got ${typeof value}: ${value})`);
                }
            });
        }

        // Validate algorithm settings
        if (data.config.algorithm) {
            if (typeof data.config.algorithm.minDiscriminatingPower !== 'number' ||
                data.config.algorithm.minDiscriminatingPower < 0 ||
                data.config.algorithm.minDiscriminatingPower > 1) {
                throw new Error('Invalid config: algorithm.minDiscriminatingPower must be between 0 and 1');
            }
        }

        // Validate share popup dimensions - dynamically validate all dimensions
        if (data.config.sharePopup) {
            if (typeof data.config.sharePopup !== 'object') {
                throw new Error('Invalid config: sharePopup must be an object');
            }
            Object.entries(data.config.sharePopup).forEach(([field, value]) => {
                if (typeof value !== 'number' || value <= 0) {
                    throw new Error(`Invalid config: sharePopup.${field} must be a positive number (got ${typeof value}: ${value})`);
                }
            });
        }

        console.log(`✓ Validated config settings`);
    }

    console.log(`✓ Validated ${Object.keys(questions).length} question metadata entries`);
}

/**
 * Inject timing values from config into CSS custom properties
 * This creates a single source of truth (YAML) for both JS and CSS animations
 */
function applyCSSTimings() {
    const root = document.documentElement;
    const t = appConfig.timings;

    // Inject timing values as CSS custom properties
    root.style.setProperty('--timing-notification-fade', `${t.notificationFadeOut}ms`);
    root.style.setProperty('--timing-auto-advance', `${t.autoAdvanceDelay}ms`);
    root.style.setProperty('--timing-transition-base', `${t.transitionBase}ms`);
    root.style.setProperty('--timing-transition-slow', `${t.transitionSlow}ms`);

    console.log(`✓ Applied CSS custom properties from config`);
}

/**
 * Load question metadata YAML file
 */
export async function loadQuestionMetadata() {
    try {
        const response = await fetch('data/questions-metadata.yaml');

        if (!response.ok) {
            throw new Error(`Failed to load question metadata: ${response.status} ${response.statusText}`);
        }

        const yamlText = await response.text();
        const data = jsyaml.load(yamlText);

        // Validate data structure
        validateQuestionMetadata(data);

        // Update shared state
        Object.assign(questionMetadata, data.questions);
        Object.assign(mutuallyExclusiveFeatures, data.mutuallyExclusive || {});

        // Calculate total questions dynamically
        appState.totalQuestions = Object.keys(questionMetadata).length;

        // Load config settings (merge with defaults)
        if (data.config) {
            appConfig.timings = {
                ...appConfig.timings,
                ...data.config.timings
            };
            appConfig.algorithm = {
                ...appConfig.algorithm,
                ...data.config.algorithm
            };
            appConfig.sharePopup = {
                ...appConfig.sharePopup,
                ...data.config.sharePopup
            };
        }

        // Inject timing values into CSS custom properties
        applyCSSTimings();

        console.log(`✓ Loaded question metadata and config (${appState.totalQuestions} questions)`);
    } catch (error) {
        console.error('Error loading question metadata:', error);
        showLoadingError('Failed to load question metadata. Please refresh the page or try again later.');
        throw error;
    }
}

/**
 * Load sunscreen data YAML file
 */
export async function loadSunscreenData() {
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
        showLoadingError('Failed to load sunscreen data. Please refresh the page or try again later.');
        throw error;
    }
}

/**
 * Filter available regions in the UI based on products
 */
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

/**
 * Load external script
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

/**
 * Load all quiz resources (js-yaml, metadata, sunscreen data)
 * Only called when user clicks "Start Quiz"
 */
export async function loadQuizResources() {
    // Load js-yaml library first
    if (typeof jsyaml === 'undefined') {
        await loadScript('lib/js-yaml.min.js');
    }

    // Then load question metadata and sunscreen data in parallel
    await Promise.all([
        loadQuestionMetadata(),
        loadSunscreenData()
    ]);
}
