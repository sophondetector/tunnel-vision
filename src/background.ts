import { setSoundOn } from "./common"

chrome.runtime.onInstalled.addListener(setSoundOn)

function setIconRed() {
  chrome.action.setIcon({
    path: {
      "16": "images/red/icon-16.png",
      "32": "images/red/icon-32.png",
      "48": "images/red/icon-48.png",
      "128": "images/red/icon-128.png"
    }
  });
}

function setIconDefault() {
  chrome.action.setIcon({
    path: {
      "16": "images/icon-16.png",
      "32": "images/icon-32.png",
      "48": "images/icon-48.png",
      "128": "images/icon-128.png"
    }
  });
}

// every time active tab changes
// ask the active tab for the director state
// change icon to reflect that state
chrome.runtime.onMessage.addListener(
  (msg, sender, sendResponse) => {
    if (msg === "RED") {
      setIconRed()
    } else if (msg === "DEFAULT") {
      setIconDefault()
    } else {
      console.log(msg)
      console.log(sender)
    }
    sendResponse()
  }
)
