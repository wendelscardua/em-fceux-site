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

type Games = { [url: string]: Array<number> };

function set(games: Games) {
  localStorage['games'] = JSON.stringify(games);
}

export function get(): Games {
  return localStorage.hasOwnProperty('games') ? JSON.parse(localStorage['games']) : {};
}

export function add(url: string, data: Uint8Array) {
  const games = get();
  games[url] = Array.from<number>(data);
  set(games);
}

export function remove(url: string) {
  const games = get();
  delete games[url];
  set(games);
}
