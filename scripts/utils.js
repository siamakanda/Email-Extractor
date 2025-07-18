/**
 * Displays a toast notification.
 * @param {string} message - The message to display.
 * @param {string} [type='info'] - The type of toast ('info', 'success', 'error').
 * @param {object|null} [debugInfo=null] - Optional debug info for error toasts.
 */
function showToast(message, type = 'info', debugInfo = null) {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;

  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  toast.appendChild(messageSpan);

  if (type === 'error' && debugInfo) {
    const debugButton = document.createElement('button');
    debugButton.className = 'toast-debug-button';
    debugButton.textContent = 'Copy Debug Info';
    debugButton.onclick = (e) => {
      e.stopPropagation();
      const formattedDebugInfo = `--- Email Extractor Debug Info ---\nVersion: ${debugInfo.version}\nURL: ${debugInfo.url}\nTimestamp: ${new Date().toISOString()}\nUser Agent: ${navigator.userAgent}\n\nError: ${debugInfo.message}\n\nStack:\n${debugInfo.stack}\n---------------------------------`;
      navigator.clipboard.writeText(formattedDebugInfo).then(() => showToast('Debug info copied!', 'success')).catch(err => showToast('Failed to copy debug info.', 'error'));
    };
    toast.appendChild(debugButton);
  }

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }, 100);
}