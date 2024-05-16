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

const defaultPuzzleOptions = {
    backgroundColor: '#797979',
    backgroundPattern: '',
    cut: 'square',
    attachment: 'classic',
    numPieces: 80,
    minPieceSize: 40,
    distortion: 2,
    numRotateSteps: 1,
    bedToCanvasRatio: 0.5,
    snapDistance: 9,
};

/******************************************************************************/

const absFn = Math.abs;
const atanFn = Math.atan2;
const ceilFn = Math.ceil;
const cosFn = Math.cos;
const floorFn = Math.floor;
const maxFn = Math.max;
const minFn = Math.min;
const powFn = Math.pow;
const randFn = Math.random;
const roundFn = Math.round;
const sinFn = Math.sin;
const sqrtFn = Math.sqrt;
const PI = Math.PI;
const PIover4 = PI / 4;
const epsilon = 1 / 100;
const epsilonEq = (a, b) => absFn(a - b) < epsilon;
const epsilonQz = (a) => Math.round(a / epsilon) * epsilon;
const confine = (v, l, h) => maxFn(minFn(v, h), l);
const distanceBetweenVertices = (a, b) => sqrtFn(powFn(b.x - a.x, 2) + powFn(b.y - a.y, 2));

/******************************************************************************/

export class Point {
    assign(a, b) {
        if ( typeof b === 'number' ) {
            this.x = a;
            this.y = b;
        } else if ( a instanceof Object ) {
            this.x = a.x || 0;
            this.y = a.y || 0;
        } else {
            this.x = 0;
            this.y = 0;
        }
    }

    distance(other) {
        return sqrtFn(
            powFn(this.x - other.x, 2) +
            powFn(this.y - other.y, 2)
        );
    }

    toString() {
        return `{x:${this.x},y:${this.y}}`;
    }

    toHashkey() {
        return `${roundFn(this.x)}_${roundFn(this.y)}`;
    }

    clone() {
        return Point.create(this);
    }

    offset(dx, dy) {
        this.x += dx;
        this.y += dy;
    }

    confine(bbox) {
        if ( this.x < bbox.tl.x ) {
            this.x = bbox.tl.x;
        } else if ( this.x > bbox.br.x ) {
            this.x = bbox.br.x;
        }
        if ( this.y < bbox.tl.y ) {
            this.y = bbox.tl.y;
        } else if ( this.y > bbox.br.y ) {
            this.y = bbox.br.y;
        }
        return this;
    }

    scale(factor) {
        this.x *= factor;
        this.y *= factor;
    }

    serialize() {
        return {
            x: this.x,
            y: this.y,
        };
    }

    static deserialize(data) {
        if ( data === undefined ) { return; }
        const pt = new Point();
        pt.x = data.x;
        pt.y = data.y;
        return pt;
    }

    static create(a, b) {
        const pt = new Point();
        pt.assign(a, b);
        return pt;
    }
}

/******************************************************************************/

class Bbox {
    assign(a, b, c, d) {
        // a=x1,b=y1,c=x2,d=y2
        if ( typeof d === 'number' ) {
            this.tl = Point.create(a, b);
            this.br = Point.create(c, d);
        }
        // a=Point or {x:?,y:?},b=Point or {x:?,y:?}
        else if ( b instanceof Object ) {
            this.tl = Point.create({ x: minFn(a.x, b.x), y: minFn(a.y, b.y) });
            this.br = Point.create({ x: maxFn(a.x, b.x), y: maxFn(a.y, b.y) });
        }
        // a=Bbox or {tl:{x:?,y:?},br:{x:?,y:?}}
        else if ( a instanceof Object ) {
            this.tl = Point.create(a.tl);
            this.br = Point.create(a.br);
        }
        //
        else {
            this.tl = Point.create();
            this.br = Point.create();
        }
        return this;
    }

    toString() {
        return `{tl:${this.tl},br:$this.br}}`;
    }

    clone() {
        return Bbox.create(this);
    }

    getTopleft() {
        return this.tl;
    }

    getBottomright() {
        return this.br;
    }

    getCentroid(absolute = false) {
        let x = (this.br.x - this.tl.x) / 2;
        let y = (this.br.y - this.tl.y) / 2;
        if ( absolute ) {
            x += this.tl.x;
            y += this.tl.y;
        }
        return Point.create(x, y);
    }

    unionPoint(p) {
        this.tl.x = minFn(this.tl.x, p.x);
        this.tl.y = minFn(this.tl.y, p.y);
        this.br.x = maxFn(this.br.x, p.x);
        this.br.y = maxFn(this.br.y, p.y);
        return this;
    }

    unionPoints(a) {
        // assume array of values
        if ( Array.isArray(a) === false ) { return; }
        for ( let i = 0; i < a.length; i += 2 ) {
            const x = a[i+0];
            const y = a[i+1];
            this.tl.x = minFn(this.tl.x, x);
            this.tl.y = minFn(this.tl.y, y);
            this.br.x = maxFn(this.br.x, x);
            this.br.y = maxFn(this.br.y, y);
        }
        return this;
    }

    get width() {
        return this.br.x - this.tl.x;
    }

    get height() {
        return this.br.y - this.tl.y;
    }

    offset(dx, dy) {
        this.tl.offset(dx, dy);
        this.br.offset(dx, dy);
        return this;
    }

    set(a) {
        if ( Array.isArray(a) === false ) { return; }
        if ( a.length === 0 ) { return; }
        // assume array of values
        if ( typeof a[0] === 'number' ) {
            for ( let i = 0; i < a.length; i += 2 ) {
                const x = a[i+0];
                const y = a[i+1];
                this.tl.x = minFn(this.tl.x, x);
                this.tl.y = minFn(this.tl.y, y);
                this.br.x = maxFn(this.br.x, x);
                this.br.y = maxFn(this.br.y, y);
            }
            return;
        }
        // array of Points
        this.tl.x = this.br.x = a[0].x;
        this.tl.y = this.br.y = a[0].y;
        for ( let i = 1; i < a.length; i++ ) {
            const p = a[i];
            this.tl.x = minFn(this.tl.x, p.x);
            this.tl.y = minFn(this.tl.y, p.y);
            this.br.x = maxFn(this.br.x, p.x);
            this.br.y = maxFn(this.br.y, p.y);
        }
        return this;
    }

    pointIn(p) {
        return p.x > this.tl.x &&
            p.x < this.br.x &&
            p.y > this.tl.y &&
            p.y < this.br.y;
    }

    doesIntersect(bb) {
        return (minFn(bb.br.x, this.br.x) - maxFn(bb.tl.x, this.tl.x)) > 0 &&
            (minFn(bb.br.y, this.br.y) - maxFn(bb.tl.y, this.tl.y)) > 0;
    }

    union(other) {
        // this bbox is empty
        if (this.isEmpty()) {
            this.tl = Point.create(other.tl);
            this.br = Point.create(other.br);
        }
        // union only if other bbox is not empty
        else if (!other.isEmpty()) {
            this.tl.x = minFn(this.tl.x, other.tl.x);
            this.tl.y = minFn(this.tl.y, other.tl.y);
            this.br.x = maxFn(this.br.x, other.br.x);
            this.br.y = maxFn(this.br.y, other.br.y);
        }
        return this;
    }

    grow(dx, dy) {
        this.tl.x -= dx;
        this.br.x += dx;
        if ( typeof dy === 'number' ) {
            this.tl.y -= dy;
            this.br.y += dy;
        } else {
            this.tl.y -= dx;
            this.br.y += dx;
        }
        return this;
    }

    shrink(dx, dy) {
        this.tl.x += dx;
        this.br.x -= dx;
        if ( typeof dy === 'number' ) {
            this.tl.y += dy;
            this.br.y -= dy;
        } else {
            this.tl.y += dx;
            this.br.y -= dx;
        }
        return this;
    }

