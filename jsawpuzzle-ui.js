/*******************************************************************************
 * 
 * jsawpuzzle 1.0
 * Copyright (c) 2024 Raymond Hill
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see {http://www.gnu.org/licenses/}.
 * 
 * Home: https://github.com/gorhill/jsawpuzzle
 *
 * */

/******************************************************************************/

import * as s14e from './s14e-serializer.js';
import { Point, Puzzle } from './jsawpuzzle.js';
import { safeInsertAdjacentHTML } from './dom-utils.js';

/******************************************************************************/

const browser = self.browser || self.chrome;

const stockPictures = [{
    hash: 'stock1',
    sourceURL: 'https://commons.wikimedia.org/wiki/File:Cape_Town_(ZA),_Wale_Street_--_2024_--_3544.jpg',
    imageRatio: 1.777777778,
    thumbURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Cape_Town_%28ZA%29%2C_Wale_Street_--_2024_--_3544.jpg/300px-Cape_Town_%28ZA%29%2C_Wale_Street_--_2024_--_3544.jpg',
    imageURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Cape_Town_%28ZA%29%2C_Wale_Street_--_2024_--_3544.jpg/1600px-Cape_Town_%28ZA%29%2C_Wale_Street_--_2024_--_3544.jpg',
    caption: 'Colorful houses in Wale Street, Cape Town, Western Cape, South Africa (2024)',
    time: 0,
}];

const floorFn = Math.floor;
const log2Fn = Math.log2;
const maxFn = Math.max;
const minFn = Math.min;
const randFn = Math.random;
const roundFn = Math.round;

const confine = (v, l, h) => maxFn(minFn(v, h), l);

const body = document.body;
body.classList.remove('nojs');

const puzzleElements = {};
for ( const elem of document.querySelectorAll('[id]') ) {
    puzzleElements[elem.id] = elem;
}

const puzzleConfig = {
    backgroundColor: '#7d7d7d',
    backgroundPattern: 'images/background-pattern-1.png',
    imageURL: stockPictures[0].imageURL,
    menuCollapsed: false,
    canApplause: true,
    selectedFeed: 'wikimedia-commons-featured',
    showEdges: true,
    showNonedges: true,
    showComposites: true,
    showPreview: false,
    snapDistance: 9,
};

const grabAnchor = Point.create();
const baseCount = 15;
let thePuzzle = null;
let partMoved = false;
let mouseDownTime = 0;
let grabbedPart = null;
let hoveredPart = null;

/******************************************************************************/

class Messaging {
    constructor() {
        this.ready = false;
        this.queue = [];
        browser.runtime.onMessage.addListener((msg) => {
            this.queue.push(msg);
            if ( this.ready === false ) { return; }
            this.process();
        });
    }

    start() {
        this.ready = true;
        this.process();
    }

    process() {
        while ( this.queue.length !== 0 ) {
            const msg = this.queue.shift();
            switch ( msg.what ) {
            case 'importPicture':
                importPicture(msg);
                break;
            default:
                break;
            }
        }
    }
}

const messaging = new Messaging();

/******************************************************************************/

function toLocalStorage(key, s) {
    return chrome.storage.local.set({ [key]: s }).catch((reason) => {
        console.log(reason);
    });
}

async function fromLocalStorage(key) {
    const bin = await chrome.storage.local.get(key).catch((reason) => {
        console.log(reason);
    });
    return bin[key];
}

function saveConfig(now = false) {
    if ( now === false ) {
        if ( saveConfig.timer ) { return; }
        saveConfig.timer = requestIdleCallback(( ) => {
            saveConfig.timer = undefined;
            toLocalStorage('config', s14e.serialize(puzzleConfig));
        });
        return;
    }
    toLocalStorage('config', s14e.serialize(puzzleConfig));
}

async function loadConfig() {
    const s = await fromLocalStorage('config');
    if ( s === undefined ) { return; }
    return s14e.deserialize(s);
}

