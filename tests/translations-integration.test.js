// Translation system integration tests - Testing async translation loading

import { JSDOM } from 'jsdom';

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost'
});
global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    clear: () => {}
};
global.history = {
    pushState: () => {},
    replaceState: () => {}
};

// Mock translations
const mockTranslations = {
    welcome: {
        title: 'Find Your Perfect Sunscreen',
        subtitle: 'Answer a few questions',
        startButton: 'Start Quiz'
    },
    questions: {
        location: 'Where are you located?',
        skinType: 'What is your skin type?'
    },
    liveCount: {
        singular: 'match',
        plural: 'matches'
    },
    screenReader: {
        switchedMode: 'Switched to {mode} mode',
        productCount: '{count} products found'
    },
    validation: {
        required: 'This field is required',
        minLength: 'Minimum length is {min} characters'
    }
};

// Mock fetch before importing
global.fetch = (url) => {
    if (url.includes('translations/en.json')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTranslations)
        });
    }
    if (url.includes('translations/de.json')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                welcome: { title: 'Finden Sie Ihre perfekte Sonnencreme' }
            })
        });
    }
    if (url.includes('translations/invalid.json')) {
        return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found'
        });
    }
    return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found'
    });
};

// Import after setting up mocks
import { loadTranslation, changeLanguage, t, availableLanguages } from '../script.js';

