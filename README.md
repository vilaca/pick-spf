# 🌞 PickSPF - Find Your Perfect Sunscreen

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://vilaca.github.io/pick-spf/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Security](https://img.shields.io/badge/security-hardened-green)](SECURITY.md)

Find your perfect sunscreen based on your skin type, preferences, and needs. A free, privacy-focused, open-source tool with intelligent question ordering and multi-language support.

**Live Site:** https://vilaca.github.io/pick-spf/

## ✨ Features

### 🧠 Smart Dynamic Questionnaire
- **Intelligent Question Ordering**: Uses entropy-based algorithm to ask the most discriminating questions first
- **Early Termination**: Stops asking questions when products are narrowed down or remaining questions provide no value
- **Two Modes**:
  - **Wizard Mode** (default): One question at a time with auto-advance
  - **View All Mode**: See all questions at once for quick answers

### 🌍 Multi-Language Support
Fully translated into 7 languages:
- 🇬🇧 English
- 🇵🇹 Portuguese (Portugal)
- 🇩🇪 German
- 🇫🇷 French
- 🇪🇸 Spanish
- 🇮🇹 Italian
- 🇵🇱 Polish

Language auto-detection based on browser settings with manual override.

### 🔒 Privacy-First
- **No cookies** - Zero tracking
- **No analytics** - Completely anonymous
- **No data collection** - Everything happens in your browser
- **Open source** - Verify the code yourself

### ♿ Accessibility
- **WCAG 2.1 AA compliant** - Fully accessible
- **Keyboard navigation** - Works without a mouse
- **Screen reader support** - ARIA labels throughout
- **High contrast mode** - Respects user preferences
- **Reduced motion** - Respects prefers-reduced-motion

### 🚀 Progressive Web App (PWA)
- **Installable** - Add to home screen on mobile/desktop
- **Full-screen mode** - App-like experience
- **Branded theme** - Matches your device chrome

### 🔗 Social Sharing
- Share results via WhatsApp, Facebook, Twitter, or link
- URL encodes selections for easy sharing
- Recipients see your criteria pre-selected

### ⚡ Performance
- **Fast load times** - ~200-300ms initial load
- **Locally hosted dependencies** - No external CDN calls
- **Preloaded resources** - Critical assets load in parallel
- **Optimized assets** - Minimal bundle size

### 🛡️ Security
- **XSS Protection** - All user data HTML-escaped
- **Content Security Policy** - Strict CSP headers
- **URL Sanitization** - Only http/https links allowed
- **Input Validation** - YAML structure validated on load
- See [SECURITY.md](SECURITY.md) for full details

## 🎯 How It Works

### Dynamic Question Algorithm

Instead of asking questions in a fixed order, the app uses information theory (entropy) to determine which question will best narrow down your options:

1. Calculate discriminating power for each unanswered question
2. Ask the question with highest entropy (best splits remaining products)
3. Automatically stop when:
   - Only 0-1 products remain
   - All questions answered
   - Remaining questions provide no filtering value

This means you might answer fewer questions than you expect - by design!

## 🚀 Quick Start

### View Live Site
Visit **https://vilaca.github.io/pick-spf/** - no installation needed!

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vilaca/pick-spf.git
   cd pick-spf
   ```

2. **Open in browser:**
   ```bash
   # Simply open index.html
   open index.html  # macOS
   start index.html # Windows
   # or double-click the file
   ```

   **That's it!** No build process, no npm install required.

3. **Optional: Run local server** (recommended for development):
   ```bash
   # Python 3
   python3 -m http.server 8000

   # Node.js
   npx serve

   # Then visit http://localhost:8000
   ```

### Running Tests

#### Browser Tests (Mocha + Chai)
```bash
open tests/index.html
```

#### Command Line Tests (Jest)
```bash
npm install
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

## 📝 Adding or Editing Sunscreen Products

All products are stored in **`data/sunscreens.yaml`** - easy to edit, no programming needed!

### Product Schema

```yaml
- id: 1                          # Unique number (increment for new products)
  name: "Product Name"           # Full product name
  brand: "Brand Name"            # Manufacturer/brand
  spf: 50                        # SPF number (15, 30, 50, 100, etc.)
  isFragranceFree: true          # true or false
  skinTypes:                     # List of compatible skin types
    - oily                       # Options: oily, dry, combination, sensitive, all
    - combination
  forKids: false                 # true or false
  formFactors:                   # How it's applied
    - cream                      # Options: cream, lotion, spray, stick, gel
    - lotion
  waterResistant: true           # true or false
  price: "$"                     # Price range: $, $$, or $$$
  availableIn:                   # Where it's sold
    - US                         # Options: US, EU, UK, Canada, Australia, Japan, Global
    - Canada
  url: https://example.com       # Optional: Link to product page
```

### Adding a New Product

