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

interface StackItem {
  label: string;
  url: string;
  offset: number;
  deletable: boolean;
}

interface StoredGames {
  [filename: string]: Array<number>;
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

  private _gameStack: StackItem[] = [];
  private _fceux: FceuxModule;
  private _canvas: HTMLCanvasElement;
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

  constructor(fceux: FceuxModule, canvas: HTMLCanvasElement) {
    this._fceux = fceux;
    this._canvas = canvas;

    this._input = new Input(this._canvas, this._fceux);
    this._inputDialog = new InputDialog(this._el, this._input);

    this.updateStack();
    this.updateStackDom();
    this.showStack(true);

    this.initConfig(false);

    this._fceux.addEventListener('game-loaded', this._gameLoadedListener);
    document.addEventListener('dragenter', this._dragListener, false);
    document.addEventListener('dragleave', this._dragListener, false);
    document.addEventListener('dragover', this._dragListener, false);
    document.addEventListener('drop', this._dropListener, false);
    canvas.addEventListener('webglcontextlost', this._contextLostListener, false);
    window.addEventListener('beforeunload', this._beforeUnloadListener);

    // Export saves to localStorage at interval.
    this._saveFilesInterval = window.setInterval(() => {
      const md5 = this._fceux.gameMd5();
      if (md5) {
        const saveFiles = this._fceux.exportSaveFiles();
        const storedSaves = {};
        for (let filename in saveFiles) {
          storedSaves[filename] = Array.from(saveFiles[filename]);
        }
        localStorage['save-' + md5] = JSON.stringify(storedSaves);
      }
    }, 1000);

    const updateLoop = () => {
      requestAnimationFrame(updateLoop);
      this._input.update();
      this._fceux.update();
    };
    updateLoop();
  }

  dispose() {
    clearInterval(this._saveFilesInterval);

    window.removeEventListener('beforeunload', this._beforeUnloadListener);
    this._canvas.removeEventListener('webglcontextlost', this._contextLostListener, false);
    document.removeEventListener('drop', this._dropListener, false);
    document.removeEventListener('dragover', this._dragListener, false);
    document.removeEventListener('dragleave', this._dragListener, false);
    document.removeEventListener('dragenter', this._dragListener, false);
    this._fceux.removeEventListener(this._gameLoadedListener);

    this._input.dispose();
  }

  toggleSound() {
    this._fceux.setMuted(!this._fceux.muted());
    this._el.soundIcon.style.backgroundPosition = (!this._fceux.muted() ? '-32' : '-80') + 'px -48px';
  }

  askSelectGame(ev: MouseEvent, el: HTMLDivElement) {
    ev.stopPropagation();
    ev.preventDefault();
    let idx = <any>el.dataset.idx * 1;
    if (idx >= 0 && idx < this._gameStack.length) {
      this.startGame(this._gameStack[idx].url, this._gameStack[idx].deletable);
    }
    return false;
  }
  askDeleteGame(ev: MouseEvent, el: HTMLDivElement) {
    ev.stopPropagation();
    ev.preventDefault();
    let idx = <any>el.dataset.idx * 1;
    if (idx >= 0 && idx < this._gameStack.length) {
      if (confirm('Are you sure you want to delete ' + this._gameStack[idx].label + '?')) {
        const storedGames = App.storedGames();
        delete storedGames[this._gameStack[idx].url];
        App.setStoredGames(storedGames);

        this.updateStack();
        this.updateStackDom();
      }

      // Workaround: confirm() stops audio context on Safari 13.1.
      setTimeout(() => this._fceux.audioContext().resume());
    }
    return false;
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
    if (f) {
      const r = new FileReader();
      r.onload = () => {
        const data = new Uint8Array(<ArrayBuffer>r.result);
        this._fceux.loadGame(data);

        const storedGames = App.storedGames();
        storedGames[f.name] = Array.from<number>(data);
        App.setStoredGames(storedGames);

        this.updateStack();
        this.updateStackDom();
      };
      r.readAsArrayBuffer(f);
    }
  }

  private showStack(show: boolean) {
    this._el.stackToggle.checked = show === undefined ? !this._el.stackToggle.checked : show;
  }
  private showControls(show: boolean) {
    this._el.controllersToggle.checked = show === undefined ? !this._el.controllersToggle.checked : show;
  }

  private startGame(url: string, isStored: boolean) {
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

    if (!isStored) {
      this._fceux.downloadGame(url);
    } else {
      const storedGames = App.storedGames();
      this._fceux.loadGame(new Uint8Array(storedGames[url]));
    }
  }

