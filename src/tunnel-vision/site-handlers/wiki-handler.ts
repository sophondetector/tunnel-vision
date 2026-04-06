import { blankDelay, TvHandler } from "./handler-utilities"

function wikipediaElementGetter(): Array<Element> | null {
  const candidates = ['#mw-content-text', '#bodyContent']
  let mainContent

  for (const cand of candidates) {
    mainContent = document.querySelector(cand)
    if (mainContent) break
  }

  if (!mainContent) {
    console.log('wikipediaElementGetter: could not find main content!')
    return null
  }

  let paras;
  paras = Array(...mainContent.querySelectorAll('p, h1, h2, h3, h4, h5'))
  if (paras.length === 0) {
    console.log('wikipediaElementGetter: could not find any paragraphs in main content!')
    return null
  }

  const headline = document.querySelector('#firstHeading')
  if (headline) {
    paras = [headline].concat(paras)
  }

  return paras
}

export const wikipediaHandler: TvHandler = {
  getTvElements: wikipediaElementGetter,
  getScrollableElement: () => null,
  initDelay: blankDelay
}

