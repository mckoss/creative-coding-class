import math from 'canvas-sketch-util/math';
import random from 'canvas-sketch-util/random';
import interpolate from 'color-interpolate';
import {Pane} from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

const name = "Wobbly Lines";
export { name, sketch, createPane };

const params = {
  speed: 10,
  rows: 10,
  cols: 10,
  scale: { min: 1, max: 30},
  length: 0.8,
  lineCap: 'butt',
  colorStart: 'rgb(255, 0, 0)',
  colorEnd: 'rgb(0, 0, 255)',

  freq: 0.002,
  amp: 0.2,
}

function createPane(container) {
  const pane = new Pane({container});
  pane.registerPlugin(EssentialsPlugin);

  const fParams = pane.addFolder({title: 'Grid'});
  fParams.addInput(params, 'speed');
  fParams.addInput(params, 'lineCap', { options: {
    butt: 'butt', square: 'square', round: 'round'
  }});
  fParams.addInput(params, 'colorStart');
  fParams.addInput(params, 'colorEnd');
  fParams.addInput(params, 'length', { min: 0.1, max: 1 });
  fParams.addInput(params, 'rows', { min:2, max: 50, step: 1 });
  fParams.addInput(params, 'cols', { min:2, max: 50, step: 1 });
  fParams.addInput(params, 'scale', { min: 1, max: 100, step: 1 });

  const fNoise = pane.addFolder({title: 'Noise'});
  fNoise.addInput(params, 'freq', { min: 0, max: 0.02 });
  fNoise.addInput(params, 'amp', { min: 0, max: 1 });
}

const sketch = ({width, height}) => {
    return ({ context, width, height, frame }) => {
        const COLS = params.cols;
        const ROWS = params.rows;
        const CELLS = ROWS * COLS;

        const gridWidth = width * 0.8;
        const gridHeight = height * 0.8;

        const cellWidth = gridWidth / COLS;
        const cellHeight = gridHeight / ROWS;

        const marginX = (width - gridWidth) / 2;
        const marginY = (height - gridHeight) / 2;

        context.fillStyle = 'beige';
        context.lineCap = params.lineCap;
        context.lineWidth = 4;
        context.fillRect(0, 0, width, height);

        context.translate(marginX, marginY);

        const colormap = interpolate([params.colorStart, params.colorEnd]);

        for (let i = 0; i < CELLS; i++) {
            let col = i % COLS;
            let row = Math.floor(i / COLS);

            const x = col * cellWidth;
            const y = row * cellHeight;

            const noise = random.noise3D(x, y, frame * params.speed, params.freq);
            const rot = math.mapRange(noise, -1, 1, -params.amp * Math.PI, params.amp * Math.PI);
            const scale = math.mapRange(noise, -1, 1, params.scale.min, params.scale.max);
            const grad = math.mapRange(noise, -1, 1, 0, 1);

            context.lineWidth = scale;
            context.strokeStyle = colormap(grad);

            const w = cellWidth * params.length;

            context.save()
            context.translate(x + cellWidth/2, y + cellHeight/2);
            context.rotate(rot);
            context.beginPath();
            context.moveTo(-w / 2, 0);
            context.lineTo(w / 2, 0);
            context.stroke();
            context.restore();
        }
    };
};