async function saveState(now = false) {
    if ( now !== true ) {
        if ( saveState.timer !== undefined ) { return; }
        saveState.timer = setTimeout(( ) => {
            saveState.timer = undefined;
            saveState(true);
        }, 20000);
        return;
    }
    if ( saveState.timer !== undefined ) {
        clearTimeout(saveState.timer);
        saveState.timer = undefined;
    }
    const data = s14e.serialize(thePuzzle.serialize(), { compress: true });
    localStorage.setItem('currentState', data);
    return browser.storage.local.set({
        currentState: data
    }).then(( ) => {
        localStorage.removeItem('currentState');
    });
}

async function loadState() {
    const data = localStorage.getItem('currentState');
    if ( data !== null ) {
        return s14e.deserialize(data);
    }
    return browser.storage.local.get('currentState').then((bin) => {
        if ( bin instanceof Object === false ) { return; }
        if ( s14e.isSerialized(bin.currentState) === false ) { return; }
        return s14e.deserialize(bin.currentState);
    });
}

/******************************************************************************/

const puzzleSnaps = [
    new Audio('./audio/snaps/12842__schluppipuppie__klick_01.mp3'),
    new Audio('./audio/snaps/12843__schluppipuppie__klick_02.mp3'),
];

function playSnap() {
    const i = floorFn(randFn() * puzzleSnaps.length);
    puzzleSnaps[i].play();
}

const puzzleClaps = [
    './audio/claps/35102_m1rk0_applause_5sec.mp3',
    './audio/claps/35104_m1rk0_applause_8sec.mp3',
    './audio/claps/60789_J.Zazvurek_Applause_9s.mp3',
];

function playClaps(which) {
    if ( puzzleConfig.canApplause !== true ) { return; }
    const claps = new Audio(puzzleClaps[which]);
    claps.play();
}

/******************************************************************************/

// Synchronize interface with current options
function syncUIWithConfig() {
    puzzleElements.puzzleShowEdges.checked = puzzleConfig.showEdges;
    puzzleElements.puzzleShowNonedges.checked = puzzleConfig.showNonedges;
    puzzleElements.puzzleShowComposites.checked = puzzleConfig.showComposites;
    puzzleElements.puzzleShowPreview.checked = puzzleConfig.showPreview
    puzzleElements.navbar.classList.toggle('collapsed', puzzleConfig.menuCollapsed);
    puzzleElements.pictureFeed.value = puzzleConfig.selectedFeed;
    puzzleElements.puzzleCut.value = puzzleConfig.cut;
    puzzleElements.puzzleAttachment.value = puzzleConfig.attachment;
    puzzleElements.puzzlePieceCount.textContent = `Number of pieces: ${thePuzzle.getNumPieces()}`;
    puzzleElements.puzzleDistortion.valueAsNumber = puzzleConfig.distortion;
    puzzleElements.puzzleRotate.value = `${puzzleConfig.numRotateSteps}`;
    puzzleElements.puzzleNumPieces.valueAsNumber = confine(
        roundFn(log2Fn(puzzleConfig.numPieces / baseCount) / 0.25) * 0.25,
        0, 6
    );
    puzzleElements.puzzleNumPiecesLabel.textContent = pieceCountSliderToPieceCount();
    puzzleElements.puzzleMysteryCheckbox.checked = puzzleConfig.mysteryMode === true;
    body.dataset.mystery = puzzleConfig.mysteryMode ? '1' : '0';
    puzzleElements.puzzleSnapDistance.valueAsNumber = confine(
        puzzleConfig.snapDistance,
        3, 15
    );
    {
        puzzleElements.backgroundColor.value = puzzleConfig.backgroundColor;
        const match = /\d+\.png$/.exec(puzzleConfig.backgroundPattern) || [];
        const which = parseInt(match[0], 10) || 0;
        const radio = puzzleElements.backgroundPatterns.children[which];
        radio.checked = true;
    }
    puzzleElements.puzzleApplause.checked = puzzleConfig.canApplause;
}

