import * as pdfjsLib from 'pdfjs-dist'
//@ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { initializeTV, getDirector } from './initialize-tv';
import { getCurrentTab, LATEST_PDF_URL_KEY, storePDFUrlInLocalStorage } from './common';
import { Z_INDEX } from './tunnel-vision/tv-screen';

// TODO: make icon change color when (1) unavailable (2) ranged successfully or (3) tried to range but error
// FIXME: auto scrolling the range into view doesn't work in the pdf viewer

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const DEFAULT_SCALE = 2
const MAX_SCALE = 4
const MIN_SCALE = .5
const SCALE_INC = .2

const CANVAS: HTMLCanvasElement = document.getElementById('the-canvas') as HTMLCanvasElement;
const CONTEXT = CANVAS.getContext('2d') as CanvasRenderingContext2D

const SIDEBAR_MIN_WIDTH = 100
const SIDEBAR_MAX_WIDTH = 1000

const SIDEBAR = document.getElementById('sidebar') as HTMLElement;
const RESIZER = document.getElementById('resizer') as HTMLElement;

const SCREEN_TOGGLE = document.getElementById('screen-toggle') as HTMLButtonElement
const OPACITY_SLIDER = document.getElementById('opacity-slider') as HTMLInputElement
const OPACITY_DISPLAY = document.getElementById('opacity-display') as HTMLInputElement
const COLOR_PICKER = document.getElementById('color-picker') as HTMLInputElement
const SOUND_TOGGLE = document.getElementById('sound-toggle') as HTMLButtonElement
const SOUND_DISPLAY = document.getElementById('sound-display') as HTMLSpanElement
const ZOOM_IN = document.getElementById('zoom-in') as HTMLButtonElement
const ZOOM_OUT = document.getElementById('zoom-out') as HTMLButtonElement
// const ZOOM_FIT = document.getElementById('zoom-fit') as HTMLButtonElement
const ZOOM_DISPLAY = document.getElementById('zoom-display') as HTMLSpanElement

let PDF_PATH: null | string = null
let PAGE_NUM: number = 1
let PDF_DOC: null | pdfjsLib.PDFDocumentProxy = null
let IS_RESIZING = false;
let ZOOM_SCALE = DEFAULT_SCALE

function zoomIn(): void {
  if (ZOOM_SCALE >= MAX_SCALE) return
  ZOOM_SCALE += SCALE_INC
  const dir = getDirector()
  const idx = dir.getRangeIdx()
  renderPage()
    .then(renderTextLayer)
    .then(initRanges)
    .then(() => dir.setRangeIdx(idx))
    .then(displayZoomPercent)
}

function zoomOut(): void {
  if (ZOOM_SCALE <= MIN_SCALE) return
  ZOOM_SCALE -= SCALE_INC
  const dir = getDirector()
  const idx = dir.getRangeIdx()
  renderPage()
    .then(renderTextLayer)
    .then(initRanges)
    .then(() => dir.setRangeIdx(idx))
    .then(displayZoomPercent)
}

// TODO: implement zoomFit
// function zoomFit(): void {
//   console.log(`zoom fit!`)
//   displayZoomPercent()
// }

function getScalePercent(): number {
  return (ZOOM_SCALE / MAX_SCALE) * 100
}

function displayZoomPercent(): void {
  const numString = getScalePercent().toFixed()
  ZOOM_DISPLAY.textContent = `${numString}%`
}

async function displaySound(): Promise<void> {
  const dir = getDirector()
  const isOn = await dir.soundIsOn()
  if (isOn) {
    SOUND_DISPLAY.textContent = 'Sound is On'
    return
  }
  SOUND_DISPLAY.textContent = 'Sound is Off'
}

function id2Key(id: number): string {
  return `${id}-tvpdf`
}

async function getLatestPDFUrl(): Promise<string> {
  const res = await chrome.storage.local.get(LATEST_PDF_URL_KEY)
  return res[LATEST_PDF_URL_KEY]
}

/**
 * first get tab
 * query localStorage tab.id-tvpdf for pdf url
 * if there is return that pdf url
 * else fetch last pdf url then upload to localStorage w/ key `tab.id-tvpdf` 
 */
async function getPDFUrl(): Promise<string> {
  const tab = await getCurrentTab()
  const key = id2Key(tab.id!)

  const obj = await chrome.storage.local.get(key)
  const res = obj[key]

  if (res) return res

  const latestUrl = await getLatestPDFUrl()
  await storePDFUrlInLocalStorage(key, latestUrl)

  return latestUrl
}

