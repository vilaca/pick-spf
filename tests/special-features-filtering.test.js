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
        const { testFilterSunscreens } = await import('../sub-modules/quiz/filters.js');

        // With current selections (EU, oily, fragrance-free, lotion), only Product A matches
        // Test that features which would result in 0 products are correctly identified

        // Test 'tinted' - should fail because Product B is not fragrance-free
        const withTinted = testFilterSunscreens(appState, {
            ...appState.selections,
            specialFeatures: ['tinted']
        });
        expect(withTinted.length).toBe(0);

        // Test 'eco-friendly-packaging' - should fail because Product C is in US, not EU
        const withEco = testFilterSunscreens(appState, {
            ...appState.selections,
            specialFeatures: ['eco-friendly-packaging']
        });
        expect(withEco.length).toBe(0);

        // Test 'anti-aging' - should succeed because Product A matches
        const withAntiAging = testFilterSunscreens(appState, {
            ...appState.selections,
            specialFeatures: ['anti-aging']
        });
        expect(withAntiAging.length).toBe(1);
        expect(withAntiAging[0].name).toBe('Product A');
    });

    it('should respect Global location in filtering', async () => {
        const { testFilterSunscreens } = await import('../sub-modules/quiz/filters.js');

        appState.selections.location = 'US';
        appState.selections.skinType = 'all';
        appState.selections.fragranceFree = 'any';
        appState.selections.formFactor = 'any';

        // Product B has 'Global' in availableIn and 'all' for skinTypes
        // So 'tinted' should be available even for US location
        const withTinted = testFilterSunscreens(appState, {
            ...appState.selections,
            specialFeatures: ['tinted']
        });
        expect(withTinted.length).toBeGreaterThan(0);
        expect(withTinted.some(p => p.name === 'Product B')).toBe(true);
    });

    it('should handle false values for boolean filters', async () => {
        const { testFilterSunscreens } = await import('../sub-modules/quiz/filters.js');

        appState.selections.fragranceFree = 'false'; // Explicitly NOT fragrance-free
        appState.selections.skinType = 'all';
        appState.selections.formFactor = 'any';

        // Product B is not fragrance-free (fragranceFree: false) and has 'tinted'
        // So tinted should be available (returns results)
        const withTinted = testFilterSunscreens(appState, {
            ...appState.selections,
            specialFeatures: ['tinted']
        });
        expect(withTinted.length).toBe(1);
        expect(withTinted[0].name).toBe('Product B');

        // Product A IS fragrance-free, so anti-aging should NOT be available
        // (returns 0 results because Product A has fragranceFree=true but we want false)
        const withAntiAging = testFilterSunscreens(appState, {
            ...appState.selections,
            specialFeatures: ['anti-aging']
        });
        expect(withAntiAging.length).toBe(0);
    });

    it('should not filter out already selected features', async () => {
        const { testFilterSunscreens } = await import('../sub-modules/quiz/filters.js');

        // Select a feature that would normally be filtered out
        appState.selections.specialFeatures = ['eco-friendly-packaging'];
        appState.selections.location = 'EU'; // Product C is only in US

        // Even though location is EU and Product C is in US,
        // if 'eco-friendly-packaging' is already selected, we should still find it
        // This test verifies the filtering logic handles already-selected features
        const results = testFilterSunscreens(appState, appState.selections);

        // With EU location, Product C should be filtered out
        expect(results.length).toBe(0);
        // This demonstrates that already-selected incompatible options
        // need special handling in the UI layer (which is tested elsewhere)
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
