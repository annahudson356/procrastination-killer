function shiftCanvasDates() {
    chrome.storage.local.get('shiftDays', ({ shiftDays }) => {
        if (!shiftDays) shiftDays = 0;

        const dateElements = document.querySelectorAll('.assignment-due, .ic-DueDate'); // update classes

        dateElements.forEach(el => {
            const text = el.textContent;
            const match = text.match(/\w+ \d{1,2}, \d{4}/); // e.g., "Nov 5, 2025"
            if (match) {
                const originalDate = new Date(match[0]);
                const newDate = new Date(originalDate);
                newDate.setDate(originalDate.getDate() + shiftDays);
                el.textContent = text.replace(match[0], newDate.toDateString());
            }
        });
    });
}

// Observe dynamic changes on the page
const observer = new MutationObserver(shiftCanvasDates);
observer.observe(document.body, { childList: true, subtree: true });

// Initial run
shiftCanvasDates();