async function renderPage(): Promise<void> {
  if (PDF_DOC === null) {
    console.warn(`renderPage: PDF_DOC is null!`)
    return
  }

  const page = await PDF_DOC.getPage(PAGE_NUM)
  const viewport = page.getViewport({ scale: ZOOM_SCALE });

  // Canvas resolution (backing store) at device pixels
  CANVAS.width = Math.round(viewport.width);
  CANVAS.height = Math.round(viewport.height);

  // IMPORTANT: CSS size = logical / CSS pixels (what text layer uses!)
  const cssWidth = Math.floor(viewport.width);
  const cssHeight = Math.floor(viewport.height);
  CANVAS.style.width = `${cssWidth}px`;
  CANVAS.style.height = `${cssHeight}px`;

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
  const viewport = page.getViewport({ scale: ZOOM_SCALE });
  const cssWidth = Math.floor(viewport.width);
  const cssHeight = Math.floor(viewport.height);

  const textLayerDiv = document.querySelector('#text-layer') as HTMLDivElement
  textLayerDiv.innerHTML = '';

  textLayerDiv.style.setProperty('--scale-factor', viewport.scale.toString());

  // Position & size MUST match canvas CSS pixels exactly
  textLayerDiv.style.position = 'absolute';
  textLayerDiv.style.left = `${CANVAS.offsetLeft}px`;
  textLayerDiv.style.top = `${CANVAS.offsetTop}px`;
  textLayerDiv.style.width = `${cssWidth}px`;
  textLayerDiv.style.height = `${cssHeight}px`;

  // NOTE: Grok put these here but they seem un-necessary - leaving commented out for now
  // Optional: force pointer events & selection
  // textLayerDiv.style.pointerEvents = 'all';
  // textLayerDiv.style.userSelect = 'text';

  const textLayer = new pdfjsLib.TextLayer({
    textContentSource: page.streamTextContent(),
    container: textLayerDiv,
    viewport: viewport,
  });

  await textLayer.render();
}

function setPageNumText(): void {
  document.getElementById('page_num')!.textContent = PAGE_NUM.toString()
}

async function initRanges(): Promise<void> {
  const dir = getDirector()
  if (!dir) {
    console.error(`renderPage: ERROR could not get director`)
    return
  }
  dir.initRanges()
}

ZOOM_IN.addEventListener('click', zoomIn)

ZOOM_OUT.addEventListener('click', zoomOut)

// ZOOM_FIT.addEventListener('click', zoomFit)

document.getElementById('prev')!.addEventListener('click', function () {
  if (PAGE_NUM <= 1) {
    return;
  }
  PAGE_NUM--;
  renderPage()
    .then(renderTextLayer)
    .then(initRanges)
    .then(setPageNumText)
});

document.getElementById('next')!.addEventListener('click', function () {
  if (PAGE_NUM >= PDF_DOC!.numPages) {
    return;
  }
  PAGE_NUM++;
  renderPage()
    .then(renderTextLayer)
    .then(initRanges)
    .then(setPageNumText)
});

document.getElementById('re-range')!.addEventListener('click', function () {
  initRanges().then(() => {
    console.log('re-range done')
  })
})

window.addEventListener('beforeunload', async () => {
  const tab = await getCurrentTab() as chrome.tabs.Tab
  const key = id2Key(tab.id as number)
  await chrome.storage.local.remove(key)
}, {
  capture: true
})

//@ts-ignore
RESIZER.addEventListener('mousedown', (e) => {
  IS_RESIZING = true;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

SCREEN_TOGGLE.addEventListener('click', () => {
  const dir = getDirector()
  dir.toggleScreen()
})

SOUND_TOGGLE.addEventListener('click', async () => {
  const dir = getDirector()
  dir.toggleSound().then(displaySound)
})

OPACITY_SLIDER.addEventListener('input', (event) => {
  //@ts-ignore
  const value = event.target.value
  const dir = getDirector()
  dir.setScreenOpacity(value)
  OPACITY_DISPLAY.textContent = `${value}%`
})

COLOR_PICKER.addEventListener('input', (event) => {
  const dir = getDirector()
  //@ts-ignore
  const value = event.target.value
  dir.setScreenColor(value)
})

// FIXME: when resizing with a selection the selection is destroyed and it defaults
// to a range

document.addEventListener('mousemove', (e) => {
  if (!IS_RESIZING) return;
  const newWidth = e.clientX;   // distance from left edge
  if (newWidth > SIDEBAR_MIN_WIDTH && newWidth < SIDEBAR_MAX_WIDTH) {   // min/max limits
    SIDEBAR.style.width = `${newWidth}px`;
    const dir = getDirector()
    // FIXME: is there a more performance friendly way to redraw the screen
    // when the sidebar moves? when moving to next range the screen is in the 
    // right position WITHOUT having to fire the onResizeCallback
    if (!dir) {
      console.log('mousemove callback: could not get director!')
      return
    }
    dir.onResizeCallback(dir)
  }
});

document.addEventListener('mouseup', () => {
  IS_RESIZING = false;
  document.body.style.cursor = 'default';
  document.body.style.userSelect = 'auto';
});

SIDEBAR.style.zIndex = (Number(Z_INDEX) + 1).toString()
RESIZER.style.zIndex = (Number(Z_INDEX) + 1).toString()

getPDFUrl()
  .then((path) => PDF_PATH = path)
  .then(async () => {
    if (!PDF_PATH) {
      throw new Error(`pdf-reader.ts: ERROR PDF_PATH is null!`)
    }
    return pdfjsLib.getDocument(PDF_PATH).promise
  })
  .then((pdfDocProxy) => {
    PDF_DOC = pdfDocProxy
    document.getElementById('page_count')!.textContent = PDF_DOC.numPages.toString()
  })
  .then(renderPage)
  .then(renderTextLayer)
  .then(initializeTV)
  .then(setPageNumText)
  .then(displayZoomPercent)
  .then(displaySound)
  .catch((err) => console.error(err))

