/*
    XYMO — GAME ENGINE
    Pure game logic. Command handlers mutate `state` and RETURN their output as
    an array of text blocks (strings). They never touch the DOM — rendering and
    animation are the UI layer's job (ui.js).

    Output text may contain authoring/markup that the UI renders:
        -word-      noun (location / object / item)        cyan
        *word*      command verb                           amber
        ~word~      Architect glyph / translated word      violet  (emitted here)
        {g:<id>}    a glyph reference, resolved by resolveGlyphs() against lexicon
        @cls@ ...   a leading block-class directive (e.g. "@raw@ ", "@qai@ ")

    The engine also exposes helpers the UI needs:
        COMMANDS         — ordered list of command verbs
        currentNouns()   — Set of noun labels referenceable right now
        completionsFor() — candidate completions for a given token slot
*/


/*
    STATE
*/

var state = {
    curloc: 1,
    inventory: [0],          // start with the interfacer
    power: 100,              // 0-100; soft urgency, never a hard fail
    lexicon: new Set(),     // ids of glyphs the player has translated
    flags: { visited: { 1: true } },   // story booleans; visited rooms (start on surface)
    sensorMode: 'qai',      // 'qai' (Q-AI interpretation) | 'raw' (truth)
    rawUnlocked: false      // raw-feed module gained later (the Lab)
};


/*
    COMMAND VERBS  (order drives the default blank-prompt suggestion: 'status')
    'raw' is a hidden alias of 'feed' and intentionally absent from help.
*/

const COMMANDS = ['status', 'scan', 'inspect', 'translate', 'inventory',
                  'enter', 'use', 'stow', 'drop',
                  'power', 'recharge', 'feed', 'raw', 'help'];


/*
    POWER
*/

const POWER_COST = {
    enter: 5, use: 3, translate: 3, scan: 2, inspect: 2,
    stow: 1, drop: 1, status: 1,
    inventory: 0, help: 0, power: 0, recharge: 0, feed: 0, raw: 0
};

const LOW = 30, CRIT = 15;

// power "band": 0 = ok, 1 = low, 2 = critical (higher is worse)
function band(p) {
    if (p <= CRIT) return 2;
    if (p <= LOW) return 1;
    return 0;
}

function applyCost(cmd) {
    const c = POWER_COST[cmd] || 0;
    if (c) state.power = Math.max(0, state.power - c);
}

// Q-AI's "abort and conserve power" leash — the engine of the loop
function barkFor(b) {
    if (b === 2) return ['@qai@ [Q-AI]: Power critical. I really must recommend aborting to a charging dock. You have done so well — nobody would blame you for turning back.'];
    if (b === 1) return ['@qai@ [Q-AI]: Friendly reminder! Power reserves are getting low. Returning to dock is always a valid option. ☺'];
    return [];
}


/*
    TEXT RESOLUTION  (glyphs + low-power degradation)
*/

// Resolve glyph markup, wrapping each in guillemets so it stands apart from prose
// (not just by color). `{g:id}` reads as the symbol until learned, then its word.
// `{gs:id}` ALWAYS shows the symbol — for Rosetta features that physically depict
// the carved sigil (so you never "read" a glyph you haven't learned yet).
function resolveGlyphs(s) {
    return s.replace(/\{g(s?):([a-z0-9_]+)\}/gi, (m, forceSym, id) => {
        const g = glyphs[id];
        if (!g) return m;
        const show = (forceSym || !state.lexicon.has(id)) ? g.symbol : g.word;
        return '~‹' + show + '›~';
    });
}

// a glyph token for system lines (e.g. "[LEXICON UPDATED] ‹⊟› = sealed")
function glyphTag(id) {
    return '~‹' + glyphs[id].symbol + '›~';
}

// at critical power, sensor text glitches (letters only; markup left intact)
function degrade(s) {
    if (state.power > CRIT) return s;
    const glitch = '▓▒░#%';
    return s.replace(/[a-z]/gi, ch =>
        Math.random() < 0.07 ? glitch[Math.floor(Math.random() * glitch.length)] : ch);
}

function resolveText(s) {
    let pre = '';
    const m = s.match(/^(@\w+@ )([\s\S]*)$/);   // preserve a leading @cls@ directive
    if (m) { pre = m[1]; s = m[2]; }
    return pre + degrade(resolveGlyphs(s));
}

// pick the right description variant: string, or {qai, raw} object.
// raw feed (when installed + active) returns the truth, tagged for stark styling.
function desc(d) {
    if (d && typeof d === 'object') {
        if (state.sensorMode === 'raw' && state.rawUnlocked && d.raw) return '@raw@ ' + d.raw;
        return d.qai != null ? d.qai : (d.raw || '');
    }
    return d;
}


