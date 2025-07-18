// Email regex (Unicode, strict domain)
const EMAIL_REGEX = /[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,}/gu;

/**
 * List of patterns or domains to ignore (false positives, common non-user emails)
 */
const EMAIL_BLACKLIST = [
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
function isBlacklisted(email) {
  return EMAIL_BLACKLIST.some(pattern => pattern.test(email));
}

/**
 * Extracts unique, non-blacklisted emails from the page.
 * @param {boolean} visibleOnly - If true, only visible text nodes are scanned.
 * @param {RegExp} [customRegex] - Optional custom regex for extraction.
 * @returns {string[]} Array of unique emails (lowercased).
 */
function extractEmailsFromPage(visibleOnly = true, customRegex) {
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
      let matches;
      const text = node.textContent;
      while ((matches = regex.exec(text)) !== null) {
        emails.push(matches[0].toLowerCase());
      }
    }
  } else {
    // More efficient: get all elements and filter for text content
    const allElements = document.querySelectorAll('*'); 
    for (const element of allElements) {
      if (element.children.length === 0) { // Only process elements with no children (text nodes)
        const text = element.textContent;
        let matches;
        while ((matches = regex.exec(text)) !== null) {
          emails.push(matches[0].toLowerCase());
        }
      }
    }
  }
    // Remove blacklisted and deduplicate
  return Array.from(new Set(emails.filter(e => !isBlacklisted(e))));
}

// The script is designed to be injected programmatically.
(function() {
  // The 'visibleOnly' argument will be passed from popup.js
  try {
    const extracted = extractEmailsFromPage(arguments[0] !== false);
    // Always return an object with either emails or an error
    return { emails: extracted && extracted.length > 0 ? extracted : [] };
  } catch (error) {
    // Return a structured error object
    return {
      __isError: true,
      message: error.message || "Unknown error during extraction",
      stack: error.stack,
    };
  }
}());
