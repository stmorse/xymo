/*
    UX CONSTANTS
*/
const CARET = '\n\n> ';
const GREEN = '#52CC7A';  // color for console outputs


/*
    GAME PROMPTS
*/

const INTRO = `/// CLASSIFICATION: TOP SECRET ///
PROJECT XYMO / Remote Autonomous System Controller, Lithium-powered [RASCL 4]
(Sisyphus Technologies, (c) 2075. Powered by Q-AI.)

This is a U.S. NASA classified system. If you have gained access by mistake, 
close this terminal and contact authorities immediately. Type 'help' for help.
`;

const HELP = `Commands:
status                  Print description of surroundings and rover status
enter -loc-             Enter -location-
inspect -obj-           Conduct scan of -object- 
use -item- on -obj-     Use -item- on nearby -object-
stow -item-             Add -item- to storage module
drop -item-             Remove -item- from storage module`;


/*
    USER VARIABLES
*/

var inventory = [0];
var curloc = 1;


/*
    GAME STRUCTURES
    TODO: port to JSON and load
*/

var locs = {
    1: {
        'label': 'Planet ZT4517 - surface',
        'description': 'Barren, tundra. Mountains 5km north. No life detected on surface within 10km.',
        'connections': [1],
        'items': []
    },
    2: {
        'label': 'Vestibule',
        'description': 'Underground circular room. Radius 10m, Height 5m.  Walls appear metallic.  Sensors detect a faint hum (10 Hz).',
        'connections': [2],
        'items': [1]
    },
    3: {
        'label': 'Holding room',
        'description': 'Long room (30m), dimly lit. An unidentifiable object, that appears to be a non-human skeleton [Q-AI: 87% probability], is attached to the wall with an electron arc-chain.',
        'connections': [2],
        'items': []
    }
};

// connection elements
// connect 2 location elements. if locked, require a `use` action to unlock
// solution is coded as either ['item', -item code-] for generic item 
// or (not yet implemented) ['interfacer', -solution sequence-] for interfacer 
var conns = {
    1: {
        'label': 'portal',
        'locations': {
            1: {
                'description': 'In-ground, circular -portal- to front of XYMO rover.',
                'locked': false,
                'transition': '[DESCENDING] ~ [STABILIZER JETS ACTIVE]\n[LANDED]',
                'destination': 2
            },
            2: {
                'description': 'Overhead, circular -portal- leading to surface.',
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
                'long_description': 'Center of door has several buttons with unintelligible alien symbols.  There is a 10x10cm square recess, glowing with refracted light.',
                'locked': true,
                'transition': '[TRACKED TRAVEL ENGAGED][INDOOR WARNING: BATTERY SAVE MODE]',
                'solution': ['item', 1, 'The cube fits neatly into the recess. A sharp pulsation temporarily disrupted our sensors, and the cube shed a powdery offwhite substance. The door appears unlocked.'],
                'destination': 3
            },
            3: {
                'description': 'Heavy -door- leading to vestibule.',
                'locked': false,
                'transition': '[TRACKED TRAVEL ENGAGED][INDOOR WARNING: BATTERY SAVE MODE]',
                'destination': 2
            }
        }
    }
}

var items = {
    0: {
        'label': 'interfacer',
        'description': 'Built-in database interfacing device, compatible with most native and extraterrestrial systems.'
    },
    1: {
        'label': 'cube',
        'description': 'Small, iridescent -cube-, possible surface debris, on ground.'
    }
}


/*
    GAME UX LOGIC/HANDLING
*/

