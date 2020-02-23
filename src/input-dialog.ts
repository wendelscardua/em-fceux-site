/**
 * @license
 *
 * Copyright (C) 2020  Valtteri "tsone" Heikkila
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

import { Elements } from './app';
import { Input } from './input';

export class InputDialog {
  private _el: Elements;
  private _input: Input;
  private _catchId = '';
  private _catchKeys: string[] = [];
  private _catchGamepad = 0;

  private _keyDownListener = this.handleKeyDown.bind(this);
  private _gamepadInterval = 0;
  private _listenerOptions = { capture: false, passive: true };

  constructor(el: Elements, input: Input) {
    this._el = el;
    this._input = input;
    this.reset();
  }

  private handleKeyDown() {
    const keys = Array.from(this._input._keySet);
    this._el.catchKey.innerHTML = InputDialog.formatKeys(keys);
    this._catchKeys = keys;
  }

  dispose() {
    this.removeListeners();
  }

  toggleShow() {
    this._el.keyBindDiv.style.display = this._el.keyBindDiv.style.display == 'block' ? 'none' : 'block';
  }

  clearBinding(el: HTMLTableDataCellElement) {
    const id = <string>el.dataset.id;
    this._input.setInput(id, [], 0);
    this.reset();
  }

  resetToDefaults() {
    this._input.loadOrResetInputMap(true);
    this.reset();
  }

  catchStart(el: HTMLTableDataCellElement) {
    const id = <string>el.dataset.id;
    this._catchId = id;

    this._el.catchName.innerHTML = <string>el.dataset.name;

    const input = this._input._inputMap[id];
    this._catchKeys = input[0];
    this._el.catchKey.innerHTML = InputDialog.formatKeys(input[0]);
    this._catchGamepad = input[1];
    this._el.catchGamepad.innerHTML = InputDialog.formatGamepad(input[1]);

    this._el.catchDiv.style.display = 'block';

    this.addListeners();
  }

  catchEnd(save: boolean) {
    if (save && this._catchId) {
      // Check for duplicate bindings.
      for (let id in this._input._inputMap) {
        if (id == this._catchId) {
          // Skip current.
          continue;
        }

        const input = this._input._inputMap[id];
        if (input[0] && this._catchKeys == input[0]) {
          // Duplicate keys.
          if (!confirm('Key ' + InputDialog.formatKeys(input[0]) + ' already bound to ' + id + '. Clear the previous binding?')) {
            return;
          }
          this._input.setInput(id, [], input[1]);
        }
        if (input[1] && this._catchGamepad == input[1]) {
          // Duplicate gamepad.
          if (!confirm(InputDialog.formatGamepad(input[1]) + ' already bound to ' + id + '. Clear the previous binding?')) {
            return;
          }
          this._input.setInput(id, input[0], 0);
        }
      }

      this._input.setInput(this._catchId, this._catchKeys, this._catchGamepad);
      this._catchId = '';
      this.reset();
    }

    this.removeListeners();
    this._el.catchDiv.style.display = 'none';
  }

  private addListeners() {
    document.addEventListener('keydown', this._keyDownListener, this._listenerOptions);

    // Must scan/poll as Gamepad API doesn't send input events...
    this._gamepadInterval = window.setInterval(() => {
      const binding = this.scanForGamepadBinding();
      if (!binding) {
        return;
      }
      this._el.catchGamepad.innerHTML = InputDialog.formatGamepad(binding);
      this._catchGamepad = binding;
    }, 60);
  }

  private removeListeners() {
    clearInterval(this._gamepadInterval);
    document.removeEventListener('keydown', this._keyDownListener, this._listenerOptions);
  }

  private scanForGamepadBinding() {
    if (navigator && navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      // Scan through gamepads.
      let i = gamepads.length - 1;
      if (i > 3) i = 3; // Max 4 gamepads.
      for (; i >= 0; --i) {
        const p = gamepads[i];
        if (p && p.connected) {
          // Scan for button.
          let j = p.buttons.length - 1;
          if (j > 15) j = 15; // Max 16 buttons.
          for (; j >= 0; --j) {
            const button = p.buttons[j];
            if (button.pressed || button.value >= 0.1) {
              return (j << 4) | (i << 2) | 1; // Produce button binding.
            }
          }
          // Scan for axis.
          j = p.axes.length - 1;
          if (j > 15) j = 15; // Max 16 axes.
          for (; j >= 0; --j) {
            const value = p.axes[j];
            if (value <= -0.1) {
              return (j << 4) | (i << 2) | 2; // Produce -axis binding.
            } else if (value >= 0.1) {
              return (j << 4) | (i << 2) | 3; // Produce +axis binding.
            }
          }
        }
      }
    }
    return 0;
  }

  private static fixKey(s: string) {
    for (let prefix of ['Key', 'Digit', 'Arrow']) {
      if (s.startsWith(prefix)) {
        return s.slice(prefix.length);
      }
    }
    return s;
  }

  private static formatKeys(keys: string[]) {
    keys = keys.map(s => InputDialog.fixKey(s));
    return keys && keys.length > 0 ? keys.join('+') : '(Unset)';
  }

  private static formatGamepad(gamepad: number) {
    const type = gamepad & 0x03;
    const pad = (gamepad & 0x0c) >> 2;
    const idx = (gamepad & 0xf0) >> 4;
    if (!type) return '(Unset)';
    const typeNames = ['Button', '-Axis', '+Axis'];
    return 'Gamepad ' + pad + ' ' + typeNames[type - 1] + ' ' + idx;
  }

  private reset() {
    const table = this._el.keyBindTable;

    while (table.lastChild != table.firstChild) {
      table.removeChild(<Node>table.lastChild);
    }

    for (let id in this._input._inputMap) {
      const input = this._input._inputMap[id];
      const name = Input.idToName(id);
      const el = <HTMLTableRowElement>this._el.keyBindProto.cloneNode(true);
      el.children[0].innerHTML = name;
      el.children[1].innerHTML = InputDialog.formatKeys(input[0]);
      el.children[2].innerHTML = InputDialog.formatGamepad(input[1]);
      el.children[3]['dataset'].id = id;
      el.children[3]['dataset'].name = name;

      table.appendChild(el);
    }
  }
}
