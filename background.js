// background.js
// Keeps declarativeNetRequest rules in sync with the stored blacklist, and
// redirects any already-open tabs that match a newly added site.

const STORAGE_KEY = "blacklist";

function normalizeDomain(raw) {
  let value = raw.trim().toLowerCase();
  if (!value) return null;

  // Strip protocol if the user pasted a full URL.
  value = value.replace(/^[a-z]+:\/\//, "");
  // Strip path/query/hash/port, keep just the host.
  value = value.split("/")[0].split("?")[0].split("#")[0].split(":")[0];
  // Strip a leading "www."
  value = value.replace(/^www\./, "");

  if (!value) return null;

  // If it doesn't look like a domain (no dot), assume ".com".
  if (!value.includes(".")) value += ".com";

  return value;
}

async function getBlacklist() {
  const data = await chrome.storage.sync.get({ [STORAGE_KEY]: [] });
  return data[STORAGE_KEY];
}

async function rebuildRules() {
  const domains = await getBlacklist();

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  const addRules = domains.map((domain, i) => ({
    id: i + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        extensionPath: `/blocked.html?site=${encodeURIComponent(domain)}`,
      },
    },
    condition: {
      requestDomains: [domain],
      resourceTypes: ["main_frame"],
    },
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });

  await redirectOpenTabs(domains);
}

async function redirectOpenTabs(domains) {
  if (!domains.length) return;
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.url || !tab.id) continue;
    let host;
    try {
      host = new URL(tab.url).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
    const isBlocked = domains.some(
      (d) => host === d || host.endsWith("." + d)
    );
    if (isBlocked) {
      chrome.tabs.update(tab.id, {
        url: chrome.runtime.getURL(
          `blocked.html?site=${encodeURIComponent(host)}`
        ),
      });
    }
  }
}

chrome.runtime.onInstalled.addListener(rebuildRules);
chrome.runtime.onStartup.addListener(rebuildRules);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes[STORAGE_KEY]) {
    rebuildRules();
  }
});
