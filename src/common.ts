export interface TvScreenState {
  opacity: number,
  hexColor: string
}

export interface TvRect {
  x: number,
  y: number,
  width: number,
  height: number
}

export const LATEST_PDF_URL_KEY = "latestTVPDF"

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
