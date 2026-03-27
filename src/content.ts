import { initializeTV } from "./initialize-tv";

initializeTV()
  .then(() => console.log('SUCCESS'))
  .catch((err) => {
    console.log('ERROR')
    console.log(err)
  })

