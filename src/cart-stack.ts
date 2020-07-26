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

import { Cart } from './cart';
import * as Games from './games';

function splitPath(filename: string) {
  const splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
  const split = splitPathRe.exec(filename);
  return split ? split.slice(1) : [];
}

function pathJoin(...parts: string[]) {
  const s = Array.prototype.slice.call(parts, 0).join('/');
  return s.replace(/\/\/+/g, '/');
}

export class CartStack {
  private _carts: Cart[] = [];
  private _div = <HTMLDivElement>document.getElementById('stack');
  private _container = <HTMLDivElement>document.getElementById('stackContainer');
  private _toggle = <HTMLInputElement>document.getElementById('stackToggle');

  show(show: boolean) {
    this._toggle.checked = show === undefined ? !this._toggle.checked : show;
  }

  getCart(index: number) {
    return this._carts[index];
  }

  getCartByLabel(label: string) {
    var canonLabel = label.toUpperCase();
    return this._carts.find((cart) => (cart._label === canonLabel));
  }

  addCart(url: string, data: Uint8Array) {
    Games.add(url, data);
    this.update();
  }

  removeCart(index: number) {
    Games.remove(this._carts[index]._url);
    this.update();
  }

  update() {
    const builtIns = ['controll.nes', 'raddio.nes', 'retropia.nes', 'retropia-ptbr.nes'];

    this._carts.length = 0;
    const pushGame = (filename: string, deletable: boolean) => {
      const split = splitPath(filename);
      const label = split[2].slice(0, -split[3].length).toUpperCase();
      this._carts.push(new Cart(label, filename, deletable));
    };
    for (let filename of builtIns) {
      pushGame('games/' + filename, false);
    }
    for (let filename in Games.get()) {
      pushGame(filename, true);
    }

    this._carts.sort((a, b) => (a._label < b._label ? -1 : a._label > b._label ? 1 : 0));

    this._carts.unshift(new Cart('', '', false));

    this.updateDom();
  }

  private updateDom() {
    const stackContainer = this._container;
    const scrollPos = stackContainer.scrollTop;
    const list = this._div;

    while (list.firstChild != list.lastChild) {
      list.removeChild(<Node>list.lastChild);
    }

    for (let i = 0; i < this._carts.length; ++i) {
      list.appendChild(this._carts[i].createDomElement(i));
    }

    stackContainer.scrollTop = scrollPos;
  }
}
