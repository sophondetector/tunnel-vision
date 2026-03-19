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

// NOTE: function for discovering the scrollable element
// start somewhere deep in the page and recurse upwards
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

export function waitForSelector(selector: string, root: Element | Document, timeout: number = 10_000): Promise<Element | Error> {
  return new Promise((resolve, reject) => {
    // Fast path: already exists
    const found = root.querySelector(selector);
    if (found) {
      resolve(found);
      return;
    }

    //@ts-ignore
    const observer = new MutationObserver((mutations, obs) => {
      const element = root.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    // Optional: reject after timeout
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`waitForSelector timed out after ${timeout}ms: ${selector}`));
    }, timeout);

    // Cleanup if promise is rejected/cancelled early
    // (optional – many people skip this)
    // But nice to have:
    // reject = (err) => { observer.disconnect(); clearTimeout(timer); origReject(err); }
  });
}

// const lec = "div[data-testid='primaryColumn']"
//
// waitForSelector(lec, document, 10_000).then((ele) => {
//   console.log(ele)
//
// create a new instance of `MutationObserver` named `observer`,
// passing it a callback function

// TODO: add generalizable reRangeEvent listener
// TODO: use this mutation observer as a base to add a dynamic content observer 

// const observer = new MutationObserver((ev) => {
//   for (const rec of ev) {
//     if (rec.type !== "childList") continue
//     if (rec.addedNodes.length < 1) continue
//     for (const node of rec.addedNodes) {
//       console.log(`added text: ${node.textContent}`)
//     }
//   }
// });

// call `observe()`, passing it the element to observe, and the options object

// const ele = document.querySelector(lec)

// if (ele) {
//   console.log('found ele')
//   observer.observe(ele, {
//     subtree: true,
//     childList: true,
//   });
// }
//
// })
//   .catch((err) => console.error(err))