// Synchronize puzzle with current options
function syncPuzzleWithConfig() {
    if ( thePuzzle.previewTile === undefined ) { return; }
    thePuzzle.previewTile.hidden = puzzleConfig.showPreview === false;
}

function pieceCountSliderToPieceCount() {
    const raw = Math.pow(2, puzzleElements.puzzleNumPieces.valueAsNumber) * baseCount | 0;
    let count = 0;
    if ( raw === baseCount ) {
        count = raw;
    } else if ( raw < 20 ) {    // Below 20, quantize to 2
        count = roundFn(raw / 2) * 2;
    } else if ( raw < 50 ) {    // Below 50, quantize to 5
        count = roundFn(raw / 5) * 5;
    } else {                    // Above 50, quantize to 10
        count = roundFn(raw / 10) * 10;
    }
    return count.toString().padStart(3, '\u2007');
}

/******************************************************************************/

const pictureset = {
    available: new Map(),
    discarded: [],
    solved: [],
};

function populatePictureset() {
    const container = document.querySelector('#puzzlePictures');
    const template = document.querySelector('#templates > .pictureItem');
    const fragment = document.createDocumentFragment();
    const sortedPictureset = Array.from(pictureset.available.values()).sort((a, b) => b.time - a.time);
    const solved = new Set(pictureset.solved);
    for ( const picture of sortedPictureset ) {
        const { hash } = picture;
        if ( container.querySelector(`figure[data-hash="${hash}"]`) !== null ) { continue; }
        const figure = template.cloneNode(true);
        figure.dataset.url = picture.imageURL;
        figure.dataset.hash = hash;
        if ( solved.has(hash) ) {
            figure.dataset.solved = '1';
        }
        const img = figure.querySelector('img');
        if ( picture.thumbURL ) {
            img.setAttribute('width', '300');
            if ( picture.imageRatio ) {
                img.setAttribute('height', `${Math.floor(300 / picture.imageRatio)}`);
            }
            img.src = picture.thumbURL;
        } else {
            img.src = picture.imageURL;
        }
        const sourceLink = figure.querySelector('a');
        sourceLink.href = picture.sourceURL;
        sourceLink.textContent = picture.sourceURL;
        const caption = figure.querySelector('figcaption');
        safeInsertAdjacentHTML(caption, 'afterbegin', picture.caption);
        fragment.append(figure);
    }
    container.prepend(fragment);
}

fromLocalStorage('pictureset').then(s => {
    if ( typeof s === 'string' ) {
        const bin = s14e.deserialize(s);
        if ( bin instanceof Object ) {
            if ( bin.available instanceof Map ) {
                pictureset.available = bin.available;
            }
            if ( Array.isArray(bin.solved) ) {
                pictureset.solved = bin.solved;
            }
            if ( Array.isArray(bin.discarded) ) {
                pictureset.discarded = bin.discarded;
            }
        }
    }
    for ( const picture of stockPictures ) {
        pictureset.available.set(picture.hash, picture);
    }
    populatePictureset();
});

async function fetchRandomPicture(source) {
    let module;
    switch ( source ) {
    case 'wikimedia-commons-featured':
        module = await import(`./feeds/wikimedia-commons-featured.js`);
        break;
    case 'wikimedia-commons-potd':
        module = await import(`./feeds/wikimedia-commons-potd.js`);
        break;
    case 'publicdomainpictures':
        module = await import(`./feeds/publicdomainpictures.js`);
        break;
    }
    const picture = await module.getRandomPicture();
    if ( picture instanceof Object === false ) { return; }
    picture.time = Date.now();
    pictureset.available.set(picture.hash, picture);
    populatePictureset();
    patchExternalLinks();
    toLocalStorage('pictureset', s14e.serialize(pictureset));
}

