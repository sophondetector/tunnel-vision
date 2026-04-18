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
  SHOW_RANGES = "SHOW_RANGES",
  LOG_RANGES = "LOG_RANGES",
  DUMP_RANGES = "DUMP_RANGES",
  SHOW_TEXT_NODES = "SHOW_TEXT_NODES"
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

export async function getCurrentTab(): Promise<chrome.tabs.Tab> {
  let queryOptions = { active: true, lastFocusedWindow: true }
  let [tab] = await chrome.tabs.query(queryOptions)
  return tab
}

export async function putInLocalStorage(key: string, url: string): Promise<void> {
  await chrome.storage.local.set({ [key]: url })
}

export async function storeLatestPDFUrlInLocalStorage(url: string): Promise<void> {
  await putInLocalStorage(LATEST_PDF_URL_KEY, url)
}

export function id2Key(id: number): string {
  return `${id}-tvpdf`
}

export async function getCurrentTabKey(): Promise<string> {
  const tab = await getCurrentTab()
  const key = id2Key(tab.id!)
  return key
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

export function logRange(logRangeOpts: {
  range: Range,
  idx?: number,
  caller?: string
}): void {
  const {
    range,
    idx = 'NO INDEX GIVEN',
    caller = 'NO CALLER GIVEN'
  } = logRangeOpts

  console.log(`${caller}: range set to range at index ${idx}`)
  console.log(range)
  console.log(range.toString())
  console.log(range.getBoundingClientRect())
  console.log(range.getClientRects())
  console.log(range.startContainer.parentElement)
}

