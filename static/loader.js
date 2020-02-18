"use strict"
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

// NOTE: Originally from: http://jsfiddle.net/vWx8V/
const KEY_CODE_TO_NAME = {8:"Backspace",9:"Tab",13:"Return",16:"Shift",17:"Ctrl",18:"Alt",19:"Pause/Break",20:"Caps Lock",27:"Esc",32:"Space",33:"Page Up",34:"Page Down",35:"End",36:"Home",37:"Left",38:"Up",39:"Right",40:"Down",45:"Insert",46:"Delete",48:"0",49:"1",50:"2",51:"3",52:"4",53:"5",54:"6",55:"7",56:"8",57:"9",65:"A",66:"B",67:"C",68:"D",69:"E",70:"F",71:"G",72:"H",73:"I",74:"J",75:"K",76:"L",77:"M",78:"N",79:"O",80:"P",81:"Q",82:"R",83:"S",84:"T",85:"U",86:"V",87:"W",88:"X",89:"Y",90:"Z",91:"Meta",93:"Right Click",96:"Numpad 0",97:"Numpad 1",98:"Numpad 2",99:"Numpad 3",100:"Numpad 4",101:"Numpad 5",102:"Numpad 6",103:"Numpad 7",104:"Numpad 8",105:"Numpad 9",106:"Numpad *",107:"Numpad +",109:"Numpad -",110:"Numpad .",111:"Numpad /",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"Num Lock",145:"Scroll Lock",182:"My Computer",183:"My Calculator",186:";",187:"=",188:",",189:"-",190:".",191:"/",192:"`",219:"[",220:"\\",221:"]",222:"'"};

