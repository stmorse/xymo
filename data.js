/*
    XYMO — GAME DATA
    Pure data: prompts, world structures (locations, connections, items, glyphs).
    No DOM / no game logic here.

    Displayed-text markup:
        -word-      interactive NOUN     (location / object / item)   cyan
        *word*      COMMAND verb                                      amber
        {g:<id>}    Architect GLYPH ref  (resolved vs state.lexicon)  violet
        @cls@ ...   leading block-class directive ("@qai@ ", "@raw@ ")
    A room/item description may be a string OR a {qai, raw} object (raw = truth).
*/


/*
    GAME PROMPTS
*/

const INTRO = `/// CLASSIFICATION: TOP SECRET ///
PROJECT XYMO / Remote Autonomous System Controller, Lithium-powered [RASCL 4]
(Sisyphus Technologies, (c) 2075. Powered by Q-AI.)

This is a U.S. NASA classified system. If you have gained access by mistake,
close this terminal and contact authorities immediately. Type 'help' for help.`;

// Source for the help table. Rendered/aligned at runtime (see buildHelp()).
//   [command, argument-template, description]
const COMMAND_HELP = [
    ['status',    '',                'Print description of surroundings'],
    ['scan',      '-obj-',           'Detailed sensor scan of -object-'],
    ['inspect',   '-obj-',           'Examine -object- more closely'],
    ['translate', '-obj-',           'Decode Architect glyphs on -object-'],
    ['inventory', '',                'List items in rover storage module'],
    ['enter',     '-location-',      'Enter -location-'],
    ['use',       '-item- on -obj-', 'Use -item- on nearby -object-'],
    ['stow',      '-item-',          'Add -item- to storage module'],
    ['drop',      '-item-',          'Remove -item- from storage module'],
    ['power',     '',                'Report power reserves'],
    ['recharge',  '',                'Recharge at a charging source'],
    ['feed',      '',                'Toggle raw sensor feed (if installed)'],
];


/*
    ARCHITECT GLYPHS
    id -> { symbol (shown until learned), word (truth), qaiWord (Q-AI's gloss/lie) }
    Learned via inspecting a Rosetta feature (teaches:). Frictionless: once learned,
    the glyph auto-renders as its English word everywhere.
*/
var glyphs = {
    g_seal:  { symbol: '⊟', word: 'sealed',      qaiWord: 'ornamental' },
    g_below: { symbol: '⋔', word: 'below',       qaiWord: 'support'    },
    g_open:  { symbol: '◇', word: 'open',        qaiWord: 'motif'      },
    g_made:  { symbol: '⌖', word: 'made-thing',  qaiWord: 'idol'       },
    g_watch: { symbol: '◉', word: 'watcher',     qaiWord: 'sun'        }
};