    scale(factor) {
        const pos = this.getCentroid(true).clone();
        pos.scale(factor);
        const width = this.width * factor;
        const height = this.height * factor;
        this.tl.x = pos.x - width / 2;
        this.tl.y = pos.y - height / 2;
        this.br.x = pos.x + width / 2;
        this.br.y = pos.y + height / 2;
        return this;
    }

    quantize() {
        this.tl.x = floorFn(this.tl.x);
        this.tl.y = floorFn(this.tl.y);
        this.br.x = ceilFn(this.br.x);
        this.br.y = ceilFn(this.br.y);
        return this;
    }

    isEmpty() {
        return this.width <= 0 || this.height <= 0;
    }

    toCanvasPath(ctx) {
        ctx.rect(this.tl.x, this.tl.y, this.width, this.height);
    }

    serialize() {
        return {
            tl: this.tl.serialize(),
            br: this.br.serialize(),
        };
    }

    static deserialize(data) {
        if ( data === undefined ) { return; }
        const bbox = new Bbox();
        bbox.tl = Point.deserialize(data.tl);
        bbox.br = Point.deserialize(data.br);
        return bbox;
    }

    static create(...args) {
        const bbox = new Bbox();
        return bbox.assign(...args);
    }
}

/******************************************************************************/

class Attachment {
    getBbox() {
        if ( this.bbox ) { return this.bbox; }
        this.bbox = Bbox.create();
        if ( this.beziers.length === 0 ) { return this.bbox; }
        this.bbox.set(this.beziers[0]);
        for ( const bezier of this.beziers ) {
            this.bbox.unionPoints(bezier);
        }
        return this.bbox;
    }

    complement() {
        const r = Attachment.create(this);
        // Just a matter of (normalized attachments required):
        // * vertical flip = sign inversion of Y
        // * horizontal flip = 1024 minus X
        // * for each bezier curve:
        //   * swap control point 1 with control point 2
        //   * the point is taken from the previous curve
        // * reverse order of the beziers in the array
        // This way we end up with a mirror curve which is
        // still drawn from pt A to pt B
        let x = 1024;
        let y = 0;
        for ( const bezier of r.beziers ) {
            const nx = bezier[4];
            const ny = bezier[5];
            bezier[4] = x;
            bezier[5] = y;
            x = 1024 - bezier[0];
            y = -bezier[1];
            bezier[0] = 1024 - bezier[2];
            bezier[1] = -bezier[3];
            bezier[2] = x;
            bezier[3] = y;
            x = 1024 - nx;
            y = -ny;
        }
        r.beziers.reverse();
        return r;
    }

    // Important: need to epsilon-quantize output to avoid bad bezier
    // rendering on Firefox
    transform(ptA, ptB) {
        // first we need to find the scaling factor, dependent on the length
        // of the line defined by ptA-ptB (normalized attachments are drawn in a
        // 1024x1024px world, origin at (0,0)
        const scale = sqrtFn(powFn(ptB.x - ptA.x, 2) + powFn(ptB.y - ptA.y, 2)) / 1024;
        // then we need to find the angle of the line defined by ptA-ptB
        const angle = atanFn(ptB.y - ptA.y, ptB.x - ptA.x);
        // now transform each point
        const cosang = cosFn(angle);
        const sinang = sinFn(angle);
        const r = Attachment.create();
        for ( const bezier of this.beziers ) {
            let x = bezier[0] * scale;
            let y = bezier[1] * scale;
            const cx1 = x * cosang - y * sinang;
            const cy1 = x * sinang + y * cosang;
            x = bezier[2] * scale;
            y = bezier[3] * scale;
            const cx2 = x * cosang - y * sinang;
            const cy2 = x * sinang + y * cosang;
            x = bezier[4] * scale;
            y = bezier[5] * scale;
            r.beziers.push([
                epsilonQz(cx1), epsilonQz(cy1),
                epsilonQz(cx2), epsilonQz(cy2),
                epsilonQz(x * cosang - y * sinang),
                epsilonQz(x * sinang + y * cosang),
            ]);
        }
        return r;
    }

    toCanvas(ctx, ptA, ptB) {
        // special case: no attachment
        if ( this.beziers.length === 0 ) {
            ctx.lineTo(ptB.x, ptB.y);
            return;
        }
        // else apply attachment
        const { x, y } = ptA;
        for ( const bezier of this.beziers ) {
            ctx.bezierCurveTo(
                x + bezier[0],
                y + bezier[1],
                x + bezier[2],
                y + bezier[3],
                x + bezier[4],
                y + bezier[5]
            );
        }
    }

    serialize() {
        return {
            attachable: this.attachable,
            beziers: this.beziers,
            bbox: this.bbox ? this.bbox.serialize() : undefined,
        };
    }

    static deserialize(data) {
        const attachment = new Attachment();
        attachment.attachable = data.attachable;
        attachment.beziers = data.beziers;
        attachment.bbox = Bbox.deserialize(data.bbox);
        return attachment;
    }

    static create(a) {
        const attachment = new Attachment();
        if ( a instanceof Object ) {
            attachment.beziers = structuredClone(a.beziers);
            attachment.attachable = a.attachable;
        } else {
            attachment.beziers = [];
            attachment.attachable = undefined;
        }
        attachment.bbox = undefined;
        return attachment;
    }

    // Built-in attachments
    // Attachments must be built horizontally, along the top edge of a
    // 1024x1024 tile, and must extend to the whole edge, expressly starting
    // at the top-left corner (the origin=0,0) and ending at the top-right
    // corner (1024,0). In between, all is allowed. I use GIMP, create a
    // 1024x1024 canvas, then use the path tool to create a path in between
    // (0,0) and (1024,0), and then export the path as an SVG file, and
    // manually convert to JSON as seen below.
    // Format: each member of the array is an array of integer value ordered
    // as follow: [cx1,cy1,cx2,cy2,x,y]
    static stock = {
        'classic': {
            beziers: [
                [ 0, 0, 448, -224, 448, -96 ],
                [ 448, -32, 384, -32, 384, 64 ],
                [ 384, 160, 448, 192, 512, 192 ],
                [ 576, 192, 640, 160, 640, 64 ],
                [ 640, -32, 576, -32, 576, -96 ],
                [ 576, -224, 1024, 0, 1024, 0 ],
            ],
        },
        'straight': {
            beziers: [
                [0, 0, 1024, 0, 1024, 0]
            ],
        },
        'tenon': {
            beziers: [
                [ 0, 0, 224, 0, 224, 0 ],
                [ 224, 0, 224, 192, 224, 192 ],
                [ 224, 192, 416, 192, 416, 192 ],
                [ 416, 192, 416, 0, 416, 0 ],
                [ 416, 0, 608, 0, 608, 0 ],
                [ 608, 0, 608, 192, 608, 192 ],
                [ 608, 192, 800, 192, 800, 192 ],
                [ 800, 192, 800, 0, 800, 0 ],
                [ 800, 0, 1024, 0, 1024, 0 ],
            ],
        },
        'wave': {
            beziers: [
                [ 128, 128, 192, -96, 320, 0 ],
                [ 352, 32, 224, 96, 256, 128 ],
                [ 448, 224, 576, -224, 768, -128 ],
                [ 800, -96, 672, -32, 704, 0 ],
                [ 832, 96, 896, -128, 1024, 0 ],
            ],
        },
    }
}

/******************************************************************************/

class AttachmentRandomizer {
    constructor(attachmentNormalized, options = {}) {
        this.normalized = Attachment.create(attachmentNormalized);
        this.allowComplement = options.allowComplement || true;
        this.minDistance = options.minDistance || 20;
        this.tooSmall = Attachment.create(Attachment.stock.straight);
        this.tooSmall.attachable = false;
    }

    randomize(a, b) {
        if ( distanceBetweenVertices(a, b) < this.minDistance ) {
            return this.tooSmall;
        }
        if ( this.allowComplement && randFn() >= 0.5 ) {
            return this.normalized.complement();
        }
        return Attachment.create(this.normalized);
    }
}

