document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const extractButton = document.getElementById('extractButton');
  const copyButton = document.getElementById('copyButton');
  const saveTxtButton = document.getElementById('saveTxtButton');
  const saveCsvButton = document.getElementById('saveCsvButton');
  const saveJsonButton = document.getElementById('saveJsonButton');
  const clearButton = document.getElementById('clearButton');
  const emailListDiv = document.getElementById('emailList');
  const copyAllButton = document.getElementById('copyAllButton');
  const totalEmailsSpan = document.getElementById('totalEmails');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const visibleOnlyCheckbox = document.getElementById('visibleOnlyCheckbox');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const searchBox = document.getElementById('searchBox');
  const domainFilter = document.getElementById('domainFilter');
  const toastContainer = document.getElementById('toastContainer');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const selectionCount = document.getElementById('selectionCount');
  const clearFiltersButton = document.getElementById('clearFiltersButton');
  const optionsButton = document.getElementById('optionsButton');

  let allEmails = [];

  // --- Core Functions ---

  /**
   * Injects the content script to extract emails from the current tab.
  */
  const extractEmailsFromTab = async () => {
    setLoading(true);
    let tab; // Define tab outside the try/catch block for access in catch
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) {
            throw new Error("Could not find the active tab.");
        }
        tab = tabs[0];

        // Ensure the tab is ready and not a chrome:// or other restricted page
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
            showToast('Cannot extract emails from this page.', 'error');
            setLoading(false);
            return;
        }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scripts/content.js'],
      });

      if (!results || !results[0] || !results[0].result) {
        throw new Error('Failed to get a response from the content script.');
      }

      const result = results[0].result;

      if (result.__isError) {
          // It's an error from the content script
          throw new Error(result.message);
      }

      // Otherwise, it should be a success with an emails array (possibly empty)
      allEmails = result.emails;
      renderEmails(allEmails);

        if (allEmails.length > 0) {
            showToast(`Extracted ${allEmails.length} emails.`, 'success');
        } else {
            showToast('No emails found on the page.');
        }
    } catch (error) {
        console.error('Email extraction failed:', error);
        const debugInfo = {
            url: tab ? tab.url : 'N/A',
            version: chrome.runtime.getManifest().version,
            message: error.message,
            stack: error.stack,
      };
      showToast('An error occurred.', 'error', debugInfo);
      allEmails = [];
      renderEmails([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Renders the list of emails in the popup.
   * @param {string[]} emails - The array of emails to display.
   */
  const renderEmails = (emails) => {
    emailListDiv.innerHTML = '';
    if (emails.length === 0) {
      const searchTerm = searchBox.value.trim();
      const domainTerm = domainFilter.value.trim();
      if (searchTerm || domainTerm) {
        emailListDiv.innerHTML = '<div class="no-emails">No emails match your filter.</div>';
      } else {
        emailListDiv.innerHTML = '<div class="no-emails">No emails to display.</div>';
      }
    } else {
      emails.forEach((email, index) => {
        const emailItem = document.createElement('div');
        emailItem.className = 'email-item';
        emailItem.innerHTML = `
          <input type="checkbox" id="email-${index}" value="${email}" class="email-checkbox">
          <label for="email-${index}" class="email-label">${email}</label>
          <button class="copy-email-btn" title="Copy email"><i class="fa-regular fa-copy"></i></button>
        `;
        emailListDiv.appendChild(emailItem);
      });
    }
    totalEmailsSpan.textContent = `Total Emails: ${emails.length}`;
    updateUiStates();
  };

  /**
   * Filters and re-renders the email list based on search and domain inputs.
   */
  const applyFilters = () => {
    const searchTerm = searchBox.value.toLowerCase();
    const domainTerms = domainFilter.value.toLowerCase().split(',').map(d => d.trim()).filter(d => d);

    const filteredEmails = allEmails.filter(email => {
      const emailLower = email.toLowerCase();
      const matchesSearch = emailLower.includes(searchTerm);      

      // If no domain filters, it's a match.
      if (domainTerms.length === 0) return matchesSearch;

      const emailDomain = emailLower.split('@')[1];
      if (!emailDomain) return false; // Should not happen for valid emails

      // Check if the email's domain matches any of the filter terms.
      const matchesDomain = domainTerms.some(term => emailDomain.includes(term));
      return matchesSearch && matchesDomain;
    });

    renderEmails(filteredEmails);
  };

  // --- UI & Helper Functions ---

  /**
   * Updates the state of UI elements based on the current selection.
   * Disables/enables buttons, updates selection count, and manages "Select All" checkbox state.
   */
  const updateUiStates = () => {
    const selectedEmails = getSelectedEmails();
    const visibleCheckboxes = document.querySelectorAll('.email-checkbox');
    const visibleItems = document.querySelectorAll('.email-item');

    const hasSelection = selectedEmails.length > 0;
    const allVisibleSelected = visibleCheckboxes.length > 0 && selectedEmails.length === visibleCheckboxes.length;

    // Enable/disable action buttons
    copyButton.disabled = !hasSelection;
    saveTxtButton.disabled = !hasSelection;
    saveCsvButton.disabled = !hasSelection;
    saveJsonButton.disabled = !hasSelection;
    copyAllButton.disabled = visibleItems.length === 0;

    // Update selection count text
    if (visibleCheckboxes.length > 0) {
      selectionCount.textContent = ` (${selectedEmails.length}/${visibleCheckboxes.length})`;
    } else {
      selectionCount.textContent = '';
    }

    // Update "Select All" checkbox state
    selectAllCheckbox.checked = allVisibleSelected;
    selectAllCheckbox.indeterminate = hasSelection && !allVisibleSelected;
  };


  const getVisibleEmails = () => {
    return Array.from(document.querySelectorAll('.email-item label')).map(label => label.textContent);
  };

  const getSelectedEmails = () => {
    return Array.from(document.querySelectorAll('.email-checkbox:checked')).map(cb => cb.value);
  };

  const setLoading = (isLoading) => {
    loadingSpinner.classList.toggle('hidden', !isLoading);
    extractButton.disabled = isLoading;
  };

  const showToast = (message, type = 'info', debugInfo = null) => {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`; // Corrected class name

    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    toast.appendChild(messageSpan);

    if (type === 'error' && debugInfo) {
      const debugButton = document.createElement('button');
      debugButton.className = 'toast-debug-button';
      debugButton.textContent = 'Copy Debug Info';
      debugButton.onclick = (e) => {
        e.stopPropagation(); // Prevent the toast from hiding on click
        const formattedDebugInfo = `--- Email Extractor Debug Info ---\nVersion: ${debugInfo.version}\nURL: ${debugInfo.url}\nTimestamp: ${new Date().toISOString()}\nUser Agent: ${navigator.userAgent}\n\nError: ${debugInfo.message}\n\nStack:\n${debugInfo.stack}\n---------------------------------`;
        navigator.clipboard.writeText(formattedDebugInfo)
          .then(() => showToast('Debug info copied!', 'success'))
          .catch(err => showToast('Failed to copy debug info.', 'error'));
      };
      toast.appendChild(debugButton);
    }

    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.add('show');
      // Set timeout to animate out and remove
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500); // Remove from DOM after transition
      }, 4000); // Keep on screen for 4 seconds
    }, 100);
  };

  const downloadFile = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    chrome.downloads.download({
      url: URL.createObjectURL(blob),
      filename: filename
    });
  };

  // --- Event Listeners ---

  extractButton.addEventListener('click', extractEmailsFromTab);

  optionsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  clearFiltersButton.addEventListener('click', () => {
    searchBox.value = '';
    domainFilter.value = '';
    applyFilters();
    showToast('Filters cleared.');
  });

  clearButton.addEventListener('click', () => {
    allEmails = [];
    renderEmails([]);
    searchBox.value = '';
    domainFilter.value = '';
    updateUiStates();
    showToast('List cleared.');
  });

  copyButton.addEventListener('click', () => {
    const selectedEmails = getSelectedEmails();
    if (selectedEmails.length === 0) {
      showToast('No emails selected to copy.', 'error');
      return;
    }
    navigator.clipboard.writeText(selectedEmails.join('\n')).then(() => {
      showToast(`Copied ${selectedEmails.length} emails to clipboard.`, 'success');
    }).catch(err => {
      showToast('Failed to copy emails.', 'error');
      console.error('Clipboard error:', err);
    });
  });

  copyAllButton.addEventListener('click', () => {
    const visibleEmails = getVisibleEmails();
    if (visibleEmails.length === 0) {
      showToast('No emails to copy.', 'error');
      return;
    }
    navigator.clipboard.writeText(visibleEmails.join('\n')).then(() => {
      showToast(`Copied all ${visibleEmails.length} visible emails.`, 'success');
    }).catch(err => showToast('Failed to copy emails.', 'error'));
  });

  saveTxtButton.addEventListener('click', () => {
    const selectedEmails = getSelectedEmails();
    if (selectedEmails.length === 0) {
      showToast('No emails selected to save.', 'error');
      return;
    }
    downloadFile(selectedEmails.join('\r\n'), 'emails.txt', 'text/plain');
    showToast('Download started for emails.txt', 'success');
  });

  saveCsvButton.addEventListener('click', () => {
    const selectedEmails = getSelectedEmails();
    if (selectedEmails.length === 0) {
      showToast('No emails selected to save.', 'error');
      return;
    }
    const csvContent = 'Email\r\n' + selectedEmails.join('\r\n');
    downloadFile(csvContent, 'emails.csv', 'text/csv');
    showToast('Download started for emails.csv', 'success');
  });

  saveJsonButton.addEventListener('click', () => {
    const selectedEmails = getSelectedEmails();
    if (selectedEmails.length === 0) {
      showToast('No emails selected to save.', 'error');
      return;
    }
    downloadFile(JSON.stringify(selectedEmails, null, 2), 'emails.json', 'application/json');
    showToast('Download started for emails.json', 'success');
  });

  selectAllCheckbox.addEventListener('change', (e) => {
    document.querySelectorAll('.email-checkbox').forEach(checkbox => {
      checkbox.checked = e.target.checked;
    });
    updateUiStates();
  });

  // Use event delegation for checkbox changes inside the list for better performance
  emailListDiv.addEventListener('change', (e) => {
    if (e.target.classList.contains('email-checkbox')) {
      updateUiStates();
    }
  });

  emailListDiv.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-email-btn');
    if (copyBtn) {
      const emailItem = copyBtn.closest('.email-item');
      const email = emailItem.querySelector('.email-checkbox').value;
      navigator.clipboard.writeText(email).then(() => {
        showToast(`Copied: ${email}`, 'success');
      }).catch(err => {
        showToast('Failed to copy email.', 'error');
      });
    }
  });

  searchBox.addEventListener('input', () => {
    applyFilters();
    chrome.storage.local.set({ searchTerm: searchBox.value });
  });

  domainFilter.addEventListener('input', () => {
    applyFilters();
    chrome.storage.local.set({ domainTerm: domainFilter.value });
  });

  visibleOnlyCheckbox.addEventListener('change', () =>
    chrome.storage.local.set({ visibleOnly: visibleOnlyCheckbox.checked }));

  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    // You can use chrome.storage.local to save the theme preference
    chrome.storage.local.set({ darkMode: isDarkMode });
    darkModeToggle.innerHTML = isDarkMode ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  });

  // --- Initialization ---

  /**
   * Loads saved settings from storage and initializes the popup state.
   */
  const initializePopup = async () => {
    try {
      // Defensively check for the storage API.
      if (!chrome || !chrome.storage || !chrome.storage.local) {
        // This specific error helps diagnose if the API itself is missing.
        throw new Error("chrome.storage.local API is not available");
      }

      // Use the promise-based version of the API for cleaner async/await.
      const settings = await chrome.storage.local.get(['darkMode', 'visibleOnly', 'searchTerm', 'domainTerm']);

      if (settings.darkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
      }

      if (typeof settings.visibleOnly === 'boolean') {
        visibleOnlyCheckbox.checked = settings.visibleOnly;
      }

      searchBox.value = settings.searchTerm || '';
      domainFilter.value = settings.domainTerm || '';

    } catch (error) {
      // If storage API is not available or fails, log a warning and proceed with default UI settings.
      console.warn(`Could not load settings: ${error.message}. Using defaults.`);
    } finally {
      // Always run the extraction after attempting to load settings.
      extractEmailsFromTab();
    }
  };

  initializePopup();
});