async function importPicture(details) {
    const { imageURL } = details;
    if ( typeof imageURL !== 'string' ) { return; }
    if ( imageURL === '' ) { return; }
    const module = await import(`./feeds/utils.js`);
    const imageHash = await module.hashFromURL(imageURL);
    if ( pictureset.available.has(imageHash) ) { return; }
    const picture ={
        hash: imageHash,
        sourceURL: details.pageURL,
        thumbURL: imageURL,
        imageURL,
        caption: '',
        time: Date.now(),
    };
    pictureset.available.set(imageHash, picture);
    populatePictureset();
    patchExternalLinks();
    toLocalStorage('pictureset', s14e.serialize(pictureset));
    puzzleConfig.imageURL = imageURL;
    puzzleConfig.imageHash = imageHash;
    preparePuzzle(puzzleConfig);
}

/******************************************************************************/

function preparePuzzle(config) {
    body.dataset.status = 'preparing';
    puzzleConfig.cut = puzzleElements.puzzleCut.value;
    puzzleConfig.attachment = puzzleElements.puzzleAttachment.value;
    puzzleConfig.distortion = puzzleElements.puzzleDistortion.valueAsNumber;
    puzzleConfig.numRotateSteps = parseInt(puzzleElements.puzzleRotate.value, 10);
    puzzleConfig.numPieces = pieceCountSliderToPieceCount();
    puzzleConfig.mysteryMode = puzzleElements.puzzleMysteryCheckbox.checked;
    puzzleConfig.snapDistance = puzzleElements.puzzleSnapDistance.valueAsNumber;
    return thePuzzle.preparePuzzle(config).then(( ) => {
        saveConfig();
        puzzleElements.puzzleCanvas.focus();
        syncPuzzleWithConfig();
        thePuzzle.shuffle();
        thePuzzle.draw();
        body.dataset.status = 'solving';
        syncUIWithConfig();
        saveState(true);
    });
}

function markCurrentPuzzleAsSolved(options = {}) {
    if ( options.restore !== true ) {
        if ( puzzleConfig.numPieces >= 200 ) {
            playClaps(2);
        } else if ( puzzleConfig.numPieces >= 100 ) {
            playClaps(1);
        } else if ( puzzleConfig.numPieces >= 30 ) {
            playClaps(0);
        }
    }
    const canvasCaption = puzzleElements.puzzleParent.querySelector('figcaption');
    if ( canvasCaption ) {
        canvasCaption.remove();
    }
    for ( const [ hash, picture ] of pictureset.available ) {
        if ( picture.imageURL !== puzzleConfig.imageURL ) { continue; }
        if ( pictureset.available.has(hash) ) {
            if ( pictureset.solved.includes(hash) === false ) {
                pictureset.solved.push(hash);
                if ( pictureset.solved.length > 1000 ) {
                    pictureset.solved = pictureset.solved.slice(0, 1000);
                }
            }
        }
        toLocalStorage('pictureset', s14e.serialize(pictureset));
        const figure = puzzleElements.puzzlePictures.querySelector(`figure[data-hash="${hash}"]`);
        if ( figure ) {
            figure.dataset.solved = '1';
            const figureCaption = figure.querySelector('figcaption');
            puzzleElements.puzzleParent.prepend(figureCaption.cloneNode(true));
        }
        break;
    }
    body.dataset.status = 'solved';
}

/******************************************************************************/

function patchExternalLinks() {
    for ( const elem of document.querySelectorAll('a[href]:not([target])') ) {
        if ( elem.href.startsWith('http') === false ) { continue; }
        elem.setAttribute('target', '_blank');
    }
}

/******************************************************************************/