/******************************************************************************/

class Side {
    static idGenerator = 1;

    assign(a, complement = false) {
        if ( a instanceof Object ) {
            if ( a instanceof Side ) {
                if ( complement ) {
                    this.id = -a.id;
                    this.ptA = Point.create(a.ptB);
                    this.ptB = Point.create(a.ptA);
                    this.attachmentNormalized = a.attachmentNormalized.complement();
                } else {
                    this.id = a.id;
                    this.ptA = Point.create(a.ptA);
                    this.ptB = Point.create(a.ptB);
                    this.attachmentNormalized = a.attachmentNormalized;
                }
                this.moveto = a.moveto;
            } else {
                this.id = a.id || undefined;
                this.ptA = Point.create(a.ptA);
                this.ptB = Point.create(a.ptB);
                this.moveto = a.moveto || false;
                this.attachmentNormalized = a.attachmentNormalized;
            }
            this.edge = a.edge;
            this.attachable = a.attachmentNormalized.attachable !== false;
        } else {
            this.edge = false;
            this.ptA = Point.create();
            this.ptB = Point.create();
            this.moveto = a.false;
            this.attachable = true;
        }
        if ( this.id === undefined ) {
            this.id = Side.idGenerator++;
        }
        if ( this.attachmentNormalized === undefined ) {
            this.attachmentNormalized = Attachment.create(Attachment.stock.straight);
        }
        this.recalc();
    }

    clone() {
        return Side.create(this);
    }

    complement() {
        return Side.create(this, true);
    }

    startPoint() {
        return this.ptA;
    }

    endPoint() {
        return this.ptB;
    }

    offset(dx, dy) {
        this.ptA.offset(dx, dy);
        this.ptB.offset(dx, dy);
        this.bbox.offset(dx, dy);
    }

    getAttachment() {
        if ( this.attachment ) { return this.attachment; }
        this.attachment = this.attachmentNormalized.transform(this.ptA, this.ptB);
        return this.attachment;
    }

    getBbox() {
        return this.bbox;
    }

    rotate(angle, x0, y0, cosang, sinang) {
        let x = this.ptA.x - x0;
        let y = this.ptA.y - y0;
        this.ptA.x = x * cosang - y * sinang + x0;
        this.ptA.y = x * sinang + y * cosang + y0;
        x = this.ptB.x - x0;
        y = this.ptB.y - y0;
        this.ptB.x = x * cosang - y * sinang + x0;
        this.ptB.y = x * sinang + y * cosang + y0;
        this.recalc();
    }

    scale(factor) {
        this.ptA.scale(factor);
        this.ptB.scale(factor);
        this.recalc();
    }

    toCanvas(ctx) {
        this.getAttachment().toCanvas(ctx, this.ptA, this.ptB);
    }

    recalc() {
        if ( this.attachmentNormalized === undefined ) { return; }
        this.attachment = this.attachmentNormalized.transform(this.ptA, this.ptB);
        this.bbox = this.attachment.getBbox().clone();
        this.bbox.offset(this.ptA.x, this.ptA.y);
        // a side is always at least one pixel wide/high due to attachment
        // which in the simplest case is a single 1 pixel-thick line
        if ( this.bbox.width === 0 ) {
            // cases: |  ^
            //        V  |
            if ( this.ptA.y < this.ptB.y ) {
                this.bbox.tl.x--;
            } else {
                this.bbox.br.x++;
            }
        } else if ( this.bbox.height === 0 ) {
            // cases: -->  <--
            if (this.ptA.x < this.ptB.x) {
                this.bbox.br.y++;
            } else {
                this.bbox.tl.y--;
            }
        }
    }

    serialize() {
        return {
            id: this.id,
            edge: this.edge,
            ptA: this.ptA.serialize(),
            ptB: this.ptB.serialize(),
            moveto: this.moveto,
            attachable: this.attachable,
            bbox: this.bbox.serialize(),
            attachment: this.attachment.serialize(),
            attachmentNormalized: this.attachmentNormalized.serialize(),
        };
    }

    static deserialize(data) {
        if ( data === undefined ) { return; }
        const side = new Side();
        side.id = data.id;
        side.edge = data.edge;
        side.ptA = Point.deserialize(data.ptA);
        side.ptB = Point.deserialize(data.ptB);
        side.moveto = data.moveto;
        side.attachable = data.attachable;
        side.bbox = Bbox.deserialize(data.bbox),
        side.attachment = Attachment.deserialize(data.attachment),
        side.attachmentNormalized = Attachment.deserialize(data.attachmentNormalized);
        return side;
    }

    static create(...args) {
        const side = new Side();
        side.assign(...args);
        return side;
    }
}

/******************************************************************************/

class Polygon {
    clone() {
        return Polygon.create(this);
    }

    getBbox() {
        return this.bbox;
    }

    getCentroid(absolute = false) {
        if ( absolute === false ) { return this.centroid; }
        const pt = this.centroid.clone();
        pt.x += this.bbox.tl.x;
        pt.y += this.bbox.tl.y;
        return pt;
    }

    pointIn() {
        alert('Polygon.prototype.pointIn: No longer supported');
    }

    offset(dx, dy) {
        for ( const side of this.sides ) {
            side.offset(dx, dy);
        }
        this.bbox.offset(dx, dy);
    }

    moveto(x, y) {
        const tl = this.bbox.tl;
        this.offset(
            x - tl.x - this.centroid.x,
            y - tl.y - this.centroid.y
        );
    }

    rotate(angle, x0, y0) {
        const cosang = cosFn(angle);
        const sinang = sinFn(angle);
        for ( const side of this.sides ) {
            side.rotate(angle, x0, y0, cosang, sinang);
        }
        this.recalc();
    }

    doesIntersect(bbox) {
        return this.bbox.doesIntersect(bbox);
    }

    getSides() {
        const r = [];
        for ( const side of this.sides ) {
            r.push(side);
        }
        return r;
    }

    merge(others) {
        // eliminate complementary sides
        const pool = new Map();
        for ( const side of this.sides ) {
            pool.set(side.id, side);
        }
        for ( const other of others ) {
            for ( const side of other.sides ) {
                if ( pool.has(-side.id) ) {
                    pool.delete(-side.id);
                } else {
                    pool.set(side.id, side);
                }
            }
        }
        // reconnected leftover sides
        const unpool = new Map();
        for ( const side of pool.values() ) {
            const hash = side.ptA.toHashkey();
            if ( unpool.has(hash) ) {
                unpool.get(hash).push(side);
            } else {
                unpool.set(hash, [ side ]);
            }
        }
        this.sides = [];
        for (;;) {
            if ( unpool.size === 0 ) { break; }
            let [ idA, sides ] = unpool.entries().next().value;
            let side = sides.shift();
            if ( sides.length === 0 ) {
                unpool.delete(idA);
            }
            side.moveto = true;
            this.sides.push(side);
            for (;;) {
                idA = side.ptB.toHashkey();
                sides = unpool.get(idA);
                if ( sides === undefined ) { break; }
                side = sides.shift();
                if ( sides.length === 0 ) {
                    unpool.delete(idA);
                }
                side.moveto = false;
                this.sides.push(side);
            }
        }
        this.recalc();
    }

    scale(factor) {
        const centroidBefore = this.getCentroid(true).clone();
        this.offset(-centroidBefore.x, -centroidBefore.y);
        for ( const side of this.sides ) {
            side.scale(factor);
        }
        centroidBefore.scale(factor);
        this.offset(centroidBefore.x, centroidBefore.y);
        this.recalc();
    }

    toCanvasPath(ctx) {
        if ( this.sides.length === 0 ) { return; }
        ctx.beginPath();
        for ( const side of this.sides ) {
            const { x, y } = side.ptA;
            if ( side.moveto ) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            side.toCanvas(ctx);
        }
        ctx.closePath();
    }

