// Email regex (Unicode, strict domain)
const EMAIL_REGEX = /[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,}/gu;

/**
 * List of patterns or domains to ignore (false positives, common non-user emails)
 */
const DEFAULT_EMAIL_BLACKLIST = [
  /^noreply@/i, /@example\.com$/i, /@test\.com$/i, /@localhost$/i
];
/**
 * Checks if a text node is visible in the DOM, considering style, hidden, and aria-hidden attributes.
 * @param {Node} node
 * @returns {boolean}
 */
function isNodeVisible(node) {
  if (!node.parentElement) return false;
  let el = node.parentElement;
  while (el) {
    const style = window.getComputedStyle(el);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      el.hasAttribute('hidden') ||
      el.getAttribute('aria-hidden') === 'true'
    ) return false;
    el = el.parentElement;
  }
  return !node.parentElement.tagName.match(/^(SCRIPT|STYLE|NOSCRIPT|HEAD|TITLE)$/i);
}

/**
 * Checks if an email matches any blacklist pattern.
 * @param {string} email
 * @returns {boolean}
 */
function isBlacklisted(email, blacklist) {
  return blacklist.some(pattern => pattern.test(email));
}

/**
 * Extracts unique, non-blacklisted emails from the page.
 * @param {boolean} visibleOnly - If true, only visible text nodes are scanned.
 * @param {RegExp} [customRegex] - Optional custom regex for extraction.
 * @returns {string[]} Array of unique emails (lowercased).
 */
function extractEmailsFromPage(visibleOnly = true, customRegex, blacklist = []) {
  if (!document.body) {
    return [];
  }
  const emails = [];
  const regex = customRegex || EMAIL_REGEX;
  if (visibleOnly) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return isNodeVisible(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent;
      // Use matchAll to correctly handle the global regex across multiple text nodes without state issues.
      for (const match of text.matchAll(regex)) {
        emails.push(match[0].toLowerCase());
      }
    }
  } else {
    // Scan all rendered text content of the body, which is more efficient.
    const body = document.body;
    if (!body) return [];
    const text = body.innerText;
    // Use matchAll to correctly handle the global regex.
    for (const match of text.matchAll(regex)) {
      emails.push(match[0].toLowerCase());
    }
  }
    // Remove blacklisted and deduplicate
  return Array.from(new Set(emails.filter(e => !isBlacklisted(e, blacklist))));
}

// The script is designed to be injected programmatically.
// The last statement of an injected script is its return value.
// We use an async IIFE (Immediately Invoked Function Expression) which returns a promise.
// The scripting API will wait for this promise to resolve, and its resolved value will be the result of the script.
(async () => {
  try {
    // A crucial guard for pages that might not have a body yet (e.g., framesets, XML files).
    // This prevents the script from crashing on non-standard pages.
    if (!document.body) {
      return { emails: [] };
    }

    let settings = {};
    // Defensively check for the storage API. On some pages (e.g., with strict CSP) or
    // in some contexts, the chrome.storage API might not be available.
    if (chrome && chrome.storage && chrome.storage.local) {
      try {
        settings = await chrome.storage.local.get(['customBlacklist', 'visibleOnly']);
      } catch (e) {
        console.warn('Email Extractor: Could not access chrome.storage.local. Using default settings.', e);
      }
    }

    // Default to true if the setting is not found or is not a boolean.
    const visibleOnly = typeof settings.visibleOnly === 'boolean' ? settings.visibleOnly : true;

    let combinedBlacklist = [...DEFAULT_EMAIL_BLACKLIST];

    if (settings.customBlacklist && Array.isArray(settings.customBlacklist)) {
      const customPatterns = settings.customBlacklist.map(pattern => {
        try {
          return new RegExp(pattern, 'i');
        } catch (e) {
          console.warn(`Invalid regex in custom blacklist: ${pattern}`);
          return null;
        }
      }).filter(Boolean);
      combinedBlacklist = combinedBlacklist.concat(customPatterns);
    }
    const extracted = extractEmailsFromPage(visibleOnly, null, combinedBlacklist);
    return { emails: extracted && extracted.length > 0 ? extracted : [] };
  } catch (error) {
    return { __isError: true, message: error.message, stack: error.stack };
  }
})();
