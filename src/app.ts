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

// NOTE: Originally from: http://jsfiddle.net/vWx8V/
const KEY_CODE_TO_NAME = {
  8: 'Backspace',
  9: 'Tab',
  13: 'Return',
  16: 'Shift',
  17: 'Ctrl',
  18: 'Alt',
  19: 'Pause/Break',
  20: 'Caps Lock',
  27: 'Esc',
  32: 'Space',
  33: 'Page Up',
  34: 'Page Down',
  35: 'End',
  36: 'Home',
  37: 'Left',
  38: 'Up',
  39: 'Right',
  40: 'Down',
  45: 'Insert',
  46: 'Delete',
  48: '0',
  49: '1',
  50: '2',
  51: '3',
  52: '4',
  53: '5',
  54: '6',
  55: '7',
  56: '8',
  57: '9',
  65: 'A',
  66: 'B',
  67: 'C',
  68: 'D',
  69: 'E',
  70: 'F',
  71: 'G',
  72: 'H',
  73: 'I',
  74: 'J',
  75: 'K',
  76: 'L',
  77: 'M',
  78: 'N',
  79: 'O',
  80: 'P',
  81: 'Q',
  82: 'R',
  83: 'S',
  84: 'T',
  85: 'U',
  86: 'V',
  87: 'W',
  88: 'X',
  89: 'Y',
  90: 'Z',
  91: 'Meta',
  93: 'Right Click',
  96: 'Numpad 0',
  97: 'Numpad 1',
  98: 'Numpad 2',
  99: 'Numpad 3',
  100: 'Numpad 4',
  101: 'Numpad 5',
  102: 'Numpad 6',
  103: 'Numpad 7',
  104: 'Numpad 8',
  105: 'Numpad 9',
  106: 'Numpad *',
  107: 'Numpad +',
  109: 'Numpad -',
  110: 'Numpad .',
  111: 'Numpad /',
  112: 'F1',
  113: 'F2',
  114: 'F3',
  115: 'F4',
  116: 'F5',
  117: 'F6',
  118: 'F7',
  119: 'F8',
  120: 'F9',
  121: 'F10',
  122: 'F11',
  123: 'F12',
  144: 'Num Lock',
  145: 'Scroll Lock',
  182: 'My Computer',
  183: 'My Calculator',
  186: ';',
  187: '=',
  188: ',',
  189: '-',
  190: '.',
  191: '/',
  192: '`',
  219: '[',
  220: '\\',
  221: ']',
  222: "'",
};

interface Game {
  label: string;
  url: string;
  offset: number;
  deletable: boolean;
}

export class App {
  _el = {
    cartProto: <HTMLDivElement>document.getElementById('cartProto'),
    catchDiv: <HTMLDivElement>document.getElementById('catchDiv'),
    catchGamepad: <HTMLSpanElement>document.getElementById('catchGamepad'),
    catchKey: <HTMLSpanElement>document.getElementById('catchKey'),
    catchName: <HTMLSpanElement>document.getElementById('catchName'),
    controllersToggle: <HTMLInputElement>document.getElementById('controllersToggle'),
    keyBindDiv: <HTMLDivElement>document.getElementById('keyBindDiv'),
    keyBindProto: <HTMLTableRowElement>document.getElementById('keyBindProto'),
    keyBindTable: <HTMLTableElement>document.getElementById('keyBindTable'),
    soundIcon: <HTMLDivElement>document.getElementById('soundIcon'),
    stack: <HTMLDivElement>document.getElementById('stack'),
    stackContainer: <HTMLDivElement>document.getElementById('stackContainer'),
    stackToggle: <HTMLInputElement>document.getElementById('stackToggle'),
  };
  _inputDialog = new InputDialog(this);

  private _games: Game[] = [];
  private _fceux: FceuxModule;
  private _input: Input;

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

  private _saveFilesInterval;

