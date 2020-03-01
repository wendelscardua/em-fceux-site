# em-fceux-site

https://bitbucket.org/tsone/em-fceux-site/

A web Nintendo Entertainment System/Famicom (NES/FC) emulator.

Try it at https://tsone.kapsi.fi/em-fceux/.

The emulation is achieved with [em-fceux](https://bitbucket.org/tsone/em-fceux/), an [Emscripten](http://emscripten.org) port of the [FCEUX](http://www.fceux.com/) emulator.

## Features

- Real-time emulation with low input latency.
- Save states and battery-backed SRAM.
- Support for two game controllers.
- Zapper support.
- Custom keyboard and gamepad input bindings.
- Support for NES, ZIP and NSF file formats.
- NTSC and PAL modes.
- NTSC composite video emulation.
- CRT TV emulation.

## Setup

1. Have [npm](https://www.npmjs.com/get-npm).
   - Note: Emscripten SDK (emsdk) has `npm` built-in. Use `source emsdk_env.sh` to set it to env.
2. Run `npm install`.

## Build

`npm start` for development build (`webpack-dev-server`).

`npm run build` for a release build. Result will be at `dist/`.

## Browser Requirements

- [WebAssembly](https://webassembly.org/).
- [WebGL](https://www.khronos.org/webgl/).
- [Web Audio API](https://www.w3.org/TR/webaudio/).
- [Web Storage API (localStorage)](https://html.spec.whatwg.org/multipage/webstorage.html).
- [Gamepad API](https://www.w3.org/TR/gamepad/).

## Contact

Authored by Valtteri "tsone" Heikkilä. See git commits for email.

Please submit bugs and feature requests in the em-fceux project [issue tracker](https://bitbucket.org/tsone/em-fceux/issues/).

## License

Licensed under [GNU GPL 2](https://www.gnu.org/licenses/gpl-2.0.txt) excluding the built-in games which are distributed by permission from the authors.
