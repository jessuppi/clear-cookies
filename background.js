// get the active http or https tab and its parsed url
async function getActiveTab() {
  // find the active tab in the current window
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return null;

  try {
    // parse the tab url and ensure it uses http or https
    const url = new URL(tab.url);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return { tab, url };
    }
  } catch {
    // ignore invalid or internal chrome urls
  }

  return null;
}

// set persistent badge background once on install or update
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#333" });
});

// clear all site data for this origin
async function removeSiteData(origin) {
  try {
    await chrome.browsingData.remove(
      { origins: [origin], since: 0 },
      {
        cookies: true,
        localStorage: true,
        indexedDB: true,
        cacheStorage: true,
        cache: true,
        serviceWorkers: true,
        webSQL: true,
        fileSystems: true
      }
    );
  } catch {}
}

// show a short badge message on the extension icon
async function flashBadge(text, ms = 1200) {
  // display temporary badge text for quick feedback
  try {
    await chrome.action.setBadgeText({ text });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), ms);
  } catch {}
}

// briefly flash the icon to confirm action
async function flashIcon(ms = 800) {
  try {
    await chrome.action.setIcon({ path: "icon128_active.png" });
  } catch {}
  setTimeout(async () => {
    try {
      await chrome.action.setIcon({ path: "icon128.png" });
    } catch {}
  }, ms);
}

// prevent overlapping runs on rapid clicks
let isRunning = false;

// handle click on extension icon
chrome.action.onClicked.addListener(async () => {
  if (isRunning) {
    await flashBadge("...");
    return;
  }
  isRunning = true;

  try {
    const active = await getActiveTab();
    if (!active) {
      await flashBadge("ERR");
      return;
    }

    const { url } = active;
    await removeSiteData(url.origin);

    await flashBadge("OK");
    await flashIcon();
  } finally {
    isRunning = false;
  }
});
