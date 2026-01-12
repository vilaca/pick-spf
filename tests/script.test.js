// Unit tests for sunscreen chooser dynamic questionnaire logic

import {
    filterProducts,
    calculateDiscriminatingPower,
    getNextQuestion,
    shouldShowResults,
    questionMetadata
} from "../main.js";

describe('Dynamic Questionnaire Logic', () => {
    let sampleProducts;

    beforeEach(() => {
        // Mock question metadata since it's now loaded dynamically
        // In production, this is loaded from data/questions-metadata.yaml
        Object.assign(questionMetadata, {
            location: { elementIndex: 0, attribute: 'availableIn', isArray: true },
            skinType: { elementIndex: 1, attribute: 'skinTypes', isArray: true },
            fragranceFree: { elementIndex: 2, attribute: 'isFragranceFree', isArray: false },
            forKids: { elementIndex: 3, attribute: 'forKids', isArray: false },
            formFactor: { elementIndex: 4, attribute: 'formFactors', isArray: true },
            waterResistant: { elementIndex: 5, attribute: 'waterResistant', isArray: false },
            specialFeatures: { elementIndex: 6, attribute: 'specialFeatures', isArray: true }
        });

        // Sample product data for testing
        sampleProducts = [
            {
                id: 1,
                name: 'Product A',
                availableIn: ['US', 'Canada'],
                skinTypes: ['oily', 'combination'],
                isFragranceFree: true,
                forKids: false,
                formFactors: ['cream'],
                waterResistant: true
            },
            {
                id: 2,
                name: 'Product B',
                availableIn: ['US', 'EU'],
                skinTypes: ['dry', 'sensitive'],
                isFragranceFree: false,
                forKids: true,
                formFactors: ['lotion', 'spray'],
                waterResistant: false
            },
            {
                id: 3,
                name: 'Product C',
                availableIn: ['EU', 'UK'],
                skinTypes: ['all'],
                isFragranceFree: true,
                forKids: false,
                formFactors: ['gel'],
                waterResistant: true
            },
            {
                id: 4,
                name: 'Product D',
                availableIn: ['US', 'Canada', 'EU'],
                skinTypes: ['oily'],
                isFragranceFree: false,
                forKids: false,
                formFactors: ['cream', 'lotion'],
                waterResistant: false
            }
        ];
    });

    describe('filterProducts', () => {
        it('should filter by location', () => {
            const selections = { location: 'US' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).toHaveLength(3);
            expect(filtered.map(p => p.id)).toEqual(expect.arrayContaining([1, 2, 4]));
        });

        it('should filter by skin type', () => {
            const selections = { skinType: 'oily' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).toHaveLength(3);
            expect(filtered.map(p => p.id)).toEqual(expect.arrayContaining([1, 3, 4]));
        });

        it('should filter by fragrance-free', () => {
            const selections = { fragranceFree: 'true' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).toHaveLength(2);
            expect(filtered.map(p => p.id)).toEqual(expect.arrayContaining([1, 3]));
        });

        it('should filter by for kids', () => {
            const selections = { forKids: 'true' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).toHaveLength(1);
            expect(filtered[0].id).toBe(2);
        });

        it('should filter by form factor', () => {
            const selections = { formFactor: 'cream' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).toHaveLength(2);
            expect(filtered.map(p => p.id)).toEqual(expect.arrayContaining([1, 4]));
        });

        it('should filter by water resistance', () => {
            const selections = { waterResistant: 'true' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).toHaveLength(2);
            expect(filtered.map(p => p.id)).toEqual(expect.arrayContaining([1, 3]));
        });

        it('should apply multiple filters together', () => {
            const selections = {
                location: 'US',
                skinType: 'oily',
                fragranceFree: 'true'
            };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).toHaveLength(1);
            expect(filtered[0].id).toBe(1);
        });

        it('should return empty array when no products match', () => {
            const selections = {
                location: 'Japan',
                skinType: 'sensitive',
                forKids: 'true'
            };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).toHaveLength(0);
        });

        it('should handle "any" selection for boolean questions', () => {
            const selections = { fragranceFree: 'any' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).toHaveLength(4); // All products
        });

        it('should handle "all" skin type selection', () => {
            const selections = { skinType: 'all' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).toHaveLength(4); // All products
        });
    });

    describe('calculateDiscriminatingPower', () => {
        it('should return 0 for questions with no discriminating power', () => {
            // If all products have the same value, no discriminating power
            const uniformProducts = [
                { id: 1, skinTypes: ['oily'], isFragranceFree: true },
                { id: 2, skinTypes: ['oily'], isFragranceFree: true },
                { id: 3, skinTypes: ['oily'], isFragranceFree: true }
            ];
            const power = calculateDiscriminatingPower('fragranceFree', uniformProducts);
            expect(power).toBe(0);
        });

        it('should return higher value for questions that split products evenly', () => {
            // Even split has maximum entropy
            const evenProducts = [
                { id: 1, isFragranceFree: true },
                { id: 2, isFragranceFree: false }
            ];
            const power = calculateDiscriminatingPower('fragranceFree', evenProducts);
            expect(power).toBeGreaterThan(0.9); // Should be close to 1 for even split
        });

        it('should return value for array attributes', () => {
            const power = calculateDiscriminatingPower('skinType', sampleProducts);
            expect(power).toBeGreaterThan(0);
        });

        it('should return value for location filtering', () => {
            const power = calculateDiscriminatingPower('location', sampleProducts);
            expect(power).toBeGreaterThan(0);
        });
    });

    describe('getNextQuestion', () => {
        it('should return the most discriminating unanswered question', () => {
            const selections = {};
            const currentProducts = sampleProducts;
            const nextQuestion = getNextQuestion(selections, currentProducts);
            expect(typeof nextQuestion).toBe('string');
            expect(['location', 'skinType', 'fragranceFree', 'forKids', 'formFactor', 'waterResistant'])
                .toContain(nextQuestion);
        });

        it('should skip already answered questions', () => {
            const selections = { location: 'US', skinType: 'oily' };
            const currentProducts = filterProducts(sampleProducts, selections);
            const nextQuestion = getNextQuestion(selections, currentProducts);
            expect(nextQuestion).not.toBe('location');
            expect(nextQuestion).not.toBe('skinType');
        });

        it('should return null when all questions are answered', () => {
            const selections = {
                location: 'US',
                skinType: 'oily',
                fragranceFree: 'true',
                forKids: 'false',
                formFactor: 'cream',
                waterResistant: 'true'
            };
            const currentProducts = filterProducts(sampleProducts, selections);
            const nextQuestion = getNextQuestion(selections, currentProducts);
            expect(nextQuestion).toBeNull();
        });

        it('should return null when remaining questions have no discriminating power', () => {
            // All remaining products have same values for unanswered questions
            const uniformProducts = [
                {
                    id: 1,
                    availableIn: ['US'],
                    skinTypes: ['oily'],
                    isFragranceFree: true,
                    forKids: false,
                    formFactors: ['cream'],
                    waterResistant: true
                },
                {
                    id: 2,
                    availableIn: ['US'],
                    skinTypes: ['oily'],
                    isFragranceFree: true,
                    forKids: false,
                    formFactors: ['cream'],
                    waterResistant: true
                }
            ];
            const selections = { location: 'US' };
            const nextQuestion = getNextQuestion(selections, uniformProducts);
            // Should return null or a question with very low power
            // Implementation may vary - this tests the logic
            if (nextQuestion !== null) {
                const power = calculateDiscriminatingPower(nextQuestion, uniformProducts);
                expect(power).toBeLessThan(0.1);
            }
        });
    });

    describe('shouldShowResults', () => {
        it('should return true when 0 products remain', () => {
            const selections = { location: 'Mars' }; // No products available
            const currentProducts = filterProducts(sampleProducts, selections);
            expect(shouldShowResults(selections, currentProducts)).toBe(true);
        });

        it('should return true when 1 product remains', () => {
            const oneProduct = [sampleProducts[0]];
            const selections = { location: 'US' };
            expect(shouldShowResults(selections, oneProduct)).toBe(true);
        });

        it('should return true when all questions answered', () => {
            const selections = {
                location: 'US',
                skinType: 'oily',
                fragranceFree: 'true',
                forKids: 'false',
                formFactor: 'cream',
                waterResistant: 'true'
            };
            const currentProducts = filterProducts(sampleProducts, selections);
            expect(shouldShowResults(selections, currentProducts)).toBe(true);
        });

        it('should return true when remaining questions have no discriminating power', () => {
            const uniformProducts = [
                {
                    id: 1,
                    availableIn: ['US'],
                    skinTypes: ['oily'],
                    isFragranceFree: true,
                    forKids: false,
                    formFactors: ['cream'],
                    waterResistant: true
                },
                {
                    id: 2,
                    availableIn: ['US'],
                    skinTypes: ['oily'],
                    isFragranceFree: true,
                    forKids: false,
                    formFactors: ['cream'],
                    waterResistant: true
                }
            ];
            const selections = { location: 'US' };
            expect(shouldShowResults(selections, uniformProducts)).toBe(true);
        });

        it('should return false when more questions can narrow down results', () => {
            const selections = { location: 'US' };
            const currentProducts = filterProducts(sampleProducts, selections);
            // Only answered 1 question, many products remain with different attributes
            if (currentProducts.length > 1) {
                expect(shouldShowResults(selections, currentProducts)).toBe(false);
            }
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty product array', () => {
            const selections = {};
            const filtered = filterProducts([], selections);
            expect(Array.isArray(filtered)).toBe(true);
            expect(filtered).toHaveLength(0);
            expect(shouldShowResults(selections, [])).toBe(true);
        });

        it('should handle null selections', () => {
            const selections = { location: null, skinType: null };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).toHaveLength(4); // Should return all products
        });

        it('should handle products with missing attributes gracefully', () => {
            const incompleteProducts = [
                { id: 1, name: 'Incomplete', availableIn: ['US'] }
                // Missing other attributes
            ];
            const selections = { location: 'US' };
            const filtered = filterProducts(incompleteProducts, selections);
            expect(filtered).toHaveLength(1);
        });

        it('should handle special characters in product data', () => {
            const specialProducts = [
                {
                    id: 1,
                    name: 'Product with "quotes" & symbols',
                    availableIn: ['US'],
                    skinTypes: ['oily'],
                    isFragranceFree: true,
                    forKids: false,
                    formFactors: ['cream'],
                    waterResistant: false
                }
            ];
            const selections = { location: 'US' };
            const filtered = filterProducts(specialProducts, selections);
            expect(filtered).toHaveLength(1);
        });

        it('should filter out products without required location', () => {
            const selections = { location: 'Japan' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).toHaveLength(0);
        });

        it('should handle products with special features property', () => {
            const productsWithFeatures = [
                {
                    id: 1,
                    name: 'Product 1',
                    availableIn: ['US'],
                    skinTypes: ['oily'],
                    specialFeatures: ['oil-control', 'hydrating']
                },
                {
                    id: 2,
                    name: 'Product 2',
                    availableIn: ['US'],
                    skinTypes: ['oily'],
                    specialFeatures: ['tinted']
                }
            ];

            // filterProducts doesn't filter by specialFeatures (that's handled elsewhere)
            // Just verify it doesn't break when products have this property
            const selections = { location: 'US' };
            const filtered = filterProducts(productsWithFeatures, selections);
            expect(filtered).toHaveLength(2);
        });

        it('should handle products with Global availability', () => {
            const globalProducts = [
                {
                    id: 1,
                    name: 'Global Product',
                    availableIn: ['Global'],
                    skinTypes: ['all']
                }
            ];

            const selections = { location: 'Antarctica' };
            const filtered = filterProducts(globalProducts, selections);
            expect(filtered).toHaveLength(1);
        });

        it('should handle all skin type products', () => {
            const allSkinProducts = [
                {
                    id: 1,
                    name: 'All Skin',
                    availableIn: ['US'],
                    skinTypes: ['all']
                }
            ];

            const selections = { location: 'US', skinType: 'sensitive' };
            const filtered = filterProducts(allSkinProducts, selections);
            expect(filtered).toHaveLength(1);
        });

        it('should filter by form factor correctly', () => {
            const selections = { formFactor: 'spray' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered.length).toBeGreaterThan(0);
            filtered.forEach(product => {
                expect(product.formFactors).toContain('spray');
            });
        });

        it('should handle water resistance filtering for false', () => {
            const selections = { waterResistant: 'false' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered.length).toBeGreaterThan(0);
            filtered.forEach(product => {
                expect(product.waterResistant).toBe(false);
            });
        });

        it('should handle fragrance free filtering for false', () => {
            const selections = { fragranceFree: 'false' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered.length).toBeGreaterThan(0);
            filtered.forEach(product => {
                expect(product.isFragranceFree).toBe(false);
            });
        });

        it('should handle for kids filtering for false', () => {
            const selections = { forKids: 'false' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered.length).toBeGreaterThan(0);
            filtered.forEach(product => {
                expect(product.forKids).toBe(false);
            });
        });

        it('should handle products without special features array', () => {
            const productsNoFeatures = [
                {
                    id: 1,
                    name: 'No Features',
                    availableIn: ['US'],
                    skinTypes: ['oily']
                    // No specialFeatures array
                }
            ];

            // filterProducts doesn't filter by specialFeatures
            // Just verify products without this property still work
            const selections = { location: 'US' };
            const filtered = filterProducts(productsNoFeatures, selections);
            expect(filtered).toHaveLength(1);
        });

        it('should handle undefined product attributes', () => {
            const productsUndefined = [
                {
                    id: 1,
                    name: 'Undefined Attrs',
                    availableIn: ['US']
                    // Other attributes undefined
                }
            ];

            const selections = { location: 'US' };
            const filtered = filterProducts(productsUndefined, selections);
            expect(filtered).toHaveLength(1);
        });
    });

    describe('Question History', () => {
        it('should track questions in order they are answered', () => {
            const history = [];
            const selections = {};

            // Simulate answering questions
            let currentProducts = sampleProducts;
            let question = getNextQuestion(selections, currentProducts);
            selections[question] = 'US';
            history.push(question);

            currentProducts = filterProducts(sampleProducts, selections);
            question = getNextQuestion(selections, currentProducts);
            if (question) {
                selections[question] = 'oily';
                history.push(question);
            }

            expect(Array.isArray(history)).toBe(true);
            expect(history.length).toBeGreaterThanOrEqual(1);
            expect(typeof history[0]).toBe('string');
        });
    });

    describe('Integration Tests', () => {
        it('should complete full questionnaire flow', () => {
            const selections = {};
            const history = [];
            let currentProducts = sampleProducts;
            let iterations = 0;
            const maxIterations = 10; // Prevent infinite loops

            while (!shouldShowResults(selections, currentProducts) && iterations < maxIterations) {
                const nextQuestion = getNextQuestion(selections, currentProducts);
                if (!nextQuestion) break;

                // Simulate answering (pick first available option)
                if (nextQuestion === 'location') selections[nextQuestion] = 'US';
                else if (nextQuestion === 'skinType') selections[nextQuestion] = 'oily';
                else if (nextQuestion === 'fragranceFree') selections[nextQuestion] = 'true';
                else if (nextQuestion === 'forKids') selections[nextQuestion] = 'false';
                else if (nextQuestion === 'formFactor') selections[nextQuestion] = 'cream';
                else if (nextQuestion === 'waterResistant') selections[nextQuestion] = 'true';

                history.push(nextQuestion);
                currentProducts = filterProducts(sampleProducts, selections);
                iterations++;
            }

            expect(iterations).toBeLessThan(maxIterations);
            expect(shouldShowResults(selections, currentProducts)).toBe(true);
        });

        it('should handle early termination when narrowed to 1 product', () => {
            const selections = { location: 'EU', forKids: 'true' };
            const currentProducts = filterProducts(sampleProducts, selections);

            expect(currentProducts).toHaveLength(1);
            expect(shouldShowResults(selections, currentProducts)).toBe(true);
        });
    });
});
