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

const browser = self.browser || self.chrome;

/******************************************************************************/

function onToolbarIconClicked() {
    browser.runtime.openOptionsPage();
}

browser.action.onClicked.addListener(onToolbarIconClicked);

/******************************************************************************/

async function sendMessage(msg) {
    const send = (resolve, msg, tryCount) => {
        browser.runtime.sendMessage(msg).then(( ) => {
            resolve();
        }).catch(( ) => {
            tryCount -= 1;
            return tryCount > 0
                ? setTimeout(( ) => { send(resolve, msg, tryCount); }, 100)
                : resolve();
        });
    };
    return new Promise(resolve => {
        send(resolve, msg, 10);
    });
}

async function onMenuClicked(details) {
    if ( details.menuItemId !== 'importPicture' ) { return; }
    await browser.runtime.openOptionsPage();
    const { pageUrl, srcUrl } = details;
    if ( typeof srcUrl !== 'string' ) { return; }
    if ( srcUrl === '' ) { return; }
    return sendMessage({
        what: 'importPicture',
        imageURL: srcUrl,
        pageURL: pageUrl,
    });
}

function enableContextMenu() {
    browser.contextMenus.create({
        id: 'importPicture',
        contexts: [
            'image',
        ],
        targetUrlPatterns: [
            'http://*/*',
            'https://*/*',
        ],
        title: 'Create puzzle',
    }, ( ) => {
        void browser.runtime.lastError;
    });
}

browser.contextMenus.onClicked.addListener((details) => {
    onMenuClicked(details);
});

function toggleContextMenu() {
    return browser.storage.local.get('enableContextMenu').then((bin) => {
        if ( bin instanceof Object === false ) { return; }
        if ( bin.enableContextMenu === true ) {
            enableContextMenu();
        } else {
            browser.contextMenus.removeAll();
        }
    });
}

toggleContextMenu();

/******************************************************************************/

browser.runtime.onMessage.addListener((msg) => {
    switch ( msg.what ) {
    case 'toggleContextMenuEntry':
        toggleContextMenu();
        break;
    default:
        break;
    }
});
