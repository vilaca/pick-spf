# 🌞 Always Use (alwaysuse.com)

Find your perfect sunscreen based on your skin type, preferences, and needs. A free, open-source tool to help you make informed decisions about sun protection.

## Features

- **Smart Filtering**: Answer a few questions to find sunscreens that match your criteria
- **Dual Mode Interface**:
  - Wizard mode: One question at a time for guided experience
  - View All mode: See all questions at once for quick selection
- **Social Sharing**: Share your recommended sunscreens with friends
- **Accessibility First**: WCAG 2.1 AA compliant with keyboard navigation and ARIA support
- **Fast & Free**: Static site hosted on Cloudflare Pages, no backend required
- **Easy to Contribute**: Product database stored in simple YAML format

## Live Demo

[Coming soon - will be deployed on Cloudflare Pages]

## Local Development

### Quick Start

1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/alwaysuse.git
   cd alwaysuse
   ```

2. Open `index.html` in your browser:
   ```bash
   open index.html  # macOS
   # or
   start index.html # Windows
   # or just double-click the file
   ```

That's it! No build process, no npm install, just open and use.

### Using a Local Server (Optional)

For better development experience with YAML loading:

```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if you have npx)
npx serve
```

Then visit `http://localhost:8000`

## How to Add or Edit Sunscreen Products

All sunscreen products are stored in `data/sunscreens.yaml`. This file is easy to edit - no programming knowledge required!

### Product Schema

Each sunscreen has these fields:

```yaml
- id: 1                          # Unique number (increment for each new product)
  name: "Product Name"           # Full product name
  brand: "Brand Name"            # Manufacturer/brand
  spf: 50                        # SPF number (15, 30, 50, 100, etc.)
  isFragranceFree: true          # true or false
  skinTypes:                     # List of compatible skin types
    - oily                       # Options: oily, dry, combination, sensitive, all
    - combination
  forKids: false                 # true or false (is this specifically for children?)
  formFactors:                   # How the sunscreen is applied
    - cream                      # Options: cream, lotion, spray, stick, gel
    - lotion
  waterResistant: true           # true or false
  price: "$"                     # Price range: $, $$, or $$$
  url: https://example.com       # Optional: Link to product page or purchase
```

### Adding a New Product

1. Open `data/sunscreens.yaml` in any text editor
2. Copy this template:
   ```yaml
   - id: 999
     name: "Your Product Name"
     brand: "Brand Name"
     spf: 50
     isFragranceFree: true
     skinTypes:
       - oily
       - sensitive
     forKids: false
     formFactors:
       - cream
     waterResistant: true
     price: "$$"
     url: https://example.com/product
   ```
3. Update the `id` to be one more than the last product
4. Fill in all the fields with accurate information
5. **Important**: Keep the indentation correct (use 2 spaces, not tabs)
6. Save the file

### Validating Your YAML

Before submitting, validate your YAML syntax:
- Online: [YAML Lint](http://www.yamllint.com/)
- VS Code: Install "YAML" extension by Red Hat

## Contributing

We welcome contributions! Here's how:

### Adding Products

1. Fork this repository
2. Edit `data/sunscreens.yaml` (see instructions above)
3. Test locally by opening `index.html`
4. Create a Pull Request with:
   - Product name in the PR title
   - Brief description of why you're adding it
   - Confirmation that information is accurate

### Reporting Issues

Found a bug or have a suggestion? [Open an issue](https://github.com/YOUR_USERNAME/alwaysuse/issues)

### Code Contributions

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly (see Testing section below)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Deployment

This site is deployed on **Cloudflare Pages** (free tier).

### Deploy Your Own Copy

1. Fork this repository
2. Sign up for [Cloudflare Pages](https://pages.cloudflare.com/)
3. Connect your GitHub account
4. Select your forked repository
5. Configure:
   - **Framework preset**: None
   - **Build command**: (leave empty)
   - **Build output directory**: `/`
6. Click "Save and Deploy"

Your site will be live at `https://your-project-name.pages.dev` in under a minute!

### Custom Domain

In Cloudflare Pages dashboard:
1. Go to your project
2. Click "Custom domains"
3. Add your domain
4. Update DNS as instructed

## Testing

### Functional Testing
- [ ] Complete the quiz and verify correct sunscreens appear
- [ ] Test with very restrictive criteria (should handle "no results")
- [ ] Toggle between wizard and view-all modes
- [ ] Test reset functionality
- [ ] Test all share buttons (WhatsApp, Facebook, Twitter, Copy Link)
- [ ] Share a link and open it in new tab (should pre-populate selections)

### Accessibility Testing
- [ ] Tab through all interactive elements
- [ ] Verify visible focus indicators
- [ ] Test with keyboard only (no mouse)
- [ ] Run Lighthouse accessibility audit (target: 100)
- [ ] Test with 200% zoom
- [ ] Test in high contrast mode

### SEO Testing
- [ ] Run Lighthouse SEO audit (target: 100)
- [ ] Validate structured data with [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] Test social previews:
  - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug)
  - [Twitter Card Validator](https://cards-dev.twitter.com/validator)

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Data**: YAML file (parsed client-side with js-yaml)
- **Hosting**: Cloudflare Pages
- **Dependencies**: js-yaml (loaded from CDN)

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with accessibility in mind
- Inspired by the need for better sunscreen discovery
- Community-driven product database

## Questions or Feedback?

Open an [issue](https://github.com/YOUR_USERNAME/alwaysuse/issues) or start a [discussion](https://github.com/YOUR_USERNAME/alwaysuse/discussions)!

---

Made with ☀️ for better sun protection
