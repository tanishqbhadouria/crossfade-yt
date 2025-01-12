chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "getCrossfadeSettings") {
      chrome.storage.sync.get({
        crossfadeDuration: 10  // Changed to 10 seconds
      }, (items) => {
        sendResponse(items);
      });
      return true;
    }
  });