    draw3dEdge(ctx) {
        ctx.save();
        ctx.lineWidth = 1.5;
        ctx.globalCompositeOperation = 'hard-light';
        ctx.save();
        ctx.translate(0.5, 0.5);
        this.toCanvasPath(ctx);
        ctx.strokeStyle = '#fff8'
        ctx.stroke();
        ctx.restore();
        ctx.translate(-0.5, -0.5);
        this.toCanvasPath(ctx);
        ctx.strokeStyle = '#0007'
        ctx.stroke();
        ctx.restore();
    }

    // "Calculating the area and centroid of a polygon" by Paul Bourke
    // https://paulbourke.net/geometry/polygonmesh/
    recalc() {
        this.bbox = Bbox.create();
        let area = 0;
        let x = 0, y = 0;
        for ( const side of this.sides ) {
            this.bbox.union(side.getBbox());
            const { x: ax, y: ay } = side.ptA;
            const { x: bx, y: by } = side.ptB;
            const f = ax * by - bx * ay;
            x += (ax + bx) * f;
            y += (ay + by) * f;
            area += f;
        }
        area /= 2;
        // centroid relative to self bbox
        const origin = this.bbox.getTopleft();
        const f = area * 6;
        this.centroid = f !== 0
            ? Point.create({ x: x / f - origin.x, y: y / f - origin.y })
            : Point.create();
    }

    serialize() {
        return {
            sides: this.sides.map(a => a.serialize()),
            bbox: this.bbox.serialize(),
            centroid: this.centroid.serialize(),
        };
    }

    static deserialize(data) {
        if ( data === undefined ) { return; }
        const polygon = new Polygon();
        polygon.sides = data.sides.map(a => Side.deserialize(a));
        polygon.bbox = Bbox.deserialize(data.bbox);
        polygon.centroid = Point.deserialize(data.centroid);
        return polygon;
    }

    static create(a) {
        const polygon = new Polygon();
        if ( a instanceof Polygon ) {
            polygon.sides = a.sides.map(a => Side.create(a));
            polygon.bbox = a.bbox.clone();
            polygon.centroid = a.centroid.clone();
            return polygon;
        }
        if ( Array.isArray(a) ) {
            polygon.sides = a.map(a => Side.create(a));
        } else {
            polygon.sides = [];
        }
        if ( polygon.sides.length > 0 ) {
            polygon.sides[0].moveto = true;
        }
        polygon.recalc();
        return polygon;
    }
}

/******************************************************************************/

class PuzzlePart {
    constructor() {
        this.hidden = false;
    }

    isEdge() {
        return false;
    }

    resize() {
    }

    serialize() {
        return {
            hidden: this.hidden,
        };
    }

    deserialize(data) {
        this.hidden = data.hidden;
    }
}

/******************************************************************************/

class PuzzlePiece extends PuzzlePart {
    static idGenerator = 1;

    constructor() {
        super();
        this.piece = true;
    }

    getBbox() {
        return this.displayPolygon.getBbox();
    }

    getCentroid(absolute) {
        return this.displayPolygon.getCentroid(absolute);
    }

    getAngleStep() {
        return this.angleStep;
    }

    setAngleStep(step, maxSteps) {
        // normalize max steps into 0-360 integer range
        if ( maxSteps !== undefined ) {
            this.numRotateSteps = 360 / roundFn(360 / minFn(maxFn(maxSteps, 1), 90));
        }
        // ensure step is within range
        this.angleStep = step % this.numRotateSteps;
        if ( this.angleStep < 0 ) {
            this.angleStep += this.numRotateSteps;
        }
        // precalculate angle in radian: 2PI*step/maxsteps
        this.angleRadians = 2 * PI * this.angleStep / this.numRotateSteps;
        this.recalc();
    }

    setDisplayPos(x, y) {
        if ( x instanceof Object ) {
            ({ x = 0, y = 0 } = x);
        }
        const before = this.getDisplayPos();
        const dx = x - before.x;
        const dy = y - before.y;
        this.displayPolygon.offset(dx, dy);
    }

    getDisplayPos() {
        return this.getCentroid(true);
    }

    getDisplayBbox() {
        return this.displayPolygon.getBbox();
    }

    draw(ctx) {
        const dTopleft = this.getDisplayBbox().getTopleft();
        ctx.drawImage(this.displayCanvas, dTopleft.x, dTopleft.y);
    }

    pointIn(p) {
        const bbox = this.getDisplayBbox();
        // coarse test first (this improves performance significantly)
        if ( bbox.pointIn(p) !== true ) { return false; }
        // convert point to display canvas coords
        const ctx = this.displayCanvas.getContext('2d');
        ctx.save();
        ctx.beginPath();
        this.displayPolygon.toCanvasPath(ctx);
        const r = ctx.isPointInPath(p.x, p.y);
        ctx.restore();
        return r;
    }

    isEdge() {
        return this.edge;
    }

    isComposite() {
        return Array.isArray(this.composite);
    }

    doesIntersect(bbox) {
        return bbox.doesIntersect(this.getDisplayBbox());
    }

    merge(others) {
        const polygons = [];
        for ( const other of others ) {
            this.edge = this.edge || other.edge;
            if ( this.isComposite() === false ) {
                this.composite = [ this.id ];
            }
            if ( other.isComposite() ) {
                this.composite = this.composite.concat(other.composite);
            } else {
                this.composite.push(other.id);
            }
            polygons.push(other.sourcePolygon);
        }
        this.sourcePolygon.merge(polygons);
        this.recalc();
    }

    resize(factor, imageCanvas) {
        const displayPos = this.getDisplayPos();
        displayPos.scale(factor);
        this.sourceCanvas = imageCanvas;
        this.sourcePolygon.scale(factor);
        this.recalc();
        this.setDisplayPos(displayPos);
    }

    snapPiece(other, snapDistance = 7) {
        // do not snap with self..
        if ( other.id === this.id ) { return false; }
        // display angle steps must be the same
        if (other.getAngleStep() !== this.getAngleStep()) { return false; }
        // overall display bounding box, inflated as per tolerance, must intersect
        const dBbox = other.getBbox().clone();
        dBbox.grow(snapDistance);
        if ( dBbox.doesIntersect(this.getBbox()) === false ) { return false; }
        // we test each side of this piece against each side of the other piece
        for ( const thisSide of this.displayPolygon.getSides() ) {
            if ( thisSide.attachable === false ) { continue; }
            for ( const otherSide of other.displayPolygon.getSides() ) {
                if ( otherSide.attachable === false ) { continue; }
                if ( (thisSide.id + otherSide.id) !== 0 ) { continue; }
                const xdistance = thisSide.ptB.x - otherSide.ptA.x;
                const ydistance = thisSide.ptB.y - otherSide.ptA.y;
                if ( absFn(xdistance) > snapDistance ) { continue; }
                if ( absFn(ydistance) > snapDistance ) { continue; }
                // merge pieces: we want the merged piece to be the one moving
                // into position.
                const otherPos = other.getDisplayPos().clone();
                otherPos.offset(xdistance, ydistance);
                other.setDisplayPos(otherPos);
                const topleftBefore = this.getBbox().union(other.getBbox()).getTopleft();
                this.merge([ other ]);
                const topleftAfter = this.getBbox().getTopleft();
                const thisPos = this.getDisplayPos();
                this.setDisplayPos(
                    thisPos.x - (topleftAfter.x - topleftBefore.x),
                    thisPos.y - (topleftAfter.y - topleftBefore.y),
                );
                return true;
            }
        }
        return false;
    }

