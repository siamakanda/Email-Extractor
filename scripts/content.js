// Email regex (Unicode, strict domain)
const EMAIL_REGEX = /[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,}/gu;

/**
 * Extracts unique emails from the page.
 * @param {boolean} visibleOnly - If true, only visible text nodes are scanned.
 * @returns {string[]} Array of unique emails.
 */
function extractEmailsFromPage(visibleOnly = true) {
  const emails = [];
  if (visibleOnly) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        const style = window.getComputedStyle(node.parentElement);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          node.parentElement.tagName.match(/^(SCRIPT|STYLE|NOSCRIPT|HEAD|TITLE)$/i)
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      let matches;
      const text = node.textContent;
      while ((matches = EMAIL_REGEX.exec(text)) !== null) {
        emails.push(matches[0]);
      }
    }
  } else {
    const textNodes = document.evaluate('//text()[normalize-space(.) != ""]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < textNodes.snapshotLength; i++) {
      const textNode = textNodes.snapshotItem(i);
      let matches;
      const text = textNode.textContent;
      while ((matches = EMAIL_REGEX.exec(text)) !== null) {
        emails.push(matches[0]);
      }
    }
  }
  return Array.from(new Set(emails));
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'extractEmails') {
    const emails = extractEmailsFromPage(request.visibleOnly !== false);
    sendResponse({ emails });
  }
});

// Automatically extract emails when the page loads (default: visible only)
const emailsOnLoad = extractEmailsFromPage(true);
chrome.runtime.sendMessage({ action: 'emailsOnLoad', emails: emailsOnLoad });

// For maintainability, consider adding tests (e.g., Jest for JS) and type checking (e.g., JSDoc or TypeScript) in future versions.
