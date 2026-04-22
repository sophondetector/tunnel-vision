import * as pdfjsLib from 'pdfjs-dist'
//@ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { initializeTV, getDirector } from './initialize-tv'
import {
  playSound,
  setSoundVol,
  getSoundVol,
  soundIsOn,
  toggleSound,
} from './tunnel-vision/sound'
import {
  LATEST_PDF_URL_KEY,
  TV_SCREEN_Z_INDEX,
  getCurrentTabKey
} from './common'
import { TvScreen } from './tunnel-vision/tv-screen'
import { getBinary, setBinary } from './indexdb'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const DEFAULT_SCALE = 2
const MAX_SCALE = 4
const MIN_SCALE = .4
const SCALE_INC = .1

const SIDEBAR_MIN_WIDTH = 100
const SIDEBAR_MAX_WIDTH = 1000
const SIDEBAR_DEFAULT_WIDTH = 350

const CANVAS: HTMLCanvasElement = document.getElementById('the-canvas') as HTMLCanvasElement
const CONTEXT = CANVAS.getContext('2d') as CanvasRenderingContext2D

// sidebar control panel
const SIDEBAR = document.getElementById('sidebar') as HTMLElement
const RESIZER = document.getElementById('resizer') as HTMLElement
const COLLAPSER = document.getElementById('collapser') as HTMLButtonElement
const CHEVRON = document.getElementById('chevron') as HTMLElement

const OPEN_PDF = document.getElementById('open-pdf') as HTMLButtonElement

const PREV_PAGE = document.getElementById('prev') as HTMLButtonElement
const NEXT_PAGE = document.getElementById('next') as HTMLButtonElement
const PAGE_COUNT = document.getElementById('page-count') as HTMLSpanElement
const PAGE_NUM_DISPLAY = document.getElementById('page-num-display') as HTMLSpanElement

const PREV_LINE = document.getElementById('prev-line') as HTMLButtonElement
const NEXT_LINE = document.getElementById('next-line') as HTMLButtonElement

const SCREEN_TOGGLE = document.getElementById('screen-toggle') as HTMLButtonElement
const OPACITY_SLIDER = document.getElementById('opacity-slider') as HTMLInputElement
const OPACITY_DISPLAY = document.getElementById('opacity-display') as HTMLInputElement
const COLOR_PICKER = document.getElementById('color-picker') as HTMLInputElement

const ZOOM_IN = document.getElementById('zoom-in') as HTMLButtonElement
const ZOOM_OUT = document.getElementById('zoom-out') as HTMLButtonElement
const ZOOM_FIT = document.getElementById('zoom-fit') as HTMLButtonElement
const ZOOM_DISPLAY = document.getElementById('zoom-display') as HTMLSpanElement

const SOUND_DISPLAY = document.getElementById('sound-display') as HTMLSpanElement
const SOUND_TOGGLE = document.getElementById('sound-toggle') as HTMLButtonElement

const VOLUME_CONTROL = document.getElementById('volume-control') as HTMLDivElement
const VOLUME_DISPLAY = document.getElementById('volume-display') as HTMLSpanElement
const VOLUME_SLIDER = document.getElementById('volume-slider') as HTMLInputElement

// sidebar debug panel
const DEBUG_PANEL = document.getElementById('debug-panel') as HTMLDivElement
const RE_RANGE = document.getElementById('re-range') as HTMLButtonElement
const RE_INIT = document.getElementById('re-init') as HTMLButtonElement
const SHOW_RANGES = document.getElementById('show-ranges') as HTMLButtonElement

// footer control panel
const FOOTER = document.getElementById('footer') as HTMLElement
const FOOTER_PREV_LINE = document.getElementById('footer-prev-line') as HTMLButtonElement
const FOOTER_NEXT_LINE = document.getElementById('footer-next-line') as HTMLButtonElement
const FOOTER_PREV_PAGE = document.getElementById('footer-prev') as HTMLButtonElement
const FOOTER_NEXT_PAGE = document.getElementById('footer-next') as HTMLButtonElement
const FOOTER_OPEN_PDF = document.getElementById('footer-open-pdf') as HTMLButtonElement

// state variables
let PAGE_NUM: number = 1
let PDF_DOC: null | pdfjsLib.PDFDocumentProxy = null
let IS_RESIZING = false
let ZOOM_SCALE = DEFAULT_SCALE
let DEFAULT_BUFFER_RADIUS = 1

async function getPDFDocumentProxy(): Promise<pdfjsLib.PDFDocumentProxy> {
  if (PDF_DOC) return PDF_DOC

  const key = await getCurrentTabKey()
  const dbResult = await getBinary(key)
  if (dbResult) {
    PDF_DOC = await pdfjsLib.getDocument({ data: dbResult }).promise
    return PDF_DOC
  }

  const latestPDFUrl = await getLatestPDFUrl()
  PDF_DOC = await pdfjsLib.getDocument(latestPDFUrl).promise
  return PDF_DOC
}