    recalc() {
        // preserve display position
        const displayPos = this.getDisplayPos();
        // we need to find out the bbox of the rotated source
        // in order to know the required image size
        this.displayPolygon = this.sourcePolygon.clone();
        const sBbox = this.sourcePolygon.getBbox();
        const sTopleft = sBbox.getTopleft();
        const sCentroid = this.sourcePolygon.getCentroid();
        // rotate
        this.displayPolygon.rotate(
            this.angleRadians,
            sTopleft.x + sCentroid.x,
            sTopleft.y + sCentroid.y
        );
        // post-rotation bbox different from pre-
        const tBbox = this.displayPolygon.getBbox();
        const tTopleft = tBbox.getTopleft();
        // create display counterpart
        this.displayCanvas = this.displayCanvas || (new OffscreenCanvas(16, 16));
        this.displayCanvas.width = tBbox.width;
        this.displayCanvas.height = tBbox.height;
        // set origin to self
        this.displayPolygon.offset(-tTopleft.x, -tTopleft.y);
        const tCentroid = this.displayPolygon.getCentroid();
        // transfer/rotate source tile image
        const ctx = this.displayCanvas.getContext('2d');
        // first, set the clipping region as per polygon
        ctx.save();
        ctx.beginPath();
        this.displayPolygon.toCanvasPath(ctx);
        ctx.clip();
        // copy/rotate source image into local buffer
        ctx.save();
        if ( this.angleStep ) {
            ctx.translate(tCentroid.x, tCentroid.y);
            ctx.rotate(this.angleRadians);
            ctx.translate(-tCentroid.x, -tCentroid.y);
        }
        ctx.drawImage(
            this.sourceCanvas,
            sTopleft.x, sTopleft.y,
            sBbox.width, sBbox.height,
            tCentroid.x - sCentroid.x, tCentroid.y - sCentroid.y,
            sBbox.width, sBbox.height
        );
        ctx.restore();
        // draw 3d edges around the piece
        this.displayPolygon.draw3dEdge(ctx);
        ctx.restore();
        // restore display position
        this.setDisplayPos(displayPos);
    }

    serialize() {
        return {
            base: super.serialize(),
            edge: this.edge,
            composite: this.composite,
            sourcePolygon: this.sourcePolygon.serialize(),
            angleStep: this.angleStep,
            numRotateSteps: this.numRotateSteps,
            angleRadians: this.angleRadians,
            displayPos: this.getDisplayPos().serialize(),
        };
    }

    static deserialize(imageCanvas, data) {
        const piece = new PuzzlePiece();
        piece.deserialize(data.base);
        piece.id = data.id || PuzzlePiece.idGenerator++;
        piece.edge = data.edge;
        piece.composite = data.composite;
        // source-related
        piece.sourceCanvas = imageCanvas
        piece.sourcePolygon = Polygon.deserialize(data.sourcePolygon);
        // display-related
        piece.angleStep = data.angleStep;
        piece.numRotateSteps = data.numRotateSteps;
        piece.angleRadians = data.angleRadians;
        piece.displayPolygon = piece.sourcePolygon.clone();
        // generate display tile
        piece.recalc();
        // move into position
        piece.setDisplayPos(Point.deserialize(data.displayPos));
        return piece;
    }

    static create(imageCanvas, polygon, options = {}) {
        const piece = new PuzzlePiece();
        piece.id = options.id || PuzzlePiece.idGenerator++;
        piece.edge = false;
        piece.composite = undefined;
        // source-related
        piece.sourceCanvas = imageCanvas
        piece.sourcePolygon = polygon;
        // display-related
        piece.angleStep = options.angleStep || 0;
        piece.numRotateSteps = options.numRotateSteps || 1;
        piece.angleRadians = options.angleRadians || (2 * PI);
        piece.displayPolygon = piece.sourcePolygon.clone();
        // generate display tile
        piece.recalc();
        // move into position
        piece.setDisplayPos(options);
        return piece;
    }
}

/******************************************************************************/

class PuzzlePreview extends PuzzlePart {
    static shadow = 12;

    constructor() {
        super();
        this.preview = true;
    }

    getBbox() {
        return this.bbox;
    }

    draw(ctx) {
        if ( this.hidden ) { return; }
        ctx.save();
        ctx.drawImage(this.image, this.bbox.tl.x, this.bbox.tl.y);
        ctx.restore();
    }

    setDisplayPos(x, y) {
        if ( x instanceof Object ) {
            ({ x = 0, y = 0 } = x);
        }
        const centroid = this.getDisplayPos();
        this.bbox.offset(x - centroid.x, y - centroid.y);
    }

    getDisplayPos() {
        return this.bbox.getCentroid(true);
    }

    getDisplayBbox() {
        const shadowedBbox = this.bbox.clone();
        shadowedBbox.br.x += PuzzlePreview.shadow;
        shadowedBbox.br.y += PuzzlePreview.shadow;
        return shadowedBbox;
    }

    pointIn(p) {
        return this.bbox.pointIn(p);
    }

    doesIntersect(bbox) {
        return this.bbox.doesIntersect(bbox);
    }

    resize(factor, imageCanvas) {
        this.bbox.scale(factor);
        const pos = this.getDisplayPos(true);
        this.recalc(imageCanvas);
        this.setDisplayPos(pos);
    }

    recalc(imageCanvas) {
        const { width: w, height: h } = imageCanvas
        this.image = this.image || (new OffscreenCanvas(16, 16));
        const prw = w / 2.5;
        const prh = h / 2.5;
        this.image.width = prw + PuzzlePreview.shadow;
        this.image.height = prh + PuzzlePreview.shadow;
        this.bbox = Bbox.create(0, 0, prw, prh);
        // transfer source image with drop shadow
        const ctx = this.image.getContext('2d');
        ctx.save();
        ctx.shadowOffsetX = PuzzlePreview.shadow / 2;
        ctx.shadowOffsetY = PuzzlePreview.shadow / 2;
        ctx.shadowBlur = PuzzlePreview.shadow - 4;
        ctx.shadowColor = 'rgba(0 0 0 / 60%)';
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(imageCanvas, 0, 0, w, h, 0, 0, prw, prh);
        ctx.restore();
        // 3d edges
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, prw, prh);
        ctx.clip();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff'
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        ctx.shadowBlur = 3;
        ctx.shadowColor = 'rgb(255 255 255 / 60%)';
        ctx.stroke();
        ctx.strokeStyle = '#000'
        ctx.shadowOffsetX = -3;
        ctx.shadowOffsetY = -3;
        ctx.shadowBlur = 3;
        ctx.shadowColor = 'rgb(0 0 0 / 60%)';
        ctx.stroke();
        ctx.restore();
    }

    serialize() {
        return {
            base: super.serialize(),
            bbox: this.bbox,
        };
    }

    static deserialize(data, imageCanvas) {
        const preview = new PuzzlePreview();
        preview.deserialize(data.base);
        preview.recalc(imageCanvas);
        preview.bbox = Bbox.deserialize(data.bbox);
        return preview;
    }

    static create(imageCanvas) {
        const preview = new PuzzlePreview();
        preview.recalc(imageCanvas);
        return preview;
    }
}

/******************************************************************************/

// Puzzle bed area

class PuzzleBed extends PuzzlePart {
    static lineWidth = 2;

    constructor(puzzle) {
        super();
        this.puzzle = puzzle;
        this.color = '';
        this.backgroundColor = '';
    }

    getBbox() {
        return this.bbox.clone().shrink(PuzzleBed.lineWidth);
    }

    draw(ctx) {
        this.recalcColor();
        ctx.save();
        ctx.lineWidth = PuzzleBed.lineWidth;
        ctx.setLineDash([ 10, 10 ]);
        ctx.strokeStyle = this.color;
        ctx.strokeRect(
            this.bbox.tl.x + 1,
            this.bbox.tl.y + 1,
            this.bbox.width - 3,
            this.bbox.height - 3
        );
        ctx.restore();
    }

    setDisplayPos(x, y) {
        if ( x instanceof Object ) {
            ({ x = 0, y = 0 } = x);
        }
        const centroid = this.getDisplayPos(true);
        this.bbox.offset(x - centroid.x, y - centroid.y);
    }

    getDisplayPos() {
        return this.bbox.getCentroid(true);
    }

    getDisplayBbox() {
        return this.bbox.clone().quantize();
    }