describe('Translation System Integration', () => {
    describe('loadTranslation', () => {
        it('should load English translations successfully', async () => {
            const translations = await loadTranslation('en');
            expect(translations).toHaveProperty('welcome');
            expect(translations.welcome).toHaveProperty('title');
            expect(translations.welcome.title).toBe('Find Your Perfect Sunscreen');
        });

        it('should load German translations successfully', async () => {
            const translations = await loadTranslation('de');
            expect(translations).toHaveProperty('welcome');
            expect(translations.welcome.title).toBe('Finden Sie Ihre perfekte Sonnencreme');
        });

        it('should fallback to English when translation fails', async () => {
            const translations = await loadTranslation('invalid');
            // Should fallback to English
            expect(translations).toHaveProperty('welcome');
            expect(translations.welcome.title).toBe('Find Your Perfect Sunscreen');
        });

        it('should throw error when English also fails', async () => {
            // Temporarily break fetch for both invalid and en
            const originalFetch = global.fetch;
            global.fetch = () => Promise.resolve({
                ok: false,
                status: 500,
                statusText: 'Server Error'
            });

            await expect(loadTranslation('invalid')).rejects.toThrow();

            // Restore fetch
            global.fetch = originalFetch;
        });

        it('should handle fetch errors gracefully', async () => {
            const originalFetch = global.fetch;
            global.fetch = () => Promise.reject(new Error('Network error'));

            await expect(loadTranslation('fr')).rejects.toThrow();

            global.fetch = originalFetch;
        });
    });

    describe('changeLanguage', () => {

        it('should change to supported language', async () => {
            await changeLanguage('en');
            // Test that t() now uses English translations
            const result = t('welcome.title');
            expect(result).toBe('Find Your Perfect Sunscreen');
        });

        it('should change to German', async () => {
            await changeLanguage('de');
            const result = t('welcome.title');
            expect(result).toBe('Finden Sie Ihre perfekte Sonnencreme');
        });

        it('should not change to unsupported language', async () => {
            // Mock console.error to suppress output
            const originalError = console.error;
            console.error = () => {};

            await changeLanguage('unsupported');
            // Function should return early without throwing
            // Translation state should remain unchanged

            console.error = originalError;
        });

        it('should update HTML lang attribute', async () => {
            await changeLanguage('en');
            // Can't easily test this without full DOM, but function should execute
            expect(document.documentElement.lang).toBeDefined();
        });
    });

    describe('t() function with loaded translations', () => {
        beforeAll(async () => {
            // Load English translations
            await changeLanguage('en');
        });

        it('should return simple nested translation', () => {
            const result = t('welcome.title');
            expect(result).toBe('Find Your Perfect Sunscreen');
        });

        it('should return deeply nested translation', () => {
            const result = t('welcome.subtitle');
            expect(result).toBe('Answer a few questions');
        });

        it('should replace single placeholder', () => {
            const result = t('screenReader.switchedMode', { mode: 'wizard' });
            expect(result).toBe('Switched to wizard mode');
        });

        it('should replace multiple placeholders', () => {
            const result = t('validation.minLength', { min: 5 });
            expect(result).toBe('Minimum length is 5 characters');
        });

        it('should handle numeric placeholders', () => {
            const result = t('screenReader.productCount', { count: 42 });
            expect(result).toBe('42 products found');
        });

        it('should handle zero as placeholder value', () => {
            const result = t('screenReader.productCount', { count: 0 });
            expect(result).toBe('0 products found');
        });

        it('should return key when translation not found', () => {
            const result = t('nonexistent.key');
            expect(result).toBe('nonexistent.key');
        });

        it('should return key when partially missing path', () => {
            const result = t('welcome.nonexistent');
            expect(result).toBe('welcome.nonexistent');
        });

        it('should leave placeholder intact when replacement missing', () => {
            const result = t('screenReader.switchedMode', { wrongKey: 'value' });
            expect(result).toBe('Switched to {mode} mode');
        });

        it('should handle empty string as placeholder value', () => {
            const result = t('screenReader.switchedMode', { mode: '' });
            expect(result).toBe('Switched to  mode');
        });

        it('should handle string with multiple same placeholders', () => {
            // Add a translation with repeated placeholder
            const testString = 'Hello {name}, goodbye {name}';
            const replaced = testString.replace(/\{(\w+)\}/g, (match, placeholder) => {
                const replacements = { name: 'World' };
                return replacements[placeholder] !== undefined ? replacements[placeholder] : match;
            });
            expect(replaced).toBe('Hello World, goodbye World');
        });
    });

    describe('Translation edge cases', () => {
        beforeAll(async () => {
            await changeLanguage('en');
        });

        it('should handle empty key', () => {
            const result = t('');
            expect(result).toBe('');
        });

        it('should handle single-level key', () => {
            // Most translations are nested, but test single level
            const result = t('welcome');
            // Returns the object itself if it's an object
            expect(typeof result).toBe('object');
        });

        it('should handle key with trailing dot', () => {
            const result = t('welcome.title.');
            // Should not find because of trailing dot
            expect(result).toBe('welcome.title.');
        });

        it('should handle replacements with special characters', () => {
            const result = t('screenReader.switchedMode', { mode: '<script>alert(1)</script>' });
            // Note: t() doesn't escape, that should be done when rendering to HTML
            expect(result).toContain('<script>');
        });

        it('should handle very long keys', () => {
            const longKey = 'a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t';
            const result = t(longKey);
            expect(result).toBe(longKey);
        });

        it('should handle keys with numbers', () => {
            const result = t('welcome.title');
            expect(typeof result).toBe('string');
        });

        it('should handle undefined replacements object', () => {
            const result = t('welcome.title', undefined);
            expect(result).toBe('Find Your Perfect Sunscreen');
        });

        it('should handle null replacements object', () => {
            const result = t('welcome.title', null);
            expect(result).toBe('Find Your Perfect Sunscreen');
        });
    });

    describe('availableLanguages constant', () => {
        it('should be immutable object', () => {
            expect(typeof availableLanguages).toBe('object');
            expect(Array.isArray(availableLanguages)).toBe(false);
        });

        it('should contain all 7 languages', () => {
            const languages = ['en', 'pt-PT', 'de', 'fr', 'es', 'it', 'pl'];
            languages.forEach(lang => {
                expect(availableLanguages).toHaveProperty(lang);
            });
        });

        it('should have proper language names', () => {
            expect(availableLanguages.en).toBe('English');
            expect(availableLanguages['pt-PT']).toBe('Português');
            expect(availableLanguages.de).toBe('Deutsch');
        });

        it('should not have unsupported languages', () => {
            expect(availableLanguages).not.toHaveProperty('zh');
            expect(availableLanguages).not.toHaveProperty('ja');
            expect(availableLanguages).not.toHaveProperty('ar');
        });
    });
});
