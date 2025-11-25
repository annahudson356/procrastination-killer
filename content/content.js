(() => {
  const DEFAULT_OFFSET_DAYS = 1;
  const MARK_CLASS = 'pk-changed';

  function loadSettings() {
    return new Promise(resolve => {
      chrome.storage.sync.get({
        enabled: true,
        offsetDays: DEFAULT_OFFSET_DAYS,
        force1159: true
      }, prefs => resolve(prefs));
    });
  }

  function parseCanvasDateString(s) {
    if (!s || typeof s !== 'string') return null;
    s = s.trim();
    s = s.replace(/^\s*Due[:\s-]*/i, '').trim();

    let iso = Date.parse(s);
    if (!isNaN(iso)) return new Date(iso);

    let re = /([A-Za-z]{3,9}\s+\d{1,2}(?:,\s*\d{4})?)\s*(?:at\s*)?(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?)?/;
    let m = s.match(re);
    if (m) return new Date(Date.parse(`${m[1]} ${m[2] || ''}`));

    re = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?:\s+(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?))?/;
    m = s.match(re);
    if (m) return new Date(Date.parse(`${m[1]} ${m[2] || ''}`));

    return null;
  }

  function formatForDisplay(date) {
    const optsDate = { month: 'short', day: '2-digit' };
    const datePart = new Intl.DateTimeFormat(undefined, optsDate).format(date);
    const timePart = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `Due ${datePart} at ${timePart}`;
  }

  function computeTransformedDate(origDate, prefs) {
    if (!origDate) return null;
    let d = new Date(origDate.getTime());

    if (prefs.force1159) {
      if (!(d.getHours() === 23 && d.getMinutes() === 59)) {
        d.setDate(d.getDate() - 1);
        d.setHours(23, 59, 0, 0);
      }
    } else {
      d.setDate(d.getDate() - (typeof prefs.offsetDays === 'number' ? prefs.offsetDays : DEFAULT_OFFSET_DAYS));
    }
    return d;
  }

  function replaceDisplayText(el, originalText, newText) {
    if (!el || !originalText || !newText) return;
    if (!el.dataset.pkOriginal) el.dataset.pkOriginal = originalText;
    el.classList.add(MARK_CLASS);
    el.textContent = newText;
  }

  function findDateElements(root = document) {
    const candidates = [];
    const selectors = [
      'span.due_date',
      '.assignment-due',
      '[data-purpose="assignment-due"]',
      '.icon_due_date',
      'div.assignment-details .date',
      '.assignment-list .date'
    ];
    selectors.forEach(sel => {
      root.querySelectorAll(sel)?.forEach(n => candidates.push(n));
    });

    const textNodes = root.querySelectorAll('span,div,li,td');
    textNodes.forEach(node => {
      if (node.textContent && /Due\s+/.test(node.textContent) && node.textContent.length < 200) {
        candidates.push(node);
      }
    });

    return Array.from(new Set(candidates));
  }

  async function tryTransformElement(el, prefs) {
    const text = el.textContent?.trim();
    if (!text || el.classList.contains(MARK_CLASS)) return;

    const parsed = parseCanvasDateString(text);
    if (!parsed) return;

    const newDate = computeTransformedDate(parsed, prefs);
    if (!newDate) return;

    const display = formatForDisplay(newDate);
    replaceDisplayText(el, text, display);
  }

  async function runTransform() {
    const prefs = await loadSettings();
    if (!prefs.enabled) return;

    const elements = findDateElements(document);
    elements.forEach(el => tryTransformElement(el, prefs));
  }

  // Run automatically when content script loads
  runTransform();

  // Observe dynamic changes (Canvas often loads asynchronously)
  const observer = new MutationObserver(() => runTransform());
  observer.observe(document.body, { childList: true, subtree: true });

  // Listen for popup messages (to manually trigger or refresh)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "RUN_MAIN_FUNCTION") {
      runTransform()
        .then(() => sendResponse({ result: "OK" }))
        .catch(err => sendResponse({ result: "Error: " + err.message }));
      return true; // async
    }
  });
})();
