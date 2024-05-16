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

import { hashFromURL } from './utils.js';

/******************************************************************************/

const PICTURE_COUNT = 600000;

async function getDocument(docURL) {
    const fetchOptions = {
        credentials: 'omit',
    };
    const response = await fetch(docURL, fetchOptions).catch((reason) => {
        console.log(reason);
    });
    if ( response instanceof Response === false ) { return; }
    if ( response.ok === false ) { return; }
    const responseText = await response.text().catch((reason) => {
        console.log(reason);
    });
    if ( typeof responseText !== 'string' ) { return; }
    const domParser = new DOMParser();
    return domParser.parseFromString(responseText, 'text/html');
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
    let tryCount = 8;
    for (;;) {
        if ( tryCount <= 0 ) { break; }
        tryCount -= 1;
        const i = Math.floor(Math.random() * PICTURE_COUNT);
        const docURL = `https://www.publicdomainpictures.net/view-image.php?image=${i}`;
        const docHash = await hashFromURL(docURL);
        if ( excludedHashes.has(docHash) ) { continue; }
        const doc = await getDocument(docURL);
        if ( doc === undefined ) { continue; }
        const main = doc.querySelector('#mainContent');
        const image = main.querySelector('#main_image img#image');
        if ( image === null ) { continue; }
        const imageURL = new URL(image.getAttribute('src'), docURL);
        const thumb = main.querySelector('meta[itemprop="thumbnailUrl"][content]');
        const thumbURL = thumb !== null
            ? new URL(thumb.getAttribute('content'), docURL)
            : '';
        return {
            hash: docHash,
            sourceURL: docURL,
            thumbURL: `${thumbURL}`,
            imageURL: `${imageURL}`,
            caption: image.getAttribute('alt') || '',
        };
    }
}
