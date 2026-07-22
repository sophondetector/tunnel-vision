import { TvDirectorState, } from "./tunnel-vision-core"
import { ChromeExtensionSoundController } from './sound-for-extension'
import { TvMessage } from "./chrome-helpers";

const DEFAULT_VOLUME = 50
const BACKGROUND_SOUND_CONTROLLER = new ChromeExtensionSoundController()

chrome.runtime.onInstalled.addListener(BACKGROUND_SOUND_CONTROLLER.setSoundOn)
chrome.runtime.onInstalled.addListener(() => BACKGROUND_SOUND_CONTROLLER.setSoundVol(DEFAULT_VOLUME))

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

function setIconUnavailable(): void {
  setIconError()
}

function setIconInitializing(): void {
  setIconReady()
}

// TODO: make the "pdf ready" icon green
function setIconPdf(): void {
  setIconReady()
}

function setIconFromState(state: TvDirectorState, _tabId: number): void {
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
    // console.warn(`background.ts: received unknown state ${state} from tab ${_tabId}`)
  }
}

// Listener 1: Tab switch
chrome.tabs.onActivated.addListener((activeInfo) => {
  const tabId = activeInfo.tabId
  chrome.tabs.sendMessage(tabId, TvMessage.GET_DIRECTOR_STATE, (response) => {
    setIconFromState(response, tabId)
  })
});

// Listener 2: Listen for state change from initializeTV
chrome.runtime.onMessage.addListener(async (message, sender) => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab.id !== sender.tab?.id) return;
  setIconFromState(message, sender.tab?.id as number)
})