const FCEM = {
games : [],
showStack : (function(show) {
	const el = document.getElementById('stackToggle');
	return function(show) {
		el.checked = (show === undefined) ? !el.checked : show;
	};
})(),
showControls : (function(show) {
	const el = document.getElementById('controllersToggle');
	return function(show) {
		el.checked = (show === undefined) ? !el.checked : show;
	};
})(),
toggleSound : (function() {
	const el = document.getElementById('soundIcon');
	return function() {
		fceux.setMuted(!fceux.muted());
		el.style.backgroundPosition = (!fceux.muted() ? '-32' : '-80') + 'px -48px';
	};
})(),
  onDeleteGameSyncFromIDB : function(er) {
    FCEM.updateGames();
    FCEM.updateStack();
  },
  onDOMLoaded : function() {
    FCEM.showStack(false);
    FCEM.showControls(false);
  },
  startGame : function(url) {
    // NOTE: AudioContext must be created from user input.
    if (!fceux.audioContext()) {
      let audioContext;
      if (typeof AudioContext !== 'undefined') {
        audioContext = new AudioContext();
      } else if (typeof webkitAudioContext !== 'undefined') {
        audioContext = new webkitAudioContext();
      }
      fceux.setAudioContext(audioContext);
    }

    fceux.downloadGame(url);
  },
  splitPath: function(filename) {
    const splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    return splitPathRe.exec(filename).slice(1);
  },
  pathJoin: function() {
    const s = Array.prototype.slice.call(arguments, 0).join('/');
    return s.replace(/\/\/+/g, '/');
  },
  updateGames : function() {
    const builtIns = [
      'Streemerz.nes',
      '2048.nes',
      'Lawn Mower.nes',
      'Alter Ego.nes',
      'Super Bat Puncher (Demo).nes',
      'Lan Master.nes',
    ];

    const addGame = function(filename, deletable) {
      deletable = deletable || false;
      const split = FCEM.splitPath(filename);
      const label = split[2].slice(0, -split[3].length).toUpperCase();
      const offset = calcGameOffset();
      return {label:label, url:filename, offset:offset, deletable:deletable};
    };

    let games = builtIns.map(function(filename) { return addGame('/games/' + filename); } );
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
    games.sort(function(a, b) {
      return (a.label < b.label) ? -1 : ((a.label > b.label) ? 1 : 0);
    });
    FCEM.games = games;
  },
  updateStack : function() {
    const games = FCEM.games;
    const stackContainer = document.getElementById("stackContainer");
    const scrollPos = stackContainer.scrollTop;
    const list = document.getElementById("stack");
    const proto = document.getElementById("cartProto");

    while (list.firstChild != list.lastChild) {
      list.removeChild(list.lastChild);
    }

    for (let i = 0; i < games.length; i++) {
      const item = games[i];
      const el = proto.cloneNode(true);

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
  },
  _getLocalInputDefault : function(id, type) {
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
  },
  setLocalKey : function(id, key) {
    // localStorage['input' + id] = key;
  },
  getLocalKey : function(id) {
    return FCEM._getLocalInputDefault(id, 0);
  },
  setLocalGamepad : function(id, binding) {
    // localStorage['gp' + id] = binding;
  },
  getLocalGamepad : function(id) {
    return FCEM._getLocalInputDefault(id, 1);
  },
  clearInputBindings : function() {
    // for (let id in FCEC.inputs) {
    //   // clear local bindings
    //   delete localStorage['input' + id];
    //   delete localStorage['gp' + id];
    //   // clear host bindings
    //   const key = FCEM.getLocalKey(id);
    //   // fceux.bindKey(0, key);
    //   // fceux.bindGamepad(id, 0);
    // }
  },
  syncInputBindings : function() {
    // for (let id in FCEC.inputs) {
    //   const key = FCEM.getLocalKey(id);
    //   // fceux.bindKey(id, key);
    //   const binding = FCEM.getLocalGamepad(id);
    //   // fceux.bindGamepad(id, binding);
    // }
  },
  initInputBindings : function() {
    FCEM.syncInputBindings();
    FCEM.initKeyBind();
  },
  key2Name : function (key) {
    let keyName = (key & 0x0FF) ? KEY_CODE_TO_NAME[key & 0x0FF] : '(Unset)';
    if (keyName === undefined) keyName = '(Unknown)';
    let prefix = '';
    if (key & 0x100 && keyName !== 'Ctrl')  prefix += 'Ctrl+';
    if (key & 0x400 && keyName !== 'Alt')   prefix += 'Alt+';
    if (key & 0x200 && keyName !== 'Shift') prefix += 'Shift+';
    if (key & 0x800 && keyName !== 'Meta')  prefix += 'Meta+';
    return prefix + keyName;
  },
  gamepad2Name : function (binding) {
    const type = binding & 0x03;
    const pad = (binding & 0x0C) >> 2;
    const idx = (binding & 0xF0) >> 4;
    if (!type) return '(Unset)';
    const typeNames = [ 'Button', '-Axis', '+Axis' ];
    return 'Gamepad ' + pad + ' ' + typeNames[type-1] + ' ' + idx;
  },
  initKeyBind : function() {
    const table = document.getElementById("keyBindTable");
    const proto = document.getElementById("keyBindProto");

    while (table.lastChild != table.firstChild) {
      table.removeChild(table.lastChild);
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
  },
  clearBinding : function(keyBind) {
    const id = keyBind.dataset.id;
    const key = FCEM.getLocalKey(id);
    // fceux.bindKey(0, key);
    FCEM.setLocalKey(id, 0);
    // fceux.bindGamepad(id, 0);
    FCEM.setLocalGamepad(id, 0);
    FCEM.initKeyBind();
  },
  resetDefaultBindings : function() {
    FCEM.clearInputBindings();
    FCEM.initInputBindings();
  },
  setConfig2 : function(id, v) {
    v = (isNaN(v * 1) ? v : v * 1);
    fceux.setConfig(id, v);
    localStorage[id] = v;
  },
  setConfig : function(el) {
    FCEM.setConfig2(el.id, (el.type == 'checkbox' ? el.checked : el.value));
  },
  initConfig : function(reset) {
    for (let id in fceux.defaultConfig) {
      let v = fceux.defaultConfig[id];
      if (!reset && localStorage.hasOwnProperty(id)) {
        v = localStorage[id];
        v = (isNaN(v * 1) ? v : v * 1);
      }
      FCEM.setConfig2(id, v);
      FCEV.setControllerEl(id, v);
    }
  },
  toggleFullscreen: function() {
    if ('requestFullscreen' in fceux.canvas) {
      if (!document.fullscreenElement) {
        fceux.canvas.requestFullscreen().catch(e => {
          console.warn('Can\'t enter fullscreen, ' + e.message + '.');
        });
      } else {
        document.exitFullscreen();
      }
    } else if ('webkitRequestFullscreen' in fceux.canvas) {
      if (!document.webkitFullscreenElement) {
        fceux.canvas.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
      } else {
        document.webkitExitFullscreen();
      }
    } else {
      console.warn('Fullscreen API unavailable.');
    }
  },
};

const FCEV = {
catchEnabled : false,
catchId : null,
catchKey : null,
catchGamepad : null,
keyBindToggle : (function() {
	const el = document.getElementById("keyBindDiv");
	return function() {
		el.style.display = (el.style.display == 'block') ? 'none' : 'block';
	};
})(),
catchStart : (function(keyBind) {
	const nameEl = document.getElementById("catchName");
	const keyEl = document.getElementById("catchKey");
	const gamepadEl = document.getElementById("catchGamepad");
	const catchDivEl = document.getElementById("catchDiv");
	return function(keyBind) {
		const id = keyBind.dataset.id;
		FCEV.catchId = id;

		nameEl.innerHTML = keyBind.dataset.name;
		const key = FCEM.getLocalKey(id);
		FCEV.catchKey = key;
		keyEl.innerHTML = FCEM.key2Name(key);

		const binding = FCEM.getLocalGamepad(id);
		FCEV.catchGamepad = binding;
		gamepadEl.innerHTML = FCEM.gamepad2Name(binding);

		catchDivEl.style.display = 'block';

		FCEV.catchEnabled = true;
	};
})(),
catchEnd : (function(save) {
	const catchDivEl = document.getElementById("catchDiv");
	return function(save) {
		FCEV.catchEnabled = false;

		if (save && FCEV.catchId) {
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
		  const oldKey = FCEM.getLocalKey(FCEV.catchId);
		  // fceux.bindKey(0, oldKey);
		  // Set new bindings
		  FCEM.setLocalKey(FCEV.catchId, FCEV.catchKey);
		  // fceux.bindKey(FCEV.catchId, FCEV.catchKey);
		  FCEM.setLocalGamepad(FCEV.catchId, FCEV.catchGamepad);
		  // fceux.bindGamepad(FCEV.catchId, FCEV.catchGamepad);

		  FCEV.catchId = null;
		  FCEM.initKeyBind();
		}

		catchDivEl.style.display = 'none';
	};
})(),
setControllerEl : function(id, val) {
	const el = document.getElementById(id);
	if (!el) {
		return;
	}
	if (el.tagName == 'SELECT' || el.type == 'range') {
		el.value = val;
	} else if (el.type == 'checkbox') {
		el.checked = val;
	}
},
scanForGamepadBinding : function() {
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
          if (button.pressed || (button.value >= 0.1)) {
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
},
};

window.onbeforeunload = function (ev) {
  return 'To prevent save game data loss, please let the game run at least one second after saving and before closing the window.';
};

const moduleParams = {
  print: function(text) {
    text = Array.prototype.slice.call(arguments).join(' ');
    console.log(text);
  },
  printErr: function(text) {
    text = Array.prototype.slice.call(arguments).join(' ');
    console.error(text);
  },
  canvas: (function() {
    const el = document.getElementById('canvas');
// TODO: tsone: handle context loss, see: http://www.khronos.org/registry/webgl/specs/latest/1.0/#5.15.2
    el.addEventListener("webglcontextlost", function(e) { alert('WebGL context lost. You will need to reload the page.'); e.preventDefault(); }, false);
    return el;
  })(),
};
const fceux = FCEUX(moduleParams);
const input = new Input(moduleParams.canvas, fceux);
fceux.then(() => {
  fceux.init();

  // TODO: Perform initial setup otherwise.
  FCEM.updateGames();
  FCEM.updateStack();
  FCEM.showStack(true);

  FCEM.initConfig();
  FCEM.initInputBindings();

  fceux.addEventListener('game-loaded', function() {
    const md5 = fceux.gameMd5();
    if (md5 && localStorage.hasOwnProperty('save-' + md5)) {
      // Import saves from localStorage.
      const save = JSON.parse(localStorage['save-' + md5]);
      for (let filename in save) {
        save[filename] = new Uint8Array(save[filename]);
      }
      fceux.importSaveFiles(save);

      // Hide UI after timeout.
      setTimeout(function() { FCEM.showStack(false); FCEM.showControls(false); }, 1000);
    }
  });

  // Export saves to localStorage at interval.
  setInterval(function() {
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
    input.update();
    fceux.update();
  };
  updateLoop();
});

function dragHandler(text) {
  return function(ev) {
    ev.stopPropagation();
    ev.preventDefault();
  };
}
function dropHandler(ev) {
  ev.stopPropagation();
  ev.preventDefault();
  const f = ev.dataTransfer.files[0];
  if (f && confirm('Do you want to run the game ' + f.name + ' and add it to stack?')) {
    const r = new FileReader();
    r.onload = function(e) {
      const opts = {encoding:'binary'};
      // TODO: Save game otherwise
      // const path = FCEM.pathJoin('/fceux/rom/', f.name);
      // fceux.FS.writeFile(path, new Uint8Array(e.target.result), opts);
      FCEM.updateGames();
      FCEM.updateStack();
      // FCEM.startGame(path);
    }
    r.readAsArrayBuffer(f);
  }
}

document.addEventListener('dragenter', dragHandler('enter'), false);
document.addEventListener('dragleave', dragHandler('leave'), false);
document.addEventListener('dragover', dragHandler('over'), false);
document.addEventListener('drop', dropHandler, false);

let current = 0;

function calcGameOffset() {
  return 3 * ((3*Math.random()) |0);
}

function askConfirmGame(ev, el, q) {
  const games = FCEM.games;
  ev.stopPropagation();
  ev.preventDefault();
  const idx = current + (el.dataset.idx |0);
  if ((idx >= 0) && (idx < games.length) && confirm(q + ' ' + games[idx].label + '?')) {
    return idx;
  } else {
    return -1;
  }
}

function askSelectGame(ev, el) {
  const idx = askConfirmGame(ev, el, 'Do you want to play');
  if (idx != -1) {
    FCEM.startGame(FCEM.games[idx].url);
  }
  return false;
}

function askDeleteGame(ev, el) {
  let idx = askConfirmGame(ev, el, 'Do you want to delete');
  if (idx != -1) {
    idx = askConfirmGame(ev, el, 'ARE YOU REALLY SURE YOU WANT TO DELETE');
    if (idx != -1) {
      // TODO: remove game rom
      // const item = FCEM.games.slice(idx, idx+1)[0];
      // fceux.FS.unlink(item.path);
      // fceux.FS.syncfs(FCEM.onDeleteGameSyncFromIDB);
    }
  }
  return false;
}

function findFiles(startPath) {
  function isRealDir(p) {
    return p !== '.' && p !== '..';
  };
  function toAbsolute(root) {
    return function(p) {
      return FCEM.pathJoin(root, p);
    }
  };

  try {
    const listing = fceux.FS.readdir(startPath);
    return listing.filter(isRealDir).map(toAbsolute(startPath));
  } catch (e) {
    return [];
  }
}

document.addEventListener("keydown", function(e) {
  if (!FCEV.catchEnabled) {
    return;
  }
  let key = e.keyCode & 0x0FF;
  if (e.metaKey)  key |= 0x800;
  if (e.altKey)   key |= 0x400;
  if (e.shiftKey) key |= 0x200;
  if (e.ctrlKey)  key |= 0x100;

  const el = document.getElementById("catchKey");
  el.innerHTML = FCEM.key2Name(key);

  FCEV.catchKey = key;
});

// Must scan/poll as Gamepad API doesn't send input events...
setInterval(function() {
  if (!FCEV.catchEnabled) {
    return;
  }
  const binding = FCEV.scanForGamepadBinding();
  if (!binding) {
    return;
  }
  const el = document.getElementById("catchGamepad");
  el.innerHTML = FCEM.gamepad2Name(binding);
  FCEV.catchGamepad = binding;
}, 60);

document.addEventListener('DOMContentLoaded', FCEM.onDOMLoaded, false);
