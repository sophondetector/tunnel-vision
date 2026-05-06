import { initDirectorForChromeExtension } from "./initialize-tv";

function weAreOnPdfWebApp(): boolean {
  return document.title === "Vision PDF"
}

if (weAreOnPdfWebApp()) {
  // TODO: inject a link to the extension viewer "its better in the extension viewer"
  console.log("using web app director - skipping extension director")
} else {
  initDirectorForChromeExtension()
}

