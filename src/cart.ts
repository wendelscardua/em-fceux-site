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

import { FceuxModule } from 'em-fceux';
import * as Games from './games';

export class Cart {
  _label: string;
  _url: string;
  _deletable: boolean;

  private static _proto = <HTMLDivElement>document.getElementById('cartProto');

  private _offset: number;

  constructor(label: string, url: string, deletable: boolean) {
    this._label = label;
    this._url = url;
    this._offset = 3 * ((3 * Math.random()) | 0);
    this._deletable = deletable;
  }

  createDomElement(index: number) {
    const el = <any>Cart._proto.cloneNode(true);

    if (index == 0) {
      el.classList.add('cartAdd');
      this._offset = 3;
    }

    el.dataset.idx = index;
    el.style.backgroundPosition = this._offset + 'px 0px';

    const label = el.firstChild.firstChild.firstChild;
    label.innerHTML = this._label;

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

    if (!this._deletable) {
      el.firstChild.lastChild.hidden = true;
    }

    return el;
  }

  start(fceux: FceuxModule) {
    if (!this._deletable) {
      fceux.downloadGame(this._url);
    } else {
      const games = Games.get();
      fceux.loadGame(new Uint8Array(games[this._url]));
    }
  }
}
