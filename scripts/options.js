document.addEventListener('DOMContentLoaded', () => {
  const saveButton = document.getElementById('saveButton');
  const blacklistTextarea = document.getElementById('blacklist');
  const toastContainer = document.getElementById('toastContainer');

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