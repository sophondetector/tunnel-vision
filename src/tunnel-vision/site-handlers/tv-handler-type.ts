export interface TvHandler {
  getTvElements: () => Array<Element> | null
  getScrollableElement: () => Element | undefined
  initDelay: () => Promise<void>
}

export function defaultBlankDelay(): Promise<void> {
  return new Promise(res => {
    res()
  })
}

function isScrollable(el: Element): boolean {
  return el.scrollHeight > el.clientHeight
}

// NOTE: FUNCTION FOR DISCOVERING THE SCROLLABLE ELEMENT
// START SOMEWHERE DEEP IN THE PAGE AND RECURSE UPWARDS
export function discoverScrollable(deepSelector: string, logElement: boolean = false): Element | undefined {

  let ele = document.querySelector(deepSelector)
  if (!ele) {
    console.error(`discoverScrollable: selector ${deepSelector} did not return an element!`)
    return undefined
  }

  while (!isScrollable(ele)) {
    ele = ele.parentElement as Element
    if (!ele) {
      console.log('discoverScrollable: could not find scrollable ele')
      return undefined
    }
  }

  console.log(`discoverScrollable: found scrollable ele`)
  if (logElement) {
    console.log(ele)
  }

  return ele
}

// TODO: add generalizable reRangeEvent listener

// TODO: use this mutation observer as a base to add a dynamic content observer 
// lec = "body"
// // create a new instance of `MutationObserver` named `observer`,
// // passing it a callback function
// const observer = new MutationObserver(() => {
//   console.log("callback that runs when observer is triggered");
// });
//
// // call `observe()`, passing it the element to observe, and the options object
// observer.observe(document.querySelector(lec), {
//   subtree: true,
//   childList: true,
// });
//
