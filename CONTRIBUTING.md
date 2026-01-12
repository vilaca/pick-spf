# Contributing Guide

Welcome to the PickSPF developer documentation! This guide covers everything you need to know to contribute to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Data Validation](#data-validation)
- [Adding Sunscreens](#adding-sunscreens)
- [Ingredient URLs](#ingredient-urls)
- [Modifying Questions](#modifying-questions)
- [Code Structure](#code-structure)
- [Git Conventions](#git-conventions)

## Getting Started

### Prerequisites

- Node.js 14+ (for running tests and validation)
- A modern web browser
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd sunscreen-chooser

# Install dependencies
npm install

# Run tests to verify setup
npm test
```

### Local Development

The app is a static site that can be served with any HTTP server:

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js http-server (install globally first)
npx http-server -p 8080
```

Then open http://localhost:8080 in your browser.

## Development Workflow

### Before Making Changes

1. **Pull latest changes**: `git pull origin master`
2. **Run tests**: `npm test` to ensure everything works
3. **Run validation**: `npm run validate` to check data integrity

### While Working

1. Make your changes
2. Test frequently: `npm test` or `npm run test:watch`
3. Validate data if you changed YAML files: `npm run validate`

### Before Committing

1. **Run full validation**: `npm run validate:full`
2. **Check git status**: `git status`
3. **Review your changes**: `git diff`
4. **Commit with descriptive message** (see [Git Conventions](#git-conventions))

## Testing

### Test Suite Overview

The project has **318 tests** across **8 test suites** with **~47% code coverage**:

- `tests/script.test.js` - Core business logic (40 tests)
- `tests/quiz.test.js` - Quiz module functionality (50 tests)
- `tests/ui.test.js` - UI rendering and event handlers (55 tests)
- `tests/initialization.test.js` - App initialization (69 tests)
- `tests/edge-cases.test.js` - Edge cases and error handling (74 tests)
- `tests/security.test.js` - XSS prevention and security (37 tests)
- `tests/translations.test.js` - Translation system (52 tests)
- `tests/translations-integration.test.js` - Async translation loading (28 tests)

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Environment

Tests use:
- **Jest** as the test runner with ES modules support
- **JSDOM** for DOM testing
- **Manual mocking** (Jest API not available in ES modules)

### Writing Tests

When adding new functionality:

1. **Add tests first** (TDD approach recommended)
2. **Test both success and failure cases**
3. **Mock external dependencies** (fetch, localStorage, etc.)
4. **Keep tests isolated** - don't rely on test execution order

Example test structure:

```javascript
describe('Feature Name', () => {
    beforeEach(() => {
        // Setup
    });

    afterEach(() => {
        // Cleanup
    });

    it('should handle normal case', () => {
        // Arrange
        const input = ...;

        // Act
        const result = functionUnderTest(input);

        // Assert
        expect(result).toBe(expected);
    });

    it('should handle edge case', () => {
        // Test edge cases
    });
});
```

## Data Validation

### What Gets Validated

The validation script (`validate-data.js`) checks:

- ✅ YAML syntax is valid
- ✅ Required fields are present
- ✅ Data types are correct (arrays, booleans, numbers, etc.)
- ✅ Ingredient URLs will generate correctly
- ✅ No duplicate ingredient testing (uses Set for deduplication)
- ⚠️  Warns about slug collisions (different ingredients → same URL)

### Running Validation

```bash
# Validate YAML files and ingredient URLs
npm run validate

# Validate + run all tests
npm run validate:full

# Or run directly
node validate-data.js
```

### Validation Output

```
🚀 Starting data validation...
📄 Validating questions-metadata.yaml... ✅
📄 Validating sunscreens.yaml... ✅
🔗 Validating ingredient URL generation... ✅
   Testing 133 unique ingredients (deduplicated)
📊 VALIDATION SUMMARY
   ⚠️  8 warnings (synonym collisions - expected)
```

### When to Run Validation

- **Always** before committing changes to YAML files
- After adding new sunscreens
- After modifying ingredient lists
- Before creating a pull request

## Adding Sunscreens

### Step-by-Step Guide

1. **Edit** `data/sunscreens.yaml`
2. **Copy an existing entry** as a template
3. **Update all fields**:

```yaml
- id: 26  # Next available ID
  name: "Product Name SPF 50+"
  brand: "Brand Name"
  spf: "50+"
  isFragranceFree: true  # or false
  skinTypes:
    - all      # Options: all, oily, combination, dry, sensitive
    - oily
  forKids: false
  formFactors:
    - lotion   # Options: lotion, cream, gel, spray, stick, powder
  waterResistant: false
  specialFeatures:
    - lightweight      # Options: lightweight, mattifying, tinted,
    - oil-control      #   hydrating, anti-aging, ultra-breathable
  availableIn:
    - EU       # Options: US, EU, UK, Canada, Australia, Japan, Global
  url: "https://brand.com/product-url"
  ingredients: "INGREDIENT 1 - INGREDIENT 2 - INGREDIENT 3"
  ingredientClassifications:  # Optional
    "INGREDIENT 1": "superstar"  # Options: superstar, goodie, icky
    "INGREDIENT 2": "goodie"
```

4. **Validate your changes**:
```bash
npm run validate
```

5. **Test the app locally** to see your new sunscreen

### Ingredient Format

- **Separator**: Use ` - ` (space-dash-space) between ingredients
- **Case**: Preserve original case from product packaging
- **Synonyms**: Use `/` for multi-language names (e.g., "AQUA / WATER / EAU")
- **CI Codes**: Include both code and name (e.g., "CI 77891 / TITANIUM DIOXIDE")

### Ingredient Classifications

Optional but recommended for key ingredients:

- **superstar**: Amazing ingredients everyone wants (e.g., NIACINAMIDE, GLYCERIN)
- **goodie**: Beneficial ingredients (e.g., UV filters, HYALURONIC ACID)
- **icky**: Potentially problematic ingredients (e.g., ALCOHOL DENAT., FRAGRANCE)

## Ingredient URLs

### How It Works

Ingredient names are converted to INCIDecoder URLs using production code from `quiz.js:1144-1168`:

```javascript
// 1. Handle synonyms (select longest English name)
"AQUA / WATER / EAU" → "WATER"
"CI 77891 / TITANIUM DIOXIDE" → "TITANIUM DIOXIDE"

// 2. Remove parentheticals and CI codes
"Zinc Oxide (UV Filter)" → "Zinc Oxide"
"CI 77891 / TITANIUM DIOXIDE" → "TITANIUM DIOXIDE"

// 3. Generate URL-safe slug
"TITANIUM DIOXIDE" → "titanium-dioxide"

// 4. Build INCIDecoder URL
→ https://incidecoder.com/ingredients/titanium-dioxide
```

### Slug Generation Rules

The production slug generator:

1. **Handles synonyms**: Selects longest non-CI-code part
2. **Removes parentheses**: `(UV Filter)` → removed
3. **Removes CI codes**: `CI 77891 /` → removed
4. **Converts to lowercase**: `WATER` → `water`
5. **Spaces to hyphens**: `Zinc Oxide` → `zinc-oxide`
6. **Removes special chars**: Only keeps `a-z`, `0-9`, `-`
7. **Collapses hyphens**: `--` → `-`
8. **Trims hyphens**: No leading/trailing `-`

### Testing Ingredient URLs

The validation script uses the **exact same production code** to test URL generation:

```bash
npm run validate
```

Sample output:
```
AQUA / WATER / EAU
  → water
  → https://incidecoder.com/ingredients/water

CI 77891 / TITANIUM DIOXIDE
  → titanium-dioxide
  → https://incidecoder.com/ingredients/titanium-dioxide
```

### Slug Collisions

Some collisions are **expected** for synonyms:
- "AQUA / WATER / EAU" + "WATER" → both link to `water`
- "CI 77891 / TITANIUM DIOXIDE" + "TITANIUM DIOXIDE" → both link to `titanium-dioxide`

This is intentional and ensures synonyms link to the same ingredient page.

## Modifying Questions

### Question Configuration

Questions are defined in `data/questions-metadata.yaml`:

```yaml
questions:
  questionId:           # Used in code to reference question
    elementIndex: 0     # Position in DOM (0-based)
    attribute: property # Sunscreen property to filter by
    isArray: true       # true = array value, false = single value
```

### Adding a New Question

1. **Edit** `data/questions-metadata.yaml`
2. **Add the question config**:

```yaml
questions:
  myNewQuestion:
    elementIndex: 7              # Next available index
    attribute: myNewProperty     # Must exist in sunscreens.yaml
    isArray: true                # Match property type in sunscreens
```

3. **Update all sunscreens** in `sunscreens.yaml` to include the new property:

```yaml
- id: 1
  name: "Existing Sunscreen"
  # ... existing fields ...
  myNewProperty:  # Add this to EVERY sunscreen
    - value1
    - value2
```

4. **Add the HTML** in `index.html`:

```html
<div class="question-card" id="myNewQuestion">
    <h2>Your Question Here?</h2>
    <div class="button-group">
        <button class="option-btn" data-value="value1">Option 1</button>
        <button class="option-btn" data-value="value2">Option 2</button>
    </div>
</div>
```

5. **Test and validate**:

```bash
npm run validate:full
```

### Question Order

Questions are dynamically ordered by **discriminating power** (how well they filter the remaining products). The `elementIndex` is used as a fallback for questions with equal power.

## Code Structure

### Main Files

- **`index.html`** - Single page application structure
- **`style.css`** - All styles (no CSS frameworks)
- **`main.js`** (29KB) - Main app initialization, UI management, filtering logic
- **`quiz.js`** (50KB) - Quiz module loaded lazily, handles question flow and results
- **`validate-data.js`** - Data validation script (not loaded in browser)

### Key Functions

#### main.js

```javascript
// Filtering and scoring
filterProducts(products, selections)
calculateDiscriminatingPower(questionId, products)
orderQuestionsByPower(selections, products)

// UI management
showView(viewId)
toggleMode()
announceToScreenReader(message)

// Security
escapeHTML(str)
sanitizeURL(url)
validateURLParam(value, allowedValues)
```

#### quiz.js

```javascript
// Lifecycle
loadQuizResources()
startQuiz()
restart()

// Question management
showNextQuestion()
handleAnswer(questionId, value, isMultiple)
updateProgress()

// Results
displayResults(filteredSunscreens)
renderResultCard(sunscreen)
generateIngredientSlug(ingredient)  // Used for INCIDecoder links
```

### Module Pattern

- **ES6 modules** with named exports
- **Lazy loading** for quiz.js (only loads when user starts quiz)
- **Shared state** via exported objects (`appState`, `appConfig`)
- **No global variables** except what's explicitly exported

### State Management

```javascript
// Shared state (main.js)
export const appState = {
    language: 'en',
    currentView: 'welcome',
    sunscreens: [],
    selections: {},
    // ...
};
```

## Git Conventions

### Commit Message Format

```
<Type>: <Short description>

<Detailed explanation>
<What was changed and why>
<Technical details>
```

### Commit Types

- **Fix**: Bug fixes
- **Add**: New features or files
- **Test**: Adding or modifying tests
- **Refactor**: Code restructuring without behavior change
- **Update**: Updating existing functionality
- **Docs**: Documentation changes
- **Chore**: Maintenance tasks (deps, config, etc.)

### Examples

```
Fix: Reset start button state on quiz restart

- Button was getting stuck in "Loading..." state
- Added reset of disabled state and text in restart() function
- Added 4 new tests to prevent regression

Fixes issue where "Start Over" button stayed disabled.
```

```
Add: YAML validation script with production code testing

- Created validate-data.js to validate all YAML files
- Uses actual production slug generation logic from quiz.js
- Validates 7 questions, 25 sunscreens, 133 unique ingredients
- Added npm scripts: "npm run validate" and "npm run validate:full"

All 133 unique ingredients validated with 8 expected synonym warnings.
```

### What NOT to Include

- ❌ **Never use** `Co-Authored-By:` tags
- ❌ **No generic messages** like "fix bug" or "update code"
- ❌ **No WIP commits** - squash before pushing

### Branch Strategy

- **`master`** - Main branch (production-ready)
- **Feature branches** - Named descriptively: `fix/restart-button`, `feature/dark-mode`
- **Clean history** - Rebase and squash commits before merging

## Testing Best Practices

### Coverage Goals

- **Target**: 80% coverage (statements, branches, functions, lines)
- **Current**: ~47% overall (60% main.js, 40% quiz.js)
- **Focus**: Cover critical paths and edge cases

### What to Test

✅ **Do test**:
- Business logic (filtering, scoring, ordering)
- UI state changes
- Event handlers
- Error handling
- Edge cases (empty arrays, null values, etc.)
- Security functions (XSS prevention, sanitization)

❌ **Don't test**:
- Third-party library internals
- Browser APIs directly (mock them)
- Simple getters/setters without logic

### Mock Strategy

```javascript
// Mock fetch
global.fetch = () => Promise.resolve({
    ok: true,
    text: () => Promise.resolve('data')
});

// Mock localStorage
const localStorageMock = {
    getItem: () => null,
    setItem: () => {},
    clear: () => {}
};
global.localStorage = localStorageMock;

// Mock DOM elements
document.body.innerHTML = `
    <div id="element-id"></div>
`;
```

## Performance Considerations

### Lazy Loading

Quiz module loads only when needed:
- Improves initial page load time
- Reduces unused code on welcome screen
- Loaded via dynamic `import()` or script tag injection

### Data Loading

- YAML files fetched in parallel
- Cached in memory after first load
- No re-fetching on quiz restart

### DOM Updates

- Batch DOM updates where possible
- Use CSS transitions instead of JS animation
- Remove event listeners in cleanup functions

## Security

### XSS Prevention

All user-controlled data must be sanitized:

```javascript
// Escape HTML entities
const safe = escapeHTML(userInput);

// Sanitize URLs
const safeURL = sanitizeURL(userInput);

// Validate against whitelist
const valid = validateURLParam(input, ['en', 'pt']);
```

### CSP Headers

Content Security Policy in `index.html`:
- `script-src 'self'` - Only scripts from same origin
- `style-src 'self'` - Only styles from same origin
- `img-src 'self' data:` - Images from self or data URIs
- No inline scripts or styles

## Deployment

This is a **static site** - no build process required!

### Deploy anywhere:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

### Files to deploy:
```
index.html
style.css
main.js
quiz.js
data/
├── questions-metadata.yaml
└── sunscreens.yaml
translations/
├── en.json
└── pt.json
lib/
└── js-yaml.min.js
images/
└── (any images)
```

## Troubleshooting

### Tests Failing

```bash
# Clear Jest cache
npm test -- --clearCache

# Run single test file
npm test tests/quiz.test.js

# Run with verbose output
npm test -- --verbose
```

### Validation Errors

```bash
# Check YAML syntax online: https://www.yamllint.com/
# Or use validation script verbose mode
node validate-data.js
```

### Coverage Issues

```bash
# Generate detailed coverage report
npm run test:coverage

# Open coverage report in browser
open coverage/lcov-report/index.html
```

## Getting Help

- **Issues**: Check existing [GitHub Issues](link-to-issues)
- **Questions**: Open a new issue with the "question" label
- **Bugs**: Include steps to reproduce and expected vs actual behavior

## License

MIT License - See LICENSE file for details.
