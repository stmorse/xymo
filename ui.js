/*
    XYMO — UI / TERMINAL LAYER
    Owns the DOM: scrollback rendering, the syntax-highlighted input line,
    ghost-text autocomplete, and the typewriter output animation.

    The input is a transparent <textarea> sitting on top of a "mirror" <div>.
    The textarea natively handles the caret, selection, and backspace (so the
    player can never delete past their own input), while the mirror underneath
    renders the same text colored, plus the gray ghost-text suggestion.
*/

let scroll, inputLine, mirror, cmd, prompt, statusline;

// animation state
let busy = false;   // true while output is typing out
let skip = false;   // set by a keypress to fast-forward the current animation

// tab-completion cycle: { index, list, pos } or null
let cycle = null;

// command history
let history = [];
let histIdx = 0;


/*
    TEXT RENDERING
*/

function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// split displayed text into colored segments: *cmd* / -noun- / ~glyph~
function renderSegments(s) {
    const re = /\*([a-zA-Z][\w]*)\*|-([a-zA-Z][\w]*)-|~([^~]+)~/g;
    const segs = [];
    let last = 0, m;
    while ((m = re.exec(s)) !== null) {
        if (m.index > last) segs.push({ text: s.slice(last, m.index), cls: '' });
        if (m[1] != null) segs.push({ text: m[1], cls: 'cmd' });
        else if (m[2] != null) segs.push({ text: m[2], cls: 'noun' });
        else segs.push({ text: m[3], cls: 'glyph' });
        last = re.lastIndex;
    }
    if (last < s.length) segs.push({ text: s.slice(last), cls: '' });
    return segs;
}

// color the player's own typed input by classifying each token live
function highlightInput(value) {
    const nouns = currentNouns();
    const parts = value.split(/(\s+)/);   // keeps whitespace chunks
    let wi = -1, html = '';
    for (const p of parts) {
        if (p === '') continue;
        if (/^\s+$/.test(p)) { html += escapeHtml(p); continue; }
        wi++;
        const low = p.toLowerCase();
        let cls = '';
        if (wi === 0) {
            if (COMMANDS.includes(low)) cls = 'cmd';
        } else if (nouns.has(low)) {
            cls = 'noun';
        }
        html += cls ? `<span class="${cls}">${escapeHtml(p)}</span>` : escapeHtml(p);
    }
    return html;
}


/*
    INPUT LINE  (mirror highlight + ghost text)
*/

// compute the gray suggestion shown after the caret (or '' if none)
function computeGhost(value) {
    if (cmd.selectionStart !== value.length) return '';   // only when caret at end
    const words = value.split(' ');
    const index = words.length - 1;
    const base = words[index];
    const cands = completionsFor(words, index)
        .filter(c => c.toLowerCase().startsWith(base.toLowerCase()) && c.length > base.length);
    return cands.length ? cands[0].slice(base.length) : '';
}

function updateMirror() {
    const value = cmd.value;
    const ghost = computeGhost(value);
    mirror.innerHTML = highlightInput(value) +
        `<span class="ghost">${escapeHtml(ghost)}</span>`;
}

// refresh the persistent status line (power / location / Q-AI link)
function updateStatus() {
    const p = state.power;
    const filled = Math.round(p / 10);
    const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled);
    const pcls = p <= 15 ? 'crit' : p <= 30 ? 'low' : '';
    const link = state.flags.qaiSevered ? 'SEVERED' : 'Q-AI';
    statusline.innerHTML =
        `<span class="sl-id">RASCL 4</span>` +
        `<span class="sl-sep"> │ </span>` +
        `PWR <span class="pwr ${pcls}">[${bar}] ${p}%</span>` +
        `<span class="sl-sep"> │ </span>` +
        `LOC: ${escapeHtml(locs[state.curloc].label)}` +
        `<span class="sl-sep"> │ </span>` +
        `LINK: ${link}`;
}


/*
    OUTPUT  (typewriter)
*/

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function delayFor(ch) {
    if (ch === '\n') return 35;
    if ('.!?:'.includes(ch)) return 70 + Math.random() * 60;
    if (',;'.includes(ch)) return 35;
    return 6 + Math.random() * 16;
}

// type one block of text into the scrollback, char by char.
// a leading "@cls@ " directive tags the block (e.g. raw feed, Q-AI bark).
async function typeBlock(text) {
    let cls = '';
    const m = text.match(/^@(\w+)@ ([\s\S]*)$/);
    if (m) { cls = m[1]; text = m[2]; }

    const block = document.createElement('div');
    block.className = 'block out' + (cls ? ' ' + cls : '');
    scroll.appendChild(block);

    for (const seg of renderSegments(text)) {
        const span = document.createElement('span');
        if (seg.cls) span.className = seg.cls;
        block.appendChild(span);
        for (const ch of seg.text) {
            span.textContent += ch;
            scroll.scrollTop = scroll.scrollHeight;
            if (!skip) await sleep(delayFor(ch));
        }
    }
    scroll.scrollTop = scroll.scrollHeight;
}

