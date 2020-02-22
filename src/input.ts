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

type InputSpec = [string, string, string[]];

interface InputMap {
  [input: string]: string[];
}

export class Input {
  private _canvas: HTMLCanvasElement;
  private _fceux: FceuxModule;
  private _keyHandler = this.handleKey.bind(this);
  private _mouseHandler = this.handleMouse.bind(this);
  private _inputState = new Set<string>();
  private _prevInputState = new Set<string>();
  private _turboFrame = false;
  private _keySet = new Set<string>();
  private _inputSpec: InputSpec[];
  private _inputMap: InputMap;

  constructor(canvas: HTMLCanvasElement, fceux: FceuxModule) {
    this._canvas = canvas;
    this._fceux = fceux;

    window.addEventListener('keyup', this._keyHandler);
    window.addEventListener('keydown', this._keyHandler);
    this._canvas.addEventListener('mousedown', this._mouseHandler);

    // Input specification: [ id, name, defaultKeys ].
    this._inputSpec = [
      // System inputs.
      ['reset', 'Reset', ['KeyR', 'ControlLeft']],
      ['throttle', 'Throttle', ['Tab']],
      ['pause', 'Pause', ['KeyP']],
      ['advanceFrame', 'Advance Single Frame', ['Slash']],
      ['stateSave', 'Save State', ['F5']],
      ['stateLoad', 'Load State', ['F7']],
      ['state0', 'Select State 0', ['Digit0']],
      ['state1', 'Select State 1', ['Digit1']],
      ['state2', 'Select State 2', ['Digit2']],
      ['state3', 'Select State 3', ['Digit3']],
      ['state4', 'Select State 4', ['Digit4']],
      ['state5', 'Select State 5', ['Digit5']],
      ['state6', 'Select State 6', ['Digit6']],
      ['state7', 'Select State 7', ['Digit7']],
      ['state8', 'Select State 8', ['Digit8']],
      ['state9', 'Select State 9', ['Digit9']],
      // Controller 1-4 inputs generated below...
    ];
    const controllerInputTemplate: InputSpec[] = [
      ['a', 'A', ['KeyF']],
      ['b', 'B', ['KeyD']],
      ['select', 'Select', ['KeyS']],
      ['start', 'Start', ['Enter']],
      ['up', 'Up', ['ArrowUp']],
      ['down', 'Down', ['ArrowDown']],
      ['left', 'Left', ['ArrowLeft']],
      ['right', 'Right', ['ArrowRight']],
      ['turbo-a', 'Turbo A', ['KeyH']],
      ['turbo-b', 'Turbo B', ['KeyG']],
    ];
    for (let index of ['1', '2', '3', '4']) {
      const idPrefix = 'controller-' + index + '-';
      const nameSuffix = ' (Controller ' + index + ')';
      for (let input of controllerInputTemplate) {
        const keys = index != '1' ? [] : input[2];
        this._inputSpec.push([idPrefix + input[0], input[1] + nameSuffix, keys]);
      }
    }

    this._inputMap = this.defaultInputMap();
  }

  dispose() {
    this._canvas.removeEventListener('mousedown', this._mouseHandler);
    window.removeEventListener('keydown', this._keyHandler);
    window.removeEventListener('keyup', this._keyHandler);
  }

  update() {
    this._turboFrame = !this._turboFrame;

    const tmp = this._prevInputState;
    this._prevInputState = this._inputState;
    this._inputState = tmp;
    this._inputState.clear();

    for (let input in this._inputMap) {
      const keys = this._inputMap[input];
      let inputActive = keys.length > 0;
      for (let key of keys) {
        if (!this._keySet.has(key)) {
          inputActive = false;
          break;
        }
      }
      if (inputActive) {
        this._inputState.add(input);
      }
    }

    this.updateSystem();
    this.updateControllers();
  }

  defaultInputMap() {
    const result: InputMap = {};
    for (let input of this._inputSpec) {
      result[input[0]] = input[2];
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
    let controllerBits = this.bitsForController('1');
    this._fceux.setControllerBits(controllerBits);
  }

  private bitsForController(index: '1' | '2' | '3' | '4') {
    let q = 0;

    const prefix = 'controller-' + index + '-';
    if (this.inputDown(prefix + 'a')) q |= 0x01;
    if (this.inputDown(prefix + 'b')) q |= 0x02;
    if (this.inputDown(prefix + 'select')) q |= 0x04;
    if (this.inputDown(prefix + 'start')) q |= 0x08;
    if (this.inputDown(prefix + 'up')) q |= 0x10;
    if (this.inputDown(prefix + 'down')) q |= 0x20;
    if (this.inputDown(prefix + 'left')) q |= 0x40;
    if (this.inputDown(prefix + 'right')) q |= 0x80;

    if (this._turboFrame) {
      if (this.inputDown(prefix + 'turbo-a')) q |= 0x01;
      if (this.inputDown(prefix + 'turbo-b')) q |= 0x02;
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

  private handleKey(e: KeyboardEvent) {
    if (e.type == 'keydown') {
      this._keySet.add(e.code);
    } else {
      this._keySet.delete(e.code);
    }
    e.preventDefault();
  }

  private handleMouse(e: MouseEvent) {
    const rect = this._canvas.getBoundingClientRect();
    this._fceux.triggerZapper(e.clientX - rect.left, e.clientY - rect.top);
    e.preventDefault();
  }
}
