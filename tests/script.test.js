// Unit tests for sunscreen chooser dynamic questionnaire logic

describe('Dynamic Questionnaire Logic', () => {
    let sampleProducts;

    beforeEach(() => {
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
            expect(filtered).to.have.lengthOf(3);
            expect(filtered.map(p => p.id)).to.include.members([1, 2, 4]);
        });

        it('should filter by skin type', () => {
            const selections = { skinType: 'oily' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).to.have.lengthOf(3);
            expect(filtered.map(p => p.id)).to.include.members([1, 3, 4]);
        });

        it('should filter by fragrance-free', () => {
            const selections = { fragranceFree: 'true' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).to.have.lengthOf(2);
            expect(filtered.map(p => p.id)).to.include.members([1, 3]);
        });

        it('should filter by for kids', () => {
            const selections = { forKids: 'true' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).to.have.lengthOf(1);
            expect(filtered[0].id).to.equal(2);
        });

        it('should filter by form factor', () => {
            const selections = { formFactor: 'cream' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).to.have.lengthOf(2);
            expect(filtered.map(p => p.id)).to.include.members([1, 4]);
        });

        it('should filter by water resistance', () => {
            const selections = { waterResistant: 'true' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).to.have.lengthOf(2);
            expect(filtered.map(p => p.id)).to.include.members([1, 3]);
        });

        it('should apply multiple filters together', () => {
            const selections = {
                location: 'US',
                skinType: 'oily',
                fragranceFree: 'true'
            };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).to.have.lengthOf(1);
            expect(filtered[0].id).to.equal(1);
        });

        it('should return empty array when no products match', () => {
            const selections = {
                location: 'Japan',
                skinType: 'sensitive',
                forKids: 'true'
            };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).to.have.lengthOf(0);
        });

        it('should handle "any" selection for boolean questions', () => {
            const selections = { fragranceFree: 'any' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).to.have.lengthOf(4); // All products
        });

        it('should handle "all" skin type selection', () => {
            const selections = { skinType: 'all' };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).to.have.lengthOf(4); // All products
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
            expect(power).to.equal(0);
        });

        it('should return higher value for questions that split products evenly', () => {
            // Even split has maximum entropy
            const evenProducts = [
                { id: 1, isFragranceFree: true },
                { id: 2, isFragranceFree: false }
            ];
            const power = calculateDiscriminatingPower('fragranceFree', evenProducts);
            expect(power).to.be.greaterThan(0.9); // Should be close to 1 for even split
        });

        it('should return value for array attributes', () => {
            const power = calculateDiscriminatingPower('skinType', sampleProducts);
            expect(power).to.be.greaterThan(0);
        });

        it('should return value for location filtering', () => {
            const power = calculateDiscriminatingPower('location', sampleProducts);
            expect(power).to.be.greaterThan(0);
        });
    });

    describe('getNextQuestion', () => {
        it('should return the most discriminating unanswered question', () => {
            const selections = {};
            const currentProducts = sampleProducts;
            const nextQuestion = getNextQuestion(selections, currentProducts);
            expect(nextQuestion).to.be.a('string');
            expect(['location', 'skinType', 'fragranceFree', 'forKids', 'formFactor', 'waterResistant'])
                .to.include(nextQuestion);
        });

        it('should skip already answered questions', () => {
            const selections = { location: 'US', skinType: 'oily' };
            const currentProducts = filterProducts(sampleProducts, selections);
            const nextQuestion = getNextQuestion(selections, currentProducts);
            expect(nextQuestion).to.not.equal('location');
            expect(nextQuestion).to.not.equal('skinType');
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
            expect(nextQuestion).to.be.null;
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
                expect(power).to.be.lessThan(0.1);
            }
        });
    });

    describe('shouldShowResults', () => {
        it('should return true when 0 products remain', () => {
            const selections = { location: 'Mars' }; // No products available
            const currentProducts = filterProducts(sampleProducts, selections);
            expect(shouldShowResults(selections, currentProducts)).to.be.true;
        });

        it('should return true when 1 product remains', () => {
            const oneProduct = [sampleProducts[0]];
            const selections = { location: 'US' };
            expect(shouldShowResults(selections, oneProduct)).to.be.true;
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
            expect(shouldShowResults(selections, currentProducts)).to.be.true;
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
            expect(shouldShowResults(selections, uniformProducts)).to.be.true;
        });

        it('should return false when more questions can narrow down results', () => {
            const selections = { location: 'US' };
            const currentProducts = filterProducts(sampleProducts, selections);
            // Only answered 1 question, many products remain with different attributes
            if (currentProducts.length > 1) {
                expect(shouldShowResults(selections, currentProducts)).to.be.false;
            }
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty product array', () => {
            const selections = {};
            const filtered = filterProducts([], selections);
            expect(filtered).to.be.an('array').that.is.empty;
            expect(shouldShowResults(selections, [])).to.be.true;
        });

        it('should handle null selections', () => {
            const selections = { location: null, skinType: null };
            const filtered = filterProducts(sampleProducts, selections);
            expect(filtered).to.have.lengthOf(4); // Should return all products
        });

        it('should handle products with missing attributes gracefully', () => {
            const incompleteProducts = [
                { id: 1, name: 'Incomplete', availableIn: ['US'] }
                // Missing other attributes
            ];
            const selections = { location: 'US' };
            const filtered = filterProducts(incompleteProducts, selections);
            expect(filtered).to.have.lengthOf(1);
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
            expect(filtered).to.have.lengthOf(1);
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

            expect(history).to.be.an('array');
            expect(history.length).to.be.at.least(1);
            expect(history[0]).to.be.a('string');
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

            expect(iterations).to.be.lessThan(maxIterations);
            expect(shouldShowResults(selections, currentProducts)).to.be.true;
        });

        it('should handle early termination when narrowed to 1 product', () => {
            const selections = { location: 'EU', forKids: 'true' };
            const currentProducts = filterProducts(sampleProducts, selections);

            expect(currentProducts).to.have.lengthOf(1);
            expect(shouldShowResults(selections, currentProducts)).to.be.true;
        });
    });
});

