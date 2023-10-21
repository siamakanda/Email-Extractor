function extractEmailsFromPage() {
  var regex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  var emails = [];

  var textNodes = document.evaluate('//text()[normalize-space(.) != ""]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

  for (var i = 0; i < textNodes.snapshotLength; i++) {
    var textNode = textNodes.snapshotItem(i);
    var text = textNode.textContent;

    while ((matches = regex.exec(text)) !== null) {
      emails.push(matches[0]);
    }
  }

  return emails;
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'extractEmails') {
    var emails = extractEmailsFromPage();
    sendResponse({ emails: emails });
  }
});

// Automatically extract emails when the page loads
var emailsOnLoad = extractEmailsFromPage();
chrome.runtime.sendMessage({ action: 'emailsOnLoad', emails: emailsOnLoad });
