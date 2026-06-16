(() => {
  const XPathHelper = window.XPathHelper;

  if (XPathHelper.loaded) {
    XPathHelper.UI?.togglePanel();
    return;
  }

  XPathHelper.loaded = true;
  window.__xpathHelperLoaded = true;
  window.__xpathHelperTogglePanel = () => XPathHelper.UI.togglePanel();

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'togglePanel') {
      XPathHelper.UI.togglePanel();
    }
  });
})();
