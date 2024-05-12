/*******************************************************************************

 * jsawpuzzle 1.0
 * Copyright (c) 2024-present Raymond Hill
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

import { safeInsertAdjacentHTML } from './dom-utils.js';

/******************************************************************************/

const browser = self.browser || self.chrome;
const i18n$ = (...args) => browser.i18n.getMessage(...args);

document.body.setAttribute('dir', i18n$('@@bidi_dir'));

for ( const elem of document.querySelectorAll('[data-i18n]') ) {
    const text = i18n$(elem.dataset.i18n);
    if ( Boolean(text) === false ) { continue; }
    safeInsertAdjacentHTML(elem, 'afterbegin', text);
}

for ( const elem of document.querySelectorAll('[label]') ) {
    const text = i18n$(elem.getAttribute('label'));
    if ( Boolean(text) === false ) { continue; }
    elem.setAttribute('label', text);
}

for ( const elem of document.querySelectorAll('[title]') ) {
    const text = i18n$(elem.getAttribute('title'));
    if ( Boolean(text) === false ) { continue; }
    elem.setAttribute('title', text);
}

for ( const elem of document.querySelectorAll('img[alt]') ) {
    const text = i18n$(elem.getAttribute('alt'));
    if ( Boolean(text) === false ) { continue; }
    elem.setAttribute('alt', text);
}

/******************************************************************************/
