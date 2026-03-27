import { initializeTV } from "./initialize-tv";

initializeTV()

const STATE = (new Date().getTime() % 2 === 0) ? "RED" : "DEFAULT"

chrome.runtime.sendMessage(STATE)

