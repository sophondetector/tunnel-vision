import * as pdfjsLib from 'pdfjs-dist'
//@ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { TvDirector } from "./tunnel-vision/index.js"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const PDF_PATH = '../test-pdf.pdf'
const SCALE = 2
// TODO FIXME: sometimes have to force sx/sy to be 1 to work - have no idea why
// const OUTPUT_SCALE = { sx: window.devicePixelRatio || 1, sy: window.devicePixelRatio || 1 }
const OUTPUT_SCALE = { sx: 1, sy: 1 }
const CANVAS: HTMLCanvasElement = document.getElementById('the-canvas') as HTMLCanvasElement;
const CONTEXT = CANVAS.getContext('2d') as CanvasRenderingContext2D


const loadingTask = pdfjsLib.getDocument(PDF_PATH)

loadingTask.promise
  .then(async (pdf) => pdf.getPage(1))
  .then(async function (page) {
    let viewport = page.getViewport({ scale: SCALE });

    // Canvas resolution (backing store) at device pixels
    CANVAS.width = Math.round(viewport.width * OUTPUT_SCALE.sx);
    CANVAS.height = Math.round(viewport.height * OUTPUT_SCALE.sy);

    // IMPORTANT: CSS size = logical / CSS pixels (what text layer uses!)
    const cssWidth = Math.floor(viewport.width);
    const cssHeight = Math.floor(viewport.height);
    CANVAS.style.width = `${cssWidth}px`;
    CANVAS.style.height = `${cssHeight}px`;

    await page.render({
      canvasContext: CONTEXT,
      viewport: viewport,
    }).promise;

    // Text layer setup
    const textLayerDiv = document.querySelector('#text-layer') as HTMLDivElement
    textLayerDiv.innerHTML = '';

    textLayerDiv.style.setProperty('--scale-factor', viewport.scale.toString());

    // Position & size MUST match canvas CSS pixels exactly
    textLayerDiv.style.position = 'absolute';
    textLayerDiv.style.left = `${CANVAS.offsetLeft}px`;
    textLayerDiv.style.top = `${CANVAS.offsetTop}px`;
    textLayerDiv.style.width = `${cssWidth}px`;
    textLayerDiv.style.height = `${cssHeight}px`;

    // NOTE: Grok put these here but they seem un-necessary
    // Leaving commented out for now
    // Optional: force pointer events & selection
    // textLayerDiv.style.pointerEvents = 'all';
    // textLayerDiv.style.userSelect = 'text';

    const textLayer = new pdfjsLib.TextLayer({
      textContentSource: page.streamTextContent(),
      container: textLayerDiv,
      viewport: viewport,
    });

    await textLayer.render();
  }).then(function () {
    // NOTE: This is a copy of content.ts with some tweaks to the logging messages
    // This is the only way I have found to make sure that the TvDirector is initted 
    // AFTER the pdf and text layers are fully loaded

    const RESIZE_DEBOUNCE_MILLIS = 500

    let DEBOUNCE_TIMEOUT_ID: undefined | number = undefined
    let DIRECTOR: TvDirector | null = null

    // TODO set control-panel messages as constants
    // receives messages from options.ts control-panel
    // @ts-ignore
    chrome.runtime.onMessage.addListener(function (value: string, sender, sendResponse) {
      if (DIRECTOR === null) {
        throw new Error(`tv pdf-reader.ts: Director is null!`)
      }

      // console.log('pdf-reader.ts: value received: ', value)

      try {

        // TODO change these to some kind of enum
        if (value === "toggle screen") {

          DIRECTOR.toggleScreen()

        } else if (value === "get state") {

          const stateResponse = DIRECTOR.getScreenState()
          sendResponse(stateResponse)

        } else if (value.match(/^\d+$/)) {

          if (!DIRECTOR.isOn()) return
          const valueNum = Number(value)
          DIRECTOR.setScreenOpacity(valueNum)

          // if its a color
        } else if (value.match(/^#[0-9a-f]{6}$/)) {

          if (!DIRECTOR.isOn()) return
          DIRECTOR.setScreenColor(value)

        } else {

          console.log(`tv pdf-reader.ts: Unknown message received!!`)
          console.log(`message value: ${value}`)
          console.log(`message sender: ${sender}`)

        }

      } catch (err) {
        console.error(`tv pdf-reader.ts ERROR: Error trying to read input from control panel`)
        console.error(err)
      }
    })

    // TODO alt+click+drag creates a highlight box
    // bring that in from grok-code.html
    document.addEventListener('keyup', (event) => {
      if (DIRECTOR === null) return
      switch (event.key) {
        case "l":
          event.altKey && DIRECTOR.toggleScreen()
          break;
        case "ArrowDown":
        case "j":
          if (DIRECTOR.isOn() && event.altKey) {
            // event.shiftKey only works in the case of arrow keys
            // shift + alt + j is handled as capital "J" case below
            if (event.shiftKey) {
              DIRECTOR.shiftRangeDown()
              break
            }
            DIRECTOR.incRange()
          }
          break;
        case "ArrowUp":
        case "k":
          if (DIRECTOR.isOn() && event.altKey) {
            // event.shiftKey only works in the case of arrow keys
            // shift + alt + k is handled as capital "K" case below
            if (event.shiftKey) {
              DIRECTOR.shiftRangeUp()
              break
            }
            DIRECTOR.decRange()
          }
          break;
        case "J":
          if (DIRECTOR.isOn() && event.altKey) {
            DIRECTOR.shiftRangeDown()
          }
          break
        case "K":
          if (DIRECTOR.isOn() && event.altKey) {
            DIRECTOR.shiftRangeUp()
          }
          break
        default:
          break;
      }
    })

    DIRECTOR = new TvDirector()
    DIRECTOR.toggleScreenOff()

    window.onresize = () => {
      clearTimeout(DEBOUNCE_TIMEOUT_ID)
      DEBOUNCE_TIMEOUT_ID = setTimeout(
        () => DIRECTOR!.onResizeCallback(),
        RESIZE_DEBOUNCE_MILLIS) as unknown as number
    }

    console.log(`tv pdf init complete`)

  })

