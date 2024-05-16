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

import { Voronoi } from './rhill-voronoi-core.min.js';

/******************************************************************************/

const powFn = Math.pow;
const sqrtFn = Math.sqrt;
const randFn = Math.random;
const roundFn = Math.round;

const hashFromSide = (a, b) => {
    return `${roundFn(a.x)},${roundFn(a.y)}_${roundFn(b.x)},${roundFn(b.y)}`;
};

const distance = (a, b) => {
    return sqrtFn(powFn(b.x - a.x, 2) + powFn(b.y - a.y, 2));
};

/******************************************************************************/

function createSeeds(details, config) {
    const { numRows, numCols, pieceWidth, pieceHeight } = details;
    const seeds = [];
    const distortion = config.distortion / 9 * 0.5;
    const partWidthVar = pieceWidth * distortion;
    const partHeightVar = pieceHeight * distortion;
    const wobble = (pt) => {
        pt.x += roundFn(randFn() * partWidthVar - 0.25);
        pt.y += roundFn(randFn() * partHeightVar - 0.25);
        return pt;
    };
    let y = pieceHeight / 2;
    for ( let i = 0; i < numRows; i++ ) {
        let x = pieceWidth / 2;
        for ( let j = 0; j < numCols; j++ ) {
            seeds.push(wobble({ x, y }));
            x += pieceWidth;
        }
        y += pieceHeight;
    }
    return seeds;
}

/******************************************************************************/

export function tesselate(details, config) {
    const { bedWidth, bedHeight } = details;
    const tiles = new Map();
    const edges = new Map();
    const voronoi = new Voronoi();
    const seeds = createSeeds(details, config);
    const diagram = voronoi.compute(seeds, {
        xl: 0, xr: bedWidth,
        yt: 0, yb: bedHeight,
    });
    let pieceId = 1;

    for ( const v of diagram.vertices ) {
        v.x = Math.round(v.x);
        v.y = Math.round(v.y);
    }

    for ( const { site, halfedges } of diagram.cells ) {
        const edgeIds = [];
        for ( const { edge: e } of halfedges ) {
            const { lSite, va, vb } = e;
            if ( distance(va, vb) < 1 ) { continue; }
            const edgeId = hashFromSide(va, vb);
            if ( edges.has(edgeId) ) {
                const edge = edges.get(edgeId);
                edge.tiles.push(pieceId);
            } else {
                const edge = { a: va, b: vb, tiles: [ pieceId ] };
                edges.set(edgeId, edge);
            }
            edgeIds.push({ edgeId, flip: lSite !== site });
        }
        tiles.set(pieceId, { id: pieceId++, edgeIds });
    }

    return { tiles, edges };
}