async function putPDFInIndexDb(pdfDocProxy: pdfjsLib.PDFDocumentProxy): Promise<void> {
  const data = await pdfDocProxy.getData()
  const key = await getCurrentTabKey()
  await setBinary(key, data.buffer as ArrayBuffer)
}

function setRadiusBasedOnZoom(): void {
  TvScreen.setBufferRadius(DEFAULT_BUFFER_RADIUS * ZOOM_SCALE * ZOOM_SCALE)
}

async function zoomIn(): Promise<void> {
  if (ZOOM_SCALE >= MAX_SCALE) return
  ZOOM_SCALE += SCALE_INC
  setRadiusBasedOnZoom()
  const dir = await getDirector()
  const idx = dir.getCurrentRangeIdx()
  await renderPage()
  await renderTextLayer()
  await initRanges()
  dir.setRangeIdx(idx)
  displayZoomPercent()
}

async function zoomOut(): Promise<void> {
  if (ZOOM_SCALE <= MIN_SCALE) return
  ZOOM_SCALE -= SCALE_INC
  setRadiusBasedOnZoom()
  const dir = await getDirector()
  const idx = dir.getCurrentRangeIdx()
  await renderPage()
  await renderTextLayer()
  await initRanges()
  dir.setRangeIdx(idx)
  displayZoomPercent()
}

async function zoomFit(): Promise<void> {
  const dir = await getDirector()
  const idx = dir.getCurrentRangeIdx()

  const page = await PDF_DOC!.getPage(PAGE_NUM)

  if (!page) {
    console.warn("No page available for zoomFit")
    displayZoomPercent()
    return
  }

  // Get the container that holds the rendered page (usually the parent div of the canvas)
  const container = document.querySelector('main') as HTMLElement

  if (!container) {
    console.warn("PDF container not found")
    displayZoomPercent()
    return
  }

  const unscaledViewport = page.getViewport({ scale: 1.0 })

  const padding = 5 // pixels of margin around the page
  const availableWidth = container.clientWidth - padding
  const availableHeight = container.clientHeight - padding

  const scaleX = availableWidth / unscaledViewport.width
  const scaleY = availableHeight / unscaledViewport.height

  // Choose the smaller scale so the whole page fits (no overflow)
  const newScale = Math.min(scaleX, scaleY)

  // Clamp to existing min/max
  ZOOM_SCALE = await getClosestZoomInc(newScale)

  // Update zoom radius
  setRadiusBasedOnZoom()

  // Re-render everything
  await renderPage()
  await renderTextLayer()
  await initRanges()
  dir.setRangeIdx(idx)
  displayZoomPercent()
}

async function getClosestZoomInc(scale: number): Promise<number> {
  if (scale <= MIN_SCALE) return MIN_SCALE
  if (scale >= MAX_SCALE) return MAX_SCALE

  // Round to nearest multiple of SCALE_INC, then clamp
  const steps = Math.round((scale - MIN_SCALE) / SCALE_INC)
  let newScale = MIN_SCALE + steps * SCALE_INC

  return Math.min(newScale, MAX_SCALE)
}

function getScalePercent(): number {
  return (ZOOM_SCALE / MAX_SCALE) * 100
}

function displayZoomPercent(): void {
  const numString = getScalePercent().toFixed()
  ZOOM_DISPLAY.textContent = `${numString}%`
}

function disableVolumeSlider(): void {
  VOLUME_SLIDER.disabled = true
  VOLUME_CONTROL.style.opacity = '0.2'
}

function enableVolumeSlider(): void {
  VOLUME_SLIDER.disabled = false
  VOLUME_CONTROL.style.opacity = '1'
}

function displaySoundIsOn(isOn: boolean): void {
  if (isOn) {
    SOUND_DISPLAY.textContent = 'Sound is On'
    enableVolumeSlider()
    return
  }
  SOUND_DISPLAY.textContent = 'Sound is Off'
  disableVolumeSlider()
}

async function getLatestPDFUrl(): Promise<string> {
  const res = await chrome.storage.local.get(LATEST_PDF_URL_KEY)
  return res[LATEST_PDF_URL_KEY]
}

async function renderPage(): Promise<void> {
  if (PDF_DOC === null) {
    console.warn(`renderPage: PDF_DOC is null!`)
    return
  }

  const dpr = window.devicePixelRatio || 1

  const page = await PDF_DOC.getPage(PAGE_NUM)
  const viewport = page.getViewport({ scale: ZOOM_SCALE })

  // Canvas resolution (backing store) at device pixels
  CANVAS.width = Math.round(viewport.width * dpr)
  CANVAS.height = Math.round(viewport.height * dpr)

  const cssWidth = Math.floor(viewport.width)
  const cssHeight = Math.floor(viewport.height)

  CANVAS.style.width = `${cssWidth}px`
  CANVAS.style.height = `${cssHeight}px`

  // NOTE: Always scale the context AFTER applying the CANVAS dimensions
  CONTEXT.scale(dpr, dpr)

  await page.render({
    canvasContext: CONTEXT,
    viewport: viewport,
  }).promise
}

