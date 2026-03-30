import { setSoundOn } from "./common"
import { ICON_STATES } from "./common";

chrome.runtime.onInstalled.addListener(setSoundOn)

function setIconError() {
  chrome.action.setIcon({
    path: {
      "16": "images/red/icon-16.png",
      "32": "images/red/icon-32.png",
      "48": "images/red/icon-48.png",
      "128": "images/red/icon-128.png"
    }
  });
}

function setIconReady() {
  chrome.action.setIcon({
    path: {
      "16": "images/icon-16.png",
      "32": "images/icon-32.png",
      "48": "images/icon-48.png",
      "128": "images/icon-128.png"
    }
  });
}

// TODO: create greyed out unavailable icon
function setIconUnavailable() {
  setIconError()
}

function setIconInitializing(): void {
  setIconReady()
}

function setIconBasedOnState(state: string, tabId: number): void {
  if (state === ICON_STATES.READY) {
    setIconReady()
    return
  } else if (state === ICON_STATES.ERROR) {
    setIconError()
    return
  } else if (state === ICON_STATES.UNAVAILABLE) {
    setIconUnavailable()
    return
  } else if (state === ICON_STATES.INITIALIZING) {
    setIconInitializing()
    return
  } else {
    console.warn(`background.ts: RECEIVED UNKNOWN STATE ${state} FROM TAB ${tabId}`)
  }
}

// Run this code when the active tab changes or its content updates
async function handleActiveTabChange(tabId: number) {
  try {
    // Optional: Only proceed if this tab is still the active one
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab.id !== tabId) return;

    // ask tab for director state
    // change icon based on that state
    // FIXME: when tab is forbidden to run extensions (such as chrome://extensions)
    // this response is undefined which causes an error
    chrome.tabs.sendMessage(tabId, ICON_STATES.GET_ICON_STATE, (response) => {
      setIconBasedOnState(response, tabId)
    })

  } catch (err) {
    console.error("Error handling active tab change:", err);
  }
}

// Listener 1: Tab switch
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await handleActiveTabChange(activeInfo.tabId);
});

// Listener 2: Listen for state change from initializeTV
chrome.runtime.onMessage.addListener(async (message, sender) => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab.id !== sender.tab?.id) return;
  setIconBasedOnState(message, sender.tab?.id as number)
})