1. Open `data/sunscreens.yaml`
2. Copy the template above
3. Update `id` to be one more than the last product
4. Fill in all required fields accurately
5. **Important**: Keep indentation correct (2 spaces, not tabs)
6. Validate your YAML: [YAML Lint](http://www.yamllint.com/)
7. Test locally by opening `index.html`
8. Submit a Pull Request

### Data Validation

The app validates all product data on load:
- Required fields present
- Correct data types (strings, numbers, booleans, arrays)
- Valid ranges (SPF 0-100)
- Non-empty arrays
- Valid URLs (if provided)

Invalid data will show an error message with details.

## 🤝 Contributing

We welcome contributions! Here's how to help:

### Adding Products

1. Fork this repository
2. Edit `data/sunscreens.yaml` (see instructions above)
3. Test locally: `open index.html`
4. Create a Pull Request with:
   - Product name in PR title
   - Why you're adding it
   - Confirmation information is accurate

### Reporting Issues

Found a bug or have a suggestion? [Open an issue](https://github.com/vilaca/pick-spf/issues)

### Code Contributions

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Security Issues

Found a vulnerability? Please **do not** open a public issue.

See [SECURITY.md](SECURITY.md) for our security policy and vulnerability reporting process.

## 🌐 Deployment

This site is deployed on **GitHub Pages** (free tier).

### Deploy Your Own Copy

1. Fork this repository
2. Go to Settings → Pages
3. Source: Deploy from branch `master` (or `main`)
4. Save

Your site will be live at `https://your-username.github.io/pick-spf/` in 1-5 minutes!

### Custom Domain

In repository Settings → Pages:
1. Add your custom domain
2. Update DNS records as instructed
3. Enable HTTPS (recommended)

## 🧪 Testing

### Functional Tests
- Complete quiz with various combinations
- Test "no results" scenario (very restrictive criteria)
- Toggle between wizard and view-all modes
- Test reset functionality
- Test all share buttons
- Open shared link in new tab (should pre-populate)

### Accessibility Tests
- Tab through all interactive elements
- Verify focus indicators visible
- Test keyboard-only navigation
- Run Lighthouse accessibility audit (target: 100)
- Test at 200% zoom
- Test in high contrast mode

### Security Tests
- Try XSS payloads in URL parameters (should be rejected)
- Try malicious URLs in YAML (should be sanitized)
- Verify CSP headers in DevTools
- Check for inline event handlers (should be none)

### Performance Tests
- Run Lighthouse performance audit
- Check Network tab for resource loading
- Verify preload tags working
- Test on slow 3G connection

## 🛠️ Tech Stack

### Core
- **HTML5** - Semantic, accessible markup
- **CSS3** - Modern layout with custom properties
- **Vanilla JavaScript** - No frameworks, ES6+
- **YAML** - Data storage (parsed with js-yaml)

### Libraries
- **js-yaml** (v4.1.0) - YAML parser (hosted locally)

### Hosting
- **GitHub Pages** - Free static site hosting
- **Git** - Version control

### Development
- **Mocha + Chai** - Browser-based unit tests
- **Jest** - Command-line unit tests (optional)

### Dependencies
Zero runtime external dependencies! js-yaml is hosted locally for:
- Better privacy (no external requests)
- Faster loading (no DNS lookup)
- More reliable (no CDN dependency)
- Works offline

## 📊 Browser Support

| Browser | Version |
|---------|---------|
| Chrome/Edge | Latest 2 |
| Firefox | Latest 2 |
| Safari | Latest 2 |
| iOS Safari | Latest 2 |
| Chrome Mobile | Latest 2 |

Modern JavaScript features used:
- ES6+ syntax (arrow functions, template literals)
- Fetch API
- URLSearchParams
- Intl.DateTimeFormat
- CSS custom properties
- CSS Grid/Flexbox

## 📦 Project Structure

```
pick-spf/
├── index.html              # Main HTML file
├── script.js               # Application logic
├── styles.css              # Styling
├── manifest.json           # PWA configuration
├── robots.txt              # SEO: Search engine rules
├── sitemap.xml             # SEO: Sitemap
├── LICENSE                 # MIT License
├── SECURITY.md             # Security policy
├── data/
│   └── sunscreens.yaml     # Product database
├── translations/
│   ├── en.json             # English
│   ├── pt-PT.json          # Portuguese
│   ├── de.json             # German
│   ├── fr.json             # French
│   ├── es.json             # Spanish
│   ├── it.json             # Italian
│   └── pl.json             # Polish
├── lib/
│   └── js-yaml.min.js      # YAML parser (local)
├── images/
│   ├── favicon.svg         # Site icon
│   └── og-image.png        # Social sharing image
└── tests/
    ├── index.html          # Test runner (browser)
    ├── script.test.js      # Test suite
    └── README.md           # Testing docs
```

## 🎨 Customization

### Changing Colors
Edit CSS custom properties in `styles.css`:
```css
:root {
    --color-primary: #FF6B35;     /* Main brand color */
    --color-secondary: #4ECDC4;   /* Accent color */
    --color-bg: #FFFFFF;          /* Background */
}
```

### Adding Languages
1. Create `translations/your-lang.json` (copy `en.json` as template)
2. Translate all strings
3. Update `availableLanguages` in `script.js`:
   ```javascript
   const availableLanguages = {
       'en': 'English',
       'your-lang': 'Your Language',
   };
   ```
4. Add language selector option in `index.html`

## 🏆 Performance Metrics

Target Lighthouse scores:
- **Performance**: 90+
- **Accessibility**: 100
- **Best Practices**: 100
- **SEO**: 100

Typical load times (measured on 4G):
- First Contentful Paint: ~200ms
- Time to Interactive: ~300ms
- Total Bundle Size: ~80KB (including js-yaml)

## 📜 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) for details.

### What this means:
✅ Commercial use allowed
✅ Modification allowed
✅ Distribution allowed
✅ Private use allowed
❌ No warranty provided
❌ No liability

## 🙏 Acknowledgments

- Built with accessibility and privacy as top priorities
- Inspired by the need for better sunscreen discovery tools
- Community-driven product database
- Thanks to all contributors!

## 💬 Questions or Feedback?

- **Issues**: [github.com/vilaca/pick-spf/issues](https://github.com/vilaca/pick-spf/issues)
- **Security**: See [SECURITY.md](SECURITY.md)

---

**Made with ☀️ and care for your skin**

*Always use sunscreen, even on cloudy days!*
