async function sendToggleMessage(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'togglePanel' });
    return true;
  } catch (error) {
    return false;
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    const isContentReady = await sendToggleMessage(tab.id);
    if (isContentReady) return;

    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['styles.css']
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        'src/content/state.js',
        'src/content/clipboard.js',
        'src/content/history.js',
        'src/content/highlight.js',
        'src/content/xpath-query.js',
        'src/content/suggestions.js',
        'src/content/panel-ui.js',
        'content.js'
      ]
    });

    await sendToggleMessage(tab.id);
  } catch (error) {
    console.error('Error toggling XPath Helper:', error);
  }
});
