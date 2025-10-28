import { TvHandler } from "./reedy-handler-type"

function mdnElementGetter(): Array<Element> | null {
	let mainContent;

	mainContent = document.querySelector('article')
	if (mainContent) return [mainContent]

	return null
}

export const mdnHandler: TvHandler = {
	getReedyElements: mdnElementGetter,
	getScrollableElement: () => undefined
}
