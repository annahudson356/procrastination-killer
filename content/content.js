// content.js
(() => {
  const DEFAULT_OFFSET_DAYS = 1;
  const MARK_CLASS = 'pk-changed';

  // Load settings
  async function loadSettings() {
    return new Promise(resolve => {
      chrome.storage.sync.get({
        enabled: true,
        offsetDays: DEFAULT_OFFSET_DAYS,
        force1159: true
      }, prefs => resolve(prefs));
    });
  }

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      if (changes.enabled || changes.offsetDays || changes.force1159) {
        init();
      }
    }
  });

  // Parse a date string from Canvas-style text
function parseCanvasDateString(s) {
  if (!s || typeof s !== 'string') return null;
  s = s.trim();

  // Normalize common Canvas format: "Dec 2 at 11:59pm" → "Dec 2 11:59 PM"
  let normalized = s
    .replace(/\bat\b/i, '')          // remove "at"
    .replace(/\s+/g, ' ')            // collapse spaces
    .replace(/(\d{1,2}:\d{2})(am|pm)/i, (_, time, meridiem) => {
      return `${time} ${meridiem.toUpperCase()}`; // fix casing
    });

  let parsed = Date.parse(normalized);
  if (!isNaN(parsed)) return new Date(parsed);

  // Fallback: try numeric format MM/DD(/YYYY) with optional time
  let numeric = s.replace(/(\d{1,2}:\d{2})(am|pm)/i, (_, time, meridiem) => {
    return `${time} ${meridiem.toUpperCase()}`;
  });
  parsed = Date.parse(numeric);
  if (!isNaN(parsed)) return new Date(parsed);

  return null; // couldn't parse
}


  // Format date for display
  function formatForDisplay(date) {
    if (!date) return '';
    const optsDate = { month: 'short', day: 'numeric' };
    const datePart = new Intl.DateTimeFormat(undefined, optsDate).format(date);
    const timePart = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${datePart} at ${timePart}`;
  }

  // Compute transformed date based on offset and optional truncate
  function computeTransformedDate(origDate, prefs) {
    if (!origDate) return null;
    let d = new Date(origDate.getTime());

    // Apply offset first
    let offset = typeof prefs.offsetDays === 'number' ? prefs.offsetDays : DEFAULT_OFFSET_DAYS;
    if (offset < 0){
        alert("Negative numbers are not permitted and could cause late assignments!");
        offset = 0;
    }
    d.setDate(d.getDate() - offset);

    // Then, if truncate is enabled and time is not already 11:59 PM
    if (prefs.force1159) {
      if (!(d.getHours() === 23 && d.getMinutes() === 59)) {
        d.setDate(d.getDate() - 1); // move one more day back
        d.setHours(23, 59, 0, 0);
      }
    }

    return d;
  }

  // Replace element text
  function replaceDisplayText(el, originalText, newText) {
    if (!el || !originalText || !newText) return;
    if (!el.dataset.pkOriginal) el.dataset.pkOriginal = originalText;
    el.classList.add(MARK_CLASS);
    el.textContent = newText;
  }

  // Find potential date elements in the DOM
  function findDateElements(root = document) {
    const candidates = [];
    const dateRegex = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/i;

    root.querySelectorAll('li, span, div, td').forEach(node => {
      if (node.textContent && dateRegex.test(node.textContent) && node.textContent.length < 200) {
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

  async function init() {
    const prefs = await loadSettings();
    if (!prefs.enabled) return;

    const els = findDateElements(document);
    for (const el of els) await tryTransformElement(el, prefs);

    // Watch for dynamically added nodes
    const mo = new MutationObserver(async mutations => {
      const p = await loadSettings();
      if (!p.enabled) return;
      mutations.forEach(m => {
        m.addedNodes?.forEach(node => {
          if (node.nodeType === 1) {
            findDateElements(node).forEach(el => tryTransformElement(el, p));
          } else if (node.nodeType === 3) {
            const parent = node.parentElement;
            if (parent) tryTransformElement(parent, p);
          }
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });

    // Periodically re-scan in case something was missed
    setInterval(async () => {
      const p = await loadSettings();
      if (!p.enabled) return;
      findDateElements(document).forEach(el => tryTransformElement(el, p));
    }, 5000);
  }

  init().catch(err => console.error('PK init error', err));
})();
