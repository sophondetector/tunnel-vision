export interface TvScreenState {
  opacity: number,
  hexColor: string
}

export const LATEST_PDF_URL_KEY = "latestTVPDF"
export const SOUND_KEY = "TvSoundOnOff"

const TRUE = 'true'
const FALSE = 'false'

export async function getCurrentTab() {
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
  const res = await chrome.storage.local.get(SOUND_KEY)
  const curVal = res[SOUND_KEY]
  if (curVal === undefined) {
    console.warn(`soundIsOn: could not retreive sound option`)
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
  await chrome.storage.local.set({ [SOUND_KEY]: TRUE })
}

export async function setSoundOff(): Promise<void> {
  await chrome.storage.local.set({ [SOUND_KEY]: FALSE })
}