/*
    LOOKUP HELPERS
*/

function namify(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// hidden connections are absent until revealed (skipped everywhere)
function connHidden(i) {
    return !!conns[i].locations[state.curloc].hidden;
}

function findConn(loc, label) {
    for (let i of loc.connections) {
        if (conns[i].label === label && !connHidden(i)) return i;
    }
    return -1;
}

function findItem(idList, label) {
    for (let i of idList) {
        if (items[i].label === label) return i;
    }
    return -1;
}

// item id for a label reachable now (room, then storage); -1 if none
function findItemHere(label) {
    const loc = locs[state.curloc];
    let ix = findItem(loc.items, label);
    if (ix === -1) ix = findItem(state.inventory, label);
    return ix;
}

// return the applicable command verbs for a noun label (for tailored hints)
function suggestVerbs(label) {
    const loc = locs[state.curloc];
    if (findConn(loc, label) !== -1) return ['scan', 'enter'];
    const ix = findItemHere(label);
    if (ix !== -1) {
        const it = items[ix];
        const v = ['scan'];
        if (it.glyphs) v.push('translate');
        if (!it.fixed) v.push(findItem(loc.items, label) !== -1 ? 'stow' : 'drop');
        return v;
    }
    return null;
}

// shared look logic for inspect/scan: returns output lines, or null if not found
function examine(obj) {
    const loc = locs[state.curloc];
    const noFurther = 'No further information available on close inspection.';

    // connections first
    let ix = findConn(loc, obj);
    if (ix !== -1) {
        const conn = conns[ix].locations[state.curloc];
        return [desc(conn.description), desc(conn.long_description) || noFurther];
    }

    // then items (room, then storage)
    ix = findItemHere(obj);
    if (ix === -1) return null;

    const item = items[ix];
    const lines = [desc(item.description)];

    // Rosetta: deduce glyph meaning from depicted context. Show the sigil in the
    // description (via {gs:}), THEN confirm what was newly learned — so it's earned.
    let learnedLine = null;
    if (item.teaches) {
        const newly = item.teaches.filter(id => glyphs[id] && !state.lexicon.has(id));
        item.teaches.forEach(id => state.lexicon.add(id));
        if (newly.length) {
            learnedLine = '[LEXICON UPDATED] ' +
                newly.map(id => glyphTag(id) + ' = ' + glyphs[id].word).join(',  ');
        }
    }

    if (item.long_description) lines.push(desc(item.long_description));
    else if (!learnedLine) lines.push(noFurther);
    if (learnedLine) lines.push(learnedLine);
    return lines;
}


/*
    HELP TABLE  (columns line up *after* markup is stripped)
*/

function stripMarkup(s) {
    return s.replace(/\*([a-zA-Z][\w]*)\*/g, '$1').replace(/-([a-zA-Z][\w]*)-/g, '$1');
}

function buildHelp() {
    const rows = COMMAND_HELP.map(([cmd, arg]) => (arg ? `*${cmd}* ${arg}` : `*${cmd}*`));
    const width = Math.max(...rows.map(r => stripMarkup(r).length)) + 2;
    const lines = COMMAND_HELP.map(([cmd, arg, descText], i) => {
        const left = rows[i];
        const pad = ' '.repeat(width - stripMarkup(left).length);
        return left + pad + descText;
    });
    return 'Commands:\n' + lines.join('\n');
}


/*
    COMMAND HANDLERS  — each returns string[] (one entry per output block)
*/

var commands = {
    'help': () => [buildHelp()],

    'inventory': () => {
        const labels = state.inventory.map(i => `-${items[i].label}-`).join(', ');
        return ['[INVENTORY:] ' + labels];
    },

    'power': () => {
        return ['[POWER] ' + powerBar(state.power) + ' ' + state.power + '%'];
    },

    'status': () => {
        const loc = locs[state.curloc];
        const out = ['[ENVIRONMENT READING:] ' + loc.label, desc(loc.description)];
        for (let ix of loc.connections) {
            if (connHidden(ix)) continue;   // Q-AI's omissions stay omitted
            out.push(desc(conns[ix].locations[state.curloc].description));
        }
        for (let ix of loc.items) {
            out.push(desc(items[ix].description));
        }
        return out;
    },

    'enter': (kws) => {
        if (!kws[1]) return ['Missing -location-.  Syntax: *enter* -location-.'];

        const loc = locs[state.curloc];
        const port = kws[1];

        const ix = findConn(loc, port);
        if (ix === -1) {
            if (findItemHere(port) !== -1) return ["You can't *enter* the " + port + '.  Try *scan* ' + port + '.'];
            return ['No way out called "' + port + '" here.  Try *status* to see the exits.'];
        }

        const conn = conns[ix].locations[state.curloc];
        if (conn.locked) return [namify(conns[ix].label) + ' is locked.'];

        state.curloc = conn.destination;
        const out = [conn.transition];

        // chirpy Q-AI aside, once per room on first arrival
        const dest = locs[state.curloc];
        if (dest.qai && !state.flags.visited[state.curloc]) out.push('@qai@ ' + dest.qai);
        state.flags.visited[state.curloc] = true;
        return out;
    },

    'inspect': (kws) => {
        if (!kws[1]) return ['Missing -obj- to inspect.'];
        const r = examine(kws[1]);
        return r || ['Nothing called "' + kws[1] + '" here.'];
    },

    // detailed scan — like inspect, but surfaces `doubt` lines Q-AI must explain away
    'scan': (kws) => {
        if (!kws[1]) return ['Missing -obj- to scan.'];
        const r = examine(kws[1]);
        if (!r) return ['Nothing called "' + kws[1] + '" here.'];
        const ix = findItemHere(kws[1]);
        if (ix !== -1 && items[ix].doubt) return r.concat(items[ix].doubt);
        return r;
    },

    'translate': (kws) => {
        if (!kws[1]) return ['Missing -obj- to translate.'];

        const target = kws[1];
        const loc = locs[state.curloc];
        const ix = findItemHere(target);
        if (ix === -1 || !items[ix].glyphs) {
            if (ix !== -1) return ['Nothing to translate on the ' + target + '.  Try *scan* ' + target + '.'];
            if (findConn(loc, target) !== -1) return ['The ' + target + ' bears no Architect glyphs.'];
            return ['No inscription called "' + target + '" here.'];
        }

        const item = items[ix];
        const out = [];

        // scrutiny can uncover a concealed mechanism this inscription refers to
        if (item.reveals != null && connHidden(item.reveals)) {
            conns[item.reveals].locations[state.curloc].hidden = false;
            out.push('[CROSS-REFERENCE] The markings key to a concealed mechanism nearby.');
            if (item.revealSpin) out.push('@qai@ ' + item.revealSpin);
        }

        // literal reading (known glyphs auto-resolve to words; unknown stay symbols)
        out.push('[ARCHITECT GLYPHS] ' + desc(item.description));

        // Q-AI ALWAYS offers its gloss — its confident, self-serving mistranslation
        const gloss = item.glyphs.map(id => glyphs[id] ? (glyphs[id].qaiWord || glyphs[id].word) : '?').join(' ');
        const conf = 86 + (item.glyphs.length * 3);
        out.push('@qai@ [Q-AI TRANSLATION, ' + conf + '%]: "' + gloss + '." ' + (item.qaiSpin || ''));
        return out;
    },

    'use': (kws) => {
        if (!kws[1]) return ['Missing -item- to use.  Syntax: *use* -item- on -obj-.'];

        const loc = locs[state.curloc];

        if (kws.length !== 4 || kws[2] !== 'on') {
            const what = kws[1];
            // tailored to what they named: a connection wants enter/scan, not use
            if (findConn(loc, what) !== -1) {
                return ["You can't *use* the " + what + ' directly.  Try *enter* ' + what + ' or *scan* ' + what + '.'];
            }
            if (findItemHere(what) !== -1) {
                return ['Syntax: *use* ' + what + ' on -obj-   (e.g. *use* ' + what + ' on -door-).'];
            }
            return ['Syntax: *use* -item- on -obj-.'];
        }

        const item = kws[1];
        const obj = kws[3];   // kws[2] is the preposition "on"

        const ix = findItem(loc.items.concat(state.inventory), item);
        if (ix === -1) return ['Item not nearby or in storage module: ' + item];

        const ci = findConn(loc, obj);
        if (ci !== -1) {
            const conn = conns[ci].locations[state.curloc];

            if (!conn.locked) {
                return ['Action had no effect. ' + namify(conns[ci].label) + ' already unlocked.'];
            }
            const sol = conn.solution;
            let solved = false;
            if (sol[0] === 'item') {
                solved = (sol[1] === ix);
            } else if (sol[0] === 'interfacer') {
                if (items[ix].label !== 'interfacer') {
                    return ['The ' + items[ix].label + ' has no effect on ' + conns[ci].label + '.'];
                }
                const missing = sol[1].filter(g => !state.lexicon.has(g));
                if (missing.length) {
                    return ['[INTERFACER] Handshake failed. Required command glyph not yet in lexicon.'];
                }
                solved = true;
            }
            if (solved) {
                conn.locked = false;
                const out = ['Success!', sol[2]];
                if (conn.protest) out.push('@qai@ ' + conn.protest);
                return out;
            }
            return ['Object ' + conns[ci].label + ' does not accept ' + items[ix].label + '.'];
        }

        // TODO: item-on-item interactions
        return ['Could not locate object: ' + obj];
    },

    'stow': (kws) => {
        if (!kws[1]) return ['Syntax error: missing -item-.'];

        const loc = locs[state.curloc];
        const item = kws[1];

        const ix = findItem(loc.items, item);
        if (ix === -1) return ['Item not in room: ' + item];
        if (items[ix].fixed) return ['Cannot stow ' + item + ': object is fixed in place.'];

        state.inventory.push(ix);
        loc.items = loc.items.filter(k => k !== ix);
        return ['Item added to storage module: ' + item];
    },

    'drop': (kws) => {
        if (!kws[1]) return ['Syntax error: missing -item-.'];

        const loc = locs[state.curloc];
        const item = kws[1];

        const ix = findItem(state.inventory, item);
        if (ix === -1) return ['Item not in storage: ' + item];

        state.inventory = state.inventory.filter(k => k !== ix);
        loc.items.push(ix);
        return ['Item removed from storage module: ' + item];
    },

    'recharge': () => {
        const loc = locs[state.curloc];
        if (!loc.charger) {
            return ['No charging source here. [Q-AI]: A dock would be ever so convenient right now.'];
        }
        const before = state.power;
        state.power = Math.min(100, state.power + (loc.charge || 100));
        const out = ['[CHARGING...] Power at ' + state.power + '%. (+' + (state.power - before) + '%)'];
        if (loc.chargeNag) out.push('@qai@ ' + loc.chargeNag);
        return out;
    },

    'feed': (kws) => commands.raw(kws),

    'raw': () => {
        if (!state.rawUnlocked) {
            return ['Raw sensor feed unavailable. [MODULE NOT INSTALLED]'];
        }
        state.sensorMode = state.sensorMode === 'raw' ? 'qai' : 'raw';
        return ['[SENSOR MODE] ' + (state.sensorMode === 'raw'
            ? 'RAW FEED — bypassing Q-AI interpretation.'
            : 'Q-AI interpretation restored.')];
    }
};

// power readout bar, e.g. [▓▓▓▓▓░░░░░]
function powerBar(p) {
    const n = Math.round(p / 10);
    return '[' + '▓'.repeat(n) + '░'.repeat(10 - n) + ']';
}

// run a parsed command line: dispatch, charge power, append barks, resolve text
function runCommand(kws) {
    const cmd = kws[0];
    if (!commands[cmd]) return ['Command not recognized. Type "help" for help.'];

    const prevBand = band(state.power);
    let out = commands[cmd](kws);
    applyCost(cmd);
    const newBand = band(state.power);
    if (newBand > prevBand) out = out.concat(barkFor(newBand));

    return out.map(resolveText);
}


/*
    UI SUPPORT — what's referenceable / completable in the current context
*/

function currentNouns() {
    const loc = locs[state.curloc];
    const set = new Set();
    for (let i of loc.connections) if (!connHidden(i)) set.add(conns[i].label);
    for (let i of loc.items) set.add(items[i].label);
    for (let i of state.inventory) set.add(items[i].label);
    return set;
}

function completionsFor(words, index) {
    if (index === 0) return COMMANDS.slice();

    const cmd = words[0].toLowerCase();
    const loc = locs[state.curloc];
    const connLabels = loc.connections.filter(i => !connHidden(i)).map(i => conns[i].label);
    const roomItems = loc.items.map(i => items[i].label);
    const invItems = state.inventory.map(i => items[i].label);
    const glyphItems = loc.items.concat(state.inventory)
        .filter(i => items[i].glyphs).map(i => items[i].label);

    switch (cmd) {
        case 'enter':     return index === 1 ? connLabels : [];
        case 'scan':
        case 'inspect':   return index === 1 ? connLabels.concat(roomItems) : [];
        case 'translate': return index === 1 ? glyphItems : [];
        case 'stow':      return index === 1 ? roomItems : [];
        case 'drop':      return index === 1 ? invItems : [];
        case 'use':
            if (index === 1) return invItems.concat(roomItems);
            if (index === 2) return ['on'];
            if (index === 3) return connLabels.concat(roomItems);
            return [];
        default: return [];
    }
}
