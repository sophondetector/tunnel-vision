export interface TvScreenState {
  opacity: number,
  hexColor: string
}

// NOTE: we export this so the pdf-reader can import it and add one to it so the pdf-reader sidebar can stay on top of the the screen
export const TV_SCREEN_Z_INDEX = `99999999`

export enum TvMessage {
  TOGGLE_SCREEN = "TOGGLE_SCREEN",
  GET_SCREEN_STATE = "GET_SCREEN_STATE",
  GET_DIRECTOR_STATE = "GET_DIRECTOR_STATE",
  INIT_RANGES = "INIT_RANGES",
  RE_INIT = "RE_INIT",
  SHOW_RANGES = "SHOW_RANGES"
}

export enum TvDirectorState {
  INITIALIZING = "INITIALIZING",
  UNAVAILABLE = "UNAVAILABLE",
  READY = "READY",
  ERROR = "ERROR",
  PDF = "PDF"
}

export const LATEST_PDF_URL_KEY = "latestTVPDF"
export const SOUND_ON_KEY = "TvSoundOnOff"
export const SOUND_VOLUME_KEY = "TvSoundVolume"

const TRUE = 'true'
const FALSE = 'false'

export async function getCurrentTab(): Promise<chrome.tabs.Tab> {
  let queryOptions = { active: true, lastFocusedWindow: true }
  let [tab] = await chrome.tabs.query(queryOptions)
  return tab
}

export async function storePDFUrlInLocalStorage(key: string, url: string): Promise<void> {
  await chrome.storage.local.set({ [key]: url })
}

export async function storeLatestPDFUrlInLocalStorage(url: string): Promise<void> {
  await storePDFUrlInLocalStorage(LATEST_PDF_URL_KEY, url)
}

export async function soundIsOn(): Promise<boolean> {
  const res = await chrome.storage.local.get(SOUND_ON_KEY)
  const curVal = res[SOUND_ON_KEY]
  if (curVal === undefined) {
    console.warn(`soundIsOn: could not retrieve sound option`)
    return false
  }
  if (curVal === TRUE) return true
  return false
}

export async function toggleSound(): Promise<void> {
  if (await soundIsOn()) {
    await setSoundOff()
    return
  }
  await setSoundOn()
}

export async function setSoundOn(): Promise<void> {
  await chrome.storage.local.set({ [SOUND_ON_KEY]: TRUE })
}

export async function setSoundOff(): Promise<void> {
  await chrome.storage.local.set({ [SOUND_ON_KEY]: FALSE })
}

export async function setSoundVol(volumeLevel: number): Promise<void> {
  await chrome.storage.local.set({ [SOUND_VOLUME_KEY]: volumeLevel })
}

export async function getSoundVol(): Promise<number> {
  const res = await chrome.storage.local.get(SOUND_VOLUME_KEY)
  const volume: number = res[SOUND_VOLUME_KEY]
  return volume
}

export async function forceLayout(): Promise<void> {
  // Option 1: Simple and very common
  void document.documentElement.offsetHeight;   // or any element

  // Option 2: Using scroll properties
  void document.documentElement.scrollHeight;

  // Option 3: getBoundingClientRect (forces full layout)
  void document.body.getBoundingClientRect();

  // Option 4: Computed style (more expensive)
  void getComputedStyle(document.documentElement).height;
}

/**
 * Pauses execution for the specified number of milliseconds
 * @param {number} ms - The number of milliseconds to pause
 * @returns {Promise<void>}
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

