# Developer Quick Start Guide

Quick reference for developers working on PickSPF. For comprehensive documentation, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Setup

```bash
# Clone and install dependencies
git clone <repository-url>
cd sunscreen-chooser
npm install

# Run tests
npm test

# Validate data
npm run validate
```

## Development Workflow

### Before Starting
```bash
git pull origin master
npm run validate:full  # Run validation + all tests
```

### Local Development
```bash
# Start local server
python3 -m http.server 8080
# Visit http://localhost:8080
```

### Before Committing
```bash
npm run validate:full  # Validate + test
git status             # Review changes
git add .
git commit -m "Type: Description"
```

## Quick Commands

```bash
# Testing
npm test                  # Run all 318 tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report

# Validation
npm run validate          # Validate YAML + ingredient URLs
npm run validate:full     # Validate + run tests
```

## Test Coverage

- **318 tests** across 8 suites
- **~47% coverage** overall (60% script.js, 40% quiz.js)
- Target: 80% coverage

## File Structure

```
.
├── index.html                    # Main HTML
├── style.css                     # All styles
├── script.js                     # Main app (29KB)
├── quiz.js                       # Quiz module (50KB, lazy loaded)
├── validate-data.js              # Data validation script
├── data/
│   ├── sunscreens.yaml          # 25 sunscreens
│   └── questions-metadata.yaml  # 7 questions
├── translations/
│   ├── en.json                  # English
│   └── pt.json                  # Portuguese
├── tests/                        # 8 test suites
│   ├── script.test.js           # Core logic (40 tests)
│   ├── quiz.test.js             # Quiz module (50 tests)
│   ├── ui.test.js               # UI rendering (55 tests)
│   ├── initialization.test.js   # Init (69 tests)
│   ├── edge-cases.test.js       # Edge cases (74 tests)
│   ├── security.test.js         # Security (37 tests)
│   ├── translations.test.js     # i18n (52 tests)
│   └── translations-integration.test.js (28 tests)
├── CONTRIBUTING.md               # Full developer docs
└── README-DEV.md                 # This file
```

## Adding a Sunscreen

1. Edit `data/sunscreens.yaml`
2. Copy existing entry as template
3. Update all fields
4. Run `npm run validate`
5. Test locally
6. Commit and push

### Required Fields
```yaml
- id: 26                      # Next available ID
  name: "Product Name SPF 50+"
  brand: "Brand Name"
  spf: "50+"
  isFragranceFree: true       # boolean
  skinTypes: [all, oily]      # array
  forKids: false              # boolean
  formFactors: [lotion]       # array
  waterResistant: false       # boolean
  specialFeatures: [lightweight]  # array (optional)
  availableIn: [EU]           # array
  url: "https://..."          # string
  ingredients: "ING1 - ING2 - ING3"  # separated by " - "
  ingredientClassifications:  # optional
    "INGREDIENT": "superstar" # superstar/goodie/icky
```

## Ingredient URL Generation

Ingredients link to INCIDecoder using production slug generation:

```javascript
// From quiz.js:1144-1168
"AQUA / WATER / EAU" → "water"
"CI 77891 / TITANIUM DIOXIDE" → "titanium-dioxide"
"Zinc Oxide (UV Filter)" → "zinc-oxide"
```

Validation script tests all 133 unique ingredients using the same code.

## Common Tasks

### Run All Tests
```bash
npm test
```

### Test Specific File
```bash
npm test tests/quiz.test.js
```

### Validate YAML Changes
```bash
npm run validate
```

### Check Test Coverage
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

### Clear Jest Cache
```bash
npm test -- --clearCache
```

## Commit Message Format

```
<Type>: <Short description>

<Detailed explanation>
```

**Types**: Fix, Add, Test, Refactor, Update, Docs, Chore

**Example**:
```
Fix: Reset start button state on quiz restart

- Button was getting stuck in "Loading..." state
- Added reset of disabled state and text in restart()
- Added 4 new tests to prevent regression
```

## Key Functions

### script.js
```javascript
filterProducts(products, selections)
calculateDiscriminatingPower(questionId, products)
orderQuestionsByPower(selections, products)
showView(viewId)
toggleMode()
escapeHTML(str)
sanitizeURL(url)
```

### quiz.js
```javascript
loadQuizResources()
startQuiz()
restart()
showNextQuestion()
handleAnswer(questionId, value, isMultiple)
displayResults(filteredSunscreens)
renderResultCard(sunscreen)
generateIngredientSlug(ingredient)  // INCIDecoder links
```

## Security

All user input must be sanitized:
```javascript
escapeHTML(userInput)      // Escape HTML entities
sanitizeURL(userInput)     // Sanitize URLs
validateURLParam(input, allowedValues)  // Whitelist validation
```

CSP headers in `index.html`:
- `script-src 'self'` - No inline scripts
- `style-src 'self'` - No inline styles
- No external CDN calls

## Testing Tips

### Mock Fetch
```javascript
global.fetch = () => Promise.resolve({
    ok: true,
    text: () => Promise.resolve('data')
});
```

### Mock localStorage
```javascript
const localStorageMock = {
    getItem: () => null,
    setItem: () => {},
    clear: () => {}
};
global.localStorage = localStorageMock;
```

### Mock DOM
```javascript
document.body.innerHTML = `
    <div id="element-id"></div>
`;
```

## Troubleshooting

### Tests Failing
```bash
npm test -- --clearCache
npm test tests/file.test.js -- --verbose
```

### Validation Errors
```bash
# Check YAML syntax
node validate-data.js

# Validate online
# https://www.yamllint.com/
```

### Coverage Too Low
```bash
npm run test:coverage
# Review coverage/lcov-report/index.html
# Add tests for uncovered lines
```

## Performance

- **Fast initial load**: ~200-300ms
- **Lazy loading**: quiz.js loads only when needed
- **No build process**: Static files only
- **Local dependencies**: No external CDN calls

## Deployment

Static site - deploy anywhere:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting

No build process required!

## Need Help?

- **Full docs**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Issues**: Check existing GitHub Issues
- **Security**: See [SECURITY.md](SECURITY.md)

---

**Quick Links**
- [CONTRIBUTING.md](CONTRIBUTING.md) - Full developer documentation
- [README.md](README.md) - User-facing documentation
- [SECURITY.md](SECURITY.md) - Security policy
