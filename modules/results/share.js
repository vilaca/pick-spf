// ===================================
// Share Functionality
// ===================================

import { generateShareURL } from './display.js';

let appState;
let appConfig;
let elements;
let t;
let announceToScreenReader;

/**
 * Initialize share module with dependencies
 */
export function initShare(deps) {
    appState = deps.appState;
    appConfig = deps.appConfig;
    elements = deps.elements;
    t = deps.t;
    announceToScreenReader = deps.announceToScreenReader;
}

/**
 * Generate share message based on selections
 */
function generateShareMessage() {
    const criteria = [];

    // Add skin type
    if (appState.selections.skinType && appState.selections.skinType !== 'all') {
        criteria.push(`${appState.selections.skinType} skin`);
    }

    // Add fragrance-free
    if (appState.selections.fragranceFree === 'true') {
        criteria.push('fragrance-free');
    }

    // Add kids
    if (appState.selections.forKids === 'true') {
        criteria.push('kids');
    }

    // Add form factor
    if (appState.selections.formFactor && appState.selections.formFactor !== 'any') {
        criteria.push(appState.selections.formFactor);
    }

    // Add water resistant
    if (appState.selections.waterResistant === 'true') {
        criteria.push('water-resistant');
    }

    const count = appState.filteredResults.length;

    if (criteria.length > 0) {
        const criteriaText = criteria.join(', ');
        return `I found ${count} sunscreen${count !== 1 ? 's' : ''} tailored for my ${criteriaText} needs! 🌞`;
    } else {
        return `I found ${count} perfect sunscreen${count !== 1 ? 's' : ''}! 🌞`;
    }
}

/**
 * Share via WhatsApp
 */
export function shareWhatsApp() {
    const message = generateShareMessage();
    const url = generateShareURL();

    // Add extra line break and make sure URL is clean for WhatsApp to detect
    const fullText = `${message}\n\nCheck it out: ${url}`;

    // Mobile: try WhatsApp app, Desktop: web.whatsapp.com
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const whatsappURL = isMobile
        ? `whatsapp://send?text=${encodeURIComponent(fullText)}`
        : `https://web.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;

    window.open(whatsappURL, '_blank');
}

/**
 * Share via Facebook
 */
export function shareFacebook() {
    const url = generateShareURL();
    const facebookURL = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookURL, '_blank', `width=${appConfig.sharePopup.width},height=${appConfig.sharePopup.height}`);
}

/**
 * Share via Twitter
 */
export function shareTwitter() {
    const message = generateShareMessage();
    const url = generateShareURL();
    const twitterURL = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`;
    window.open(twitterURL, '_blank', `width=${appConfig.sharePopup.width},height=${appConfig.sharePopup.height}`);
}

/**
 * Copy link to clipboard
 */
export async function copyLink() {
    const url = generateShareURL();

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url);
            showCopyConfirmation(t('share.copyConfirmation'));
        } else {
            // Fallback for browsers without clipboard API
            fallbackCopyToClipboard(url);
            showCopyConfirmation(t('share.copyConfirmation'));
        }
    } catch (error) {
        console.error('Copy failed:', error);
        showCopyConfirmation(t('share.copyFailed'));
    }
}

/**
 * Fallback copy to clipboard for older browsers
 */
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
    } catch (error) {
        console.error('Fallback copy failed:', error);
    }

    document.body.removeChild(textArea);
}

/**
 * Show copy confirmation message
 */
function showCopyConfirmation(message) {
    elements.copyConfirmation.textContent = message;
    announceToScreenReader(message);

    setTimeout(() => {
        elements.copyConfirmation.textContent = '';
    }, 3000);
}
