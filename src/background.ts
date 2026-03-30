import { TvDirectorState, TvMessage, setSoundOn } from "./common"

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

function setIconPdf(): void {
  setIconReady()
}

function setIconBasedOnState(state: TvDirectorState, tabId: number): void {
  if (state === TvDirectorState.READY) {
    setIconReady()
  } else if (state === TvDirectorState.ERROR) {
    setIconError()
  } else if (state === TvDirectorState.UNAVAILABLE) {
    setIconUnavailable()
  } else if (state === TvDirectorState.INITIALIZING) {
    setIconInitializing()
  } else if (state === TvDirectorState.PDF) {
    setIconPdf()
  } else {
    console.warn(`background.ts: RECEIVED UNKNOWN STATE ${state} FROM TAB ${tabId}`)
  }
}

// Listener 1: Tab switch
chrome.tabs.onActivated.addListener((activeInfo) => {
  const tabId = activeInfo.tabId
  chrome.tabs.sendMessage(tabId, TvMessage.GET_DIRECTOR_STATE, (response) => {
    setIconBasedOnState(response, tabId)
  })
});

// Listener 2: Listen for state change from initializeTV
chrome.runtime.onMessage.addListener(async (message, sender) => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab.id !== sender.tab?.id) return;
  setIconBasedOnState(message, sender.tab?.id as number)
})