    pointIn() {
        return false;
    }

    doesIntersect(bbox) {
        return bbox.doesIntersect(this.getDisplayBbox());
    }

    recalcColor() {
        const { backgroundColor } = this.puzzle.config;
        if ( backgroundColor !== this.backgroundColor ) {
            this.color = '';
            this.backgroundColor = backgroundColor;
        }
        if ( this.color !== '' ) { return; }
        const match = /^#[a-z0-9]{6}/i.exec(backgroundColor);
        // https://alienryderflex.com/hsp.html
        const red = parseInt(match[0].slice(1,3), 16);
        const green = parseInt(match[0].slice(3,5), 16);
        const blue = parseInt(match[0].slice(5,7), 16);
        const brightness = sqrtFn(
            0.299 * red * red +
            0.587 * green * green +
            0.114 * blue * blue
        );
        this.color = brightness > 128 ? '#404040' : '#c0c0c0c0';
    }

    resize(factor) {
        super.resize(factor);
        this.bbox.shrink(PuzzleBed.lineWidth);
        this.bbox.scale(factor);
        this.bbox.grow(PuzzleBed.lineWidth);
    }

    serialize() {
        return {
            base: super.serialize(),
            bbox: this.getBbox(),
        };
    }

    static deserialize(puzzle, data) {
        if ( data === undefined ) { return; }
        const bed = new PuzzleBed(puzzle);
        bed.deserialize(data.base);
        bed.bbox = Bbox.deserialize(data.bbox).grow(PuzzleBed.lineWidth);
        return bed;
    }

    static create(puzzle, x, y, w, h) {
        const bed = new PuzzleBed(puzzle);
        bed.bbox = Bbox.create(0, 0, w, h);
        bed.bbox.grow(PuzzleBed.lineWidth);
        bed.setDisplayPos(x, y);
        return bed;
    }
}

/******************************************************************************/

export class Puzzle {
    constructor(parent) {
        this.config = Object.assign({}, defaultPuzzleOptions);
        this.imageURL = '';
        this.imageSource = null;
        this.imageCanvas = null;
        this.details = {};
        this.bedTile = null;
        this.previewTile = null;
        this.pieces = new Map();
        this.composites = new Map();
        this.drawingStack = [];
        this.canvasParent = document.querySelector(parent);
        this.prepareCanvas();
    }

    prepareConfig(options = {}) {
        this.config = {};
        for ( const k of Object.keys(defaultPuzzleOptions) ) {
            this.config[k] = options[k] !== undefined
                ? options[k]
                : defaultPuzzleOptions[k];
        }
    }

    prepareCanvas() {
        this.canvas = this.canvasParent.querySelector('canvas');
        if ( this.canvas === null ) {
            this.canvas = document.createElement('canvas');
            this.canvasParent.prepend(this.canvas);
        }
        if ( this.canvas.getContext === undefined ) { return; }
        const canvasRect = this.canvasParent.getBoundingClientRect();
        this.canvas.width = canvasRect.width;
        this.canvas.height = canvasRect.height;
    }