  private static splitPath(filename: string) {
    const splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    const split = splitPathRe.exec(filename);
    return split ? split.slice(1) : [];
  }
  private static pathJoin(...parts: string[]) {
    const s = Array.prototype.slice.call(parts, 0).join('/');
    return s.replace(/\/\/+/g, '/');
  }

  private static storedGames(): { [key: string]: Array<number> } {
    return localStorage.hasOwnProperty('games') ? JSON.parse(localStorage['games']) : {};
  }
  private static setStoredGames(storedGames: StoredGames) {
    localStorage['games'] = JSON.stringify(storedGames);
  }
  private updateStack() {
    const builtIns = ['Streemerz.nes', '2048.nes', 'Lawn Mower.nes', 'Alter Ego.nes', 'Super Bat Puncher (Demo).nes', 'Lan Master.nes'];

    this._gameStack = [];
    const pushGame = (filename: string, deletable: boolean) => {
      const split = App.splitPath(filename);
      const label = split[2].slice(0, -split[3].length).toUpperCase();
      const offset = 3 * ((3 * Math.random()) | 0);
      this._gameStack.push({ label, url: filename, offset, deletable });
    };
    for (let filename of builtIns) {
      pushGame('/games/' + filename, false);
    }
    for (let filename in App.storedGames()) {
      pushGame(filename, true);
    }

    this._gameStack.sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
  }
  private updateStackDom() {
    const stackContainer = this._el.stackContainer;
    const scrollPos = stackContainer.scrollTop;
    const list = this._el.stack;

    while (list.firstChild != list.lastChild) {
      list.removeChild(<Node>list.lastChild);
    }

    for (let i = 0; i < this._gameStack.length; ++i) {
      const item = this._gameStack[i];
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

  private storeConfig(id: string, v: string | number) {
    const x = isNaN(+v) ? v : +v;
    this._fceux.setConfig(id, x);
    localStorage[id] = x;
  }
  setConfig(el: HTMLInputElement) {
    this.storeConfig(el.id, el.type == 'checkbox' ? (el.checked ? 1 : 0) : el.value);
  }
  private setControllerEl(id: string, val: string | number) {
    const el = <HTMLInputElement>document.getElementById(id);
    if (el) {
      if (el.tagName == 'SELECT' || el.type == 'range') {
        el.value = <string>val;
      } else if (el.type == 'checkbox') {
        el.checked = !!val;
      }
    }
  }
  initConfig(reset: boolean) {
    for (let id in this._fceux.defaultConfig) {
      let v = this._fceux.defaultConfig[id];
      if (!reset && localStorage.hasOwnProperty(id)) {
        v = localStorage[id];
        v = isNaN(+v) ? v : +v;
      }
      this.storeConfig(id, v);
      this.setControllerEl(id, v);
    }
  }
  toggleFullscreen() {
    if ('requestFullscreen' in this._canvas) {
      if (!document.fullscreenElement) {
        this._canvas.requestFullscreen().catch(e => {
          console.warn("Can't enter fullscreen, " + e.message + '.');
        });
      } else {
        document.exitFullscreen();
      }
    } else if ('webkitRequestFullscreen' in this._canvas) {
      // @ts-ignore: For Safari 13.1.
      if (!document.webkitFullscreenElement) {
        // @ts-ignore: For Safari 13.1.
        this._canvas.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
      } else {
        // @ts-ignore: For Safari 13.1.
        document.webkitExitFullscreen();
      }
    } else {
      console.warn('Fullscreen API unavailable.');
    }
  }

  // DEBUG
  // findFiles(dir: string) {
  //   try {
  //     const list: string[] = this._fceux.FS.readdir(dir);
  //     const filtered = list.filter(x => x !== '.' && x !== '..');
  //     return filtered.map(x => App.pathJoin(dir, x));
  //   } catch (e) {
  //     return [];
  //   }
  // }
}

const params = {
  print: (...text: string[]) => {
    console.log(Array.prototype.slice.call(text).join(' '));
  },
  printErr: (...text: string[]) => {
    console.error(Array.prototype.slice.call(text).join(' '));
  },
};
globalThis.fceux = FCEUX(params).then(() => {
  const canvasQuerySelector = '#mycanvas';
  globalThis.fceux.init(canvasQuerySelector);
  globalThis.app = new App(globalThis.fceux, <HTMLCanvasElement>document.querySelector(canvasQuerySelector));
});
