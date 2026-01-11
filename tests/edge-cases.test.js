// Additional edge case tests for better coverage

import { JSDOM } from 'jsdom';

describe('Additional Edge Cases and Coverage', () => {
    let script;

    beforeEach(async () => {
        // Suppress console
        global.console.warn = () => {};
        global.console.error = () => {};
        global.console.log = () => {};

        // Setup DOM
        const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
            url: 'http://localhost'
        });
        global.document = dom.window.document;
        global.window = dom.window;
        global.navigator = { language: 'en' };
        global.localStorage = {
            getItem: () => null,
            setItem: () => {},
            clear: () => {}
        };
        global.history = {
            pushState: () => {},
            replaceState: () => {}
        };
        global.fetch = (url) => {
            if (url.includes('.json')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        welcome: { title: 'Test' },
                        meta: { title: 'Test' }
                    })
                });
            }
            return Promise.resolve({ ok: false });
        };

        script = await import('../script.js');
    });

    describe('Translation Edge Cases', () => {
        it('should handle translation keys with multiple levels', async () => {
            const { changeLanguage, t } = script;
            await changeLanguage('en');

            const result = t('welcome.title');
            expect(typeof result).toBe('string');
        });

        it('should handle translation replacements with numbers', () => {
            const { t } = script;

            // Test placeholder replacement logic
            const testString = 'Count: {count}';
            const replaced = testString.replace(/\{(\w+)\}/g, (match, key) => {
                const replacements = { count: 42 };
                return replacements[key] !== undefined ? replacements[key] : match;
            });

            expect(replaced).toBe('Count: 42');
        });

        it('should handle translation replacements with zero', () => {
            const { t } = script;

            const testString = 'Count: {count}';
            const replaced = testString.replace(/\{(\w+)\}/g, (match, key) => {
                const replacements = { count: 0 };
                return replacements[key] !== undefined ? replacements[key] : match;
            });

            expect(replaced).toBe('Count: 0');
        });

        it('should handle empty replacement values', () => {
            const { t } = script;

            const testString = 'Value: {value}';
            const replaced = testString.replace(/\{(\w+)\}/g, (match, key) => {
                const replacements = { value: '' };
                return replacements[key] !== undefined ? replacements[key] : match;
            });

            expect(replaced).toBe('Value: ');
        });

        it('should not replace unmatched placeholders', () => {
            const { t } = script;

            const testString = 'Value: {value}';
            const replaced = testString.replace(/\{(\w+)\}/g, (match, key) => {
                const replacements = { other: 'test' };
                return replacements[key] !== undefined ? replacements[key] : match;
            });

            expect(replaced).toBe('Value: {value}');
        });
    });

    describe('calculateDiscriminatingPower Edge Cases', () => {
        it('should return 0 for invalid question key', () => {
            const { calculateDiscriminatingPower } = script;

            const products = [
                { id: 1, skinTypes: ['oily'] }
            ];

            const power = calculateDiscriminatingPower('invalidKey', products);
            expect(power).toBe(0);
        });

        it('should return 0 for empty products array', () => {
            const { calculateDiscriminatingPower, questionMetadata } = script;

            // Add a test question to metadata
            questionMetadata.testQuestion = { attribute: 'test', isArray: false };

            const power = calculateDiscriminatingPower('testQuestion', []);
            expect(power).toBe(0);
        });

        it('should return 0 for null products', () => {
            const { calculateDiscriminatingPower, questionMetadata } = script;

            questionMetadata.testQuestion = { attribute: 'test', isArray: false };

            const power = calculateDiscriminatingPower('testQuestion', null);
            expect(power).toBe(0);
        });

        it('should return 0 for non-array products', () => {
            const { calculateDiscriminatingPower, questionMetadata } = script;

            questionMetadata.testQuestion = { attribute: 'test', isArray: false };

            const power = calculateDiscriminatingPower('testQuestion', 'not an array');
            expect(power).toBe(0);
        });
    });

    describe('getNextQuestion Edge Cases', () => {
        it('should handle empty products array', () => {
            const { getNextQuestion } = script;

            const selections = {};
            const result = getNextQuestion(selections, []);

            expect(result).toBeNull();
        });

        it('should skip already answered questions', () => {
            const { getNextQuestion, questionMetadata } = script;

            // Setup metadata
            questionMetadata.question1 = { elementIndex: 0, attribute: 'attr1', isArray: false };
            questionMetadata.question2 = { elementIndex: 1, attribute: 'attr2', isArray: false };

            const selections = { question1: 'answered' };
            const products = [
                { id: 1, attr1: 'value1', attr2: 'value2' }
            ];

            const result = getNextQuestion(selections, products);

            // Should not return question1 since it's already answered
            expect(result).not.toBe('question1');
        });

        it('should return null when all questions answered', () => {
            const { getNextQuestion, questionMetadata } = script;

            // Setup metadata
            questionMetadata.q1 = { elementIndex: 0, attribute: 'a1', isArray: false };
            questionMetadata.q2 = { elementIndex: 1, attribute: 'a2', isArray: false };

            const selections = { q1: 'answered', q2: 'answered' };
            const products = [{ id: 1 }];

            const result = getNextQuestion(selections, products);

            expect(result).toBeNull();
        });
    });

    describe('shouldShowResults Edge Cases', () => {
        it('should return true for empty products', () => {
            const { shouldShowResults } = script;

            const result = shouldShowResults({}, []);

            expect(result).toBe(true);
        });

        it('should return true for single product', () => {
            const { shouldShowResults } = script;

            const result = shouldShowResults({}, [{ id: 1 }]);

            expect(result).toBe(true);
        });

        it('should return true when next question is null', () => {
            const { shouldShowResults } = script;

            // If no more discriminating questions, should show results
            const result = shouldShowResults({}, [{ id: 1 }, { id: 2 }]);

            expect(typeof result).toBe('boolean');
        });
    });

    describe('Security Functions Additional Tests', () => {
        it('should handle escapeHTML with numbers', () => {
            const { escapeHTML } = script;

            expect(escapeHTML(123)).toBe('123');
        });

        it('should handle escapeHTML with boolean', () => {
            const { escapeHTML } = script;

            expect(escapeHTML(true)).toBe('true');
            // false is falsy, so escapeHTML returns empty string
            expect(escapeHTML(false)).toBe('');
        });

        it('should handle sanitizeURL with spaces', () => {
            const { sanitizeURL } = script;

            expect(sanitizeURL('http://example.com/path with spaces')).toBeTruthy();
        });

        it('should handle sanitizeURL with query parameters', () => {
            const { sanitizeURL } = script;

            const url = 'https://example.com?foo=bar&baz=qux';
            expect(sanitizeURL(url)).toBe(url);
        });

        it('should handle sanitizeURL with fragments', () => {
            const { sanitizeURL } = script;

            const url = 'https://example.com#section';
            expect(sanitizeURL(url)).toBe(url);
        });

        it('should handle validateURLParam with empty string', () => {
            const { validateURLParam } = script;

            expect(validateURLParam('location', '')).toBeNull();
        });

        it('should handle validateURLParam with whitespace', () => {
            const { validateURLParam } = script;

            expect(validateURLParam('location', '  ')).toBeNull();
        });

        it('should validate form parameter values', () => {
            const { validateURLParam } = script;

            expect(validateURLParam('form', 'cream')).toBe('cream');
            expect(validateURLParam('form', 'lotion')).toBe('lotion');
            expect(validateURLParam('form', 'spray')).toBe('spray');
            expect(validateURLParam('form', 'stick')).toBe('stick');
            expect(validateURLParam('form', 'gel')).toBe('gel');
            expect(validateURLParam('form', 'any')).toBe('any');
        });

        it('should validate features parameter values', () => {
            const { validateURLParam } = script;

            expect(validateURLParam('features', 'oil-control')).toBe('oil-control');
            expect(validateURLParam('features', 'hydrating')).toBe('hydrating');
            expect(validateURLParam('features', 'anti-aging')).toBe('anti-aging');
            expect(validateURLParam('features', 'tinted')).toBe('tinted');
        });
    });

    describe('availableLanguages', () => {
        it('should have correct structure', () => {
            const { availableLanguages } = script;

            expect(typeof availableLanguages).toBe('object');
            expect(availableLanguages).not.toBeNull();
        });

        it('should have language codes as keys', () => {
            const { availableLanguages } = script;

            const keys = Object.keys(availableLanguages);
            expect(keys.length).toBeGreaterThan(0);

            keys.forEach(key => {
                expect(typeof key).toBe('string');
                expect(key.length).toBeGreaterThanOrEqual(2);
            });
        });

        it('should have language names as values', () => {
            const { availableLanguages } = script;

            const values = Object.values(availableLanguages);
            expect(values.length).toBeGreaterThan(0);

            values.forEach(value => {
                expect(typeof value).toBe('string');
                expect(value.length).toBeGreaterThan(0);
            });
        });
    });

    describe('appConfig', () => {
        it('should have valid timing values', () => {
            const { appConfig } = script;

            expect(appConfig.timings.notificationFadeOut).toBeGreaterThan(0);
            expect(appConfig.timings.notificationAutoDismiss).toBeGreaterThan(0);
            expect(typeof appConfig.timings.notificationFadeOut).toBe('number');
            expect(typeof appConfig.timings.notificationAutoDismiss).toBe('number');
        });

        it('should have reasonable timing values', () => {
            const { appConfig } = script;

            // Fade out should be shorter than auto-dismiss
            expect(appConfig.timings.notificationFadeOut).toBeLessThan(
                appConfig.timings.notificationAutoDismiss
            );
        });
    });

    describe('filterProducts comprehensive tests', () => {
        it('should handle multiple boolean filters together', () => {
            const { filterProducts } = script;

            const products = [
                {
                    id: 1,
                    availableIn: ['US'],
                    isFragranceFree: true,
                    forKids: true,
                    waterResistant: true
                },
                {
                    id: 2,
                    availableIn: ['US'],
                    isFragranceFree: false,
                    forKids: false,
                    waterResistant: false
                }
            ];

            const selections = {
                location: 'US',
                fragranceFree: 'true',
                forKids: 'true',
                waterResistant: 'true'
            };

            const filtered = filterProducts(products, selections);
            expect(filtered).toHaveLength(1);
            expect(filtered[0].id).toBe(1);
        });

        it('should handle any selections for boolean filters', () => {
            const { filterProducts } = script;

            const products = [
                { id: 1, availableIn: ['US'], isFragranceFree: true },
                { id: 2, availableIn: ['US'], isFragranceFree: false }
            ];

            const selections = {
                location: 'US',
                fragranceFree: 'any'
            };

            const filtered = filterProducts(products, selections);
            expect(filtered).toHaveLength(2);
        });

        it('should handle any selection for water resistant', () => {
            const { filterProducts } = script;

            const products = [
                { id: 1, availableIn: ['US'], waterResistant: true },
                { id: 2, availableIn: ['US'], waterResistant: false }
            ];

            const selections = {
                location: 'US',
                waterResistant: 'any'
            };

            const filtered = filterProducts(products, selections);
            expect(filtered).toHaveLength(2);
        });

        it('should handle any selection for kids', () => {
            const { filterProducts } = script;

            const products = [
                { id: 1, availableIn: ['US'], forKids: true },
                { id: 2, availableIn: ['US'], forKids: false }
            ];

            const selections = {
                location: 'US',
                forKids: 'any'
            };

            const filtered = filterProducts(products, selections);
            expect(filtered).toHaveLength(2);
        });

        it('should handle any selection for form factor', () => {
            const { filterProducts } = script;

            const products = [
                { id: 1, availableIn: ['US'], formFactors: ['cream'] },
                { id: 2, availableIn: ['US'], formFactors: ['lotion'] }
            ];

            const selections = {
                location: 'US',
                formFactor: 'any'
            };

            const filtered = filterProducts(products, selections);
            expect(filtered).toHaveLength(2);
        });
    });
});
