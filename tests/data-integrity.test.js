// Data integrity tests
// Validates that sunscreen data meets quality and consistency requirements

import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Sunscreen Data Integrity', () => {
    let sunscreensData;

    beforeAll(() => {
        // Load actual sunscreens data
        const dataPath = path.join(__dirname, '..', 'data', 'sunscreens.yaml');
        const content = fs.readFileSync(dataPath, 'utf8');
        sunscreensData = yaml.load(content);
    });

    describe('Forbidden Special Features', () => {
        it('should not contain oil-control in any sunscreen specialFeatures', () => {
            const sunscreensWithOilControl = sunscreensData.sunscreens.filter(s =>
                s.specialFeatures && s.specialFeatures.includes('oil-control')
            );

            if (sunscreensWithOilControl.length > 0) {
                const names = sunscreensWithOilControl.map(s => s.name).join(', ');
                throw new Error(
                    `Found ${sunscreensWithOilControl.length} sunscreen(s) with "oil-control" feature: ${names}. ` +
                    'This is redundant with skin type selection (oily skin).'
                );
            }

            expect(sunscreensWithOilControl.length).toBe(0);
        });

        it('should not contain hydrating in any sunscreen specialFeatures', () => {
            const sunscreensWithHydrating = sunscreensData.sunscreens.filter(s =>
                s.specialFeatures && s.specialFeatures.includes('hydrating')
            );

            if (sunscreensWithHydrating.length > 0) {
                const names = sunscreensWithHydrating.map(s => s.name).join(', ');
                throw new Error(
                    `Found ${sunscreensWithHydrating.length} sunscreen(s) with "hydrating" feature: ${names}. ` +
                    'This is redundant with skin type selection (dry skin).'
                );
            }

            expect(sunscreensWithHydrating.length).toBe(0);
        });

        it('should have no forbidden features in specialFeatures arrays', () => {
            const forbiddenFeatures = ['oil-control', 'hydrating'];
            const violations = [];

            sunscreensData.sunscreens.forEach(sunscreen => {
                if (sunscreen.specialFeatures && Array.isArray(sunscreen.specialFeatures)) {
                    sunscreen.specialFeatures.forEach(feature => {
                        if (forbiddenFeatures.includes(feature)) {
                            violations.push({
                                id: sunscreen.id,
                                name: sunscreen.name,
                                feature: feature
                            });
                        }
                    });
                }
            });

            if (violations.length > 0) {
                const details = violations.map(v =>
                    `  - ${v.name} (id: ${v.id}) has forbidden feature: "${v.feature}"`
                ).join('\n');
                throw new Error(
                    `Found ${violations.length} forbidden feature(s) in sunscreen data:\n${details}\n\n` +
                    'These features are redundant with skin type selection and should be removed.'
                );
            }

            expect(violations).toEqual([]);
        });
    });

    describe('Data Structure', () => {
        it('should have all sunscreens with required fields', () => {
            const requiredFields = [
                'id', 'name', 'url', 'brand', 'spf', 'isFragranceFree',
                'skinTypes', 'forKids', 'formFactors', 'waterResistant',
                'availableIn', 'ingredients'
            ];

            sunscreensData.sunscreens.forEach(sunscreen => {
                requiredFields.forEach(field => {
                    expect(sunscreen).toHaveProperty(field);
                    expect(sunscreen[field]).not.toBeNull();
                    expect(sunscreen[field]).not.toBeUndefined();
                });
            });
        });

        it('should have all sunscreen names in English', () => {
            const portugueseWords = [
                'fluido', 'bruma', 'leite', 'loção', 'creme',
                'corpo', 'zonas', 'antimanchas', 'invisível',
                'hidratante', 'com cor', 'sem perfume'
            ];

            const violatingNames = [];

            sunscreensData.sunscreens.forEach(sunscreen => {
                const nameLower = sunscreen.name.toLowerCase();
                portugueseWords.forEach(word => {
                    if (nameLower.includes(word)) {
                        violatingNames.push({
                            name: sunscreen.name,
                            word: word
                        });
                    }
                });
            });

            if (violatingNames.length > 0) {
                const details = violatingNames.map(v =>
                    `  - "${v.name}" contains Portuguese word: "${v.word}"`
                ).join('\n');
                throw new Error(
                    `Found ${violatingNames.length} sunscreen name(s) with Portuguese words:\n${details}\n\n` +
                    'All product names should be in English for consistency.'
                );
            }

            expect(violatingNames).toEqual([]);
        });

        it('should have SPF values as strings to preserve "+" suffix', () => {
            sunscreensData.sunscreens.forEach(sunscreen => {
                expect(typeof sunscreen.spf).toBe('string');

                // Check that SPF values like "50+" are preserved
                if (sunscreen.spf.includes('+')) {
                    expect(sunscreen.spf).toMatch(/\d+\+/);
                }
            });
        });
    });
});
