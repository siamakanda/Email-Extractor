document.addEventListener('DOMContentLoaded', () => {
  const saveButton = document.getElementById('saveButton');
  const blacklistTextarea = document.getElementById('blacklist');
  const toastContainer = document.getElementById('toastContainer');

  // Simple toast function for feedback
  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
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

  // Load saved settings
  const loadSettings = () => {
    chrome.storage.local.get(['customBlacklist'], (result) => {
      if (chrome.runtime.lastError) return console.error('Error loading settings:', chrome.runtime.lastError);
      if (result.customBlacklist && Array.isArray(result.customBlacklist)) {
        blacklistTextarea.value = result.customBlacklist.join('\n');
      }
    });
  };

  // Save settings
  const saveSettings = () => {
    const blacklist = blacklistTextarea.value.split('\n').map(line => line.trim()).filter(line => line);
    chrome.storage.local.set({ customBlacklist: blacklist }, () => {
      if (chrome.runtime.lastError) return showToast('Error saving settings.', 'error');
      showToast('Settings saved successfully!', 'success');
    });
  };

  saveButton.addEventListener('click', saveSettings);
  loadSettings();
});