    prepareImage(details) {
        this.imageCanvas = this.imageCanvas || (new OffscreenCanvas(16, 16));
        this.imageCanvas.width = details.bedWidth;
        this.imageCanvas.height = details.bedHeight;
        const ctx = this.imageCanvas.getContext('2d');
        ctx.save();
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.imageSource, 0, 0, details.imageWidth, details.imageHeight, 0, 0, details.bedWidth, details.bedHeight);
        ctx.restore();
    }

    computeSizes(details, options = {}) {
        const { canvasWidth, canvasHeight } = details;
        const { imageWidth, imageHeight } = details;
        const { numPieces, minPieceSize } = details;
        const bedArea = canvasWidth * canvasHeight;
        const imgArea = bedArea * (details.bedToCanvasRatio || 0.5);
        const imgRatio = imageWidth / imageHeight;
        const bedMargin = 24;
        let bedHeight = minFn(sqrtFn(imgArea / imgRatio), canvasHeight - bedMargin);
        let bedWidth = minFn(bedHeight * imgRatio, canvasWidth - bedMargin);
        bedHeight = bedWidth / imgRatio;
        if ( options.preserveNumPieces !== true ) {
            details.numCols = minFn(
                maxFn(ceilFn(sqrtFn(numPieces) * sqrtFn(imgRatio)), 2),
                maxFn(ceilFn(bedWidth / minPieceSize), 2)
            );
            details.numRows = minFn(
                maxFn(ceilFn(sqrtFn(numPieces) / sqrtFn(imgRatio)), 2),
                maxFn(ceilFn(bedHeight / minPieceSize), 2)
            );
        }
        details.bedWidth = bedWidth;
        details.bedHeight = bedHeight;
        details.pieceWidth = bedWidth / details.numCols;
        details.pieceHeight = bedHeight / details.numRows;
        return details;
    }

    async preparePuzzle(puzzleOptions = {}) {
        // use default options if none specified
        // validate configurable parameters
        this.prepareConfig(puzzleOptions);
        if ( typeof puzzleOptions.imageURL === 'string' ) {
            if ( puzzleOptions.imageURL !== '' ) {
                this.imageURL = puzzleOptions.imageURL;
            }
        }
        if ( this.imageURL === '' ) { return; }
        if ( puzzleOptions.attachment ) {
            if ( Attachment.stock[puzzleOptions.attachment] === undefined ) {
                this.config.attachment = defaultPuzzleOptions.attachment;
            }
        }
        this.config.numPieces = confine(this.config.numPieces, 4, 999);
        this.config.distortion = confine(this.config.distortion, 0, 9);
        this.config.numRotateSteps = confine(this.config.numRotateSteps, 1, 90);
        // clear internal state
        this.pieces.clear();
        this.composites.clear();
        this.drawingStack = [];
        // final step: load image to be used
        this.imageSource = new Image();
        this.imageSource.src = this.imageURL;
        return this.imageSource.decode().then(( ) => {
            return this.createParts();
        });
    }

    async createParts() {
        const details = this.details = {
            canvasWidth: this.canvas.width,
            canvasHeight: this.canvas.height,
            imageWidth: this.imageSource.width,
            imageHeight: this.imageSource.height,
            numPieces: this.config.numPieces,
            minPieceSize: this.config.minPieceSize,
            bedToCanvasRatio: this.config.bedToCanvasRatio,
        };
        this.computeSizes(details);
        // empty drawing stack
        this.pieces.clear();
        this.composites.clear();
        this.drawingStack = [];
        // create the image that will be used as source for the puzzle parts
        this.prepareImage(details);
        // create workarea
        this.bedTile = PuzzleBed.create(this,
            details.canvasWidth / 2,
            details.canvasHeight / 2,
            details.bedWidth,
            details.bedHeight
        );
        this.drawingStack.push(this.bedTile);
        // generate pieces
        return this.createPieces(details).then(( ) => {
            for ( const piece of this.pieces.values() ) {
                this.drawingStack.push(piece);
            }
            // create preview tile
            this.previewTile = PuzzlePreview.create(this.imageCanvas);
            this.previewTile.setDisplayPos(details.canvasWidth / 2, details.canvasHeight / 2);
            this.drawingStack.push(this.previewTile);
        })
    }

    async createPieces(details) {
        const {
            canvasWidth, canvasHeight,
            bedWidth, bedHeight,
            pieceWidth, pieceHeight,
            minPieceSize,
        } = details;
        const bedOffset = {
            x: (canvasWidth - bedWidth) / 2,
            y: (canvasHeight - bedHeight) / 2,
        };
        let module;
        switch ( this.config.cut ) {
        case 'hexagon':
            module = await import('./tesselations/hexagon.js');
            break;
        case 'square':
            module = await import('./tesselations/square.js');
            break;
        }
        const { numRotateSteps } = this.config;
        const attachmentStraight = Attachment.create(Attachment.stock.straight);
        const minDistance = maxFn(
            minFn(pieceWidth * 0.4, pieceHeight * 0.4),
            minPieceSize * 0.25
        );
        const attachmentRandomizer = new AttachmentRandomizer(
            Attachment.stock[this.config.attachment],
            { minDistance }
        );
        const tesselation = module.tesselate(details, this.config);
        const sides = new Map();
        for ( const tile of tesselation.tiles.values() ) {
            const polygonSides = [];
            let hasEdge = false;
            for ( const { edgeId, flip } of tile.edgeIds ) {
                const edge = tesselation.edges.get(edgeId);
                if ( sides.has(edgeId) ) {
                   polygonSides.push(sides.get(edgeId).complement());
                   continue;
                }
                const sideargs = flip
                    ? { ptA: edge.b, ptB: edge.a }
                    : { ptA: edge.a, ptB: edge.b };
                const isEdge = edge.tiles.length === 1;
                if ( isEdge ) { hasEdge = true; }
                sideargs.edge = isEdge;
                sideargs.attachmentNormalized = isEdge
                    ? attachmentStraight
                    : attachmentRandomizer.randomize(edge.a, edge.b);
                const side = Side.create(sideargs);
                sides.set(edgeId, side);
                polygonSides.push(side);
            }
            const polygon = Polygon.create(polygonSides);
            const piece = PuzzlePiece.create(this.imageCanvas, polygon, {
                id: tile.id,
                offset: bedOffset,
                numRotateSteps,
            });
            piece.edge = hasEdge;
            this.pieces.set(piece.id, piece);
        }
    }

    resizePuzzle() {
        const canvasRect = this.canvasParent.getBoundingClientRect();
        const { width, height } = canvasRect;
        if ( width === this.details.canvasWidth ) {
            if ( height === this.details.canvasHeight ) { return; }
        }
        const newDetails = Object.assign({}, this.details);
        newDetails.canvasWidth = width;
        newDetails.canvasHeight = height;
        this.computeSizes(newDetails, { preserveNumPieces: true });
        const { bedWidth, canvasWidth, canvasHeight } = newDetails;
        const partScale = bedWidth / this.details.bedWidth;
        const posScaleX = canvasWidth / this.details.canvasWidth / partScale;
        const posScaleY = canvasHeight / this.details.canvasHeight / partScale;
        this.details = newDetails;
        // adjust canvas to new size
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        // regenerate source image
        this.prepareImage(newDetails);
        // scale parts and position of parts
        const canvasBbox = Bbox.create(0, 0, canvasWidth, canvasHeight);
        for ( const part of this.drawingStack ) {
            part.resize(partScale, this.imageCanvas);
            const partPos = part.getDisplayPos().clone();
            partPos.x *= posScaleX;
            partPos.y *= posScaleY;
            const confinedPos = Point.create(partPos);
            confinedPos.confine(canvasBbox);
            part.setDisplayPos(confinedPos);
        }
        this.draw();
    }

    shuffle() {
        if ( this.pieces.size <= 1 ) { return; }
        // canvas width/height
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        // workarea width/height
        const ww = this.imageCanvas.width;
        const wh = this.imageCanvas.height;
        // border width/height
        const bw = roundFn((cw - ww) / 2);
        const bh = roundFn((ch - wh) / 2);
        // piece width/height
        const mw = roundFn(this.details.pieceWidth / 2.25);
        const mh = roundFn(this.details.pieceHeight / 2.25);
        // workarea box
        // list of boxes where pieces can go
        const borderVertices = [];
        if ( bw > bh ) {
            borderVertices.push(
                bw, 0, cw - bw, bh,
                cw - bw, 0, cw, ch,
                bw, ch - bh, cw - bw, ch,
                0, 0, bw, ch,
            );
        } else {
            borderVertices.push(
                0, 0, cw, bh,
                cw - bw, bh, cw, ch - bh,
                0, ch - bh, cw, ch,
                0, bh, bw, ch - bh,
            );
        }
        const regions = [];
        let area = 0, extent = 0;
        for ( let i = 0; i < borderVertices.length; i += 4 ) {
            const bbox = Bbox.create(...borderVertices.slice(i, i + 4));
            bbox.shrink(mw, mh);
            area = bbox.width * bbox.height;
            if ( area > 0 ) {
                regions.push({ l: extent, h: extent + area, bbox });
                extent += area;
            }
        }
        for ( const part of this.drawingStack ) {
            if ( part.hidden ) { continue; }
            if ( part.piece !== true ) { continue; }
            if ( part.isComposite() ) { continue; }
            let linearPos = randFn() * extent;
            for ( const region of regions ) {
                if ( linearPos > region.h ) { continue; }
                linearPos -= region.l;
                const x = region.bbox.tl.x + roundFn(linearPos % region.bbox.width);
                const y = region.bbox.tl.y + roundFn(linearPos / region.bbox.width);
                part.setDisplayPos(x, y);
                if ( this.config.numRotateSteps > 1 ) {
                    part.setAngleStep(
                        roundFn(randFn() * this.config.numRotateSteps),
                        this.config.numRotateSteps
                    );
                }
                break;
            }
        }
        this.shuffleZ();
    }

    shuffleZ() {
        let l = this.drawingStack.findIndex(a => a.piece);
        if ( l === -1 ) { l = 0; }
        let h = this.drawingStack.findLastIndex(a => a.piece !== true);
        if ( h === -1 ) { h = this.drawingStack.length; }
        const n = h - l;
        for ( let i = l; i < h; i++ ) {
            const j = floorFn(randFn() * n) + l;
            const t = this.drawingStack[i];
            this.drawingStack[i] = this.drawingStack[j];
            this.drawingStack[j] = t;
        }
    }

    movePart(part, x, y) {
        const drawBbox = part.getDisplayBbox().clone();
        const canvasBbox = Bbox.create(0, 0, this.canvas.width, this.canvas.height);
        const confinedPos = Point.create(x, y);
        confinedPos.confine(canvasBbox);
        part.setDisplayPos(confinedPos);
        if ( part.edge ) {
            this.snapPartToBed(part);
        }
        drawBbox.union(part.getDisplayBbox());
        this.draw(drawBbox);
    }

    drawBackground(ctx, clip) {
        ctx.fillStyle = this.backgroundPattern || this.config.backgroundColor;
        if ( clip ) {
            ctx.fill();
        } else {
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    draw(clip) {
        const ctx = this.canvas.getContext('2d');
        ctx.save();
        // comment out to verify minimal redrawing
        //ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // draw only what intersect with clip region
        if ( clip ) {
            ctx.beginPath();
            clip.grow(1).quantize().toCanvasPath(ctx);
            ctx.clip();
        }
        this.drawBackground(ctx, clip);
        // stack drawn from bottom to top
        for ( const part of this.drawingStack ) {
            if ( part.hidden ) { continue; }
            if ( clip && part.doesIntersect(clip) === false ) { continue; }
            part.draw(ctx);
        }
        ctx.restore();
    }

    getNumPieces() {
        return this.pieces.size;
    }

    getAllPieces() {
        return this.drawingStack.filter(a => a.piece);
    }

    // merge two puzzle pieces
    mergePieces(id, others) {
        const parts = [];
        for ( const otherId of others ) {
            parts.push(this.pieces.get(otherId));
            this.pieces.delete(otherId);
        }
        const piece = this.pieces.get(id);
        piece.merge(parts);
        this.composites.set(id, piece);
    }

    partUnderPoint(p) {
        const stack = this.drawingStack;
        let iPart = stack.length;
        while ( iPart-- ) {
            const part = stack[iPart];
            if ( part.hidden ) { continue; }
            if ( part.pointIn(p) === false ) { continue; }
            return part;
        }
        return null;
    }

    sendBack(part) {
        if ( part instanceof PuzzlePart === false ) { return false; }
        const i = this.drawingStack.indexOf(part);
        if ( i < 0 ) { return false; }
        this.drawingStack.splice(i, 1);
        // insert above the last non-piece part at the beginning
        const j = this.drawingStack.findIndex(a => a.piece);
        if ( j !== -1 ) {
            this.drawingStack.splice(j, 0, part);
        } else {
            this.drawingStack.unshift();
        }
        return true;
    }

    sendTop(part) {
        if ( part instanceof PuzzlePart === false ) { return false; }
        const i = this.drawingStack.indexOf(part);
        if ( i >= this.drawingStack.length - 2 ) { return false; }
        this.drawingStack.splice(i, 1);
        // insert below the first non-piece part at the end
        const j = this.drawingStack.findLastIndex(a => a.piece !== true);
        if ( j !== -1 ) {
            this.drawingStack.splice(j, 0, part);
        } else {
            this.drawingStack.push(part);
        }
        return true;
    }

    // whether the puzzle is all solved
    isSolved() {
        if ( this.composites.size !== 1 ) { return false; }
        const part = this.composites.values().next().value;
        return part.composite.length === this.pieces.size;
    }

    // mark puzzle as changed
    markAsDirty() {
        this.dirty = true;
    }

    // parse puzzle key
    parseKey(key) {
        if ( !key || !key.length ) { return {}; }
        // split attributes-clusters
        const streamParts = key.split('--');
        // parse attributes and create puzzle
        if ( streamParts.length === 0 ) { return {}; }
        const r = JSON.parse(atob(streamParts[0]));
        // parse clusters
        if ( streamParts.length === 1 ) { return r; }
        r.clusters = [];
        const clusters = streamParts[1].split('-');
        for ( const cluster of clusters ) {
            r.clusters.push(JSON.parse(atob(cluster)));
        }
        return r;
    }

    // check whether a piece snaps onto another one
    snapPiece(target) {
        const pieceCount = this.drawingStack.length;
        for (;;) {
            const beforeCount = this.drawingStack.length;
            const targetBbox = target.getBbox().clone();
            const { snapDistance } = this.config;
            targetBbox.grow(snapDistance);
            for ( const part of this.drawingStack ) {
                // skip self
                if ( part === target ) { continue; }
                // consider only puzzle piece (leaving other puzzle parts)
                if ( part.piece !== true ) { continue; }
                // ignore hidden piece
                if ( part.hidden ) { continue; }
                // angle must be same
                if ( part.getAngleStep() !== target.getAngleStep() ) { continue; }
                // coarse test
                if ( !targetBbox.doesIntersect(part.getBbox()) ) { continue; }
                // test if it's a match
                if ( !part.snapPiece(target, snapDistance) ) { continue; }
                // pieces fit together
                // remember which pieces are clustered together, for persistence
                this.composites.set(part.id, part);
                this.composites.delete(target.id);
                // get rid of merged piece
                const i = this.drawingStack.indexOf(target);
                if ( i >= 0 ) {
                    this.drawingStack.splice(i, 1);
                }
                target = part;
            }
            if ( this.drawingStack.length === beforeCount ) { break; }
        }
        if ( this.drawingStack.length === pieceCount ) { return false; }
        this.snapPartToBed(target);
        this.draw();
        return true;
    }

    snapPartToBed(part) {
        if ( part.angleRadians !== 0 ) {
            if ( epsilonEq(part.angleRadians % PIover4, 0) === false ) {
                return false;
            }
        }
        const pos = part.getDisplayPos();
        const partBox = part.getBbox();
        const bedBox = this.bedTile.getBbox();
        const { snapDistance } = this.config;
        let dx, dy;
        for ( const side of part.displayPolygon.sides ) {
            if ( side.edge !== true ) { continue; }
            const sideBox = side.getBbox();
            const { x: ax, y: ay } = sideBox.tl;
            const { x: bx, y: by } = sideBox.br;
            if ( dx === undefined && absFn(ax - bx) < 1.1 ) {
                if ( epsilonEq(ax, partBox.tl.x) && absFn(ax - bedBox.tl.x) <= snapDistance ) {
                    dx = bedBox.tl.x - ax;
                } else if ( epsilonEq(bx, partBox.br.x) && absFn(bx - bedBox.br.x) <= snapDistance ) {
                    dx = bedBox.br.x - bx;
                }
            } else if ( dy === undefined && absFn(ay - by) < 1.1 ) {
                if ( epsilonEq(ay, partBox.tl.y) && absFn(ay - bedBox.tl.y) <= snapDistance ) {
                    dy = bedBox.tl.y - ay;
                } else if ( epsilonEq(by, partBox.br.y) && absFn(by - bedBox.br.y) <= snapDistance ) {
                    dy = bedBox.br.y - by;
                }
            }
            if ( dx !== undefined && dy !== undefined ) { break; }
        }
        if ( dx === undefined && dy === undefined ) { return false; }
        part.setDisplayPos(pos.x + (dx || 0), pos.y + (dy || 0));
        return true;
    }

    async setBackground(color, pattern = '') {
        if ( color !== this.config.backgroundColor ) {
            this.config.backgroundColor = color;
            this.backgroundPattern = null;
        }
        if ( pattern !== this.config.backgroundPattern ) {
            this.config.backgroundPattern = pattern;
            this.backgroundPattern = null;
        }
        if ( this.config.backgroundPattern === '' ) { return; }
        if ( this.backgroundPattern ) { return; }
        const image = new Image();
        image.src = pattern;
        return image.decode().then(( ) => {
            const { naturalWidth, naturalHeight } = image;
            const backgroundCanvas = new OffscreenCanvas(naturalWidth, naturalHeight);
            let ctx = backgroundCanvas.getContext('2d');
            ctx.fillStyle = this.config.backgroundColor;
            ctx.fillRect(0, 0, naturalWidth, naturalHeight);
            ctx.globalAlpha = 0.08;
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(image, 0, 0, naturalWidth, naturalHeight);
            ctx = this.canvas.getContext('2d');
            this.backgroundPattern = ctx.createPattern(backgroundCanvas, 'repeat');
        });
    }

    serialize() {
        return {
            config: this.config,
            imageURL: this.imageURL,
            details: this.details,
            bedTile: this.bedTile.serialize(),
            previewTile: this.previewTile.serialize(),
            pieces: Array.from(this.pieces.values()).map(a => a.serialize()),
            composites: Array.from(this.composites.keys()),
            drawingStack: this.drawingStack.map(a => a.id),
        };
    }

    static async deserialize(parent, data) {
        const puzzle = new Puzzle(parent);
        if ( data instanceof Object === false ) { return; }
        puzzle.config = data.config;
        puzzle.imageURL = data.imageURL;
        puzzle.details = data.details;
        puzzle.imageSource = new Image();
        puzzle.imageSource.src = puzzle.imageURL;
        return puzzle.setBackground(
            puzzle.config.backgroundColor,
            puzzle.config.backgroundPattern
        ).then(( ) =>
            puzzle.imageSource.decode()
        ).then(( ) => {
            puzzle.prepareImage(puzzle.details);
            puzzle.bedTile = PuzzleBed.deserialize(puzzle, data.bedTile);
            puzzle.drawingStack.push(puzzle.bedTile);
            puzzle.previewTile = PuzzlePreview.deserialize(data.previewTile, puzzle.imageCanvas);
            puzzle.pieces = new Map(data.pieces
                .map(a => PuzzlePiece.deserialize(puzzle.imageCanvas, a))
                .map(a => [ a.id, a ])
            );
            for ( const id of data.composites ) {
                puzzle.composites.set(id, puzzle.pieces.get(id));
            }
            for ( const id of data.drawingStack ) {
                const piece = puzzle.pieces.get(id);
                if ( piece === undefined ) { continue; }
                puzzle.drawingStack.push(piece);
            }
            puzzle.drawingStack.push(puzzle.previewTile);
            return puzzle;
        }).catch(( ) => { });
    }

    static async create(parent) {
        return new Puzzle(parent);
    }
}

/******************************************************************************/

