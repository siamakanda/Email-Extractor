document.addEventListener('DOMContentLoaded', function() {
  var extractButton = document.getElementById('extractButton');
  var copyButton = document.getElementById('copyButton');
  var saveTxtButton = document.getElementById('saveTxtButton');
  var saveCsvButton = document.getElementById('saveCsvButton');
  var totalEmailsElement = document.getElementById('totalEmails');
  var emailListElement = document.getElementById('emailList');

  function updateEmails(emails) {
    var totalEmails = emails.length;

    totalEmailsElement.textContent = 'Total Emails: ' + totalEmails;

    if (totalEmails > 0) {
      emailListElement.textContent = emails.join('\n');
    } else {
      emailListElement.textContent = 'No emails found on this page.';
    }
  }

  function extractEmails() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var tab = tabs[0];
      chrome.tabs.sendMessage(tab.id, { action: 'extractEmails' }, function(response) {
        if (response && response.emails) {
          var emails = response.emails;
          updateEmails(emails);
        } else {
          emailListElement.textContent = 'Failed to extract emails.';
        }
      });
    });
  }

  extractButton.addEventListener('click', extractEmails);

  copyButton.addEventListener('click', function() {
    var emailList = emailListElement.textContent;
    copyToClipboard(emailList);
  });

  saveTxtButton.addEventListener('click', function() {
    var emailList = emailListElement.textContent;
    saveTextFile(emailList, 'extracted_emails.txt');
  });

  saveCsvButton.addEventListener('click', function() {
    var emailList = emailListElement.textContent;
    var csvContent = emailsToCsv(emailList);
    saveTextFile(csvContent, 'extracted_emails.csv');
  });

  function copyToClipboard(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('Emails copied to clipboard!');
  }

  function saveTextFile(content, filename) {
    var blob = new Blob([content], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });
  }

  function emailsToCsv(emails) {
    return emails.replace(/\n/g, ',');
  }

  // Update emails when the page loads
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'emailsOnLoad' && request.emails) {
      updateEmails(request.emails);
    }
  });

  // Automatically extract emails on extension popup load
  extractEmails();
});
