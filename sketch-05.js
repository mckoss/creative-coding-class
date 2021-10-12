const canvasSketch = require('canvas-sketch');
const math = require('canvas-sketch-util/math');
const random = require('canvas-sketch-util/random');
import {Pane} from 'tweakpane';

import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
const interpolate = require('color-interpolate');

const settings = {
  dimensions: [ 1080, 1080 ],
  animate: true
};

let manager;

const fontSize = 1080;
const fontFamily = 'Times';

let message = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let nextCharacter = 0;

const glyphCanvas = document.createElement('canvas');
const glyphContext = glyphCanvas.getContext('2d');

// Tweakpane parameters
const params = {
  speed: { min: 4, max: 8 },
  cell: 20,
  filter: { min: 0, max: 180 },
  radius: 0.45,
};

function createPane() {
  const pane = new Pane();
  pane.registerPlugin(EssentialsPlugin);

  const fParams = pane.addFolder({title: 'Params'});
  fParams.addInput(params, 'speed', {min: 1, max: 20});
  fParams.addInput(params, 'cell', { min: 5, max: 100, step: 1 });
  fParams.addInput(params, 'filter', { min: 0, max: 255, step: 1 });
  fParams.addInput(params, 'radius', { min: 0.05, max: 0.6 });

  pane.on('change', () => {
      manager.render();
  });
}

const sketch = ({width, height}) => {
  let targetDots = null;
  let sourceDots = null;
  let pairs = null;
  let isFinished = false;
  let waiting = false;
  let glyph = null;
  let previousGlyph = null;

  return ({ context, width, height }) => {
    if (waiting) {
        return true;
    }

    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    const cell = params.cell;
    const cols = Math.floor(width / cell);
    const rows = Math.floor(height / cell);

    if (pairs === null) {
        previousGlyph = glyph;
        glyph = message[nextCharacter];
        nextCharacter = (nextCharacter + 1) % message.length;
        targetDots = getGlyphDots(glyph, rows, cols, cell);
        if (previousGlyph !== null) {
            sourceDots = getGlyphDots(previousGlyph, rows, cols, cell);
        } else {
            sourceDots = getGlyphDots('+', rows, cols, cell);
        }
        pairs = pairDots(sourceDots, targetDots);
        console.log(`Next Transition: ${previousGlyph} (${sourceDots.length}) => ` +
                    `${glyph} (${targetDots.length}) (${pairs.length} pairs)`);
        for (let pair of pairs) {
            let sourceDot = sourceDots[pair.i];
            let targetDot = targetDots[pair.j];

            [pair.x, pair.y, pair.v] = sourceDot;
            pair.speed = random.range(params.speed.min, params.speed.max);

            // Pre-calculate step size
            pair.dx = targetDot[0] - sourceDot[0];
            pair.dy = targetDot[1] - sourceDot[1];
            const dist = Math.sqrt(pair.dx ** 2 + pair.dy ** 2);
            pair.dx *= pair.speed / dist;
            pair.dy *= pair.speed / dist;
        }
    }

    // Draw all the dots (some may overlap);
    for (let pair of pairs) {
        context.fillStyle = `rgb(${pair.v}, ${pair.v}, ${pair.v})`;

        context.save();
        context.translate(pair.x, pair.y);
        context.beginPath()
        context.arc(cell/2, cell/2, cell * params.radius, 0, 2 * Math.PI);
        context.fill();
        context.restore();
    }

    isFinished = true;

    // Move each pairing toward it's target positions and values.
    for (let pair of pairs) {
        if (pair.speed === 0) {
            continue;
        }

        const targetDot = targetDots[pair.j];
        
        isFinished = false;

        let dx = targetDot[0] - pair.x;
        let dy = targetDot[1] - pair.y;
        pair.v = 0.99 * pair.v + 0.01 * targetDot[2];
        const dist = Math.sqrt(dx ** 2 + dy ** 2);

        // Not possible to over-shoot.
        if (dist <= pair.speed) {
            [pair.x, pair.y, pair.v] = targetDot;
            pair.speed = 0;
        } else {
            pair.x += pair.dx;
            pair.y += pair.dy;
        }
    }
    
    if (isFinished) {
        waiting = true;
        pairs = null;
        targetDots = null;
        sourceDots = null;
        console.log('all finished');
        setTimeout(() => {
            waiting = false;
        }, 1000);
    }
  };
};

function getGlyphDots(glyph, rows, cols, cell) {
    // array of [x, y, value: 0 - 255]
    let results = [];

    glyphCanvas.width = cols;
    glyphCanvas.height = rows;

    glyphContext.fillStyle = 'white';
    glyphContext.fillRect(0, 0, cols, rows);

    glyphContext.fillStyle = 'black';
    glyphContext.font = `${cols}px ${fontFamily}`;

    const metrics = glyphContext.measureText(glyph);
    const mx = -metrics.actualBoundingBoxLeft;
    const my = -metrics.actualBoundingBoxAscent;
    const mw = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
    const mh = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    const x = cols/2 - mw/2 - mx;
    const y = rows/2 - mh/2 - my;

    glyphContext.save();
    glyphContext.translate(x, y);
    glyphContext.fillText(glyph, 0, 0);
    glyphContext.restore();

    // RGBA array - 4 bytes per pixel
    const glyphPixels = glyphContext.getImageData(0, 0, cols, rows).data;
    
    for (let i = 0; i < rows * cols; i++) {
        let col = i % cols;
        let row = Math.floor(i / cols);

        // const r = glyphPixels[4 * i];
        const g = glyphPixels[4 * i + 1];
        // const b = glyphPixels[4 * i + 2];
        // const a = glyphPixels[4 * i + 3];

        if (g >= params.filter.min && g <= params.filter.max) {
            results.push([col * cell, row * cell, g]);
        }
    }

    return results;
}

