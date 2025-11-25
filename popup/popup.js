// Load current settings when popup opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get({
    offsetDays: 1,
    force1159: true
  }, prefs => {
    document.getElementById('offsetDays').value = prefs.offsetDays;
    document.getElementById('force1159').checked = prefs.force1159;
  });
});

// Save settings and trigger content script
document.getElementById('saveBtn').addEventListener('click', () => {
  const offsetDays = parseInt(document.getElementById('offsetDays').value, 10);
  const force1159 = document.getElementById('force1159').checked;

  chrome.storage.sync.set({ offsetDays, force1159 }, () => {
    // Tell content script to refresh dates immediately
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "RUN_MAIN_FUNCTION" });
      }
    });
  });
});
