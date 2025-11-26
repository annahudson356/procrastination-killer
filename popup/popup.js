document.addEventListener('DOMContentLoaded', () => {
  const offsetInput = document.getElementById('offsetDays');
  const forceCheckbox = document.getElementById('force1159');

  chrome.storage.sync.get({
    offsetDays: 1,
    force1159: true
  }, prefs => {
    offsetInput.value = prefs.offsetDays;
    forceCheckbox.checked = prefs.force1159;
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    let offsetVal = Number(offsetInput.value);
    if (isNaN(offsetVal) || offsetVal < 0) {
      offsetVal = 0;
      offsetInput.value = 0;
      alert("Negative numbers are not permitted and could cause late assignments!");
    }
    else{
        const newPrefs = {
        offsetDays: offsetVal,
        force1159: forceCheckbox.checked
        };

        chrome.storage.sync.set(newPrefs, () => {
        console.log('Settings saved:', newPrefs);
        });

        chrome.tabs.reload();
    }
  });
});
