// blocked.js
const params = new URLSearchParams(location.search);
const site = params.get("site");
if (site) {
  document.getElementById("site").textContent = site;
}

// This page runs with the extension's own privileges (it's served from
// chrome-extension://), so chrome.tabs.remove() works here regardless of
// how the tab was opened — unlike window.close(), which Chrome silently
// blocks for any tab the script didn't open itself.
//
// We use chrome.tabs.query({active:true, currentWindow:true}) rather than
// chrome.tabs.getCurrent(), which can unreliably return undefined on a
// page that arrived via a redirect.
document.getElementById("close-tab").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (chrome.runtime.lastError || !tab || tab.id === undefined) {
      console.error(
        "Focus: couldn't find the active tab, falling back to window.close()",
        chrome.runtime.lastError
      );
      window.close();
      return;
    }
    chrome.tabs.remove(tab.id, () => {
      if (chrome.runtime.lastError) {
        console.error("Focus: tabs.remove failed", chrome.runtime.lastError);
        window.close();
      }
    });
  });
});
