# Tunnel Vision
Tunnel Vision is a Chrome extension to help you read stuff and eliminate distractions on the Internet. 
Tunnel Vision helps you read by darkening the screen except for a single line, so you can read them one at a time.

## Development
Tunnel Vision is written in `typescript`, and built with `vite` and `crxjs`. 

## Installation
### Building
There's no "official" distribution yet, so you gotta install all the dev dependencies and then build it yourself.
```sh
$ npm i -D
$ npm run build
```
This will create the source code in the `dist/` folder. You can then install it as an unpacked chrome extension. 

### Loading an Unpacked Chrome Extension
1. Do the build steps above
1. In Chrome, navigate to `chrome://extensions`
1. Ensure `Developer mode` is on (upper right corner)
1. Click `Load unpacked` (upper left corner)
1. Navigate to the `dist/` folder you created in the build steps above
1. Load the `dist/` folder

## Usage
<div> Press <b>alt-l</b> to turn the tv-screen on and off.</div>
<div> You can also click Tunnel Vision icon and then click the <b>Tunnel Vision Screen On/Off</b> button.</div>
<div> <b>alt + up arrow</b> to move the highlighted range up.</div>
<div> <b>alt + down arrow</b> to move the highlighted range down.</div>
<div> You can also use <b>alt + j</b> and <b>alt + k</b>.</div>
<div> When the screen is on, you may <b>click on the line you wish to highlight.</b></div>

## Plans
* pdf mode built off of `pdfjs`
* highlighting an arbitrary range of lines
* highlighting by html element
* click/drag to create a highlight box
* click/drag to highlight an arbitrary range of lines

## Copyright
Copyright (c) 2025 Nathaniel Taylor
