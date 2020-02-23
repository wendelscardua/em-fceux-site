/**
 * @license
 *
 * Copyright (C) 2015  Valtteri "tsone" Heikkila
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import FCEUX, { FceuxModule } from 'em-fceux';
import { Input } from './input';
import { InputDialog } from './input-dialog';

interface Game {
  label: string;
  url: string;
  offset: number;
  deletable: boolean;
}

export class Elements {
  cartProto = <HTMLDivElement>document.getElementById('cartProto');
  catchDiv = <HTMLDivElement>document.getElementById('catchDiv');
  catchGamepad = <HTMLSpanElement>document.getElementById('catchGamepad');
  catchKey = <HTMLSpanElement>document.getElementById('catchKey');
  catchName = <HTMLSpanElement>document.getElementById('catchName');
  controllersToggle = <HTMLInputElement>document.getElementById('controllersToggle');
  keyBindDiv = <HTMLDivElement>document.getElementById('keyBindDiv');
  keyBindProto = <HTMLTableRowElement>document.getElementById('keyBindProto');
  keyBindTable = <HTMLTableElement>document.getElementById('keyBindTable');
  soundIcon = <HTMLDivElement>document.getElementById('soundIcon');
  stack = <HTMLDivElement>document.getElementById('stack');
  stackContainer = <HTMLDivElement>document.getElementById('stackContainer');
  stackToggle = <HTMLInputElement>document.getElementById('stackToggle');
}

export class App {
  _el = new Elements();
  _inputDialog: InputDialog;

  private _games: Game[] = [];
  private _fceux: FceuxModule;
  _input: Input;

  private _gameLoadedListener = this.handleGameLoaded.bind(this);
  private _dropListener = this.handleDrop.bind(this);
  private _dragListener = (ev: DragEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
  };
  private _contextLostListener = (ev: Event) => {
    // TODO: Handle context loss, see: http://www.khronos.org/registry/webgl/specs/latest/1.0/#5.15.2
    alert('WebGL context lost. You will need to reload the page.');
    ev.preventDefault();
  };
  private _beforeUnloadListener = (ev: BeforeUnloadEvent) => {
    ev.preventDefault();
    ev.returnValue = '';
  };

  private _saveFilesInterval = 0;

  constructor(fceux: FceuxModule) {
    this._fceux = fceux;
    this._input = new Input(fceux.canvas, fceux);
    this._inputDialog = new InputDialog(this._el, this._input);

    this.updateGames();
    this.updateStack();
    this.showStack(true);

    this.initConfig(false);

    fceux.addEventListener('game-loaded', this._gameLoadedListener);
    document.addEventListener('dragenter', this._dragListener, false);
    document.addEventListener('dragleave', this._dragListener, false);
    document.addEventListener('dragover', this._dragListener, false);
    document.addEventListener('drop', this._dropListener, false);
    fceux.canvas.addEventListener('webglcontextlost', this._contextLostListener, false);
    window.addEventListener('beforeunload', this._beforeUnloadListener);

    // Export saves to localStorage at interval.
    this._saveFilesInterval = window.setInterval(() => {
      const md5 = fceux.gameMd5();
      if (md5) {
        const save = fceux.exportSaveFiles();
        for (let filename in save) {
          save[filename] = Array.from(save[filename]);
        }
        localStorage['save-' + md5] = JSON.stringify(save);
      }
    }, 1000);

    const updateLoop = () => {
      requestAnimationFrame(updateLoop);
      this._input.update();
      fceux.update();
    };
    updateLoop();
  }

  dispose() {
    clearInterval(this._saveFilesInterval);

    window.removeEventListener('beforeunload', this._beforeUnloadListener);
    this._fceux.canvas.removeEventListener('webglcontextlost', this._contextLostListener, false);
    document.removeEventListener('drop', this._dropListener, false);
    document.removeEventListener('dragover', this._dragListener, false);
    document.removeEventListener('dragleave', this._dragListener, false);
    document.removeEventListener('dragenter', this._dragListener, false);
    this._fceux.removeEventListener(this._gameLoadedListener);

    this._input.dispose();
  }

  private handleGameLoaded() {
    const md5 = this._fceux.gameMd5();
    if (md5 && localStorage.hasOwnProperty('save-' + md5)) {
      // Import saves from localStorage.
      const save = JSON.parse(localStorage['save-' + md5]);
      for (let filename in save) {
        save[filename] = new Uint8Array(save[filename]);
      }
      this._fceux.importSaveFiles(save);

      // Hide UI after timeout.
      setTimeout(() => {
        this.showStack(false);
        this.showControls(false);
      }, 1000);
    }
  }

  private handleDrop(ev: DragEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    const f = ev.dataTransfer ? ev.dataTransfer.files[0] : null;
    if (f && confirm('Do you want to run the game ' + f.name + ' and add it to stack?')) {
      const r = new FileReader();
      r.onload = () => {
        const opts = { encoding: 'binary' };
        // TODO: Save game otherwise
        // const path = FCEM.pathJoin('/fceux/rom/', f.name);
        // fceux.FS.writeFile(path, new Uint8Array(ev.target.result), opts);
        this.updateGames();
        this.updateStack();
        // FCEM.startGame(path);
      };
      r.readAsArrayBuffer(f);
    }
  }

  showStack(show: boolean) {
    this._el.stackToggle.checked = show === undefined ? !this._el.stackToggle.checked : show;
  }
  showControls(show: boolean) {
    this._el.controllersToggle.checked = show === undefined ? !this._el.controllersToggle.checked : show;
  }
  toggleSound() {
    this._fceux.setMuted(!this._fceux.muted());
    this._el.soundIcon.style.backgroundPosition = (!this._fceux.muted() ? '-32' : '-80') + 'px -48px';
  }

  private onDeleteGameSyncFromIDB() {
    this.updateGames();
    this.updateStack();
  }
  private startGame(url: string) {
    // NOTE: AudioContext must be created from user input.
    if (!this._fceux.audioContext()) {
      let audioContext;
      if (typeof AudioContext !== 'undefined') {
        audioContext = new AudioContext();
        // @ts-ignore: For Safari 13.1.
      } else if (typeof webkitAudioContext !== 'undefined') {
        // @ts-ignore: For Safari 13.1.
        audioContext = new webkitAudioContext();
      } else {
        console.error('WebAudio API unavailable.');
      }
      this._fceux.setAudioContext(audioContext);
    }

    this._fceux.downloadGame(url);
  }
  private splitPath(filename: string) {
    const splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    const split = splitPathRe.exec(filename);
    return split ? split.slice(1) : [];
  }
  pathJoin(...parts: string[]) {
    const s = Array.prototype.slice.call(parts, 0).join('/');
    return s.replace(/\/\/+/g, '/');
  }
  updateGames() {
    const builtIns = ['Streemerz.nes', '2048.nes', 'Lawn Mower.nes', 'Alter Ego.nes', 'Super Bat Puncher (Demo).nes', 'Lan Master.nes'];

    const calcGameOffset = () => {
      return 3 * ((3 * Math.random()) | 0);
    };

    const addGame = (filename: string, deletable: boolean): Game => {
      const split = this.splitPath(filename);
      const label = split[2].slice(0, -split[3].length).toUpperCase();
      const offset = calcGameOffset();
      return { label: label, url: filename, offset: offset, deletable: deletable };
    };

    let games = builtIns.map(filename => {
      return addGame('/games/' + filename, false);
    });
    // files.forEach(function(filename) {
    //     const split = FCEM.splitPath(filename);
    //     const label = split[2].slice(0, -split[3].length).toUpperCase();
    //     const offset = calcGameOffset();
    //     games.push({label:label, path:filename, offset:offset, deletable:deletable});
    //   });
    // const addGamesIn = function(path, deletable) {
    //   const files = findFiles(path);
    //   files.forEach(function(filename) {
    //     const split = FCEM.splitPath(filename);
    //     const label = split[2].slice(0, -split[3].length).toUpperCase();
    //     const offset = calcGameOffset();
    //     games.push({label:label, path:filename, offset:offset, deletable:deletable});
    //   });
    // };

    // addGamesIn('/data/games/', false);
    // addGamesIn('/fceux/rom/', true);

    // sort in alphabetic order and assign as new games list
    games.sort((a, b) => {
      return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
    });
    this._games = games;
  }
  updateStack() {
    const games = this._games;
    const stackContainer = this._el.stackContainer;
    const scrollPos = stackContainer.scrollTop;
    const list = this._el.stack;
    // const proto = this._el.cartProto;

    while (list.firstChild != list.lastChild) {
      list.removeChild(<Node>list.lastChild);
    }

    for (let i = 0; i < games.length; i++) {
      const item = games[i];
      // TODO: don't use any
      const el = <any>this._el.cartProto.cloneNode(true);

      el.dataset.idx = i;
      el.style.backgroundPosition = item.offset + 'px 0px';
      list.appendChild(el);

      const label = el.firstChild.firstChild.firstChild;
      label.innerHTML = item.label;

      label.style.fontSize = '16px';
      label.style.lineHeight = '18px';

      let fontSize = 13;
      while (label.scrollHeight > 18 && fontSize >= 9) {
        label.style.fontSize = fontSize + 'px';
        fontSize -= 2;
      }
      if (label.scrollHeight > 18) {
        label.style.lineHeight = '9px';
      }

      if (!item.deletable) {
        el.firstChild.lastChild.hidden = true;
      }
    }

    stackContainer.scrollTop = scrollPos;
  }

  askSelectGame(ev: MouseEvent, el: HTMLDivElement) {
    const idx = this.askConfirmGame(ev, el, 'Do you want to play');
    if (idx != -1) {
      this.startGame(this._games[idx].url);
    }
    return false;
  }
  private askConfirmGame(ev: MouseEvent, el: HTMLDivElement, q) {
    const games = this._games;
    ev.stopPropagation();
    ev.preventDefault();
    const idx = <any>el.dataset.idx * 1;
    if (idx >= 0 && idx < games.length && confirm(q + ' ' + games[idx].label + '?')) {
      return idx;
    } else {
      return -1;
    }
  }
  askDeleteGame(ev: MouseEvent, el: HTMLDivElement) {
    let idx = this.askConfirmGame(ev, el, 'Do you want to delete');
    if (idx != -1) {
      idx = this.askConfirmGame(ev, el, 'ARE YOU REALLY SURE YOU WANT TO DELETE');
      if (idx != -1) {
        // TODO: remove game rom
        // const item = FCEM.games.slice(idx, idx+1)[0];
        // fceux.FS.unlink(item.path);
        // fceux.FS.syncfs(FCEM.onDeleteGameSyncFromIDB);
      }
    }
    return false;
  }

  // TODO: replace use of any
  private setConfig2(id: string, v: any) {
    v = isNaN(v * 1) ? v : v * 1;
    this._fceux.setConfig(id, v);
    localStorage[id] = v;
  }
  setConfig(el: HTMLInputElement) {
    this.setConfig2(el.id, el.type == 'checkbox' ? el.checked : el.value);
  }
  private setControllerEl(id: string, val: any) {
    const el = <HTMLInputElement>document.getElementById(id);
    if (!el) {
      return;
    }
    if (el.tagName == 'SELECT' || el.type == 'range') {
      el.value = val;
    } else if (el.type == 'checkbox') {
      el.checked = val;
    }
  }
  initConfig(reset: boolean) {
    for (let id in this._fceux.defaultConfig) {
      let v = this._fceux.defaultConfig[id];
      if (!reset && localStorage.hasOwnProperty(id)) {
        v = localStorage[id];
        v = isNaN(v * 1) ? v : v * 1;
      }
      this.setConfig2(id, v);
      this.setControllerEl(id, v);
    }
  }
  toggleFullscreen() {
    if ('requestFullscreen' in this._fceux.canvas) {
      if (!document.fullscreenElement) {
        this._fceux.canvas.requestFullscreen().catch(e => {
          console.warn("Can't enter fullscreen, " + e.message + '.');
        });
      } else {
        document.exitFullscreen();
      }
    } else if ('webkitRequestFullscreen' in this._fceux.canvas) {
      // @ts-ignore: For Safari 13.1.
      if (!document.webkitFullscreenElement) {
        // @ts-ignore: For Safari 13.1.
        this._fceux.canvas.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
      } else {
        // @ts-ignore: For Safari 13.1.
        document.webkitExitFullscreen();
      }
    } else {
      console.warn('Fullscreen API unavailable.');
    }
  }

  // TODO: remove, for debugging
  findFiles(dir: string) {
    try {
      const list: string[] = fceux.FS.readdir(dir);
      const filtered = list.filter(x => x !== '.' && x !== '..');
      return filtered.map(x => this.pathJoin(dir, x));
    } catch (e) {
      return [];
    }
  }
}

const params = {
  print: (...text: string[]) => {
    console.log(Array.prototype.slice.call(text).join(' '));
  },
  printErr: (...text: string[]) => {
    console.error(Array.prototype.slice.call(text).join(' '));
  },
  canvas: <HTMLCanvasElement>document.getElementById('canvas'),
};
const fceux = (globalThis.fceux = FCEUX(params).then(() => {
  fceux.init();
  globalThis.app = new App(fceux);
}));
