import { initializeTV } from "./initialize-tv";
import { ICON_STATES } from "./common";

initializeTV()
  .then(() => {
    console.log('Tunnel Vision initialized successfully')
    chrome.runtime.sendMessage(ICON_STATES.READY)
  })
  .catch((err) => {
    console.error(err)
    chrome.runtime.sendMessage(ICON_STATES.ERROR)
  })

