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

let message = "Hello";
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
  let dotSpeeds = null;
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

    if (targetDots === null) {
        previousGlyph = glyph;
        glyph = message[nextCharacter];
        nextCharacter = (nextCharacter + 1) % message.length;
        console.log(`Next Transition: ${previousGlyph} => ${glyph}`);
        targetDots = getGlyphDots(glyph, rows, cols, cell);
        if (previousGlyph !== null) {
            sourceDots = getGlyphDots(previousGlyph, rows, cols, cell);
        } else {
            sourceDots = targetDots.map((dot) => [
                random.rangeFloor(-width, 2 * width),
                random.rangeFloor(-height, 2 * height),
                dot[2]]
            );
            if (sourceDots.length !== targetDots.length) {
                waiting = true;
                throw Error(`1. ${sourceDots.length} != ${targetDots.length}`);
            }
        }
        matchDots(sourceDots, targetDots);
        if (sourceDots.length !== targetDots.length) {
            waiting = true;
            throw Error(`2. ${sourceDots.length} != ${targetDots.length}`);
        }
        dotSpeeds = targetDots.map(() => random.range(params.speed.min, params.speed.max));
    }

    if (sourceDots.length !== targetDots.length) {
        waiting = true;
        throw Error(`3. ${sourceDots.length} != ${targetDots.length}`);
    }

    // Draw all the source dots...
    for (let dot of sourceDots) {
        const [x, y, v] = dot;
        context.fillStyle = `rgb(${v}, ${v}, ${v})`;

        context.save();
        context.translate(x, y);
        context.beginPath()
        context.arc(cell/2, cell/2, cell * params.radius, 0, 2 * Math.PI);
        context.fill();
        context.restore();
    }

    isFinished = true;

    if (sourceDots.length !== targetDots.length) {
        waiting = true;
        throw Error(`4. ${sourceDots.length} != ${targetDots.length}`);
    }

    // Move them toward their target positions and values.
    for (let i = 0; i < sourceDots.length; i++) {
        const sourceDot = sourceDots[i];
        const targetDot = targetDots[i];

        if (sourceDot === targetDot) {
            continue;
        }

        isFinished = false;
        let dx = targetDot[0] - sourceDot[0];
        let dy = targetDot[1] - sourceDot[1];
        sourceDot[2] = 0.99 * sourceDot[2] + 0.01 * targetDot[2];
        const dist = Math.sqrt(dx ** 2 + dy ** 2);

        if (dist <= dotSpeeds[i]) {
            sourceDots[i] = targetDot;
        } else {
            dx = dx / dist * Math.min(dotSpeeds[i], dist);
            dy = dy / dist * Math.min(dotSpeeds[i], dist);
            sourceDot[0] = sourceDot[0] + dx;
            sourceDot[1] = sourceDot[1] + dy;
        }
    }
    
    if (sourceDots.length !== targetDots.length) {
        throw Error(`3. ${sourceDots.length} != ${targetDots.length}`);
    }

    if (isFinished) {
        waiting = true;
        targetDots = null;
        sourceDots = null;
        console.log('all finished');
        setTimeout(() => {
            waiting = false;
        }, 3000);
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

// Modify the sourceDots and targetDots array so that
// 1. They are the same size (equal to the larger of the two dimensions).
// 2. The nearest source and target dots are at the same index.
function matchDots(sourceDots, targetDots) {
    let targetsUsed = new Set();
    let matches = new Map();

    // Function is symetrical - assume the source array
    // is not longer than the target one - otherwise
    // verse the arguments.
    if (targetDots.length < sourceDots.length) {
        return matchDots(targetDots, sourceDots);
    }

    // Loop through shorter list, matching with best matches from
    // the longer one.
    for (let i = 0; i < sourceDots.length; i++) {
        let j = closestMatch(sourceDots[i], targetDots);
        matches.set(sourceDots[i], j);
        targetsUsed.add(j);
    }

    let addedDots = [];

    // Now make duplicate entries from the source list
    // to match nearest targets.
    for (let j = 0; j < targetDots.length; j++) {
        if (targetsUsed.has(j)) {
            continue;
        }
        let i = closestMatch(targetDots[j], sourceDots);
        let newSource = sourceDots[i].concat();
        addedDots.push(newSource);
        matches.set(newSource, j);
    }

    if (sourceDots.length + addedDots.length !== targetDots.length) {
        throw Error('MATCHES ERROR');
    }

    extend(sourceDots, addedDots);

    // Rearrange the all sourceDots in targetDots order.
    sourceDots.sort((a, b) => {
        return matches.get(a) - matches.get(b);
    });
}

// Find the "nearest" counterpart dot from the target set.
function closestMatch(dot, targetDots) {
    return findMax(dot, targetDots, (dot, other) => {
        return -dotDistance(dot, other);
    });
}

function dotDistance(dot1, dot2) {
    return Math.sqrt(
        (dot1[0] - dot2[0]) ** 2 +
        (dot1[1] - dot2[1]) ** 2 +
        (dot1[2] - dot2[2]) ** 2 * 4);
}

function findMax(v, a, scoreFunc) {
    let bestScore = undefined;
    let best = -1;

    for (let i = 0; i < a.length; i++) {
        let score = scoreFunc(v, a[i]);
        if (bestScore === undefined || score > bestScore) {
            bestScore = score;
            best = i;
        }
    }
    return best;
}

function extend(a, b) {
    for (let item of b) {
        a.push(item);
    }
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

function testMatchDots() {
    console.log("Begin matchDots Test");

    let empty1 = [];
    let empty2 = [];
    matchDots(empty1, empty2);
    console.assert(empty1.length === 0, "empty1 0");
    console.assert(empty2.length === 0, "empty2 0");

    let square = [[-1, -1, 0], [-1, 1, 0], [1, 1, 0], [1, -1, 0]];

    let origin = [[0, 0, 0]];
    matchDots(origin, square);
    console.assert(origin.length === 4, `origin expanded to 4 elements (not ${origin.length})`);
    for (let dot of origin) {
        console.assert(dot[0] === 0 && dot[1] === 0, `${dot}`)
    }

    let pair = [[-5, 0, 0], [5, 0, 0]];
    matchDots(pair, square);
    console.assert(pair.length === 4, `pair ${pair.length}`);
    console.assert(pair[0][0] === -5 && pair[1][0] === -5, `${pair}`);

    let rotatedSquare = square.map((dot) => rotateDot(dot, Math.PI/2));

    matchDots(square, rotatedSquare);
    console.assert(square[0][0] === 1, `${square}`);

    console.log("End matchDots Test");
}

function rotateDot(dot, angle) {
    let x = dot[0] * Math.cos(angle) - dot[1] * Math.sin(angle);
    let y = dot[0] * Math.sin(angle) + dot[1] * Math.cos(angle);
    return [x, y, dot[2]];
}

// testDotDistance();
// testClosestMatch();
// testMatchDots();

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