async function renderTextLayer(): Promise<void> {
  if (PDF_DOC === null) {
    console.warn(`renderTextLayer: PDF_DOC is null!`)
    return
  }

  const page = await PDF_DOC.getPage(PAGE_NUM)
  const viewport = page.getViewport({ scale: ZOOM_SCALE })
  const cssWidth = Math.floor(viewport.width)
  const cssHeight = Math.floor(viewport.height)

  const textLayerDiv = document.querySelector('#text-layer') as HTMLDivElement
  textLayerDiv.innerHTML = ''

  textLayerDiv.style.setProperty('--scale-factor', viewport.scale.toString())

  // Position & size MUST match canvas CSS pixels exactly
  textLayerDiv.style.position = 'absolute'
  textLayerDiv.style.left = `${CANVAS.offsetLeft}px`
  textLayerDiv.style.top = `${CANVAS.offsetTop}px`
  textLayerDiv.style.width = `${cssWidth}px`
  textLayerDiv.style.height = `${cssHeight}px`

  // NOTE: Grok put these here but they seem un-necessary - leaving commented out for now
  // Optional: force pointer events & selection
  // textLayerDiv.style.pointerEvents = 'all'
  // textLayerDiv.style.userSelect = 'text'

  const textLayer = new pdfjsLib.TextLayer({
    textContentSource: page.streamTextContent(),
    container: textLayerDiv,
    viewport: viewport,
  })

  await textLayer.render()
}

function setPageNumDisplay(): void {
  PAGE_NUM_DISPLAY.textContent = PAGE_NUM.toString()
}

async function initRanges(): Promise<void> {
  const dir = await getDirector()
  if (!dir) {
    console.error(`renderPage: ERROR could not get director`)
    return
  }
  await dir.initRanges()
}

async function toggleDebugPanel(): Promise<void> {
  const isOff = DEBUG_PANEL.classList.contains("hidden")
  if (isOff) {
    DEBUG_PANEL.classList.remove("hidden")
    return
  }
  DEBUG_PANEL.classList.add("hidden")
}

async function nextPage(): Promise<void> {
  if (PAGE_NUM >= PDF_DOC!.numPages) {
    return
  }
  PAGE_NUM++
  await renderPage()
  await renderTextLayer()
  await initRanges()
  setPageNumDisplay()
}

async function prevPage(): Promise<void> {
  if (PAGE_NUM <= 1) {
    return
  }
  PAGE_NUM--
  await renderPage()
  await renderTextLayer()
  await initRanges()
  setPageNumDisplay()
}

async function incLine(): Promise<void> {
  const dir = await getDirector()
  dir.incLine()
}

async function decLine(): Promise<void> {
  const dir = await getDirector()
  dir.decLine()
}

async function openPDF(): Promise<void> {
  try {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.pdf,application/pdf'

    // Handle file selection
    fileInput.onchange = async (event) => {
      //@ts-ignore
      const file = event.target.files[0]
      if (!file) return

      // Create object URL
      const fileUrl = URL.createObjectURL(file)

      // Load the PDF with pdf.js
      await pdfjsLib.getDocument(fileUrl).promise
        .then((pdfDocProxy) => {
          PDF_DOC = pdfDocProxy
          PAGE_COUNT.textContent = PDF_DOC.numPages.toString()
          PAGE_NUM = 1
        })
        .then(() => putPDFInIndexDb(PDF_DOC as pdfjsLib.PDFDocumentProxy))
        .then(renderPage)
        .then(renderTextLayer)
        .then(setPageNumDisplay)
        .then(displayZoomPercent)
        .then(getDirector)
        .then((dir) => dir.initRanges())

      // Clean up the object URL when done (or keep it while viewing)
      URL.revokeObjectURL(fileUrl)
    }

    // Trigger the file picker
    fileInput.click()

  } catch (err) {
    console.error('Error opening local PDF: ', err)
    console.error((err as Error).stack)
  }
}

function showFooter(): void {
  FOOTER.classList.remove("hidden")
}

function hideFooter(): void {
  FOOTER.classList.add("hidden")
}

ZOOM_IN.addEventListener('click', zoomIn)

ZOOM_OUT.addEventListener('click', zoomOut)

ZOOM_FIT.addEventListener('click', zoomFit)

PREV_PAGE.addEventListener('click', prevPage)
FOOTER_PREV_PAGE.addEventListener('click', prevPage)

