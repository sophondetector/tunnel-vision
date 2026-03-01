import { TvHandler } from "./tv-handler-type"

function getArticleEle(): HTMLElement[] | null {
  const articles = Array.from(document.querySelectorAll('article'))
  if (articles.length > 0) {
    console.log("getArticleEle: found!")
    return articles
  }
  return null
}

function getGenericTextEles(): Array<Element> | null {
  const genericLec = 'h1, h2, h3, p, ol, ul'
  const res = document.querySelectorAll(genericLec)
  if (res.length > 0) {
    console.log('getGenericTextEles: success!')
    return Array(...res)
  }
  return null
}

function getBodyChildWithMostText(): Element | null {
  const candidates = document.querySelectorAll('body > *')
  let winner;
  let maxLen = 0;
  for (const cand of candidates) {
    //@ts-ignore
    if (cand.checkVisibility() && cand.innerText && cand.innerText.length > maxLen) {
      winner = cand
      //@ts-ignore
      maxLen = cand.innerText.length
    }
  }

  if (winner) {
    console.log("getBodyChildWithMostText: found!")
    console.log(winner)
    return winner
  }

  return null
}

export function genericElementGetter(): Array<Element> | null {
  let res: Element | Array<Element> | null = null;

  res = getArticleEle()
  if (res) return res

  res = getGenericTextEles()
  if (res) return res

  res = getBodyChildWithMostText()
  if (res) return [res]

  console.error('genericElementGetter: failed')
  return null

}

export const genericHandler: TvHandler = {
  getTvElements: genericElementGetter,
  getScrollableElement: () => undefined
}