// Helper functions extracted from script.js for testing
// These should match the actual implementation

function filterProducts(products, selections) {
    return products.filter(product => {
        // Location
        if (selections.location && !product.availableIn.includes(selections.location)) {
            return false;
        }

        // Skin type
        if (selections.skinType && selections.skinType !== 'all') {
            if (!product.skinTypes.includes(selections.skinType) && !product.skinTypes.includes('all')) {
                return false;
            }
        }

        // Fragrance free
        if (selections.fragranceFree && selections.fragranceFree !== 'any') {
            const fragranceFreeBool = selections.fragranceFree === 'true';
            if (product.isFragranceFree !== fragranceFreeBool) {
                return false;
            }
        }

        // For kids
        if (selections.forKids && selections.forKids !== 'any') {
            const forKidsBool = selections.forKids === 'true';
            if (product.forKids !== forKidsBool) {
                return false;
            }
        }

        // Form factor
        if (selections.formFactor && selections.formFactor !== 'any') {
            if (!product.formFactors.includes(selections.formFactor)) {
                return false;
            }
        }

        // Water resistant
        if (selections.waterResistant && selections.waterResistant !== 'any') {
            const waterResistantBool = selections.waterResistant === 'true';
            if (product.waterResistant !== waterResistantBool) {
                return false;
            }
        }

        return true;
    });
}

const questionMetadata = {
    location: { elementIndex: 0, attribute: 'availableIn', isArray: true },
    skinType: { elementIndex: 1, attribute: 'skinTypes', isArray: true },
    fragranceFree: { elementIndex: 2, attribute: 'isFragranceFree', isArray: false },
    forKids: { elementIndex: 3, attribute: 'forKids', isArray: false },
    formFactor: { elementIndex: 4, attribute: 'formFactors', isArray: true },
    waterResistant: { elementIndex: 5, attribute: 'waterResistant', isArray: false }
};

function calculateDiscriminatingPower(questionKey, currentProducts) {
    if (currentProducts.length <= 1) return 0;

    const metadata = questionMetadata[questionKey];
    const attribute = metadata.attribute;
    const isArray = metadata.isArray;

    const valueGroups = {};

    currentProducts.forEach(product => {
        const value = product[attribute];
        if (isArray) {
            value.forEach(v => {
                valueGroups[v] = (valueGroups[v] || 0) + 1;
            });
        } else {
            const key = String(value);
            valueGroups[key] = (valueGroups[key] || 0) + 1;
        }
    });

    const groups = Object.values(valueGroups);
    const total = currentProducts.length;

    let entropy = 0;
    groups.forEach(count => {
        const proportion = count / total;
        if (proportion > 0) {
            entropy -= proportion * Math.log2(proportion);
        }
    });

    return entropy;
}

function getNextQuestion(selections, currentProducts) {
    const unansweredQuestions = Object.keys(questionMetadata).filter(
        key => !selections[key]
    );

    if (unansweredQuestions.length === 0) return null;

    let bestQuestion = null;
    let maxPower = 0;

    unansweredQuestions.forEach(question => {
        const power = calculateDiscriminatingPower(question, currentProducts);
        if (power > maxPower) {
            maxPower = power;
            bestQuestion = question;
        }
    });

    // If max power is very low (< 0.01), no question provides value
    if (maxPower < 0.01) return null;

    return bestQuestion;
}

function shouldShowResults(selections, currentProducts) {
    // Show results if 0 or 1 products remain
    if (currentProducts.length <= 1) return true;

    // Show results if all questions answered
    const totalQuestions = Object.keys(questionMetadata).length;
    const answeredQuestions = Object.keys(selections).filter(key => selections[key]).length;
    if (answeredQuestions >= totalQuestions) return true;

    // Show results if no more questions provide discriminating power
    const nextQuestion = getNextQuestion(selections, currentProducts);
    if (!nextQuestion) return true;

    return false;
}
