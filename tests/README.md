# Unit Tests

Comprehensive unit tests for the sunscreen chooser dynamic questionnaire logic.

## Running Tests

### Option 1: Browser (No Installation)
Open `tests/index.html` in your browser to run tests using Mocha + Chai from CDN.

### Option 2: Command Line (Requires npm)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run tests:**
   ```bash
   npm test
   ```

3. **Run tests in watch mode:**
   ```bash
   npm run test:watch
   ```

4. **Run tests with coverage:**
   ```bash
   npm run test:coverage
   ```

## What's Tested

### Core Functions
- **filterProducts**: Filtering logic for all question types
- **calculateDiscriminatingPower**: Entropy-based algorithm
- **getNextQuestion**: Dynamic question ordering
- **shouldShowResults**: Early termination logic

### Test Coverage
- ✅ Single filter tests (location, skin type, fragrance-free, kids, form factor, water resistance)
- ✅ Multiple filter combinations
- ✅ Edge cases (empty arrays, null values, missing attributes)
- ✅ Discriminating power calculations
- ✅ Question history tracking
- ✅ Early termination scenarios
- ✅ Full questionnaire flow integration

## Coverage Goals
- **Minimum**: 80% coverage for branches, functions, lines, statements
- Run `npm run test:coverage` to see detailed coverage report
