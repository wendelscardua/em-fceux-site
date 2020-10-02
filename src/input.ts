/**
 * @license
 *
 * Copyright (C) 2019  Valtteri "tsone" Heikkila
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

import { FceuxModule } from 'em-fceux';

// Key: { id: [keys, gamepad] }
interface InputMap {
  [input: string]: [string[], number];
}

export class Input {
  private static _defaultInputSpec = Input.defaultInputSpec();

  private _canvas: HTMLCanvasElement;
  private _fceux: FceuxModule;
  private _keyHandler = this.handleKey.bind(this);
  private _mouseHandler = this.handleMouse.bind(this);
  private _inputState = new Set<string>();
  private _prevInputState = new Set<string>();
  private _turboFrame = false;
  _keySet = new Set<string>();
  _inputMap: InputMap = {};
  private _listenerOptions = { capture: true };

  constructor(canvas: HTMLCanvasElement, fceux: FceuxModule) {
    this._canvas = canvas;
    this._fceux = fceux;

    this.loadOrResetInputMap(false);

    window.addEventListener('keyup', this._keyHandler, this._listenerOptions);
    window.addEventListener('keydown', this._keyHandler, this._listenerOptions);
    this._canvas.addEventListener('mousedown', this._mouseHandler, this._listenerOptions);
  }

  loadOrResetInputMap(forceReset: boolean) {
    const inputMap = localStorage['input-map'];
    if (forceReset || inputMap === undefined) {
      this._inputMap = Input.defaultInputMap();
      this.saveInputMap();
    } else {
      this._inputMap = JSON.parse(inputMap);
    }
  }

  saveInputMap() {
    localStorage['input-map'] = JSON.stringify(this._inputMap);
  }

  dispose() {
    this.saveInputMap();

    this._canvas.removeEventListener('mousedown', this._mouseHandler, this._listenerOptions);
    window.removeEventListener('keydown', this._keyHandler, this._listenerOptions);
    window.removeEventListener('keyup', this._keyHandler, this._listenerOptions);
  }

  update() {
    this._turboFrame = !this._turboFrame;

    const tmp = this._prevInputState;
    this._prevInputState = this._inputState;
    this._inputState = tmp;
    this._inputState.clear();

    const gamepads = navigator && navigator.getGamepads ? navigator.getGamepads() : [];
    for (let id in this._inputMap) {
      const input = this._inputMap[id];
      if (this.isInputKeysActive(input[0]) || this.isInputGamepadActive(gamepads, input[1])) {
        this._inputState.add(id);
      }
    }

    this.updateSystem();
    return this.updateControllers();
  }

  setInput(id: string, keys: string[], gamepad: number) {
    this._inputMap[id] = [keys, gamepad];
    this.saveInputMap();
  }

  static idToName(id: string) {
    return Input._defaultInputSpec[id][0];
  }

  private isInputKeysActive(keys: string[]) {
    if (keys.length > 0) {
      for (let key of keys) {
        if (!this._keySet.has(key)) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  private isInputGamepadActive(gamepads: (Gamepad | null)[], binding: number) {
    const type = binding & 0x03; // 0: not set, 1: button, 2: axis (negative), 3: axis (positive)
    if (type && gamepads) {
      const gamepadIdx = (binding & 0x0c) >> 2; // 0-3: gamepad index
      if (gamepadIdx < gamepads.length) {
        const p = gamepads[gamepadIdx];
        if (p && p.connected) {
          const idx = (binding & 0xf0) >> 4; // 0-15: button index
          switch (type) {
            case 1:
              return idx < p.buttons.length && (p.buttons[idx].pressed || p.buttons[idx].value >= 0.1);
            case 2:
              return idx < p.axes.length && p.axes[idx] <= -0.1;
            case 3:
              return idx < p.axes.length && p.axes[idx] >= 0.1;
          }
        }
      }
    }
    return false;
  }

  private static defaultInputSpec() {
    // Key: { id: [name, defaultKeys, defaultGamepad] }
    // Gamepad bitfield bits:
    //   0-1: Type of binding: 0=not set, 1=button, 2=axis (negative), 3=axis (positive).
    //   2-3: Gamepad index (0-3).
    //   4-7: Button/axis index (0-15).
    const spec = {
      // System inputs.
      reset: ['Reset', ['KeyR', 'ControlLeft'], 0],
      throttle: ['Throttle', ['Tab'], 0],
      pause: ['Pause', ['KeyP'], 0],
      advanceFrame: ['Advance Single Frame', ['Slash'], 0],
      stateSave: ['Save State', ['F5'], 0],
      stateLoad: ['Load State', ['F7'], 0],
      state0: ['Select State 0', ['Digit0'], 0],
      state1: ['Select State 1', ['Digit1'], 0],
      state2: ['Select State 2', ['Digit2'], 0],
      state3: ['Select State 3', ['Digit3'], 0],
      state4: ['Select State 4', ['Digit4'], 0],
      state5: ['Select State 5', ['Digit5'], 0],
      state6: ['Select State 6', ['Digit6'], 0],
      state7: ['Select State 7', ['Digit7'], 0],
      state8: ['Select State 8', ['Digit8'], 0],
      state9: ['Select State 9', ['Digit9'], 0],
      // Controller 1-4 inputs generated below...
    };
    const controllerInputTemplate = {
      A: ['A', ['KeyF'], 1],
      B: ['B', ['KeyD'], 17],
      Select: ['Select', ['KeyS'], 161],
      Start: ['Start', ['Enter'], 177],
      Up: ['Up', ['ArrowUp'], 18],
      Down: ['Down', ['ArrowDown'], 19],
      Left: ['Left', ['ArrowLeft'], 2],
      Right: ['Right', ['ArrowRight'], 3],
      TurboA: ['Turbo A', ['KeyH'], 49],
      TurboB: ['Turbo B', ['KeyG'], 65],
    };
    for (let i of ['1', '2', '3', '4']) {
      const idPrefix = 'controller' + i;
      const nameSuffix = ' (Controller ' + i + ')';
      for (let id in controllerInputTemplate) {
        const t = controllerInputTemplate[id];
        const keys = i != '1' ? [] : t[1];
        const gamepad = i != '1' ? 0 : t[2];
        spec[idPrefix + id] = [t[0] + nameSuffix, keys, gamepad];
      }
    }
    return spec;
  }

  private static defaultInputMap() {
    const result: InputMap = {};
    for (let id in Input._defaultInputSpec) {
      const t = Input._defaultInputSpec[id];
      result[id] = [t[1], t[2]];
    }
    return result;
  }

  private updateSystem() {
    const fceux = this._fceux;
    if (this.inputPressed('reset')) {
      fceux.reset();
    }
    if (this.inputPressed('pause')) {
      fceux.setPaused(!fceux.paused());
    }
    if (this.inputPressed('advanceFrame')) {
      fceux.advanceFrame();
    }
    if (this.inputPressed('stateSave')) {
      fceux.saveState();
    }
    if (this.inputPressed('stateLoad')) {
      fceux.loadState();
    }
    for (let i = 0; i < 10; ++i) {
      if (this.inputPressed('state' + i)) {
        fceux.setState(i);
      }
    }

    fceux.setThrottling(this.inputDown('throttle'));
  }

  private updateControllers() {
    // TODO: handle all active controllers
    return (this.bitsForController('2') << 8) | this.bitsForController('1');
  }

  private bitsForController(index: '1' | '2' | '3' | '4') {
    let q = 0;

    const prefix = 'controller' + index;
    if (this.inputDown(prefix + 'A')) q |= 0x01;
    if (this.inputDown(prefix + 'B')) q |= 0x02;
    if (this.inputDown(prefix + 'Select')) q |= 0x04;
    if (this.inputDown(prefix + 'Start')) q |= 0x08;
    if (this.inputDown(prefix + 'Up')) q |= 0x10;
    if (this.inputDown(prefix + 'Down')) q |= 0x20;
    if (this.inputDown(prefix + 'Left')) q |= 0x40;
    if (this.inputDown(prefix + 'Right')) q |= 0x80;

    if (this._turboFrame) {
      if (this.inputDown(prefix + 'TurboA')) q |= 0x01;
      if (this.inputDown(prefix + 'TurboB')) q |= 0x02;
    }

    if ((q & 0x30) == 0x30) q &= ~0x20; // Replace up + down -> up.
    if ((q & 0xc0) == 0xc0) q &= ~0x80; // Replace left + right -> left.

    return q;
  }

  private inputDown(input: string) {
    return this._inputState.has(input);
  }

  private inputPressed(input: string) {
    return !this._prevInputState.has(input) && this._inputState.has(input);
  }

  private handleKey(ev: KeyboardEvent) {
    if (!ev.metaKey && !ev.altKey) {
      if (ev.type == 'keydown') {
        this._keySet.add(ev.code);
      } else {
        this._keySet.delete(ev.code);
      }
      ev.preventDefault();
    } else {
      // Workaround for some events not sent when Meta or Alt is pressed.
      this._keySet.clear();
    }
  }

  private handleMouse(ev: MouseEvent) {
    const rect = this._canvas.getBoundingClientRect();
    this._fceux.triggerZapper(ev.clientX - rect.left, ev.clientY - rect.top);
  }
}