  constructor(fceux: FceuxModule) {
    this._fceux = fceux;
    this._input = new Input(fceux.canvas, fceux);

    this.updateGames();
    this.updateStack();
    this.showStack(true);

    this.initConfig(false);
    this.initInputBindings();

    fceux.addEventListener('game-loaded', this._gameLoadedListener);
    document.addEventListener('dragenter', this._dragListener, false);
    document.addEventListener('dragleave', this._dragListener, false);
    document.addEventListener('dragover', this._dragListener, false);
    document.addEventListener('drop', this._dropListener, false);
    fceux.canvas.addEventListener('webglcontextlost', this._contextLostListener, false);

    // Export saves to localStorage at interval.
    this._saveFilesInterval = setInterval(() => {
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
        // fceux.FS.writeFile(path, new Uint8Array(e.target.result), opts);
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
        // } else if (typeof webkitAudioContext !== 'undefined') {
        //   audioContext = new webkitAudioContext();
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
    const builtIns = [
      'Streemerz.nes',
      '2048.nes',
      'Lawn Mower.nes',
      'Alter Ego.nes',
      'Super Bat Puncher (Demo).nes',
      'Lan Master.nes',
    ];

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

  askSelectGame(ev, el) {
    const idx = this.askConfirmGame(ev, el, 'Do you want to play');
    if (idx != -1) {
      this.startGame(this._games[idx].url);
    }
    return false;
  }
  private askConfirmGame(ev, el, q) {
    const games = this._games;
    ev.stopPropagation();
    ev.preventDefault();
    const idx = el.dataset.idx | 0;
    if (idx >= 0 && idx < games.length && confirm(q + ' ' + games[idx].label + '?')) {
      return idx;
    } else {
      return -1;
    }
  }
  askDeleteGame(ev, el) {
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

  // TODO: input binding, move to Input?
  private getLocalInputDefault(id: string, type: boolean) {
    // const m = (type ? 'gp' : 'input') + id;
    // if (localStorage[m] === undefined) {
    // if (FCEC.inputs[id] === undefined) {
    //   localStorage[m] = '0'; // NOTE: fallback if the id is undefined
    // } else {
    //   localStorage[m] = FCEC.inputs[id][type];
    // }
    // }
    // return localStorage[m] * 1;
    return 0;
  }
  setLocalKey(id: string, key: number) {
    // localStorage['input' + id] = key;
  }
  getLocalKey(id: string) {
    return this.getLocalInputDefault(id, false);
  }
  setLocalGamepad(id: string, binding: number) {
    // localStorage['gp' + id] = binding;
  }
  getLocalGamepad(id: string) {
    return this.getLocalInputDefault(id, true);
  }
  private clearInputBindings() {
    // for (let id in FCEC.inputs) {
    //   // clear local bindings
    //   delete localStorage['input' + id];
    //   delete localStorage['gp' + id];
    //   // clear host bindings
    //   const key = FCEM.getLocalKey(id);
    //   // fceux.bindKey(0, key);
    //   // fceux.bindGamepad(id, 0);
    // }
  }
  private syncInputBindings() {
    // for (let id in FCEC.inputs) {
    //   const key = FCEM.getLocalKey(id);
    //   // fceux.bindKey(id, key);
    //   const binding = FCEM.getLocalGamepad(id);
    //   // fceux.bindGamepad(id, binding);
    // }
  }
  private initInputBindings() {
    this.syncInputBindings();
    this.initKeyBind();
  }
  key2Name(key: number) {
    let keyName = key & 0x0ff ? KEY_CODE_TO_NAME[key & 0x0ff] : '(Unset)';
    if (keyName === undefined) keyName = '(Unknown)';
    let prefix = '';
    if (key & 0x100 && keyName !== 'Ctrl') prefix += 'Ctrl+';
    if (key & 0x400 && keyName !== 'Alt') prefix += 'Alt+';
    if (key & 0x200 && keyName !== 'Shift') prefix += 'Shift+';
    if (key & 0x800 && keyName !== 'Meta') prefix += 'Meta+';
    return prefix + keyName;
  }
  gamepad2Name(binding: number) {
    const type = binding & 0x03;
    const pad = (binding & 0x0c) >> 2;
    const idx = (binding & 0xf0) >> 4;
    if (!type) return '(Unset)';
    const typeNames = ['Button', '-Axis', '+Axis'];
    return 'Gamepad ' + pad + ' ' + typeNames[type - 1] + ' ' + idx;
  }
  initKeyBind() {
    const table = this._el.keyBindTable;
    // const proto = this._el.keyBindProto;

    while (table.lastChild != table.firstChild) {
      table.removeChild(<Node>table.lastChild);
    }

    // for (let id in FCEC.inputs) {
    //   const item = FCEC.inputs[id];
    //   const key = FCEM.getLocalKey(id);
    //   const gamepad = FCEM.getLocalGamepad(id);
    //   const keyName = FCEM.key2Name(key);
    //   const gamepadName = FCEM.gamepad2Name(gamepad);

    //   const el = proto.cloneNode(true);
    //   el.children[0].innerHTML = item[2];
    //   el.children[1].innerHTML = keyName;
    //   el.children[2].innerHTML = gamepadName;
    //   el.children[3].dataset.id = id;
    //   el.children[3].dataset.name = item[2];

    //   table.appendChild(el);
    // }
  }
  clearBinding(keyBind) {
    const id = keyBind.dataset.id;
    // const key = this.getLocalKey(id);
    // fceux.bindKey(0, key);
    this.setLocalKey(id, 0);
    // fceux.bindGamepad(id, 0);
    this.setLocalGamepad(id, 0);
    this.initKeyBind();
  }
  resetDefaultBindings() {
    this.clearInputBindings();
    this.initInputBindings();
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
      // } else if ('webkitRequestFullscreen' in this._fceux.canvas) {
      //   if (!document.webkitFullscreenElement) {
      //     this._fceux.canvas.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
      //   } else {
      //     document.webkitExitFullscreen();
      //   }
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

window.onbeforeunload = () => {
  return 'To prevent save game data loss, please let the game run at least one second after saving and before closing the window.';
};

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
