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
      try {
          const textNodes = document.evaluate('//text()[normalize-space(.) != ""]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          for (let i = 0; i < textNodes.snapshotLength; i++) {
              const textNode = textNodes.snapshotItem(i);
              let matches;
              const text = textNode.textContent;
              while ((matches = regex.exec(text)) !== null) {
                  emails.push(matches[0].toLowerCase());
              }
          }
      } catch (error) {
          console.error("Error in XPath evaluation:", error);
          return [];  // Or handle the error as appropriate for your application.
      }
  }
   // Remove blacklisted and deduplicate
  return Array.from(new Set(emails.filter(e => !isBlacklisted(e))));
}

// This script is designed to be injected programmatically.
// It immediately executes and returns the result.
(function() {
  // The 'visibleOnly' argument will be passed from popup.js
    // We default to true if no argument is passed.
  return extractEmailsFromPage(arguments[0] !== false);
})();
