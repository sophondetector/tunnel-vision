import { blankDelay, TvHandler } from "./handler-utilities"

const SCROLLABLE_ELE_LECS = [
  '#post-viewer > div > div > div.pencraft.pc-display-flex.pc-flexDirection-column.flexGrow-tjePuI.pc-reset.content-cFaSRD > div.pencraft.pc-display-flex.pc-flexDirection-column.flexGrow-tjePuI.pc-reset.post-XKrpvd',
  '#post-viewer > div > div > div.pencraft.pc-display-flex.pc-flexDirection-column.flexGrow-tjePuI.pc-reset.content-cFaSRD > div'
]

export function isActuallySubstack(): boolean {
  return document.querySelector('link[href="https://substackcdn.com"]') ? true : false
}

// TODO: event listener for article fetch
// TODO: dfs for the first element that satisfies this
function isScrollable(ele: Element): boolean {
  const map = ele.computedStyleMap()
  const overflowY = map.get('overflow-y')
  return (overflowY == 'scroll' || overflowY == 'auto')
}

async function substackScrollableElement(): Promise<Element | null> {
  for (const lec of SCROLLABLE_ELE_LECS) {
    const ele = document.querySelector(lec)
    if (ele && isScrollable(ele)) {
      return ele
    }
  }
  console.error('substackScrollableElement: could not find scrollable element')
  return null
}

async function substackElementGetter(): Promise<Element[] | null> {
  let mainContent;

  mainContent = document.querySelectorAll('h1, h3, p, .captioned-image-container, a.weight-bold-DmI9lw')
  if (mainContent.length > 0) {
    return Array(...mainContent)
  }

  mainContent = document.querySelector('#entry > div.reader-nav-root.reader2-font-base > div.reader-nav-page')
  if (mainContent) return [mainContent]

  return null
}

export const substackHandler: TvHandler = {
  getTvElements: substackElementGetter,
  getScrollableElement: substackScrollableElement,
  initDelay: blankDelay,
  mutationHandler: null
}
