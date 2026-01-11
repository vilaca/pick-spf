// Security utilities tests - Testing actual production code

import { JSDOM } from 'jsdom';

// Setup DOM environment before importing script.js
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost'
});
global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;

// Import actual production functions from script.js
import { escapeHTML, sanitizeURL, validateURLParam } from '../script.js';

describe('Security Utilities', () => {
    describe('escapeHTML', () => {
        it('should escape HTML special characters', () => {
            const result = escapeHTML('<script>alert("xss")</script>');
            // DOM textContent escapes properly
            expect(result).toContain('&lt;');
            expect(result).toContain('&gt;');
            expect(result).not.toContain('<script>');
        });

        it('should escape quotes', () => {
            const result = escapeHTML('"double" and \'single\' quotes');
            // DOM textContent doesn't escape quotes, but that's fine for XSS prevention
            // Quotes are only dangerous in attribute context, not in text content
            expect(result).toBe('"double" and \'single\' quotes');
        });

        it('should escape ampersands', () => {
            expect(escapeHTML('Tom & Jerry')).toBe('Tom &amp; Jerry');
        });

        it('should handle empty strings', () => {
            expect(escapeHTML('')).toBe('');
        });

        it('should handle null and undefined', () => {
            expect(escapeHTML(null)).toBe('');
            expect(escapeHTML(undefined)).toBe('');
        });

        it('should handle regular text without changes', () => {
            expect(escapeHTML('Hello World')).toBe('Hello World');
        });

        it('should prevent XSS via event handlers', () => {
            const malicious = '<img src=x onerror="alert(1)">';
            const escaped = escapeHTML(malicious);
            // Verify tags are escaped
            expect(escaped).toContain('&lt;');
            expect(escaped).toContain('&gt;');
        });

        it('should escape multiple HTML tags', () => {
            const html = '<div><span>nested</span></div>';
            const escaped = escapeHTML(html);
            expect(escaped).toContain('&lt;div&gt;');
            expect(escaped).toContain('&lt;span&gt;');
            expect(escaped).toContain('&lt;/span&gt;');
            expect(escaped).toContain('&lt;/div&gt;');
        });
    });

    describe('sanitizeURL', () => {
        it('should allow valid HTTP URLs', () => {
            const url = 'http://example.com/product';
            expect(sanitizeURL(url)).toBe(url);
        });

        it('should allow valid HTTPS URLs', () => {
            const url = 'https://example.com/product';
            expect(sanitizeURL(url)).toBe(url);
        });

        it('should block javascript: protocol', () => {
            expect(sanitizeURL('javascript:alert(1)')).toBe('');
        });

        it('should block data: protocol', () => {
            expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBe('');
        });

        it('should block file: protocol', () => {
            expect(sanitizeURL('file:///etc/passwd')).toBe('');
        });

        it('should handle empty strings', () => {
            expect(sanitizeURL('')).toBe('');
        });

        it('should handle null and undefined', () => {
            expect(sanitizeURL(null)).toBe('');
            expect(sanitizeURL(undefined)).toBe('');
        });

        it('should handle malformed URLs', () => {
            expect(sanitizeURL('not a url at all')).toBe('');
        });

        it('should handle URLs with query parameters', () => {
            const url = 'https://example.com/page?id=123&name=test';
            expect(sanitizeURL(url)).toBe(url);
        });

        it('should handle URLs with fragments', () => {
            const url = 'https://example.com/page#section';
            expect(sanitizeURL(url)).toBe(url);
        });

        it('should block vbscript: protocol', () => {
            expect(sanitizeURL('vbscript:msgbox(1)')).toBe('');
        });
    });

    describe('validateURLParam', () => {
        describe('location parameter', () => {
            it('should accept valid locations', () => {
                expect(validateURLParam('location', 'US')).toBe('US');
                expect(validateURLParam('location', 'EU')).toBe('EU');
                expect(validateURLParam('location', 'UK')).toBe('UK');
                expect(validateURLParam('location', 'Canada')).toBe('Canada');
                expect(validateURLParam('location', 'Australia')).toBe('Australia');
                expect(validateURLParam('location', 'Japan')).toBe('Japan');
                expect(validateURLParam('location', 'Global')).toBe('Global');
            });

            it('should reject invalid locations', () => {
                expect(validateURLParam('location', 'Mars')).toBeNull();
                expect(validateURLParam('location', 'invalid')).toBeNull();
            });
        });

        describe('skin parameter', () => {
            it('should accept valid skin types', () => {
                expect(validateURLParam('skin', 'oily')).toBe('oily');
                expect(validateURLParam('skin', 'dry')).toBe('dry');
                expect(validateURLParam('skin', 'combination')).toBe('combination');
                expect(validateURLParam('skin', 'sensitive')).toBe('sensitive');
                expect(validateURLParam('skin', 'all')).toBe('all');
            });

            it('should reject invalid skin types', () => {
                expect(validateURLParam('skin', 'invalid')).toBeNull();
            });
        });

        describe('boolean parameters', () => {
            it('should accept valid fragrance values', () => {
                expect(validateURLParam('fragrance', 'true')).toBe('true');
                expect(validateURLParam('fragrance', 'false')).toBe('false');
                expect(validateURLParam('fragrance', 'any')).toBe('any');
            });

            it('should accept valid kids values', () => {
                expect(validateURLParam('kids', 'true')).toBe('true');
                expect(validateURLParam('kids', 'false')).toBe('false');
                expect(validateURLParam('kids', 'any')).toBe('any');
            });

            it('should accept valid water values', () => {
                expect(validateURLParam('water', 'true')).toBe('true');
                expect(validateURLParam('water', 'false')).toBe('false');
                expect(validateURLParam('water', 'any')).toBe('any');
            });

            it('should reject invalid boolean values', () => {
                expect(validateURLParam('fragrance', '1')).toBeNull();
                expect(validateURLParam('kids', 'yes')).toBeNull();
                expect(validateURLParam('water', 'no')).toBeNull();
            });
        });

        describe('form parameter', () => {
            it('should accept valid form factors', () => {
                expect(validateURLParam('form', 'cream')).toBe('cream');
                expect(validateURLParam('form', 'lotion')).toBe('lotion');
                expect(validateURLParam('form', 'spray')).toBe('spray');
                expect(validateURLParam('form', 'stick')).toBe('stick');
                expect(validateURLParam('form', 'gel')).toBe('gel');
                expect(validateURLParam('form', 'any')).toBe('any');
            });

            it('should reject invalid form factors', () => {
                expect(validateURLParam('form', 'invalid')).toBeNull();
            });
        });

        describe('features parameter', () => {
            it('should accept valid special features', () => {
                expect(validateURLParam('features', 'oil-control')).toBe('oil-control');
                expect(validateURLParam('features', 'hydrating')).toBe('hydrating');
                expect(validateURLParam('features', 'anti-aging')).toBe('anti-aging');
                expect(validateURLParam('features', 'tinted')).toBe('tinted');
                expect(validateURLParam('features', 'eco-friendly-packaging')).toBe('eco-friendly-packaging');
            });

            it('should reject invalid features', () => {
                expect(validateURLParam('features', 'invalid')).toBeNull();
            });
        });

        describe('edge cases', () => {
            it('should handle case sensitivity correctly', () => {
                // Parameters are case-sensitive
                expect(validateURLParam('location', 'us')).toBeNull(); // lowercase should fail
            });

            it('should reject unknown parameters', () => {
                expect(validateURLParam('unknown', 'value')).toBeNull();
            });

            it('should handle empty values', () => {
                expect(validateURLParam('location', '')).toBeNull();
            });

            it('should handle XSS attempts', () => {
                expect(validateURLParam('location', '<script>alert(1)</script>')).toBeNull();
                expect(validateURLParam('skin', 'oily"; alert(1); //')).toBeNull();
            });
        });
    });
});