// type out a list of output blocks; input is locked, any key fast-forwards
async function printBlocks(blocks) {
    busy = true;
    skip = false;
    for (const b of blocks) await typeBlock(b);
    busy = false;
    skip = false;
    cmd.focus();
}

// echo the player's command into the scrollback (instant, with a prompt glyph)
function commitCommand(value) {
    const block = document.createElement('div');
    block.className = 'block in';
    block.innerHTML = `<span class="prompt">&gt; </span>` + highlightInput(value);
    scroll.appendChild(block);
    scroll.scrollTop = scroll.scrollHeight;
}


/*
    KEY HANDLING
*/

async function submit() {
    const value = cmd.value.trim();
    cmd.value = '';
    cycle = null;

    if (value === '') { updateMirror(); return; }

    history.push(value);
    histIdx = history.length;

    commitCommand(value);
    const kws = value.split(/\s+/).map(s => s.toLowerCase());
    const out = runCommand(kws);

    updateStatus();             // power/location may have changed
    updateMirror();             // reset ghost for the now-empty line
    await printBlocks(out);
    updateMirror();             // refresh — context (nouns/completions) may have changed
}

function doTab() {
    const value = cmd.value;
    const words = value.split(' ');
    const index = words.length - 1;
    const base = words[index];

    const cycling = cycle && cycle.index === index && cycle.list.length &&
        words[index].toLowerCase() === cycle.list[cycle.pos].toLowerCase();

    if (cycling) {
        cycle.pos = (cycle.pos + 1) % cycle.list.length;
    } else {
        const list = completionsFor(words, index)
            .filter(c => c.toLowerCase().startsWith(base.toLowerCase()));
        if (!list.length) { cycle = null; return; }
        cycle = { index, list, pos: 0 };
    }

    words[index] = cycle.list[cycle.pos];
    const nv = words.join(' ');
    cmd.value = nv;
    cmd.selectionStart = cmd.selectionEnd = nv.length;
    updateMirror();   // keep `cycle` intact (programmatic change, no input event)
}

function setInput(value) {
    cmd.value = value;
    cmd.selectionStart = cmd.selectionEnd = value.length;
    cycle = null;
    updateMirror();
}

function historyPrev() {
    if (!history.length) return;
    histIdx = Math.max(0, histIdx - 1);
    setInput(history[histIdx]);
}

function historyNext() {
    if (histIdx >= history.length) return;
    histIdx++;
    setInput(histIdx === history.length ? '' : history[histIdx]);
}

function onKeyDown(e) {
    // while output is animating, any key fast-forwards it (and is swallowed)
    if (busy) { skip = true; e.preventDefault(); return; }

    switch (e.key) {
        case 'Tab':       e.preventDefault(); doTab(); return;
        case 'Enter':     e.preventDefault(); submit(); return;
        case 'ArrowUp':   e.preventDefault(); historyPrev(); return;
        case 'ArrowDown': e.preventDefault(); historyNext(); return;
    }
}

function onInput() {
    cycle = null;          // user typed something real; abandon any tab cycle
    updateMirror();
}


/*
    INIT
*/

document.addEventListener('DOMContentLoaded', async function () {
    scroll     = document.getElementById('scroll');
    inputLine  = document.getElementById('inputline');
    mirror     = document.getElementById('mirror');
    cmd        = document.getElementById('cmd');
    prompt     = document.getElementById('prompt');
    statusline = document.getElementById('statusline');

    cmd.addEventListener('keydown', onKeyDown);
    cmd.addEventListener('input', onInput);

    // keep keystrokes / ghost in sync when the caret moves by click or arrows
    cmd.addEventListener('keyup', updateMirror);
    cmd.addEventListener('click', updateMirror);

    // clicking anywhere (without selecting text) returns focus to the prompt
    document.addEventListener('mousedown', function (e) {
        if (e.target === cmd) return;
        if (window.getSelection().toString()) return;
        setTimeout(() => cmd.focus(), 0);
    });

    updateStatus();
    updateMirror();
    cmd.focus();
    // intro, then Q-AI's chirpy welcome from the starting room
    await printBlocks([INTRO, '@qai@ ' + locs[state.curloc].qai]);
    updateMirror();
});
