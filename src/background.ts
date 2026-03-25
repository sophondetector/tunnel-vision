import { setSoundOn } from "./common"

chrome.runtime.onInstalled.addListener(setSoundOn)
