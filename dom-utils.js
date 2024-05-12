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

/******************************************************************************/

const domParser = new DOMParser();

export function safeInsertAdjacentHTML(parent, position, text) {
    const importedDoc = domParser.parseFromString(text, 'text/html');
    const importedBody = importedDoc.body;
    const fragment = new DocumentFragment();
    while ( importedBody.firstChild !== null ) {
        fragment.append(document.adoptNode(importedBody.firstChild));
    }
    switch ( position ) {
    case 'afterbegin':
        parent.prepend(fragment);
        break;
    case 'beforeend':
        parent.append(fragment);
        break;
    default:
        break;
    }
}
