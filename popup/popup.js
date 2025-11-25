document.addEventListener('DOMContentLoaded', () => {
  const offsetInput = document.getElementById('offsetDays');
  const forceCheckbox = document.getElementById('force1159');

  // Load current settings
  chrome.storage.sync.get({
    offsetDays: 1,
    force1159: true
  }, prefs => {
    offsetInput.value = prefs.offsetDays;
    forceCheckbox.checked = prefs.force1159;
  });

  // Save settings on change
  document.getElementById('saveBtn').addEventListener('click', () => {
    const newPrefs = {
      offsetDays: Number(offsetInput.value),
      force1159: forceCheckbox.checked
    };
    chrome.storage.sync.set(newPrefs, () => {
      console.log('Settings saved:', newPrefs);
    });
  });
});
