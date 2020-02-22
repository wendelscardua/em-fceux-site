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

import { App } from './app';

export class InputDialog {
  private _app: App;
  private _catchId = '';
  _catchEnabled = false;
  _catchKey = 0;
  _catchGamepad = 0;

  constructor(app: App) {
    this._app = app;

    document.addEventListener('keydown', e => {
      if (!this._catchEnabled) {
        return;
      }
      let key = e.keyCode & 0x0ff;
      if (e.metaKey) key |= 0x800;
      if (e.altKey) key |= 0x400;
      if (e.shiftKey) key |= 0x200;
      if (e.ctrlKey) key |= 0x100;

      this._app._el.catchKey.innerHTML = app.key2Name(key);
      this._catchKey = key;
    });

    // Must scan/poll as Gamepad API doesn't send input events...
    setInterval(() => {
      if (!this._catchEnabled) {
        return;
      }
      const binding = this.scanForGamepadBinding();
      if (!binding) {
        return;
      }
      this._app._el.catchGamepad.innerHTML = app.gamepad2Name(binding);
      this._catchGamepad = binding;
    }, 60);
  }

  keyBindToggle() {
    this._app._el.keyBindDiv.style.display = this._app._el.keyBindDiv.style.display == 'block' ? 'none' : 'block';
  }

  catchStart(keyBind) {
    const nameEl = this._app._el.catchName;
    const keyEl = this._app._el.catchKey;
    const gamepadEl = this._app._el.catchGamepad;
    const catchDivEl = this._app._el.catchDiv;

    const id = keyBind.dataset.id;
    this._catchId = id;

    nameEl.innerHTML = keyBind.dataset.name;
    const key = this._app.getLocalKey(id);
    this._catchKey = key;
    keyEl.innerHTML = this._app.key2Name(key);

    const binding = this._app.getLocalGamepad(id);
    this._catchGamepad = binding;
    gamepadEl.innerHTML = this._app.gamepad2Name(binding);

    catchDivEl.style.display = 'block';

    this._catchEnabled = true;
  }

  catchEnd(save: boolean) {
    const catchDivEl = this._app._el.catchDiv;

    this._catchEnabled = false;

    if (save && this._catchId) {
      // Check/overwrite duplicates
      /*
		  for (let id in FCEC.inputs) {

        // Skip current binding
		    if (FCEV.catchId == id) {
          continue;
        }

                    // Check duplicate key binding
		    const key = FCEM.getLocalKey(id);
		    if (key && FCEV.catchKey == key) {
		      if (!confirm('Key ' + FCEM.key2Name(key) + ' already bound as ' + FCEC.inputs[id][2] + '. Clear the previous binding?')) {
		        FCEV.catchEnabled = true; // Re-enable key catching
		        return;
		      }
		      FCEM.setLocalKey(id, 0);
		      // fceux.bindKey(0, key);
		    }

        // Check duplicate gamepad binding
		    const binding = FCEM.getLocalGamepad(id);
		    if (binding && FCEV.catchGamepad == binding) {
		      if (!confirm(FCEM.gamepad2Name(binding) + ' already bound as ' + FCEC.inputs[id][2] + '. Clear the previous binding?')) {
		        FCEV.catchEnabled = true; // Re-enable key catching
		        return;
		      }
		      FCEM.setLocalGamepad(id, 0);
		      // fceux.bindGamepad(id, 0);
		    }
      }
      */

      // Clear old key binding
      // const oldKey = this._app.getLocalKey(this._catchId);
      // fceux.bindKey(0, oldKey);
      // Set new bindings
      this._app.setLocalKey(this._catchId, this._catchKey);
      // fceux.bindKey(FCEV.catchId, FCEV.catchKey);
      this._app.setLocalGamepad(this._catchId, this._catchGamepad);
      // fceux.bindGamepad(FCEV.catchId, FCEV.catchGamepad);

      this._catchId = '';
      this._app.initKeyBind();
    }

    catchDivEl.style.display = 'none';
  }

  scanForGamepadBinding() {
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
}
