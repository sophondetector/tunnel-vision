export interface TvHandler {
	getTvElements: () => Array<Element> | null
	getScrollableElement: () => Element | undefined
}

// TODO experiment with making ^^^ a class

// TODO add generalizable reRangeEvent listener

// TODO use this mutation observer as a base to add a dynamic content observer 
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
