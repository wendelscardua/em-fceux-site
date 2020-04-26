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
import { CartStack } from './cart-stack';

export class Elements {
  catchDiv = <HTMLDivElement>document.getElementById('catchDiv');
  catchGamepad = <HTMLSpanElement>document.getElementById('catchGamepad');
  catchKey = <HTMLSpanElement>document.getElementById('catchKey');
  catchName = <HTMLSpanElement>document.getElementById('catchName');
  controllersToggle = <HTMLInputElement>document.getElementById('controllersToggle');
  keyBindDiv = <HTMLDivElement>document.getElementById('keyBindDiv');
  keyBindProto = <HTMLTableRowElement>document.getElementById('keyBindProto');
  keyBindTable = <HTMLTableElement>document.getElementById('keyBindTable');
  fullscreenIcon = <HTMLDivElement>document.getElementById('fullscreenIcon');
  soundIcon = <HTMLDivElement>document.getElementById('soundIcon');
  dpadIcon = <HTMLDivElement>document.getElementById('dpadIcon');
  introDiv = <HTMLDivElement>document.getElementById('introDiv');
  helpToggle = <HTMLInputElement>document.getElementById('helpToggle');
  selectFile = <HTMLInputElement>document.getElementById('selectFile');
}

export class App {
  _el = new Elements();
  _inputDialog?: InputDialog;
  _input?: Input;

  private _fceux: FceuxModule;
  private _canvasSelector: string;
  private _canvas: HTMLCanvasElement;

  private _stack = new CartStack();

  private _initialized = false;

  private _gameLoadedListener = this.handleGameLoaded.bind(this);
  private _dropListener = this.handleDrop.bind(this);
  private _dragListener = (ev: DragEvent) => {
    ev.stopPropagation();
    ev.preventDefault();
  };
  private _keyListener = (ev: KeyboardEvent) => {
    if (ev.code == 'Escape') {
      if (this._el.helpToggle.checked || this._inputDialog?.isShown()) {
        this._el.helpToggle.checked = false;
        this._inputDialog?.show(false);
      } else {
        this._stack.show(false);
        this.showControls(false);
      }
    }
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

  constructor(fceux: FceuxModule, canvasSelector: string) {
    this._fceux = fceux;
    this._canvasSelector = canvasSelector;
    this._canvas = <HTMLCanvasElement>document.querySelector(canvasSelector);

    this._stack.update();
    this._stack.show(true);
    this.initConfig(false);

    document.addEventListener('keydown', this._keyListener);
    document.addEventListener('dragenter', this._dragListener, false);
    document.addEventListener('dragleave', this._dragListener, false);
    document.addEventListener('dragover', this._dragListener, false);
    document.addEventListener('drop', this._dropListener, false);
    this._canvas.addEventListener('webglcontextlost', this._contextLostListener, false);
    window.addEventListener('beforeunload', this._beforeUnloadListener);
  }

  // NOTE: Must be called in a user interaction event.
  init() {
    this._fceux.init(this._canvasSelector); // Creates AudioContext.

    this._initialized = true;

    this.initConfig(false);

    this._fceux.addEventListener('game-loaded', this._gameLoadedListener);

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

    this._input = new Input(this._canvas, this._fceux);
    this._inputDialog = new InputDialog(this._el, this._input);

    const updateLoop = () => {
      if (this._initialized) {
        window.requestAnimationFrame(updateLoop);
        this._input?.update();
        this._fceux.update();
      }
    };
    window.requestAnimationFrame(updateLoop);

    // Unhide icons at window top-right.
    this._el.introDiv.style.display = 'none';
    this._el.dpadIcon.style.display = 'block';
    this._el.soundIcon.style.display = 'block';
    this._el.fullscreenIcon.style.display = 'block';
  }

  dispose() {
    if (this._initialized) {
      this._inputDialog?.dispose();
      this._input?.dispose();
      clearInterval(this._saveFilesInterval);
      this._fceux.removeEventListener(this._gameLoadedListener);
      this._initialized = false;
    }

    window.removeEventListener('beforeunload', this._beforeUnloadListener);
    this._canvas.removeEventListener('webglcontextlost', this._contextLostListener, false);
    document.removeEventListener('drop', this._dropListener, false);
    document.removeEventListener('dragover', this._dragListener, false);
    document.removeEventListener('dragleave', this._dragListener, false);
    document.removeEventListener('dragenter', this._dragListener, false);
    document.removeEventListener('keydown', this._keyListener);
  }

  onClickCart(ev: MouseEvent, el: HTMLDivElement) {
    ev.stopPropagation();
    ev.preventDefault();

    const index = <any>el.dataset.idx * 1;
    if (index == 0) {
      // Add a game from file.
      this._el.selectFile.click();
    } else {
      const cart = this._stack.getCart(index);
      if (cart) {
        if (!this._initialized) {
          this.init();
        }
        cart.start(this._fceux);
      }
    }
    return false;
  }

  onClickCartDelete(ev: MouseEvent, el: HTMLDivElement) {
    ev.stopPropagation();
    ev.preventDefault();
    const index = <any>el.dataset.idx * 1;
    const cart = this._stack.getCart(index);
    if (cart) {
      if (confirm('Are you sure you want to delete ' + cart._label + '?')) {
        this._stack.removeCart(index);
      }

      // Workaround: confirm() stops audio context on Safari 13.1.
      if (this._initialized) {
        setTimeout(() => this._fceux._audioContext?.resume());
      }
    }
    return false;
  }

  handleSelectFile(files: FileList) {
    this.readFile(files[0]);
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
        this._stack.show(false);
        this.showControls(false);
      }, 1000);
    }
  }

  private readFile(f: File | null) {
    if (f) {
      const r = new FileReader();
      r.onload = () => {
        const data = new Uint8Array(<ArrayBuffer>r.result);
        if (this._initialized) {
          this._fceux.loadGame(data);
        }
        this._stack.addCart(f.name, data);
      };
      r.readAsArrayBuffer(f);
    }
  }

  private handleDrop(ev: DragEvent) {
    ev.stopPropagation();
    ev.preventDefault();
    this.readFile(ev.dataTransfer ? ev.dataTransfer.files[0] : null);
  }

  private showControls(show: boolean) {
    this._el.controllersToggle.checked = show === undefined ? !this._el.controllersToggle.checked : show;
  }

  private storeConfig(id: string, v: string | number) {
    const x = isNaN(+v) ? v : +v;
    if (this._initialized) {
      this._fceux.setConfig(id, x);
    }
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
    for (let id in this._fceux._defaultConfig) {
      let v = this._fceux._defaultConfig[id];
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
  toggleMuted() {
    if (this._initialized) {
      this._fceux.setMuted(!this._fceux.muted());
      this._el.soundIcon.style.backgroundPosition = (!this._fceux.muted() ? '-32' : '-80') + 'px -48px';
    }
  }
  toggleInputBindings() {
    if (this._initialized) {
      this._inputDialog?.toggleShow();
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
  globalThis.app = new App(globalThis.fceux, '#mycanvas');
});
