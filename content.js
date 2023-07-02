function extractEmailsFromPage() {
  var regex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  var emails = [];

  var textNodes = document.evaluate('//text()[normalize-space(.) != ""]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

  for (var i = 0; i < textNodes.snapshotLength; i++) {
    var textNode = textNodes.snapshotItem(i);
    var text = textNode.textContent;

    var matches = text.match(regex);
    if (matches) {
      for (var j = 0; j < matches.length; j++) {
        var email = matches[j];
        if (!emails.includes(email)) {
          emails.push(email);
        }
      }
    }
  }

  return emails;
}

function saveEmails(emails) {
  var timestamp = new Date().toISOString();
  var filename = 'autosave_emails_' + timestamp + '.txt';
  var content = emails.join('\n');

  var blob = new Blob([content], { type: 'text/plain' });
  var url = URL.createObjectURL(blob);

  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: false
  });
}

function updateEmailContainer(emails) {
  chrome.runtime.sendMessage({ action: 'updateEmailContainer', emails: emails });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'extractEmails') {
    var emails = extractEmailsFromPage();
    sendResponse({ emails: emails });
    updateEmailContainer(emails); // Update email container with new emails
  }
});

// Automatically extract emails when the page loads
var emailsOnLoad = extractEmailsFromPage();
chrome.runtime.sendMessage({ action: 'emailsOnLoad', emails: emailsOnLoad });
updateEmailContainer(emailsOnLoad); // Update email container with initial emails

// Periodically save emails with timestamps
var autosaveInterval = setInterval(function() {
  var emails = extractEmailsFromPage();
  saveEmails(emails);
  updateEmailContainer(emails); // Update email container with new emails
}, 60000); // Adjust the interval (in milliseconds) as needed