// Generating a mapping of source to target dots s.t.
// for each dot, it is paired with the closest other
// dot.  Note that dots may be paired with multiple other
// dots in the other set.
function pairDots(sourceDots, targetDots) {
    // N*M Array - Whoah - could get very big
    let pairings = [];
    for (let i = 0; i < sourceDots.length; i++) {
        for (let j = 0; j < targetDots.length; j++) {
            pairings.push({i, j, dist: dotDistance(sourceDots[i], targetDots[j])});
        }
    }

    pairings.sort((a, b) => a.dist - b.dist);

    let numPairs = Math.max(sourceDots.length, targetDots.length);

    let sourcesPaired = new Set();
    let targetsPaired = new Set();
    let results = [];

    for (let pair of pairings) {
        if (!sourcesPaired.has(pair.i) || !targetsPaired.has(pair.j)) {
            results.push(pair);
            sourcesPaired.add(pair.i);
            targetsPaired.add(pair.j);
        }
    }

    return results;
}

function dotDistance(dot1, dot2) {
    return Math.sqrt(
        (dot1[0] - dot2[0]) ** 2 +
        (dot1[1] - dot2[1]) ** 2 +
        (dot1[2] - dot2[2]) ** 2 * 4);
}

function testDotDistance() {
    console.log("Begin dotDistance test.");
    let dot1 = [0, 0, 0];
    let dot2 = [1, 0, 0];
    let dot3 = [0, 1, 0];
    let dot4 = [0, 0, 1];

    let tests = [
        [dot1, dot1, 0],
        [dot1, dot2, 1],
        [dot1, dot3, 1],
        [dot1, dot4, 2],
        [[-1, -1, 2], [-1, 1, 0], Math.sqrt(20)],
    ];

    for (let test of tests) {
        let d = dotDistance(test[0], test[1]);
        console.assert(Math.abs(d - test[2]) < 0.001, `dist(${test[0]}, ${test[1]}) was ${d} !== ${test[2]}`);
    }

    console.log("End dotDistanceTest");
}

function testClosestMatch() {
    console.log("Begin closestMatch Test");

    let square = [[-1, -1, 0], [-1, 1, 0], [1, 1, 0], [1, -1, 0]];
    let rotatedSquare = square.map((dot) => rotateDot(dot, Math.PI/5));

    for (let i = 0; i < square.length; i++) {
        let j = closestMatch(square[i], rotatedSquare);
        console.assert(j === i, `PI/5: ${square[i]} ${j} != ${i}`);
    }

    rotatedSquare = square.map((dot) => rotateDot(dot, Math.PI/2));

    for (let i = 0; i < square.length; i++) {
        let j = closestMatch(square[i], rotatedSquare);
        console.assert(j === (i + 1) % 4, `PI/2: ${square[i]} ${j} != ${i}`);
    }

    rotatedSquare = square.map((dot) => rotateDot(dot, Math.PI));

    for (let i = 0; i < square.length; i++) {
        let j = closestMatch(square[i], rotatedSquare);
        console.assert(j === (i + 2) % 4, `PI/2: ${square[i]} ${j} != ${i}`);
    }

    let coloredSquare = [[-1, -1, 2], [-1, 1, 0], [1, 1, 0], [1, -1, 0]];
    rotatedSquare = coloredSquare.map((dot) => rotateDot(dot, Math.PI/2));
    let expected = [0, 2, 3, 1];

    for (let i = 0; i < coloredSquare.length; i++) {
        let j = closestMatch(coloredSquare[i], rotatedSquare);
        console.assert(j === expected[i], `PI/2-colored: ${square[i]} ${j} != ${expected[i]}`);
    }

    console.log("End closestMatch Test");
}

function testPairDots() {
    console.log("Begin pairDots Test");

    let empty1 = [];
    let empty2 = [];
    let pairs = pairDots(empty1, empty2);
    console.assert(pairs.length === 0, "empty pairs");

    let square = [[-1, -1, 0], [-1, 1, 0], [1, 1, 0], [1, -1, 0]];

    let origin = [[0, 0, 0]];
    pairs = pairDots(origin, square);
    console.assert(pairsString(pairs) === '[{"i":0,"j":0},{"i":0,"j":1},{"i":0,"j":2},{"i":0,"j":3}]', `${pairs}`);

    let pair = [[-5, 0, 0], [5, 0, 0]];
    pairs = pairDots(pair, square);
    console.assert(pairs.length === 4, `pair ${pairs.length}`);
    console.assert(pairsString(pairs) === '[{"i":0,"j":0},{"i":0,"j":1},{"i":1,"j":2},{"i":1,"j":3}]', `${pairs}`);

    let rotatedSquare = square.map((dot) => rotateDot(dot, Math.PI/2));

    pairs = pairDots(square, rotatedSquare);
    console.assert(pairsString(pairs) === '[{"i":0,"j":1},{"i":1,"j":2},{"i":2,"j":3},{"i":3,"j":0}]', `${pairs}`);

    console.log("End pairDots Test");
}

function rotateDot(dot, angle) {
    let x = dot[0] * Math.cos(angle) - dot[1] * Math.sin(angle);
    let y = dot[0] * Math.sin(angle) + dot[1] * Math.cos(angle);
    return [x, y, dot[2]];
}

function pairsString(pairs) {
    return JSON.stringify(pairs.map((pair) => {
        let { i, j } = pair;
        return { i, j };
    }));
}

testDotDistance();
testPairDots();

async function start() {
    manager = await canvasSketch(sketch, settings);
}

document.addEventListener('keyup', (e) => {
    if (e.keyCode > 32 && !e.ctrlKey) {
        glyph = e.key;
        manager.render();
    }
});

createPane();
start();
