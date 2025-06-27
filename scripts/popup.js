document.addEventListener('DOMContentLoaded', function() {
  var extractButton = document.getElementById('extractButton');
  var copyButton = document.getElementById('copyButton');
  var saveTxtButton = document.getElementById('saveTxtButton');
  var saveCsvButton = document.getElementById('saveCsvButton');
  var totalEmailsElement = document.getElementById('totalEmails');
  var emailListElement = document.getElementById('emailList');
  var visibleOnlyCheckbox = document.getElementById('visibleOnlyCheckbox');
  const searchBox = document.getElementById('searchBox');
  const domainFilter = document.getElementById('domainFilter');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const saveJsonButton = document.getElementById('saveJsonButton');
  const clearButton = document.getElementById('clearButton');

  let lastExtractedEmails = [];
  let filteredEmails = [];
  let selectedEmails = new Set();
  let darkMode = false;

  // User-facing strings for easy translation
  const UI_STRINGS = {
    totalEmails: 'Total Emails',
    noEmails: 'No emails found on this page.',
    failedExtract: 'Failed to extract emails.',
    copySuccess: 'Emails copied to clipboard!',
    copyFail: 'Clipboard copy failed.',
    clipboardDenied: 'Clipboard permission denied.',
    clipboardNotSupported: 'Clipboard copy not supported.',
    downloadDenied: 'Download permission denied.',
    downloadNotAvailable: 'Download API not available.',
    saveSuccess: 'Emails saved!',
    saveFail: 'Failed to save file.',
    extractVisibleOnly: 'Extract from visible text only',
    extractAll: 'Extract from all text nodes',
    extracting: 'Extracting emails...'
  };

  function renderEmailList(emails) {
    emailListElement.innerHTML = '';
    if (!emails.length) {
      emailListElement.textContent = UI_STRINGS.noEmails;
      return;
    }
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.padding = '0';
    emails.forEach(email => {
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.marginBottom = '4px';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selectedEmails.size === 0 || selectedEmails.has(email);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedEmails.add(email);
        else selectedEmails.delete(email);
      });
      li.appendChild(checkbox);
      const span = document.createElement('span');
      span.textContent = email;
      span.style.marginLeft = '8px';
      li.appendChild(span);
      ul.appendChild(li);
    });
    emailListElement.appendChild(ul);
  }

  function updateEmails(emails) {
    lastExtractedEmails = emails;
    filteredEmails = filterAndSearchEmails(emails);
    totalEmailsElement.textContent = UI_STRINGS.totalEmails + ': ' + filteredEmails.length;
    renderEmailList(filteredEmails);
  }

  function filterAndSearchEmails(emails) {
    let result = emails;
    const search = searchBox.value.trim().toLowerCase();
    const domain = domainFilter.value.trim().toLowerCase();
    if (search) {
      result = result.filter(e => e.toLowerCase().includes(search));
    }
    if (domain) {
      result = result.filter(e => e.toLowerCase().endsWith('@' + domain.replace(/^@/, '')));
    }
    return result;
  }

  function extractEmails() {
    totalEmailsElement.textContent = UI_STRINGS.extracting;
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var tab = tabs[0];
      chrome.tabs.sendMessage(tab.id, { action: 'extractEmails', visibleOnly: visibleOnlyCheckbox.checked }, function(response) {
        if (response && response.emails) {
          selectedEmails.clear();
          var emails = response.emails.filter(validateEmail);
          updateEmails(emails);
        } else {
          emailListElement.textContent = UI_STRINGS.failedExtract;
        }
      });
    });
  }

  function validateEmail(email) {
    // Basic RFC 5322 compliant regex for validation
    return /^[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,}$/u.test(email);
  }

  extractButton.addEventListener('click', extractEmails);
  visibleOnlyCheckbox.addEventListener('change', extractEmails);
  searchBox.addEventListener('input', () => updateEmails(lastExtractedEmails));
  domainFilter.addEventListener('input', () => updateEmails(lastExtractedEmails));
  clearButton.addEventListener('click', () => {
    lastExtractedEmails = [];
    filteredEmails = [];
    selectedEmails.clear();
    updateEmails([]);
  });
  darkModeToggle.addEventListener('click', () => {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
    const icon = darkModeToggle.querySelector('i');
    if (darkMode) {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
    } else {
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
    }
  });

  copyButton.addEventListener('click', function() {
    const emailsToCopy = filteredEmails.filter(e => selectedEmails.size === 0 || selectedEmails.has(e));
    if (!emailsToCopy.length) {
      showNotification('Nothing to copy.');
      return;
    }
    copyToClipboard(emailsToCopy.join('\n'));
  });

  saveTxtButton.addEventListener('click', function() {
    const emailsToSave = filteredEmails.filter(e => selectedEmails.size === 0 || selectedEmails.has(e));
    if (!emailsToSave.length) {
      showNotification('No emails to save.');
      return;
    }
    saveTextFile(emailsToSave.join('\n'), 'extracted_emails.txt');
  });

  saveCsvButton.addEventListener('click', function() {
    const emailsToSave = filteredEmails.filter(e => selectedEmails.size === 0 || selectedEmails.has(e));
    if (!emailsToSave.length) {
      showNotification('No emails to save.');
      return;
    }
    saveTextFile(emailsToSave.join(','), 'extracted_emails.csv');
  });

  saveJsonButton.addEventListener('click', function() {
    const emailsToSave = filteredEmails.filter(e => selectedEmails.size === 0 || selectedEmails.has(e));
    if (!emailsToSave.length) {
      showNotification('No emails to save.');
      return;
    }
    saveTextFile(JSON.stringify(emailsToSave, null, 2), 'extracted_emails.json');
  });

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function() {
        showNotification(UI_STRINGS.copySuccess);
      }).catch(function(err) {
        showNotification(UI_STRINGS.clipboardDenied);
      });
    } else {
      try {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        var successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (successful) {
          showNotification(UI_STRINGS.copySuccess);
        } else {
          showNotification(UI_STRINGS.copyFail);
        }
      } catch (e) {
        showNotification(UI_STRINGS.clipboardNotSupported);
      }
    }
  }

  function showNotification(message) {
    var notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.background = '#323232';
    notification.style.color = '#fff';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '9999';
    notification.style.fontSize = '14px';
    notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    document.body.appendChild(notification);
    setTimeout(function() {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 2000);
  }

  function saveTextFile(content, filename) {
    var blob = new Blob([content], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    if (chrome && chrome.downloads) {
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      }, function(downloadId) {
        if (chrome.runtime.lastError) {
          showNotification(UI_STRINGS.downloadDenied);
        } else {
          showNotification(UI_STRINGS.saveSuccess);
        }
      });
    } else {
      showNotification(UI_STRINGS.downloadNotAvailable);
    }
  }

  // Update emails when the page loads
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'emailsOnLoad' && request.emails) {
      selectedEmails.clear();
      updateEmails(request.emails);
    }
  });

  // Automatically extract emails on extension popup load
  extractEmails();

  // For maintainability, consider adding tests (e.g., Jest for JS) and type checking (e.g., JSDoc or TypeScript) in future versions.
});