function prepareListeners() {
    puzzleElements.pictureFetch.addEventListener('click', (ev) => {
        if ( ev.button !== 0 ) { return; }
        const feed = puzzleElements.pictureFeed.value;
        fetchRandomPicture(feed);
        puzzleConfig.selectedFeed = feed;
        saveConfig();
    });

    puzzleElements.puzzlePictures.addEventListener('click', (ev) => {
        const target = ev.target;
        const figure = target.closest('figure');
        if ( figure === null ) { return; }
        let action = '';
        if ( target.localName === 'del' ) {
            action = 'delete';
        } else if ( target.matches('img')  ) {
            action = 'use';
        }
        const hash = figure.dataset.hash;
        switch ( action ) {
        case 'delete': {
            pictureset.available.delete(hash);
            if ( pictureset.discarded.includes(hash) === false ) {
                pictureset.discarded.push(hash);
                if ( pictureset.discarded.length > 1000 ) {
                    pictureset.discarded = pictureset.discarded.slice(0, 1000);
                }
            }
            const i = pictureset.solved.indexOf(hash);
            if ( i !== -1 ) {
                pictureset.solved.splice(i, 1);
            }
            toLocalStorage('pictureset', s14e.serialize(pictureset));
            figure.remove();
            break;
        }
        case 'use':
            puzzleConfig.imageURL = figure.dataset.url;
            puzzleConfig.imageHash = hash;
            preparePuzzle(puzzleConfig);
            break;
        default:
            return;
        }
        ev.preventDefault();
        ev.stopPropagation();
    });

    puzzleElements.menuToggler.addEventListener('click', ( ) => {
        puzzleConfig.menuCollapsed =
            puzzleElements.navbar.classList.toggle('collapsed');
        saveConfig();
    });

    puzzleElements.puzzleMysteryCheckbox.addEventListener('input', ( ) => {
        const mystery = puzzleElements.puzzleMysteryCheckbox.checked;
        body.dataset.mystery = mystery ? '1' : '0';
        puzzleConfig.mysteryMode = mystery;
        if ( mystery ) {
            togglePreview(false);
        }
    });

    puzzleElements.puzzleNumPieces.addEventListener('input', ( ) => {
        puzzleElements.puzzleNumPiecesLabel.textContent =
            pieceCountSliderToPieceCount();
    });

    puzzleElements.puzzleCreate.addEventListener('click', ( ) => {
        preparePuzzle(puzzleConfig);
    });

    puzzleElements.puzzleSnapDistance.addEventListener('input', ( ) => {
        puzzleConfig.snapDistance = puzzleElements.puzzleSnapDistance.valueAsNumber;
        thePuzzle.config.snapDistance = puzzleConfig.snapDistance;
    });

    puzzleElements.backgroundColor.addEventListener('input', ( ) => {
        thePuzzle.setBackground(
            puzzleElements.backgroundColor.value,
            'images/background-pattern-1.png'
        ).then(( ) => {
            thePuzzle.draw();
        });
        saveConfig();
    });

    puzzleElements.backgroundPatterns.addEventListener('click', (ev) => {
        if ( ev.target.localName !== 'input' ) { return; }
        const radio = puzzleElements.backgroundPatterns.querySelector('input:checked');
        if ( radio === null ) { return; }
        const pattern = radio.value !== '0'
            ? `images/background-pattern-${radio.value}.png`
            : '';
        thePuzzle.setBackground(
            puzzleElements.backgroundColor.value,
            pattern
        ).then(( ) => {
            thePuzzle.draw();
        });
        saveConfig();
    });

    puzzleElements.puzzleContextMenu.addEventListener('input', ( ) => {
        browser.storage.local.set({
            enableContextMenu: puzzleElements.puzzleContextMenu.checked === true
        }).then(( ) => {
            browser.runtime.sendMessage({ what: 'toggleContextMenuEntry' });
        });
    });
    browser.storage.local.get('enableContextMenu', (bin) => {
        if ( bin instanceof Object === false ) { return; }
        puzzleElements.puzzleContextMenu.checked = bin.enableContextMenu === true;
    });

    puzzleElements.puzzleApplause.addEventListener('input', ( ) => {
        puzzleConfig.canApplause = puzzleElements.puzzleApplause.checked === true;
        saveConfig();
    });

    puzzleElements.puzzleShowEdges.addEventListener('click', ( ) => {
        puzzleConfig.showEdges = puzzleElements.puzzleShowEdges.checked;
        updateHiddenStatus();
    });

    puzzleElements.puzzleShowNonedges.addEventListener('click', ( ) => {
        puzzleConfig.showNonedges = puzzleElements.puzzleShowNonedges.checked;
        updateHiddenStatus();
    });

    puzzleElements.puzzleShowComposites.addEventListener('click', ( ) => {
        puzzleConfig.showComposites = puzzleElements.puzzleShowComposites.checked;
        updateHiddenStatus();
    });

    puzzleElements.puzzleShowPreview.addEventListener('click', ( ) => {
        puzzleConfig.showPreview = puzzleElements.puzzleShowPreview.checked;
        syncPuzzleWithConfig();
        thePuzzle.draw();
    });

    const normalizeEventPos = (ev) => {
        const rect = puzzleElements.puzzleCanvas.getBoundingClientRect();
        return Point.create(ev.clientX - rect.left, ev.clientY - rect.top);
    };

    puzzleElements.puzzleCanvas.addEventListener('pointerdown', (ev) => {
        if ( ev.button !== 0 ) { return; }
        if ( grabbedPart !== null ) {
            if ( partMoved === false ) { partMoved = true; }
            return;
        }
        const target = ev.target;
        const pos = normalizeEventPos(ev);
        // Grab a piece
        grabbedPart = hoveredPart = thePuzzle.partUnderPoint(pos);
        if ( grabbedPart === null ) { return; }
        target.style.cursor = 'grabbing';
        // bring on top
        target.setPointerCapture(ev.pointerId);
        thePuzzle.sendTop(grabbedPart);
        const dPos = grabbedPart.getDisplayPos();
        grabAnchor.x = pos.x - dPos.x;
        grabAnchor.y = pos.y - dPos.y;
        thePuzzle.draw(grabbedPart.getDisplayBbox().clone());
        partMoved = false;
        mouseDownTime = Date.now();
    }, { passive: true });

    puzzleElements.puzzleCanvas.addEventListener('pointerup', (ev) => {
        if ( ev.button !== 0 ) { return; }
        if ( grabbedPart === null ) { return; }
        ev.target.releasePointerCapture(ev.pointerId);
        if ( partMoved === false ) { return; }
        if ( (Date.now() - mouseDownTime) < 250 ) { return; }
        const target = ev.target;
        const pos = normalizeEventPos(ev);
        // Ungrab a piece
        target.style.cursor = 'grab';
        if ( grabbedPart.piece ) {
            if ( thePuzzle.snapPiece(grabbedPart) ) {
                playSnap();
            }
            saveState();
        }
        grabbedPart = null;
        hoveredPart = thePuzzle.partUnderPoint(pos);
        // is the puzzle solved?
        if ( body.dataset.status !== 'solved' && thePuzzle.isSolved() ) {
            markCurrentPuzzleAsSolved();
        }
    }, { passive: true });

    puzzleElements.puzzleCanvas.addEventListener('pointermove', (ev) => {
        const target = ev.target;
        const pos = normalizeEventPos(ev);
        if ( grabbedPart === null ) {
            hoveredPart = thePuzzle.partUnderPoint(pos);
            if ( hoveredPart === null ) {
                target.style.cursor = '';
                return;
            }
            target.style.cursor = 'grab';
            return;
        }
        thePuzzle.movePart(grabbedPart,
            pos.x - grabAnchor.x,
            pos.y - grabAnchor.y
        );
        partMoved = true;
    }, { passive: true });

    // mouse wheel handling: http://adomas.org/javascript-mouse-wheel/
    puzzleElements.puzzleCanvas.addEventListener('wheel', (ev) => {
        if ( puzzleConfig.numRotateSteps <= 1 ) { return; }
        if ( hoveredPart === null ) { return; }
        if ( hoveredPart.piece !== true ) { return; }
        if ( ev.deltaY === 0 ) { return; }
        const drawBbox = hoveredPart.getDisplayBbox().clone();
        if ( grabbedPart === null ) {
            thePuzzle.sendTop(hoveredPart);
        }
        hoveredPart.setAngleStep(hoveredPart.getAngleStep() + (ev.deltaY > 0 ? 1 : -1));
        drawBbox.union(hoveredPart.getDisplayBbox());
        thePuzzle.draw(drawBbox);
        ev.preventDefault();
        ev.stopPropagation();
    }, { passive: false });

    self.addEventListener('beforeunload', ( ) => {
        saveState(true);
    });

    self.addEventListener('keydown', (ev) => {
        if ( puzzleElements.theMenu.contains(document.activeElement) ) { return; }
        const { code } = ev;
        // pre-filter according to key code
        switch (code) {
        case 'ArrowLeft':   // rotate moved piece left
        case 'KeyA':
        case 'ArrowRight':  // rotate moved piece right
        case 'KeyD':
        case 'ArrowUp':     // send moved piece to the top of drawing stack
        case 'KeyW':
        case 'ArrowDown':   // send moved piece to the bottom of drawing stack
        case 'KeyS':
            if ( hoveredPart === null ) { return true; }
            if ( hoveredPart.piece !== true ) { return; }
            break;
        case 'KeyR':        // toggle preview tile visibility
        case 'KeyE':        // toggle edge pieces visibility
        case 'KeyQ':        // toggle show composite pieces only
        case 'KeyX':        // shuffle position
        case 'KeyZ':        // suffle z-order
            break;
        default:
            return;
        }
        // process
        let drawBbox;
        switch (code) {
        case 'ArrowLeft':   // rotate moved piece left
        case 'KeyA':
            if ( puzzleConfig.numRotateSteps <= 1 ) { return; }
            drawBbox = hoveredPart.getDisplayBbox().clone();
            hoveredPart.setAngleStep(hoveredPart.getAngleStep() - 1);
            break;
        case 'ArrowRight':  // rotate moved piece right
        case 'KeyD':
            if ( puzzleConfig.numRotateSteps <= 1 ) { return; }
            drawBbox = hoveredPart.getDisplayBbox().clone();
            hoveredPart.setAngleStep(hoveredPart.getAngleStep() + 1);
            break;
        case 'ArrowUp':     // send moved piece to the top of drawing stack
        case 'KeyW':
            drawBbox = hoveredPart.getDisplayBbox().clone();
            thePuzzle.sendTop(hoveredPart);
            break;
        case 'ArrowDown':   // send moved piece to the bottom of drawing stack
        case 'KeyS':
            drawBbox = hoveredPart.getDisplayBbox().clone();
            thePuzzle.sendBack(hoveredPart);
            break;
        case 'KeyR':        // toggle preview tile visibility
            togglePreview();
            break;
        case 'KeyE':        // toggle edge pieces visibility
            toggleShowNonedges();
            break;
        case 'KeyQ':        // toggle show composite pieces only
            toggleShowComposites();
            break;
        case 'KeyX':        // shuffle position
            thePuzzle.shuffle();
            thePuzzle.draw();
            break;
        case 'KeyZ':        // suffle z-order
            thePuzzle.shuffleZ();
            thePuzzle.draw();
            break;
        default:
            return;
        }
        if ( drawBbox ) {
            drawBbox.union(hoveredPart.getDisplayBbox());
            thePuzzle.draw(drawBbox);
        }
        ev.preventDefault();
    });

    const resizeHandler = ( ) => {
        const { canvasWidth, canvasHeight } = thePuzzle.details;
        if ( typeof canvasWidth !== 'number' ) { return; }
        if ( canvasWidth === 0 ) { return; }
        if ( typeof canvasHeight !== 'number' ) { return; }
        if ( canvasHeight === 0 ) { return; }
        thePuzzle.resizePuzzle();
    };

    const resizeObserver = new ResizeObserver((entries) => {
        if ( entries.length === 0 ) { return; }
        if ( resizeHandler.timer ) { return; }
        resizeHandler.timer = requestIdleCallback(( ) => {
            resizeHandler.timer = undefined;
            resizeHandler();
        });
    });

    resizeObserver.observe(puzzleElements.puzzleCanvas);
}

