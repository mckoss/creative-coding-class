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

let message = ['C', 'O', 'V', 'I', 'D', '\u{1F571}'];
let nextCharacter = 0;

const glyphCanvas = document.createElement('canvas');
const glyphContext = glyphCanvas.getContext('2d');

// Tweakpane parameters
const params = {
  speed: { min: 4, max: 8 },
  cell: 20,
  filter: { min: 0, max: 180 },
  radius: 0.45,
  minimalPairs: true,
  inverse: false,

  infection: false,
  infectNeighbors: 0.1,
  fatalities: 0.02,
};

let infectedSource = null;
let infectedTarget = null;

function createPane() {
  const pane = new Pane();
  pane.registerPlugin(EssentialsPlugin);

  const fParams = pane.addFolder({title: 'Params'});
  fParams.addInput(params, 'speed', {min: 1, max: 20});
  fParams.addInput(params, 'cell', { min: 5, max: 100, step: 1 });
  fParams.addInput(params, 'filter', { min: 0, max: 255, step: 1 });
  fParams.addInput(params, 'radius', { min: 0.05, max: 0.6 });
  fParams.addInput(params, 'minimalPairs');
  fParams.addInput(params, 'inverse');

  fParams.addInput(params, 'infection').on('change', (e) => {
      if (e.value === true) {
          console.log("Resetting infection Set");
          infectedSource = new Map();
          infectedTarget = new Map();
      }
  });
  fParams.addInput(params, 'infectNeighbors', {min: 0, max: 1});
  fParams.addInput(params, 'fatalities', {min: 0, max: 0.2});

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

    context.fillStyle = params.inverse ? 'black' : 'white';
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
        if (params.infection) {
            // Start off with a single infected dot.
            if (infectedSource.size === 0) {
                let i = random.rangeFloor(0, sourceDots.length);
                infectedSource.set(i, 1);
            }
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
            if (dist >= 1) {
                pair.dx *= pair.speed / dist;
                pair.dy *= pair.speed / dist;
            }
        }

        // Propagate the infection age to one target for each source.
        // All others get age==1 infection.
        // Two sources hitting the same target should keep target at max
        // of source ages.
        if (params.infection) {
            for (let pair of pairs) {
                if (infectedSource.has(pair.i)) {
                    let age = infectedTarget.get(pair.j) || 0;
                    age = Math.max(age, infectedSource.get(pair.i) + 1);
                    infectedTarget.set(pair.j, age);
                }
            }

            // Need to be able to look up neighbors in constant time.
            let targetIndexFromPos = new Map();
            for (let j = 0; j < targetDots.length; j++) {
                let dot = targetDots[j];
                targetIndexFromPos.set(`${dot[0]}-${dot[1]}`, j);
            }

            // Propagate infection to neighbors with some probability.
            for (let j = 0; j < targetDots.length; j++) {
                if (!infectedTarget.has(j) || infectedTarget.get(j) >= deadAge) {
                    continue;
                }

                let [x, y] = targetDots[j];

                for (let [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
                    if (random.value() > params.infectNeighbors) {
                        continue;
                    }

                    let k = targetIndexFromPos.get(`${x + dx * cell}-${y + dy * cell}`);
                    if (k !== undefined && !infectedTarget.has(k)) {
                        console.log(`Infecting ${k} => ${targetDots[k]}`)
                        infectedTarget.set(k, 1);
                    }
                }
            }

            // Determine who lives and who dies!
            for (let j = 0; j < targetDots.length; j++) {
                let age = infectedTarget.get(j) || 0;
                if (age !== recoveryAge) {
                    continue;
                }

                if (random.value() < params.fatalities) {
                    console.log(`${j} died!`);
                    infectedTarget.set(j, deadAge);
                } else {
                    infectedTarget.set(j, recoveryAge + 1);
                }
            }

            console.log(`Infections: ${infectedSource.size} => ${infectedTarget.size}`);
        }
    }

    // Draw all the dots (some may overlap);
    for (let pair of pairs) {
        let age = 0;
        if (params.infection) {
            age = getInfectionAge(pair);
        }
        context.fillStyle = getPairColor(age, pair);

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
        if (params.infection) {
            // Infection carries over to next animation.
            infectedSource = infectedTarget;
            infectedTarget = new Map();
            console.log(infectedSource);
        }
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

    glyphContext.fillStyle = params.inverse ? 'black' : 'white';
    glyphContext.fillRect(0, 0, cols, rows);

    glyphContext.fillStyle = params.inverse ? 'white' : 'black';
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

    let sourceDegree = new Map();
    let targetDegree = new Map();
    let results = [];

    // Add pairings for any dot that doesn't have any yet.
    // Only allow matches with both sides unmatched UNTIL
    // all the items in the smaller set are matched.  Then
    // all branching over elements in the smaller set.
    let singletons = Math.min(sourceDots.length, targetDots.length);
    for (let pair of pairings) {
        if (params.minimalPairs) {
            if (singletons > 0) {
                if (sourceDegree.has(pair.i) || targetDegree.has(pair.j)) {
                    continue;
                }
                singletons--;
            }
        }
        if (sourceDegree.has(pair.i) && targetDegree.has(pair.j)) {
            continue;
        }
        results.push(pair);
        incMap(sourceDegree, pair.i);
        incMap(targetDegree, pair.j);
    }

    let redundant = 0;

    // Remove redundant pairings - dots with more than one
    // pairing on both sides of a pair.
    for (let i = results.length - 1; i >= 0; i--) {
        let pair = results[i];
        // Pairing is redundant!
        if (sourceDegree.get(pair.i) > 1 && targetDegree.get(pair.j) > 1) {
            decMap(sourceDegree, pair.i);
            decMap(targetDegree, pair.j);
            results.splice(i, 1);
            redundant++;
        }
    }

    console.log(`Removed ${redundant} redundant pairs.`);

    return results;
}

function incMap(m, key) {
    let v = m.get(key) || 0;
    m.set(key, v + 1);
}

function decMap(m, key) {
    m.set(key, m.get(key) - 1);
}

function dotDistance(dot1, dot2) {
    return Math.sqrt(
        (dot1[0] - dot2[0]) ** 2 +
        (dot1[1] - dot2[1]) ** 2 +
        (dot1[2] - dot2[2]) ** 2 * 4);
}

function getInfectionAge(pair) {
    let age = infectedSource.get(pair.i) || 0;
    if (pair.speed === 0) {
        age = Math.max(age, infectedTarget.get(pair.j) || 0);
    }
    return age;
}

const recoveryAge = 30;
const deadAge = 10000;

const infectionBreaks = [
    { min: 1, color: `yellow` },
    { min: 2, color: `orange` },
    { min: 10, color: `red` },
    { min: recoveryAge, color: `blue` },
    { min: deadAge, color: `rgba(0, 0, 0, 0)`},
];

function getPairColor(age, pair) {
    let color = `rgb(${pair.v}, ${pair.v}, ${pair.v})`;

    if (age === 0) {
        return color;
    }

    for (let b of infectionBreaks) {
        if (age >= b.min) {
            color = b.color;
        }
    }

    return color;
}

// =============================== Tests ============================

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

function testPairDots() {
    console.log("Begin pairDots Test");

    let square = [[-1, -1, 0], [-1, 1, 0], [1, 1, 0], [1, -1, 0]];
    let origin = [[0, 0, 0]];
    let pair = [[-5, 0, 0], [5, 0, 0]];
    let rotatedSquare = square.map((dot) => rotateDot(dot, Math.PI/2));
    let slightlyRotatedSquare = square.map((dot) => rotateDot(dot, Math.PI/8));
    let source = [[0, 0, 0], [0, 1, 0]];
    let target = [[2, 1, 0], [2, 2, 0]];

    let tests = [
        [ [], [], '[]'],
        [ origin, square, '[{"i":0,"j":0},{"i":0,"j":1},{"i":0,"j":2},{"i":0,"j":3}]'],
        [ pair, square, '[{"i":0,"j":0},{"i":0,"j":1},{"i":1,"j":2},{"i":1,"j":3}]'],
        [ square, slightlyRotatedSquare, '[{"i":0,"j":0},{"i":1,"j":1},{"i":2,"j":2},{"i":3,"j":3}]'],
        [ square, rotatedSquare, '[{"i":0,"j":1},{"i":1,"j":2},{"i":2,"j":3},{"i":3,"j":0}]'],
        [ source, target, '[{"i":0,"j":0},{"i":1,"j":1}]'],

    ];

    for (let i = 0; i < tests.length; i++) {
        assertPairs(i, pairDots(tests[i][0], tests[i][1]), tests[i][2]);
    }

    params.minimalPairs = false;
    for (let i = 0; i < tests.length; i++) {
        assertPairs(i, pairDots(tests[i][0], tests[i][1]), tests[i][2]);
    }

    params.minimapPairs = true;

    console.log("End pairDots Test");

    function assertPairs(i, pairs, s) {
        console.assert(pairsString(pairs) === s, `Unexpected pairs (#${i + 1}):\n${pairsString(pairs)} !=\n${s}`);
    }

    function pairsString(pairs) {
        return JSON.stringify(pairs.map((pair) => {
            let { i, j } = pair;
            return { i, j };
        }));
    }
}

function rotateDot(dot, angle) {
    let x = dot[0] * Math.cos(angle) - dot[1] * Math.sin(angle);
    let y = dot[0] * Math.sin(angle) + dot[1] * Math.cos(angle);
    return [x, y, dot[2]];
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
