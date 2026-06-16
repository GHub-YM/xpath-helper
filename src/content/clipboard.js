(() => {
  const XPathHelper = window.XPathHelper;

  function getElementAbsolutePath(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';

    const segments = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
      let index = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index += 1;
        }
        sibling = sibling.previousElementSibling;
      }

      segments.unshift(`${current.tagName.toLowerCase()}[${index}]`);
      current = current.parentElement;
    }

    return `/html/${segments.join('/')}`;
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      console.warn('Clipboard API failed, falling back to execCommand:', error);
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      return document.execCommand('copy');
    } catch (error) {
      console.error('Copy failed:', error);
      return false;
    } finally {
      textarea.remove();
    }
  }

  function isXPathValidForElement(xpath, element) {
    if (!xpath || !element) return false;

    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );

      for (let index = 0; index < result.snapshotLength; index += 1) {
        if (result.snapshotItem(index) === element) return true;
      }
    } catch (error) {
      return false;
    }

    return false;
  }

  XPathHelper.Clipboard = {
    getElementAbsolutePath,
    copyToClipboard,
    isXPathValidForElement
  };
})();
