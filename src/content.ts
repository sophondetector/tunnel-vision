import { initializeTV } from "./initialize-tv";
import { ICON_STATES } from "./common";

initializeTV()

const STATE = (new Date().getTime() % 2 === 0) ? ICON_STATES.ERROR : ICON_STATES.READY

chrome.runtime.sendMessage(STATE)

