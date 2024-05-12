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

async function getCandidates(year, group) {
    const url = `https://commons.wikimedia.org/wiki/Commons:Featured_pictures/chronological/${year}-${group}`;
    const fetchOptions = {
        credentials: 'omit',
    };
    const response = await fetch(url, fetchOptions).catch((reason) => {
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
    const boxes = doc.querySelectorAll('.gallerybox > .thumb');
    const out = [];
    for ( const box of boxes ) {
        const link = box.querySelector('a.mw-file-description');
        if ( link === null ) { continue; }
        const candidateURL = String(new URL(link.pathname, url));
        const img = box.querySelector('img.mw-file-element');
        if ( img === null ) { continue; }
        const thumbURL = String(new URL(img.getAttribute('src'), url));
        const match = /([^/]+)\/(\d+)px-\1$/.exec(thumbURL);
        if ( match === null ) { continue; }
        out.push(candidateURL);
    }
    return out;
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
    const now = new Date();
    const startYear = 2006;
    const currentYear = now.getFullYear();
    const monthCount = (currentYear - startYear) * 12 + now.getMonth() + 1;
    let tryCount = 8;
    for (;;) {
        if ( tryCount <= 0 ) { break; }
        tryCount -= 1;
        const month = Math.floor(Math.random() * monthCount);
        const year = startYear + Math.floor(month / 12);
        const group = (month % 12) < 6 ? 'A' : 'B';
        const fileURLs = await getCandidates(year, group);
        if ( Array.isArray(fileURLs) === false ) { continue; }
        if ( fileURLs.length === 0 ) { continue; }
        const i = Math.floor(Math.random() * fileURLs.length);
        const fileURL = fileURLs[i];
        const fileHash = await hashFromURL(fileURL);
        if ( excludedHashes.has(fileHash) ) { continue; }
        const picture = await fetchPicture(fileURL);
        if ( picture ) { return picture; }
    }
}
