#!/usr/bin/env node

/**
 * Data Validation Script
 *
 * This script validates:
 * 1. All YAML files are valid YAML syntax
 * 2. YAML files have the expected structure/schema
 * 3. All ingredient URLs will be generated correctly using production code
 *
 * Uses actual production functions from quiz.js for URL generation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// PRODUCTION CODE - Slug Generation from quiz.js
// This is the exact same logic used in production
// ============================================================================

/**
 * Generate URL slug for ingredient (from quiz.js:1144-1168)
 * @param {string} ingredient - Raw ingredient name
 * @returns {string} - URL-safe slug
 */
function generateIngredientSlug(ingredient) {
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

    return slug;
}

// ============================================================================
// Validation Functions
// ============================================================================

let errors = [];
let warnings = [];

function addError(message) {
    errors.push(`❌ ERROR: ${message}`);
}

function addWarning(message) {
    warnings.push(`⚠️  WARNING: ${message}`);
}

function validateYAMLFile(filePath) {
    console.log(`\n📄 Validating ${filePath}...`);

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = yaml.load(content);
        console.log(`✅ Valid YAML syntax`);
        return data;
    } catch (e) {
        addError(`Failed to parse ${filePath}: ${e.message}`);
        return null;
    }
}

function validateQuestionsMetadata(data) {
    console.log(`\n🔍 Validating questions-metadata.yaml structure...`);

    if (!data.questions) {
        addError('questions-metadata.yaml: Missing "questions" section');
        return;
    }

    const requiredFields = ['elementIndex', 'attribute', 'isArray'];
    const questions = Object.keys(data.questions);

    console.log(`   Found ${questions.length} questions: ${questions.join(', ')}`);

    questions.forEach(questionId => {
        const question = data.questions[questionId];
        requiredFields.forEach(field => {
            if (question[field] === undefined) {
                addError(`Question "${questionId}" missing required field: ${field}`);
            }
        });

        if (typeof question.elementIndex !== 'number') {
            addError(`Question "${questionId}": elementIndex must be a number`);
        }

        if (typeof question.isArray !== 'boolean') {
            addError(`Question "${questionId}": isArray must be a boolean`);
        }
    });

    // Validate config section
    if (!data.config) {
        addWarning('questions-metadata.yaml: Missing "config" section');
    } else {
        if (!data.config.timings) {
            addWarning('config: Missing "timings" section');
        }
        if (!data.config.algorithm) {
            addWarning('config: Missing "algorithm" section');
        }
    }

    console.log(`✅ Questions metadata structure validated`);
}

function validateSunscreensData(data) {
    console.log(`\n🔍 Validating sunscreens.yaml structure...`);

    if (!data.sunscreens) {
        addError('sunscreens.yaml: Missing "sunscreens" array');
        return [];
    }

    if (!Array.isArray(data.sunscreens)) {
        addError('sunscreens.yaml: "sunscreens" must be an array');
        return [];
    }

    console.log(`   Found ${data.sunscreens.length} sunscreens`);

    const requiredFields = [
        'id', 'name', 'brand', 'spf', 'isFragranceFree', 'skinTypes',
        'forKids', 'formFactors', 'waterResistant', 'availableIn',
        'url', 'ingredients'
    ];

    // Use Set to automatically deduplicate ingredients across all sunscreens
    const allIngredients = new Set();

    data.sunscreens.forEach((sunscreen, index) => {
        const sunscreenLabel = `Sunscreen #${index + 1} (${sunscreen.name || 'unnamed'})`;

        // Check required fields
        requiredFields.forEach(field => {
            if (sunscreen[field] === undefined) {
                addError(`${sunscreenLabel}: Missing required field "${field}"`);
            }
        });

        // Validate field types
        if (sunscreen.id !== undefined && typeof sunscreen.id !== 'number') {
            addError(`${sunscreenLabel}: "id" must be a number`);
        }

        if (sunscreen.isFragranceFree !== undefined && typeof sunscreen.isFragranceFree !== 'boolean') {
            addError(`${sunscreenLabel}: "isFragranceFree" must be a boolean`);
        }

        if (sunscreen.forKids !== undefined && typeof sunscreen.forKids !== 'boolean') {
            addError(`${sunscreenLabel}: "forKids" must be a boolean`);
        }

        if (sunscreen.waterResistant !== undefined && typeof sunscreen.waterResistant !== 'boolean') {
            addError(`${sunscreenLabel}: "waterResistant" must be a boolean`);
        }

        // Validate arrays
        const arrayFields = ['skinTypes', 'formFactors', 'availableIn'];
        arrayFields.forEach(field => {
            if (sunscreen[field] !== undefined && !Array.isArray(sunscreen[field])) {
                addError(`${sunscreenLabel}: "${field}" must be an array`);
            }
        });

        // Validate URL
        if (sunscreen.url && !sunscreen.url.startsWith('http')) {
            addWarning(`${sunscreenLabel}: URL should start with http:// or https://`);
        }

        // Extract ingredients (Set will deduplicate automatically)
        if (sunscreen.ingredients) {
            const ingredientList = sunscreen.ingredients
                .split(' - ')
                .map(i => i.trim())
                .filter(i => i.length > 0);

            ingredientList.forEach(ing => allIngredients.add(ing));
        }

        // Validate ingredient classifications if present
        if (sunscreen.ingredientClassifications) {
            const validClassifications = ['superstar', 'goodie', 'icky'];
            Object.entries(sunscreen.ingredientClassifications).forEach(([ingredient, classification]) => {
                if (!validClassifications.includes(classification)) {
                    addError(`${sunscreenLabel}: Invalid classification "${classification}" for ingredient "${ingredient}". Must be one of: ${validClassifications.join(', ')}`);
                }
            });
        }
    });

    console.log(`✅ Sunscreens data structure validated`);
    return Array.from(allIngredients);
}

