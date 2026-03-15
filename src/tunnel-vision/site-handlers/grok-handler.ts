import { TvHandler } from "./tv-handler-type"

function grokElementGetter(): Array<Element> | null {
  const content = document.querySelector('main')
  if (!content) return null
  return [content]
}

// NOTE: THIS IS USEFUL FOR THE COMMENTED OUT FIND SCROLLABLE ELEMENT PATTERN BELOW
// function isScrollable(el: Element): boolean {
//   return el.scrollHeight > el.clientHeight
// }

function grokGetScrollable(): Element | undefined {
  return document.querySelector('main div.scrollbar-gutter-stable') ?? undefined


  // NOTE: THIS IS A USEFUL PATTERN FOR DISCOVERING THE SCROLLABLE ELEMENT
  // START SOMEWHERE DEEP IN THE PAGE AND RECURSE UPWARDS
  //
  // let ele = document.querySelector('main p') as Element
  //
  // while (!isScrollable(ele)) {
  //   ele = ele.parentElement as Element
  //   if (!ele) {
  //     console.log('grokHandler: could not find scrollable ele')
  //     return undefined
  //   }
  // }
  //
  // console.log(`grokHandler: found scrollable ele`)
  // console.log(ele)
  // return ele
}

export const grokHandler: TvHandler = {
  getTvElements: grokElementGetter,
  getScrollableElement: grokGetScrollable
}
