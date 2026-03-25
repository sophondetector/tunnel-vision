# Tunnel Vision
Tunnel Vision is a Chrome extension to help you read stuff and eliminate distractions on the Internet. 
Tunnel Vision helps you read by darkening the screen except for a single line, so you can read them one at a time.

## Development
Tunnel Vision is written in `typescript`, and built with `vite` and `crxjs`.

### Logo
To modify the logo do the following:
1. Open `logo/Logo.xcf` in GIMP
1. Make the desired modifications
1. Export as `logo/Base-Logo.png`
1. Run `. create-icons.sh`

## Installation
### Building
```sh
$ npm i -D
$ npm run build
```
This will create the source code in the `dist/` folder. You can then install it as an unpacked chrome extension. 

### Installing as an Unpacked Chrome Extension
1. Do the build steps above
1. In Chrome, navigate to `chrome://extensions`
1. Ensure `Developer mode` is on (upper right corner)
1. Click `Load unpacked` (upper left corner)
1. Navigate to the `dist/` folder you created in the build steps above
1. Load the `dist/` folder

## Usage
<div> Press <b>alt-l</b> to turn the tv-screen on and off.</div>
<div>You can also click Tunnel Vision icon and then click the <b>Tunnel Vision Screen On/Off</b> button.</div>
<div>Press Sound On/Off button to toggle the sound which plays when moving up/down a line</div>
<div> <b>alt + up arrow</b> to move the highlighted range up.</div>
<div> <b>alt + down arrow</b> to move the highlighted range down.</div>
<div>You can also use <b>alt + j</b> and <b>alt + k</b>.</div>
<div>When the screen is on, you may <b>click on the line you wish to highlight.</b></div>
<div>If you select text while the screen is off, that text will be highlighted when the screen is turned on.</div>

## Copyright
Copyright (c) 2025 Nathaniel Taylor
