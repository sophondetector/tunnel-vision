export const SOUND_ON_KEY = "TvSoundOnOff"
export const SOUND_VOLUME_KEY = "TvSoundVolume"

export enum TvMessage {
  TOGGLE_SCREEN = "TOGGLE_SCREEN",
  GET_SCREEN_STATE = "GET_SCREEN_STATE",
  GET_DIRECTOR_STATE = "GET_DIRECTOR_STATE",
  INIT_RANGES = "INIT_RANGES",
  RE_INIT = "RE_INIT",
  SHOW_RANGES = "SHOW_RANGES",
  LOG_RANGES = "LOG_RANGES",
  DUMP_RANGES = "DUMP_RANGES",
  SHOW_TEXT_NODES = "SHOW_TEXT_NODES"
}

export async function getCurrentTab(): Promise<chrome.tabs.Tab> {
  let queryOptions = { active: true, lastFocusedWindow: true }
  let [tab] = await chrome.tabs.query(queryOptions)
  return tab
}


