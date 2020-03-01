# em-fceux-site

https://bitbucket.org/tsone/em-fceux-site/

Nintendo Entertainment System/Famicom (NES/FC) emulator on the web.

Try it at https://tsone.kapsi.fi/em-fceux/.

The emulator uses [em-fceux](https://bitbucket.org/tsone/em-fceux/), an
[Emscripten](http://emscripten.org) port of the [FCEUX](http://www.fceux.com/)
emulator.

## Build

Setup:

1. Have [npm](https://www.npmjs.com/get-npm).
2. Run `npm install`.

For development, run `npm start` to start `webpack-dev-server` at
http://localhost:8080/.

For release, run `npm run build` to create a deployable site in `dist/`.

## Contact

Authored by Valtteri "tsone" Heikkilä. See git commits for email.

Please submit bugs and feature requests in the
[em-fceux issue tracker](https://bitbucket.org/tsone/em-fceux/issues/).

## License

Licensed under [GNU GPL 2](https://www.gnu.org/licenses/gpl-2.0.txt) excluding
the built-in games. The games are distributed by permission from the authors.
