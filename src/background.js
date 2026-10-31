chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === "a6p:openOptions") {
    chrome.runtime.openOptionsPage();
  }
});