// edge=e, non-edge=ne, composite=c, non-composite=nc
//
//  checkboxes | hidden if
// ------------+-----------
//     +e+ne+c | -
//     -e+ne+c | +e & -c
//     +e-ne+c | -e & -c
//     -e-ne+c | -c
//     +e+ne-c | +c
//     -e+ne-c | +e | +c
//     +e-ne-c | -e | +c
//     -e-ne-c | +
// ------------+-----------
const fromCheckboxes = new Map([
    [ 0b111, ( ) => false ],
    [ 0b011, (a) => a.isEdge() && a.isComposite() === false ],
    [ 0b101, (a) => a.isEdge() === false && a.isComposite() === false ],
    [ 0b001, (a) => a.isComposite() === false ],
    [ 0b110, (a) => a.isComposite() ],
    [ 0b010, (a) => a.isEdge() || a.isComposite() ],
    [ 0b100, (a) => a.isEdge() === false || a.isComposite() ],
    [ 0b000, ( ) => true ],
]);

function updateHiddenStatus() {
    const bits = (puzzleConfig.showEdges ? 0b100 : 0) |
        (puzzleConfig.showNonedges ? 0b010 : 0) |
        (puzzleConfig.showComposites ? 0b001 : 0);
    const testFn = fromCheckboxes.get(bits);
    thePuzzle.getAllPieces().forEach(a => {
        a.hidden = a !== grabbedPart && testFn(a);
    });
    thePuzzle.draw();
}

