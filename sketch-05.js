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

let glyph = 'K';

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

  return ({ context, width, height }) => {

    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    const cell = params.cell;
    const cols = Math.floor(width / cell);
    const rows = Math.floor(height / cell);

    let startingDot = [width / 2, height /2, 255];
    if (targetDots === null) {
        targetDots = getGlyphDots(glyph, rows, cols, cell);
        sourceDots = targetDots.map(() => startingDot.concat());
        dotSpeeds = targetDots.map(() => random.range(params.speed.min, params.speed.max));
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

    let isFinished = true;

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

    if (isFinished) {
        console.log('all finished');
        targetDots = null;
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
