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

export async function hashFromURL(href) {
    const encoder = new TextEncoder();
    const data = encoder.encode(href);
    const buffer = await crypto.subtle.digest('SHA-256', data);
    const array = Array.from(new Uint8Array(buffer));
    return array.map(b => b.toString(16).padStart(2, '0')).join('').slice(-10);
}

export async function fetchPicture(fileURL) {
    const fetchOptions = {
        credentials: 'omit',
    };
    const response = await fetch(fileURL, fetchOptions).catch((reason) => {
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
    const img = doc.querySelector('#file.fullImageLink img[data-file-width]');
    if ( img === null ) { return; }
    const { width: screenWidth, height: screenHeight } = self.screen;
    const screenRatio = screenWidth / screenHeight;
    const defaultURL = new URL(img.getAttribute('src'), fileURL);
    defaultURL.search = '';
    const match = /([^/]+)\/(\d+)px-\1$/.exec(defaultURL.href);
    if ( match === null ) { return; }
    const naturalWidth = parseInt(img.dataset.fileWidth, 10) || 0;
    if ( naturalWidth === 0 ) { return; }
    const naturalHeight = parseInt(img.dataset.fileHeight, 10) || 0;
    if ( naturalHeight === 0 ) { return; }
    const thumbWidth = parseInt(img.width, 10) || 0;
    if ( thumbWidth === 0 ) { return; }
    const thumbHeight = parseInt(img.height, 10) || 0;
    if ( thumbHeight === 0 ) { return; }
    const imageRatio = naturalWidth / naturalHeight;
    let optimalWidth = 0;
    if ( imageRatio > screenRatio ) {
        optimalWidth = screenWidth;
    } else {
        optimalWidth = Math.ceil(screenHeight * imageRatio / 100);
        if ( optimalWidth === Math.floor(screenWidth / 100) ) {
            optimalWidth = screenWidth;
        } else {
            optimalWidth *= 100;
        }
    }
    if ( naturalWidth !== 0 && naturalWidth < optimalWidth ) {
        optimalWidth = naturalWidth;
    }
    const thumbURL = [
        defaultURL.href.slice(0, match.index),
        match[1],
        '/300px-',
        match[1],
    ].join('');
    const imageURL = [
        defaultURL.href.slice(0, match.index),
        match[1], '/',
        `${optimalWidth}px-`,
        match[1],
    ].join('');
    const caption = doc.querySelector('.description[lang="en"]');
    const span = caption.querySelector('span.language.en');
    if ( span ) { span.remove(); }
    return {
        hash: await hashFromURL(fileURL),
        sourceURL: fileURL,
        imageRatio,
        thumbURL,
        imageURL,
        caption: caption.textContent,
    };
}
