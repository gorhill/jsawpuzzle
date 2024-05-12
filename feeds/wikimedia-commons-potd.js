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

import { fetchPicture } from './wikimedia-commons-fetch.js';
import { hashFromURL } from './utils.js';

/******************************************************************************/

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function availableDays() {
    const hashes = new Set();
    const t0 = (new Date('2006-01-01 12:00:00')).getTime();
    const t1 = Date.now();
    for ( let t = t0; t <= t1; t += MS_PER_DAY ) {
        const d = new Date(t);
        const day = `${d.getDate()}`.padStart(2, '0');
        const month = `${d.getMonth() + 1}`.padStart(2, '0');
        const year = `${d.getFullYear()}`;
        const hash = `${year}${month}${day}`;
        hashes.add(hash);
    }
    return Array.from(hashes);
}

async function getPicture(hash) {
    const year = hash.slice(0, 4);
    const month = hash.slice(4, 6);
    const day = hash.slice(6, 8);
    const potdURL = `https://commons.wikimedia.org/wiki/Template:Potd/${year}-${month}-${day}_(en)`;
    const fetchOptions = {
        credentials: 'omit',
    };
    const response = await fetch(potdURL, fetchOptions).catch((reason) => {
        console.log(reason);
    });
    if ( response instanceof Response === false ) { return; }
    if ( response.ok === false ) { return; }
    const responseText = await response.text().catch((reason) => {
        console.log(reason);
    });
    if ( typeof responseText !== 'string' ) { return; }

    const domParser = new DOMParser();
    const doc = domParser.parseFromString(responseText, 'text/html');
    const link = doc.querySelector('figure a.mw-file-description');
    if ( link === null ) { return; }
    const img = link.querySelector('img.mw-file-element');
    if ( img === null ) { return; }
    const linkURL = new URL(link.pathname, potdURL);
    return linkURL.href;
}

/******************************************************************************/

export async function getRandomPicture(details = {}) {
    const excludedHashes = new Set();
    if ( details.solved ) {
        details.solved.forEach(a => excludedHashes.add(a));
    }
    if ( details.discarded ) {
        details.discarded.forEach(a => excludedHashes.add(a));
    }
    const hashes = availableDays();
    let tryCount = 8;
    for (;;) {
        if ( tryCount <= 0 ) { break; }
        tryCount -= 1;
        const day = Math.floor(Math.random() * hashes.length);
        const hash = hashes[day];
        const fileURL = await getPicture(hash);
        if ( Boolean(fileURL) === false ) { continue; }
        const fileHash = await hashFromURL(fileURL);
        if ( excludedHashes.has(fileHash) ) { continue; }
        const picture = await fetchPicture(fileURL);
        if ( picture ) { return picture; }
    }
}
