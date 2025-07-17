document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const extractButton = document.getElementById('extractButton');
  const copyButton = document.getElementById('copyButton');
  const saveTxtButton = document.getElementById('saveTxtButton');
  const saveCsvButton = document.getElementById('saveCsvButton');
  const saveJsonButton = document.getElementById('saveJsonButton');
  const clearButton = document.getElementById('clearButton');
  const emailListDiv = document.getElementById('emailList');
  const totalEmailsSpan = document.getElementById('totalEmails');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const visibleOnlyCheckbox = document.getElementById('visibleOnlyCheckbox');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const searchBox = document.getElementById('searchBox');
  const domainFilter = document.getElementById('domainFilter');
  const toastContainer = document.getElementById('toastContainer');
  const darkModeToggle = document.getElementById('darkModeToggle');

  let allEmails = [];

  // --- Core Functions ---

  /**
   * Injects the content script to extract emails from the current tab.
   */
  const extractEmailsFromTab = async () => {
    setLoading(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Ensure the tab is ready and not a chrome:// or other restricted page
      if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
        showToast('Cannot extract emails from this page.', 'error');
        setLoading(false);
        return;
      }

      const visibleOnly = visibleOnlyCheckbox.checked;      

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scripts/content.js'],
        function: extractEmails, // Assuming this function exists in content.js
        args: [visibleOnly]
      });

      //  The result is an array of injection results. We expect one result from our one injection.
      if (results && results[0] && results[0].result) {
        allEmails = results[0].result;
        renderEmails(allEmails);
      } else {
        allEmails = [];
        renderEmails([]);
        showToast('No emails found on the page.');
      }
    } catch (error) {
      console.error('Email extraction failed:', error);
      showToast(`Error: ${error.message}`, 'error');
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
      emailListDiv.innerHTML = '<div class="no-emails">No emails to display.</div>';
    } else {
      emails.forEach((email, index) => {
        const emailItem = document.createElement('div');
        emailItem.className = 'email-item';
        emailItem.innerHTML = `
          <input type="checkbox" id="email-${index}" value="${email}" class="email-checkbox">
          <label for="email-${index}">${email}</label>
        `;
        emailListDiv.appendChild(emailItem);
      });
    }
    totalEmailsSpan.textContent = `Total Emails: ${emails.length}`;
    selectAllCheckbox.checked = false;
  };

  /**
   * Filters and re-renders the email list based on search and domain inputs.
   */
  const applyFilters = () => {
    const searchTerm = searchBox.value.toLowerCase();
    const domainTerm = domainFilter.value.toLowerCase();

    const filteredEmails = allEmails.filter(email => {
      const emailLower = email.toLowerCase();
      const matchesSearch = emailLower.includes(searchTerm);
      const matchesDomain = domainTerm ? emailLower.endsWith(`@${domainTerm}`) || emailLower.split('@')[1].includes(domainTerm) : true;
      return matchesSearch && matchesDomain;
    });

    renderEmails(filteredEmails);
  };

  // --- UI & Helper Functions ---

  const getSelectedEmails = () => {
    return Array.from(document.querySelectorAll('.email-checkbox:checked')).map(cb => cb.value);
  };

  const setLoading = (isLoading) => {
    loadingSpinner.classList.toggle('hidden', !isLoading);
    extractButton.disabled = isLoading;
  };

  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
      }, 3000);
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

  clearButton.addEventListener('click', () => {
    allEmails = [];
    renderEmails([]);
    searchBox.value = '';
    domainFilter.value = '';
    showToast('List cleared.');
  });

  copyButton.addEventListener('click', () => {
    const selectedEmails = getSelectedEmails();
    if (selectedEmails.length === 0) {
      showToast('No emails selected to copy.', 'error');
      return;
    }
    navigator.clipboard.writeText(selectedEmails.join('\n')).then(() => {
      showToast(`Copied ${selectedEmails.length} emails to clipboard.`);
    }).catch(err => {
      showToast('Failed to copy emails.', 'error');
      console.error('Clipboard error:', err);
    });
  });

  saveTxtButton.addEventListener('click', () => {
    const selectedEmails = getSelectedEmails();
    if (selectedEmails.length === 0) {
      showToast('No emails selected to save.', 'error');
      return;
    }
    downloadFile(selectedEmails.join('\r\n'), 'emails.txt', 'text/plain');
  });

  saveCsvButton.addEventListener('click', () => {
    const selectedEmails = getSelectedEmails();
    if (selectedEmails.length === 0) {
      showToast('No emails selected to save.', 'error');
      return;
    }
    const csvContent = 'Email\r\n' + selectedEmails.join('\r\n');
    downloadFile(csvContent, 'emails.csv', 'text/csv');
  });

  saveJsonButton.addEventListener('click', () => {
    const selectedEmails = getSelectedEmails();
    if (selectedEmails.length === 0) {
      showToast('No emails selected to save.', 'error');
      return;
    }
    downloadFile(JSON.stringify(selectedEmails, null, 2), 'emails.json', 'application/json');
  });

  selectAllCheckbox.addEventListener('change', (e) => {
    document.querySelectorAll('.email-checkbox').forEach(checkbox => {
      checkbox.checked = e.target.checked;
    });
  });

  searchBox.addEventListener('input', applyFilters);
  domainFilter.addEventListener('input', applyFilters);

  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    // You can use chrome.storage.local to save the theme preference
    chrome.storage.local.set({ darkMode: isDarkMode });
    darkModeToggle.innerHTML = isDarkMode ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  });

  // --- Initialization ---

  // Load dark mode preference on startup
  chrome.storage.local.get('darkMode', (data) => {
    if (data.darkMode) {
      document.body.classList.add('dark-mode');
      darkModeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
  });

  // Automatically run extraction when the popup is opened.
  extractEmailsFromTab();
});