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
  } else if (state === ICON_STATES.ERROR) {
    setIconError()
  } else if (state === ICON_STATES.UNAVAILABLE) {
    setIconUnavailable()
  } else if (state === ICON_STATES.INITIALIZING) {
    setIconInitializing()
  } else {
    console.warn(`background.ts: RECEIVED UNKNOWN STATE ${state} FROM TAB ${tabId}`)
  }
}

// Listener 1: Tab switch
chrome.tabs.onActivated.addListener((activeInfo) => {
  const tabId = activeInfo.tabId
  // FIXME: when tab is forbidden to run extensions (such as chrome://extensions)
  // this response is undefined which causes an error
  chrome.tabs.sendMessage(tabId, ICON_STATES.GET_ICON_STATE, (response) => {
    setIconBasedOnState(response, tabId)
  })
});

// Listener 2: Listen for state change from initializeTV
chrome.runtime.onMessage.addListener(async (message, sender) => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab.id !== sender.tab?.id) return;
  setIconBasedOnState(message, sender.tab?.id as number)
})