NEXT_PAGE.addEventListener('click', nextPage)
FOOTER_NEXT_PAGE.addEventListener('click', nextPage)

NEXT_LINE.addEventListener('click', incLine)
FOOTER_NEXT_LINE.addEventListener('click', incLine)

PREV_LINE.addEventListener('click', decLine)
FOOTER_PREV_LINE.addEventListener('click', decLine)

RE_RANGE.addEventListener('click', async function () {
  await initRanges()
  console.log('re-range done')
})

RE_INIT.addEventListener('click', async function () {
  const dir = await getDirector()
  await dir.init()
  console.log('re-init done')
})

SHOW_RANGES.addEventListener('click', async function () {
  const dir = await getDirector()
  const isOn = dir.toggleShowRanges()
  if (isOn) {
    dir.toggleScreenOn()
    SHOW_RANGES.classList.add("bg-red-300", "hover:bg-red-400")
  } else {
    SHOW_RANGES.classList.remove("bg-red-300", "hover:bg-red-400")
  }
})

RESIZER.addEventListener('mousedown', () => {
  IS_RESIZING = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
})

COLLAPSER.addEventListener('click', () => {
  const width = Number.parseFloat(SIDEBAR.style.width)
  if (width > 0) {
    SIDEBAR.style.width = `${0}px`
    CHEVRON.style.transform = 'rotate(180deg)'
    showFooter()
    return
  }

  CHEVRON.style.transform = 'rotate(0deg)'
  SIDEBAR.style.width = `${SIDEBAR_DEFAULT_WIDTH}px`
  hideFooter()
})

OPEN_PDF.addEventListener('click', openPDF)
FOOTER_OPEN_PDF.addEventListener('click', openPDF)

SCREEN_TOGGLE.addEventListener('click', async () => {
  const dir = await getDirector()
  dir.toggleScreen()
})

SOUND_TOGGLE.addEventListener('click', async () => {
  await toggleSound()
  const isOn = await soundIsOn()
  displaySoundIsOn(isOn)
})

VOLUME_SLIDER.addEventListener("input", async (event) => {
  //@ts-ignore
  const value = event.target.value
  await setSoundVol(value)
  VOLUME_DISPLAY.textContent = `${value}%`
  playSound()
  // NOTE: this is here to make sure that user pressing "alt+arrow" doesn't also count as volume input
  // it effectively disables keyboard control for the volume slider
  VOLUME_SLIDER.blur()
})

OPACITY_SLIDER.addEventListener('input', async (event) => {
  //@ts-ignore
  const value = event.target.value
  const dir = await getDirector()
  dir.setScreenOpacity(value)
  OPACITY_DISPLAY.textContent = `${value}%`
  // NOTE: this is here to make sure that user pressing "alt+arrow" doesn't also count as opacity input
  // it effectively disables keyboard control for the opacity slider
  OPACITY_SLIDER.blur()
})

COLOR_PICKER.addEventListener('input', async (event) => {
  const dir = await getDirector()
  //@ts-ignore
  const value = event.target.value
  dir.setScreenColor(value)
})

document.addEventListener('mousemove', async (e) => {
  if (!IS_RESIZING) return
  const newWidth = e.clientX
  if (newWidth > SIDEBAR_MIN_WIDTH && newWidth < SIDEBAR_MAX_WIDTH) {
    SIDEBAR.style.width = `${newWidth}px`
  }
})

document.addEventListener('mouseup', () => {
  IS_RESIZING = false
  document.body.style.cursor = 'default'
  document.body.style.userSelect = 'auto'
})

document.addEventListener('keyup', (event) => {
  if (!event.altKey) return
  if (event.key === "D") {
    toggleDebugPanel()
  }
})

SIDEBAR.style.zIndex = (Number(TV_SCREEN_Z_INDEX) + 1).toString()
RESIZER.style.zIndex = (Number(TV_SCREEN_Z_INDEX) + 1).toString()
FOOTER.style.zIndex = (Number(TV_SCREEN_Z_INDEX) + 1).toString()

getPDFDocumentProxy()
  .then(putPDFInIndexDb)
  .then(() => {
    PAGE_COUNT.textContent = PDF_DOC!.numPages.toString()
  })
  .then(renderPage)
  .then(renderTextLayer)
  .then(initializeTV)
  .then(setPageNumDisplay)
  .then(displayZoomPercent)
  .then(soundIsOn)
  .then(displaySoundIsOn)
  .then(getSoundVol)
  .then((vol) => {
    VOLUME_DISPLAY.textContent = `${vol}%`
    VOLUME_SLIDER.value = String(vol)
  })
  .catch((err) => {
    console.error(err)
    console.error((err as Error).stack)
    // FIXME: display to the user if text can't be extracted from the pdf
    // FIXME: display to the user is there is some other error
  })