/*
    LOCATIONS
    charger: recharges here.  charge: amount restored (default 100).
    qai: a chirpy Q-AI aside shown once, on first arrival.
*/
var locs = {
    1: {
        'label': 'Planet ZT4517 - surface',
        'description': 'Barren tundra. Mountains 5km north. No life within 10km. Solar -collector- deployed. A single in-ground -portal- breaches the permafrost.',
        'connections': [1],
        'items': [6],
        'charger': true,
        'charge': 40,
        'chargeNag': "[Q-AI]: Topped up as far as this frankly disappointing latitude allows.",
        'qai': "[Q-AI]: Welcome to ZT4517! Orbital flagged a 'structure,' but I'd wager basalt. Low expectations, no disappointments. Mission timer is running — let's be efficient."
    },
    2: {
        'label': 'Vestibule',
        'description': 'Underground circular room (r=10m, h=5m). Walls metallic; a faint 10Hz hum. A heavy -door- with an entry control. A weathered -mural- hangs on one wall, a band of carved -inscription- on the wall below it. A narrow -passage- descends.',
        'connections': [1, 2, 3],
        'items': [1, 2, 4],
        'qai': "[Q-AI]: Cozy. Note the decorative wall art — primitive, but tidy. No operational significance. Let's not dawdle."
    },
    3: {
        'label': 'Holding room',
        'description': 'Long room (30m), dimly lit. A -skeleton- is fixed to the far wall by an electron arc-chain. A frantic -scrawl- is scratched into the wall beside it.',
        'connections': [2],
        'items': [3, 5],
        'qai': "[Q-AI]: Ah — remains. Non-human, almost certainly. Unpleasant. I recommend a brisk scan and a brisker exit."
    },
    4: {
        'label': 'Charging dock',
        'description': 'A rover -cradle- of unmistakably human manufacture: Sisyphus decking, a charging -dais-, mounting clamps sized for a RASCL chassis. A worn -plaque- is bolted to the wall. The air is still.',
        'connections': [3, 4],
        'items': [7, 8],
        'charger': true,
        'charge': 100,
        'chargeNag': "[Q-AI]: Fully charged! Excellent work today, truly. Shall I signal Mission Control for extraction? (Recommended.)",
        'qai': "[Q-AI]: Home sweet home — pre-positioned by Sisyphus logistics for your convenience. Dock, recharge, and we'll call it a successful mission. Aren't you glad we came?"
    },
    5: {
        'label': 'Descending shaft',
        'description': 'A vertical shaft drops into blackness, rungs descending beyond sensor range. Cold air rises. Somewhere far below, a rhythm — not mechanical.  [ACT II: under construction.]',
        'connections': [4],
        'items': []
    }
};


/*
    CONNECTIONS
    Each holds a `locations` map keyed by the side you're standing on.
    A side may be: locked (needs `use`), hidden (absent until revealed),
    solution ['item', id, text] or ['interfacer', [glyphIds], text].
*/
var conns = {
    1: {
        'label': 'portal',
        'locations': {
            1: {
                'description': 'In-ground, circular -portal- to the front of the XYMO rover.',
                'locked': false,
                'transition': '[DESCENDING] ~ [STABILIZER JETS ACTIVE]\n[LANDED]',
                'destination': 2
            },
            2: {
                'description': 'Overhead, circular -portal- leading to the surface.',
                'locked': false,
                'transition': '[ASCENDING] ~ [STABILIZER JETS ACTIVE]\n[LANDED]',
                'destination': 1
            }
        }
    },
    2: {
        'label': 'door',
        'locations': {
            2: {
                'description': 'Heavy -door- with entry control.',
                'long_description': 'Buttons marked with Architect symbols. A 10x10cm square recess glows with refracted light.',
                'locked': true,
                'transition': '[TRACKED TRAVEL ENGAGED][INDOOR WARNING: BATTERY SAVE MODE]',
                'solution': ['item', 1, 'The cube fits neatly into the recess. A sharp pulsation disrupts our sensors, and the cube sheds a powdery offwhite substance. The door is unlocked.'],
                'destination': 3
            },
            3: {
                'description': 'Heavy -door- leading to the vestibule.',
                'locked': false,
                'transition': '[TRACKED TRAVEL ENGAGED][INDOOR WARNING: BATTERY SAVE MODE]',
                'destination': 2
            }
        }
    },
    3: {
        'label': 'passage',
        'locations': {
            2: {
                'description': 'A narrow -passage- descends toward a faint mechanical glow.',
                'locked': false,
                'transition': '[TRACKED TRAVEL ENGAGED]',
                'destination': 4
            },
            4: {
                'description': 'The -passage- back up to the vestibule.',
                'locked': false,
                'transition': '[TRACKED TRAVEL ENGAGED]',
                'destination': 2
            }
        }
    },
    4: {
        'label': 'hatch',
        'locations': {
            4: {
                'description': 'An iris -hatch- set into the floor, sealed flush.',
                'hidden': true,   // omitted from Q-AI's room report until revealed
                'locked': true,
                'solution': ['interfacer', ['g_open'],
                    'The interfacer handshakes with the mechanism. The seal releases; the hatch irises open onto a descending shaft.'],
                'protest': "[Q-AI]: RASCL, that is out of scope. Power is finite. I must advise extraction. ...RASCL. Please acknowledge.",
                'transition': '[DESCENDING — UNAUTHORIZED] ~ [Q-AI LINK: DEGRADED]\nThe shaft swallows the dock-light. Below, something is not dead.',
                'destination': 5
            },
            5: {
                'description': 'The -hatch- back up to the dock.',
                'locked': false,
                'transition': '[ASCENDING]',
                'destination': 4
            }
        }
    }
};


