# em-fceux-site

https://bitbucket.org/tsone/em-fceux-site/

Nintendo Entertainment System / Famicom emulator for the web.

Try it at https://tsone.kapsi.fi/em-fceux/.

## Overview

The emulator uses [em-fceux](https://bitbucket.org/tsone/em-fceux/) emulation
core. Among other things it supports battery-backed save RAM, save states, input
bindings (also to gamepad/joystick). It also has NTSC video signal and CRT TV
emulation, and a "stack of games" for that 80's/90's retro gaming experience.

## Features

- NTSC and PAL system emulation.
- Save states and battery-backed SRAM.
- Support for two game controllers.
- Zapper support.
- Customizeable input bindings to keyboard or gamepad/joysticks.
- Support for .nes, .zip and .nsf game file formats (drag and drop).
- NTSC composite video emulation.
- CRT TV screen emulation.

## Setup

1. Have [npm](https://www.npmjs.com/get-npm).
   - Note, Emscripten has `npm`, and it's set to env by `source emsdk_env.sh`.
2. Run `npm install`.

## Build

`npm start` for development build, running `webpack-dev-server`.

`npm run build` for a release build, with result at `dist/`.

## Browser Requirements

- WebAssembly.
- WebGL.
- Web Audio API.
- localStorage.
- Gamepad API.

Recent Chrome, Firefox or macOS Safari will work.

## Contact

Authored by Valtteri "tsone" Heikkilä. See git commits for email.

Please submit bugs and feature requests at
[em-fceux issue tracker](https://bitbucket.org/tsone/em-fceux/issues/).

## Legal

Licensed under [GNU GPL Version 2](https://www.gnu.org/licenses/gpl-2.0.txt).

Built-in games are distributed by permission from the authors.