var cmds = {
    'help': (kws) => {
        echo(HELP);
    },

    'status': (kws) => {
        let loc = locs[curloc];
        echo('[INVENTORY:] ' + inventory.map(i => {return ' ' + items[i].label}), true);
        echo('[ENVIRONMENT READING:] ' + loc.label, true);
        echo(loc.description, true);
        
        let n = 1; 
        for (let ix of loc.connections) {
            echo(conns[ix].locations[curloc].description, 
                 n < loc.connections.length || loc.items.length > 0);
            n += 1;
        }
        n = 1;
        for (let ix of loc.items) {
            echo(items[ix].description, n < loc.items.length);
            n += 1;
        }
        // echo(''); // create newline and caret
        // TODO: fix this so there's not an extra newline
    },

    'enter': function(kws) {
        if (!kws[1]) {
            echo('Missing <loc>.');
            return;
        }

        let loc = locs[curloc];
        let port = kws[1];

        // determine which connection we're trying to enter
        // this feels hacky
        let ix = -1;
        for (let i of loc.connections) {
            if (port == conns[i].label) {
                ix = i;
                break;
            }
        }
        if (ix == -1) {
            echo('Unrecognized command: ' + port);
            return;
        }
        
        let conn = conns[ix].locations[curloc];
        if (conn.locked) {
            echo(namify(conns[ix].label) + ' is locked.');
            return;
        }
        
        // update current location and print transition string
        curloc = conn.destination;
        echo(conn.transition);
    },

    'inspect': function(kws) {
        if (!kws[1]) {
            echo('Missing -obj- to inspect.');
            return;
        }

        let loc = locs[curloc];
        let obj = kws[1];

        // determine which object we're trying to inspect
        // this feels hacky
        let ix = -1;

        // try connections first
        for (let i of loc.connections) {
            if (obj == conns[i].label) {
                ix = i;
                break;
            }
        }
        if (ix != -1) {
            let conn = conns[ix].locations[curloc];
            echo(conn.description, true);
            if (conn.long_description) {
                echo(conn.long_description);
            } else {
                echo('No further information available on close inspection.')
            }
            return;
        }

        // now try items
        for (let i of loc.items) {
            if (obj == items[i].label) {
                ix = i;
                break;
            }
        }
        if (ix != -1) {
            let item = items[ix];
            echo(item.description, true);
            if (item.long_description) {
                echo(item.long_description);
            } else {
                echo('No further information available on close inspection.');
            }
            return;
        }

        // didn't find any labels that matched input
        if (ix == -1) {
            echo('Unrecognized command: ' + obj);
            return;
        }
    },

    'use': function(kws) {
        if (!kws[1]) {
            echo('Missing -item- to use.');
            return;
        }

        if (kws.length != 4 || kws[2] != 'on') {
            echo('Incorrect syntax. Try:  use -item- on -obj-');
            return;
        }

        let loc = locs[curloc];
        let item = kws[1];
        let obj = kws[3];  // ignore preposition in kws[2]

        // figure out what item this is
        // check room items and inventory
        let ix = -1;
        for (let i of loc.items.concat(inventory)) {
            if (item == items[i].label) {
                ix = i;
                break;
            }
        }
        if (ix == -1) {
            echo('Item not nearby or in storage module: ' + item);
            return;
        }

        // check object is in the room, accepts this item
        // check connections
        for (let i of loc.connections) {
            if (obj == conns[i].label) {
                // found connection
                let conn = conns[i].locations[curloc];
                
                // check if its even locked
                if (!conn.locked) {
                    echo('Action had no effect. ' + namify(conns[i].label) + ' already unlocked.');
                    return;
                }

                // check if its unlocked by this item
                if (conn.solution[0] == 'item' && conn.solution[1] == ix) {
                    conn.locked = false;
                    echo('Success!', true);
                    echo(conn.solution[2]);
                    return;
                }

                // if we're here, the object doesn't accept this item
                echo('Object ' + conns[i].label + ' does not accept ' + items[ix].label);
                return;
            }
        }
        
        // TODO: check items
        
        // if we're here, the object isn't in the room
        echo('Could not locate object: ' + obj);
    },

    'stow': function(kws) {
        if (!kws[1]) {
            echo('Syntax error: missing -item-.');
            return;
        }

        let loc = locs[curloc];
        let item = kws[1];
        
        // figure out what item this is
        let ix = -1;
        for (let i of loc.items) {
            if (item == items[i].label) {
                ix = i;
                break;
            }
        }
        if (ix == -1) {
            echo('Item not in room: ' + item);
            return;
        }

        // add to inventory
        inventory.push(ix);

        // remove from the room
        loc.items = loc.items.filter(k => {return k != ix});

        echo('Item added to storage module: ' + item);
    },

    'drop': function(kws) {
        if (!kws[1]) {
            echo('Syntax error: missing -item-.');
            return;
        }

        let loc = locs[curloc];
        let item = kws[1];
        
        // figure out what item this is
        let ix = -1;
        for (let i of inventory) {
            if (item == items[i].label) {
                ix = i;
                break;
            }
        }
        if (ix == -1) {
            echo('Item not in storage: ' + item);
            return;
        }

        // remove from inventory
        inventory = inventory.filter(k => {return k != ix});

        // add to the room
        loc.items.push(ix);

        echo('Item removed from storage module: ' + item);
    }
}

// helper function to capitalize first letter of labels for pretty printing
function namify(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// hacky helper function to reset cursor to end of div
// works in Firefox, Chrome, Opera, Safari, IE 9+
function setCursorToEnd(contentEditableElement) {
    var range = document.createRange(); // create a range (like an invisible selection)
    range.selectNodeContents(contentEditableElement); // select the entire contents of the element
    range.collapse(false); //collapse the range to the end point (false param)
    
    var selection = window.getSelection(); // get the selection object (allows you to change selection)
    selection.removeAllRanges(); // remove any selections already made
    selection.addRange(range); // make the range you have just created the visible selection
}

// echo string in console
function echo(s, final) {
    let ta = document.getElementById('console');
    ta.innerHTML += '\n' + `<span style="color: ${GREEN}">` + s + '</span>';
    
    // if final true, dont add a CARET (if undefined (not present) or false, add)
    // Note: hacky overloading
    if (!final) {
        ta.innerHTML += CARET;
    }

    setCursorToEnd(ta);
}

// handle enter keypress in #console
function process(e) {
    let ta = document.getElementById('console');
    
    // force cursor back after the caret on any key press
    setCursorToEnd(ta);

    // handle enter
    if (e.keyCode == 13) {
        // prevent default behavior (including newline on enter)
        e.preventDefault();
        
        // get user input after caret
        let input = ta.innerText.split(CARET).pop().trim();

        // split input by space and map to lowercase
        let kws = input.split(' ').map(s => s.toLowerCase());
        
        // handle input
        if (kws[0] in cmds) {
            cmds[kws[0]](kws); // execute action
        } else {
            echo('Command not recognized. Type "help" for help.');
        }

        // manually scroll to bottom (this behavior was turned off with preventDefault)
        ta.scrollTop = ta.scrollHeight;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('console').focus();
    echo(INTRO);
});