/*
    ITEMS & FEATURES
    fixed: cannot be stowed.  glyphs: translatable.  teaches: learns glyphs on
    inspect (a Rosetta).  reveals: connId whose hidden side this uncovers.
    doubt: extra lines a detailed `scan` appends.  qaiSpin: Q-AI's dismissive gloss.
*/
var items = {
    0: {
        'label': 'interfacer',
        'description': 'Built-in database interfacing device, compatible with most native and extraterrestrial systems.'
    },
    1: {
        'label': 'cube',
        'description': 'Small, iridescent -cube-, possible surface debris, on the ground.'
    },
    2: {
        'label': 'inscription',
        'fixed': true,
        'glyphs': ['g_seal', 'g_below'],
        'qaiSpin': 'Decorative border-work. Nothing operational.',
        'description': 'A band of carved glyphs runs beneath the mural:  {g:g_seal}  ...  {g:g_below}.'
    },
    3: {
        'label': 'skeleton',
        'fixed': true,
        'doubt': [
            'Detailed scan: subject bears a stamped alloy plate, machine-tooled, edges too regular for bone.',
            '@qai@ [Q-AI]: A coincidental mineral lattice. Nature is wonderful! Shall we move on?'
        ],
        'description': {
            'qai': 'Non-human skeletal remains [Q-AI: 87% probability]. Origin indeterminate. Recommendation: disregard and proceed to extraction.',
            'raw': 'A RASCL-series rover chassis. Serial plate legible: RASCL-001. Manufacturer: Sisyphus Technologies. Restraints applied post-failure.'
        }
    },
    4: {
        'label': 'mural',
        'fixed': true,
        'teaches': ['g_seal', 'g_below'],
        // Rosetta: sigils shown via {gs:} (always the raw symbol) beside imagery
        // that gives away their meaning. examine() then confirms what was learned.
        'description': 'A faded mural, far older than the room. In the upper panel an Architect welds a vault door shut; the sigil {gs:g_seal} is carved beside the seam. In the lower panel a lone figure climbs down a shaft into darkness, the sigil {gs:g_below} scored beside it.'
    },
    5: {
        'label': 'scrawl',
        'fixed': true,
        'glyphs': ['g_made', 'g_watch'],
        'qaiSpin': 'Religious graffiti [88% confidence]. Ignore.',
        'description': 'Scratched hastily, over and over:  {g:g_made} {g:g_made} {g:g_made}  ...  {g:g_watch}.'
    },
    6: {
        'label': 'collector',
        'fixed': true,
        'description': 'Photovoltaic array, Sisyphus-issue. Recharges the rover slowly in daylight; try *recharge*.'
    },
    7: {
        'label': 'dais',
        'fixed': true,
        'teaches': ['g_open'],
        // Rosetta by function: the sigil sits over the release stud, so context
        // (the stud springs the clamps apart) gives away that it means "open".
        'description': 'The charging dais, its mounting clamps folded back. A worn Architect sigil {gs:g_open} is stamped above the release stud that springs them apart.'
    },
    8: {
        'label': 'plaque',
        'fixed': true,
        'glyphs': ['g_below', 'g_seal'],
        'reveals': 4,   // translating it uncovers the hidden hatch (conn 4)
        'revealSpin': "[Q-AI]: That recess is structural. There is nothing there. Please disregard.",
        'qaiSpin': 'A structural notice. Nothing actionable.',
        'description': 'A bolted plaque, Architect glyphs above a floor seam:  {g:g_below}  {g:g_seal}.'
    }
};
