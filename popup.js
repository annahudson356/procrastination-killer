// Load saved shift on popup open
chrome.storage.local.get('shiftDays', ({ shiftDays }) => {
    document.getElementById('shiftDays').value = shiftDays || 0;
});

document.getElementById('saveShift').addEventListener('click', () => {
    const shift = parseInt(document.getElementById('shiftDays').value);
    chrome.storage.local.set({ shiftDays: shift }, () => {
        alert(`Due dates will be shifted by ${shift} day(s)!`);
    });
});
