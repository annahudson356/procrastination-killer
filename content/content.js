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
      // Re-run on relevant change
      if (changes.enabled || changes.offsetDays || changes.force1159) {
        init();
      }
    }
  });

  // Your date parsing, formatting, and transforming functions
  function parseCanvasDateString(s) {
    if (!s || typeof s !== 'string') return null;
    s = s.trim().replace(/^\s*Due[:\s-]*/i, '');
    let iso = Date.parse(s);
    if (!isNaN(iso)) return new Date(iso);

    let re = /([A-Za-z]{3,9}\s+\d{1,2}(?:,\s*\d{4})?)\s*(?:at\s*)?(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?)?/;
    let m = s.match(re);
    if (m) {
      let candidate = Date.parse(`${m[1]} ${m[2] || ''}`);
      if (!isNaN(candidate)) return new Date(candidate);
    }

    re = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?:\s+(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?))?/;
    m = s.match(re);
    if (m) {
      let candidate = Date.parse(`${m[1]} ${m[2] || ''}`);
      if (!isNaN(candidate)) return new Date(candidate);
    }
    return null;
  }

  function formatForDisplay(date) {
    let optsDate = { month: 'short', day: '2-digit' };
    let datePart = new Intl.DateTimeFormat(undefined, optsDate).format(date);
    let timePart = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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

    root.querySelectorAll('span,div,li,td').forEach(node => {
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
            if (parent && /Due\s+/.test(parent.textContent)) tryTransformElement(parent, p);
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
