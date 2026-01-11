# Security Policy

## Security Measures Implemented

### 1. Cross-Site Scripting (XSS) Protection

#### HTML Escaping
All user-controlled data is HTML-escaped before rendering:
- Product names, brands, prices
- Form factors and skin types
- All content from YAML file

```javascript
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
```

#### URL Sanitization
External URLs are validated to only allow http/https protocols:
```javascript
function sanitizeURL(url) {
    // Only allows http: and https: protocols
    // Prevents javascript:, data:, and other dangerous schemes
}
```

### 2. Content Security Policy (CSP)

Strict CSP header prevents:
- Inline script execution (with exceptions for necessary inline scripts)
- Loading resources from unauthorized domains
- Clickjacking attacks (frame-ancestors 'none')
- Form submissions to external domains

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  connect-src 'self';
  frame-ancestors 'none';
">
```

### 3. Data Validation

#### YAML Structure Validation
Every sunscreen entry is validated for:
- Required fields (id, name, brand, spf, skinTypes, etc.)
- Correct data types (numbers, strings, booleans, arrays)
- Valid ranges (SPF 0-100)
- Array length (non-empty)

#### URL Parameter Validation
All URL parameters are validated against whitelists:
- `location`: Only valid regions (US, EU, UK, Canada, Australia, Japan, Global)
- `skin`: Only valid skin types (oily, dry, combination, sensitive, all)
- `fragrance`, `kids`, `water`: Only 'true', 'false', 'any'
- `form`: Only valid form factors (cream, lotion, spray, stick, gel, any)

Invalid parameters are rejected and logged.

### 4. Security Headers

Multiple security headers are set:
```html
<!-- Prevent MIME sniffing -->
<meta http-equiv="X-Content-Type-Options" content="nosniff">

<!-- Prevent clickjacking -->
<meta http-equiv="X-Frame-Options" content="DENY">

<!-- Control referrer information -->
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">

<!-- Disable unnecessary browser features -->
<meta http-equiv="Permissions-Policy" content="geolocation=(), microphone=(), camera=()">
```

### 5. Input Validation

All form inputs are:
- Type-validated (radio buttons with predefined values)
- Server-side equivalent validation in JavaScript
- No free-text inputs (reduces attack surface)

### 6. Error Handling

Graceful error handling prevents information leakage:
- Generic error messages shown to users
- Detailed errors only logged to console
- Failed operations don't expose internal structure

### 7. No External Dependencies (Runtime)

- js-yaml hosted locally (no CDN dependency)
- No analytics or tracking scripts
- No external fonts or resources
- Reduces supply chain attack surface

## Security Best Practices

### For Contributors

1. **Never commit sensitive data** (API keys, secrets, credentials)
2. **Validate all input** before processing
3. **Escape all output** that could contain user data
4. **Use parameterized queries** (if database ever added)
5. **Keep dependencies updated** (check js-yaml for vulnerabilities)

### For Data Editors

When editing `data/sunscreens.yaml`:
1. **Validate URLs** - Only add trusted, verified product URLs
2. **No special characters** - Avoid HTML/script tags in names
3. **Accurate data** - Ensure all information is correct
4. **Test locally** - Run validation before committing

## Reporting Security Issues

If you discover a security vulnerability:
1. **Do NOT** open a public GitHub issue
2. Email: [removed]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and provide updates on fixes.

## Security Considerations

### Current Limitations

1. **'unsafe-inline' in CSP**: Required for inline styles and scripts
   - Future: Move all inline scripts to external files
   - Future: Use nonces or hashes for inline content

2. **Client-side only**: No server-side validation
   - Not a major concern as it's a static informational site
   - No user accounts or sensitive operations

3. **No rate limiting**: Static site on GitHub Pages
   - GitHub Pages handles DDoS protection
   - No API to abuse

### Future Enhancements

- [ ] Remove 'unsafe-inline' from CSP
- [ ] Add Subresource Integrity (SRI) hashes
- [ ] Implement automated security testing (OWASP ZAP, etc.)
- [ ] Add security.txt file
- [ ] Regular dependency audits

## Compliance

This application follows:
- OWASP Top 10 security practices
- WCAG 2.1 AA accessibility standards
- Privacy by design principles (no tracking, no cookies)

## Last Updated

2026-01-11
