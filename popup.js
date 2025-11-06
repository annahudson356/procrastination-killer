document.getElementById('saveShift').addEventListener('click', () => {
  const shift = parseInt(document.getElementById('shiftDays').value);
  chrome.storage.local.set({ shiftDays: shift }, () => {
    console.log('Shift days saved:', shift);
  });
});
