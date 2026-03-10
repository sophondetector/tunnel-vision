import { initializeTV } from "./initialize-tv";

initializeTV()

// TODO: integrate the below pattern into the initializeTV function
// so the elementGetter doesn't fire until some condition is met

// NOTE: THIS IS A "ROUGH AND READY" SOLUTION FOR SITES WHERE THE 
// ELEMENT GETTER IS FIRING BEFORE THE SITE IS LOADED

// const WAIT = 5000
//
// setTimeout(
//   () => {
//     console.log(`initting after ${WAIT} milliseconds`)
//     initializeTV()
//   },
//   5000
// )
//
