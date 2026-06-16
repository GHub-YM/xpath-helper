(() => {
  const XPathHelper = window.XPathHelper;
  const STORAGE_KEY = 'xpathHelperHistory';
  const MAX_HISTORY = 20;

  async function getHistory() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const history = result[STORAGE_KEY];
      return Array.isArray(history) ? history.filter(Boolean) : [];
    } catch (error) {
      console.warn('读取XPath历史失败:', error);
      return [];
    }
  }

  async function saveHistory(history) {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEY]: history.slice(0, MAX_HISTORY)
      });
    } catch (error) {
      console.warn('保存XPath历史失败:', error);
    }
  }

  async function addEntry(value) {
    const entry = value.trim();
    if (!entry) return;

    const history = await getHistory();
    if (history.includes(entry)) return;

    await saveHistory([entry, ...history].slice(0, MAX_HISTORY));
  }

  async function clearHistory() {
    await saveHistory([]);
  }

  function attach({ panel, xpathInput, executeXPath }) {
    const historyButton = panel.querySelector('#xpath-history-btn');
    const historyPopup = panel.querySelector('#xpath-history-popup');
    if (!historyButton || !historyPopup) return;

    async function renderHistory() {
      const history = await getHistory();
      historyPopup.innerHTML = '';

      if (!history.length) {
        const empty = document.createElement('div');
        empty.className = 'xpath-history-empty';
        empty.textContent = '暂无历史记录';
        historyPopup.appendChild(empty);
        return;
      }

      const fragment = document.createDocumentFragment();
      history.forEach(value => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'xpath-history-item';
        item.textContent = value;
        item.title = value;
        item.addEventListener('click', () => {
          xpathInput.value = value;
          hideHistory();
          xpathInput.focus();
          executeXPath();
        });
        fragment.appendChild(item);
      });

      const clearButton = document.createElement('button');
      clearButton.type = 'button';
      clearButton.className = 'xpath-history-clear';
      clearButton.textContent = '清空历史';
      clearButton.addEventListener('click', async () => {
        await clearHistory();
        renderHistory();
      });

      historyPopup.append(fragment, clearButton);
    }

    function positionHistory() {
      const rect = historyButton.getBoundingClientRect();
      if (!historyPopup.parentNode || historyPopup.parentNode !== document.body) {
        historyPopup.parentNode?.removeChild(historyPopup);
        document.body.appendChild(historyPopup);
      }

      historyPopup.style.display = 'block';
      historyPopup.style.visibility = 'hidden';
      historyPopup.style.width = `${Math.max(xpathInput.getBoundingClientRect().width, 220)}px`;

      const popupRect = historyPopup.getBoundingClientRect();
      let left = rect.left;
      let top = rect.bottom + 8;

      if (left + popupRect.width > window.innerWidth) {
        left = window.innerWidth - popupRect.width - 10;
      }
      if (top + popupRect.height > window.innerHeight) {
        top = rect.top - popupRect.height - 8;
      }

      historyPopup.style.left = `${Math.max(left, 10)}px`;
      historyPopup.style.top = `${Math.max(top, 10)}px`;
      historyPopup.style.visibility = 'visible';
    }

    function hideHistory() {
      historyPopup.style.display = 'none';
      historyPopup.style.visibility = 'hidden';
    }

    async function toggleHistory(event) {
      event.stopPropagation();
      if (historyPopup.style.display === 'block') {
        hideHistory();
        return;
      }

      await renderHistory();
      positionHistory();
    }

    historyButton.addEventListener('click', toggleHistory);
    document.addEventListener('click', event => {
      if (!historyPopup.contains(event.target) && event.target !== historyButton) {
        hideHistory();
      }
    });
    window.addEventListener('resize', hideHistory);
  }

  XPathHelper.History = {
    addEntry,
    attach,
    clearHistory,
    getHistory
  };
})();
