import { initDirectorForChromeExtension } from "./initialize-tv";

function weAreOnVisionPdfWebApp(): boolean {
  const host = window.location.hostname
  return host === "visionpdf.dev" || host.endsWith(".visionpdf.dev")
}

if (weAreOnVisionPdfWebApp()) {
  console.log("on visionpdf.dev - skipping extension director")
} else {
  initDirectorForChromeExtension()
}