function toggleShowNonedges(show) {
    puzzleConfig.showNonedges = show === undefined
        ? puzzleConfig.showEdges && puzzleConfig.showNonedges === false
        : show;
    puzzleElements.puzzleShowNonedges.checked = puzzleConfig.showNonedges;
    puzzleConfig.showEdges = true;
    puzzleElements.puzzleShowEdges.checked = puzzleConfig.showEdges;
    updateHiddenStatus();
}

function toggleShowComposites(show) {
    puzzleConfig.showEdges = puzzleConfig.showNonedges = show === undefined
        ? puzzleConfig.showEdges === false && puzzleConfig.showNonedges === false
        : show
    if ( puzzleConfig.showComposites === false ) {
        puzzleConfig.showEdges = puzzleConfig.showNonedges = false;
        puzzleConfig.showComposites = true;
        puzzleElements.puzzleShowComposites.checked = true;
    }
    puzzleElements.puzzleShowEdges.checked = puzzleConfig.showEdges;
    puzzleElements.puzzleShowNonedges.checked = puzzleConfig.showNonedges;
    updateHiddenStatus();
}

function togglePreview(show) {
    if ( thePuzzle.previewTile === undefined ) { return; }
    if ( show === undefined ) {
        show = thePuzzle.previewTile.hidden;
    }
    const hide = !show;
    if ( hide === thePuzzle.previewTile.hidden ) { return; }
    if ( show && body.dataset.mystery === '1' ) { return; }
    thePuzzle.previewTile.hidden = hide;
    syncUIWithConfig();
    thePuzzle.draw();
}

/******************************************************************************/

self.addEventListener('load', ( ) => {
    loadConfig().then(config => {
        Object.assign(puzzleConfig, config || {});
        return loadState();
    }).then((selfie) => {
        if ( Boolean(selfie) === false ) { return; }
        return Puzzle.deserialize('#puzzleParent', selfie).then(puzzle => {
            if ( Boolean(puzzle) === false ) { return; }
            thePuzzle = puzzle;
            thePuzzle.draw();
            Object.assign(puzzleConfig, thePuzzle.config);
            syncUIWithConfig();
            return thePuzzle;
        });
    }).then(puzzle => {
        if ( puzzle ) { return puzzle; }
        return Puzzle.create('#puzzleParent').then(puzzle => {
            thePuzzle = puzzle;
            Object.assign(puzzleConfig, thePuzzle.config, structuredClone(puzzleConfig));
            syncUIWithConfig();
            preparePuzzle(puzzleConfig);
        });
    }).then(( ) => {
        if ( Boolean(thePuzzle) === false ) { return; }
        if ( thePuzzle.isSolved() ) {
            markCurrentPuzzleAsSolved({ restore: true });
        }
        patchExternalLinks();
        prepareListeners();
        messaging.start();
    });
});