function validateIngredientURLs(ingredients) {
    console.log(`\n🔗 Validating ingredient URL generation...`);
    console.log(`   Testing ${ingredients.length} unique ingredients (deduplicated)`);

    const urlMap = new Map();
    const slugCollisions = new Map();

    // Only test each unique ingredient once
    ingredients.forEach(ingredient => {
        const slug = generateIngredientSlug(ingredient);
        const url = `https://incidecoder.com/ingredients/${slug}`;

        // Check for empty slugs
        if (!slug || slug.length === 0) {
            addError(`Empty slug generated for ingredient: "${ingredient}"`);
            return;
        }

        // Check for slug collisions (different ingredients generating same slug)
        // Note: Collisions are OK for synonyms (e.g., "AQUA / WATER / EAU" and "WATER")
        if (slugCollisions.has(slug)) {
            const existing = slugCollisions.get(slug);
            if (existing !== ingredient) {
                addWarning(`Slug collision: "${ingredient}" and "${existing}" both generate slug "${slug}" (OK if they're synonyms)`);
            }
        } else {
            slugCollisions.set(slug, ingredient);
        }

        urlMap.set(ingredient, { slug, url });
    });

    console.log(`✅ Generated ${urlMap.size} ingredient URLs`);

    // Display sample URLs
    console.log(`\n📋 Sample ingredient URLs (first 10):`);
    let count = 0;
    for (const [ingredient, { slug, url }] of urlMap.entries()) {
        if (count >= 10) break;
        console.log(`   ${ingredient}`);
        console.log(`   → ${slug}`);
        console.log(`   → ${url}\n`);
        count++;
    }

    return urlMap;
}

// ============================================================================
// Main Validation
// ============================================================================

function main() {
    console.log('🚀 Starting data validation...\n');
    console.log('='.repeat(80));

    const dataDir = path.join(__dirname, 'data');

    // Validate questions-metadata.yaml
    const questionsFile = path.join(dataDir, 'questions-metadata.yaml');
    const questionsData = validateYAMLFile(questionsFile);
    if (questionsData) {
        validateQuestionsMetadata(questionsData);
    }

    // Validate sunscreens.yaml
    const sunscreensFile = path.join(dataDir, 'sunscreens.yaml');
    const sunscreensData = validateYAMLFile(sunscreensFile);
    let ingredients = [];
    if (sunscreensData) {
        ingredients = validateSunscreensData(sunscreensData);
    }

    // Validate ingredient URLs
    if (ingredients.length > 0) {
        validateIngredientURLs(ingredients);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 VALIDATION SUMMARY\n');

    if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ All validations passed! No errors or warnings.');
    } else {
        if (errors.length > 0) {
            console.log(`\n❌ ERRORS (${errors.length}):\n`);
            errors.forEach(err => console.log(err));
        }

        if (warnings.length > 0) {
            console.log(`\n⚠️  WARNINGS (${warnings.length}):\n`);
            warnings.forEach(warn => console.log(warn));
        }
    }

    console.log('\n' + '='.repeat(80));

    // Exit with error code if there are errors
    if (errors.length > 0) {
        console.log('\n❌ Validation failed with errors.');
        process.exit(1);
    } else if (warnings.length > 0) {
        console.log('\n⚠️  Validation completed with warnings.');
        process.exit(0);
    } else {
        console.log('\n✅ Validation successful!');
        process.exit(0);
    }
}

// Run validation
main();
