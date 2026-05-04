import { initDirectorForChromeExtension } from "./initialize-tv";

// TODO: a more "bullet-proof" check for whether we're on the web app
function weAreOnPdfWebApp(): boolean {
  return document.querySelector('#viewerContainer') ? true : false
}

if (!weAreOnPdfWebApp()) {
  initDirectorForChromeExtension()
} else {
  // TODO: inject a link to the extension viewer "its better in the extension viewer"
  console.log("using web app director - skipping extension director")
}

