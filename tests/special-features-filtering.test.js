// ===================================
// Special Features Filtering Tests
// ===================================
// Tests to ensure special features are properly disabled when they would result in 0 products

import { JSDOM } from 'jsdom';

describe('Special Features Dynamic Disabling', () => {
    let dom;
    let document;
    let window;
    let appState;
    let sunscreens;

    beforeEach(() => {
        // Create DOM
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div class="question" data-question="specialFeatures">
                    <label class="option">
                        <input type="checkbox" name="specialFeatures" value="anti-aging">
                    </label>
                    <label class="option">
                        <input type="checkbox" name="specialFeatures" value="tinted">
                    </label>
                    <label class="option">
                        <input type="checkbox" name="specialFeatures" value="eco-friendly-packaging">
                    </label>
                </div>
            </body>
            </html>
        `);

        document = dom.window.document;
        window = dom.window;
        global.document = document;
        global.window = window;

        // Mock sunscreens data
        sunscreens = [
            {
                name: 'Product A',
                availableIn: ['EU'],
                skinTypes: ['oily'],
                isFragranceFree: true,
                forKids: false,
                formFactors: ['lotion'],
                waterResistant: false,
                specialFeatures: ['anti-aging']
            },
            {
                name: 'Product B',
                availableIn: ['EU', 'Global'],
                skinTypes: ['all'],
                isFragranceFree: false,
                forKids: false,
                formFactors: ['cream'],
                waterResistant: false,
                specialFeatures: ['tinted']
            },
            {
                name: 'Product C',
                availableIn: ['US'],
                skinTypes: ['dry'],
                isFragranceFree: false,
                forKids: true,
                formFactors: ['spray'],
                waterResistant: true,
                specialFeatures: ['eco-friendly-packaging']
            }
        ];

        appState = {
            sunscreens: sunscreens,
            currentQuestionKey: 'specialFeatures',
            selections: {
                location: 'EU',
                skinType: 'oily',
                fragranceFree: 'true',
                forKids: 'false',
                formFactor: 'lotion',
                waterResistant: 'false',
                specialFeatures: []
            }
        };
    });

    it('should disable feature that results in 0 products', async () => {
        const { updateSpecialFeaturesAvailability } = await import('../sub-modules/quiz/special-features.js');

        // With current selections (EU, oily, fragrance-free, lotion), only Product A matches
        // Product A has anti-aging
        // Tinted (Product B) should be disabled because Product B is not fragrance-free
        // eco-friendly (Product C) should be disabled because Product C is in US, not EU

        updateSpecialFeaturesAvailability(appState);

        const tintedCheckbox = document.querySelector('input[value="tinted"]');
        const ecoCheckbox = document.querySelector('input[value="eco-friendly-packaging"]');
        const antiAgingCheckbox = document.querySelector('input[value="anti-aging"]');

        // Tinted should be disabled (Product B fails fragrance-free filter)
        expect(tintedCheckbox.disabled).toBe(true);

        // Eco-friendly should be disabled (Product C is in US, not EU)
        expect(ecoCheckbox.disabled).toBe(true);

        // Anti-aging should be enabled (Product A matches all filters)
        expect(antiAgingCheckbox.disabled).toBe(false);
    });

    it('should respect Global location in filtering', async () => {
        const { updateSpecialFeaturesAvailability } = await import('../sub-modules/quiz/special-features.js');

        appState.selections.location = 'US';
        appState.selections.skinType = 'all';
        appState.selections.fragranceFree = 'any';
        appState.selections.formFactor = 'any';

        // Product B has 'Global' in availableIn and 'all' for skinTypes
        // So 'tinted' should be available even for US

        updateSpecialFeaturesAvailability(appState);

        const tintedCheckbox = document.querySelector('input[value="tinted"]');
        expect(tintedCheckbox.disabled).toBe(false);
    });

    it('should handle false values for boolean filters', async () => {
        const { updateSpecialFeaturesAvailability } = await import('../sub-modules/quiz/special-features.js');

        appState.selections.fragranceFree = 'false'; // Explicitly NOT fragrance-free
        appState.selections.skinType = 'all';
        appState.selections.formFactor = 'any';

        // Product B is not fragrance-free (fragranceFree: false) and has 'tinted'
        // So tinted should be available

        updateSpecialFeaturesAvailability(appState);

        const tintedCheckbox = document.querySelector('input[value="tinted"]');
        expect(tintedCheckbox.disabled).toBe(false);

        // Product A IS fragrance-free, so anti-aging should be disabled
        const antiAgingCheckbox = document.querySelector('input[value="anti-aging"]');
        expect(antiAgingCheckbox.disabled).toBe(true);
    });

    it('should not disable already selected features', async () => {
        const { updateSpecialFeaturesAvailability } = await import('../sub-modules/quiz/special-features.js');

        // Select a feature that would normally be disabled
        appState.selections.specialFeatures = ['eco-friendly-packaging'];
        appState.selections.location = 'EU'; // Product C is only in US

        const ecoCheckbox = document.querySelector('input[value="eco-friendly-packaging"]');
        ecoCheckbox.checked = true;

        updateSpecialFeaturesAvailability(appState);

        // Should NOT be disabled because it's already selected
        expect(ecoCheckbox.disabled).toBe(false);
    });

    it('should filter correctly with multiple selection combinations', async () => {
        const { testFilterSunscreens } = await import('../sub-modules/quiz/filters.js');

        // Test that testFilterSunscreens matches filterSunscreens behavior
        const selections1 = {
            location: 'EU',
            skinType: 'oily',
            fragranceFree: 'true',
            forKids: 'false',
            formFactor: 'lotion',
            waterResistant: 'false',
            specialFeatures: []
        };

        const results1 = testFilterSunscreens(appState, selections1);
        expect(results1.length).toBe(1);
        expect(results1[0].name).toBe('Product A');

        // Test with fragranceFree = 'false'
        const selections2 = {
            ...selections1,
            fragranceFree: 'false',
            skinType: 'all',
            formFactor: 'any'
        };

        const results2 = testFilterSunscreens(appState, selections2);
        expect(results2.length).toBe(1);
        expect(results2[0].name).toBe('Product B');
    });

    it('should handle combinations that result in zero products', async () => {
        const { testFilterSunscreens } = await import('../sub-modules/quiz/filters.js');

        // Impossible combination: EU location + water resistant + kids
        const selections = {
            location: 'EU',
            skinType: 'all',
            fragranceFree: 'any',
            forKids: 'true',
            formFactor: 'any',
            waterResistant: 'true',
            specialFeatures: []
        };

        const results = testFilterSunscreens(appState, selections);
        expect(results.length).toBe(0);
    });
});
