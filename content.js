function shiftCanvasDates() {
  chrome.storage.local.get('shiftDays', ({ shiftDays }) => {
    if (!shiftDays) shiftDays = 0;

    // Find all elements that contain due dates
    const dateElements = document.querySelectorAll('.assignment-due, .ic-DueDate'); // example classes

    dateElements.forEach(el => {
      const originalText = el.textContent;
      const dateMatch = originalText.match(/\w+ \d{1,2}, \d{4}/); // e.g., "Nov 5, 2025"
      if (dateMatch) {
        const originalDate = new Date(dateMatch[0]);
        const newDate = new Date(originalDate);
        newDate.setDate(originalDate.getDate() + shiftDays);

        // Replace the text with the shifted date
        el.textContent = originalText.replace(dateMatch[0], newDate.toDateString());
      }
    });
  });
}

// Run when the page loads
window.addEventListener('load', shiftCanvasDates);
