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

// FIXME: this only receives a message when the tab first loads a page - it needs to poll the active tab every time the active tab changes

// every time active tab changes
// ask the active tab for the director state
// change icon to reflect that state
chrome.runtime.onMessage.addListener(
  (msg, sender, sendResponse) => {
    if (msg === ICON_STATES.READY) setIconReady()
    else if (msg === ICON_STATES.ERROR) setIconError()
    else if (msg === ICON_STATES.UNAVAILABLE) setIconUnavailable()
    console.log(sender)
    sendResponse()
  }
)
