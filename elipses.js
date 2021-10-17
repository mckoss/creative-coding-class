import canvasSketch from 'canvas-sketch';
import math from 'canvas-sketch-util/math';
import random from 'canvas-sketch-util/random';
import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

const settings = {
  dimensions: [ 1024, 1024 ],
  animate: true
};

const params = {
  speed: 10,
  dots: 75,
  radius: 40,
};

function createPane() {
  const pane = new Pane();
  pane.registerPlugin(EssentialsPlugin);

  const fParams = pane.addFolder({title: 'Params'});
  fParams.addInput(params, 'speed', {min: -20, max: 20});
  fParams.addInput(params, 'dots', {min: 1, max: 400, step: 1});
  fParams.addInput(params, 'radius', {min: 2, max: 60});
}

const sketch = () => {
  let rot = 0;
  return ({ context, width, height }) => {
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    rot += Math.PI/32/60 * params.speed;

    const radius = width / 3;
    context.fillStyle = 'red';

    context.translate(width / 2, height / 2);

    context.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let {x, y, z} of fibPack(params.dots, radius, rot)) {
        if (z < 0) {
            continue;
        }
        context.save();
        transformSpherePoint(context, {x, y, z}, radius);
        context.beginPath();
        context.arc(0, 0, params.radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    context.fillStyle = 'rgba(255, 0, 0, 0.6)';
    for (let {x, y, z} of fibPack(params.dots, radius, rot)) {
        if (z > 0) {
            continue;
        }
        context.save();

        transformSpherePoint(context, {x, y, z}, radius);
        context.beginPath();
        context.arc(0, 0, params.radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
  };
};

// Packing n points around a sphere.
function *fibPack(n, radius, rot=0) {
  const phi = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < n; i++) {
    // i/n * -1 + (1 - i/n) * 1 == 
    const y = 1 - i / (n - 1) * 2;
    const r = Math.sqrt(1 - y * y);

    const theta = phi * i + rot;

    const x = r * Math.cos(theta) * radius;
    const z = r * Math.sin(theta) * radius;
    yield {x, y: y * radius, z};
  }
}

function transformSpherePoint(context, {x, y, z}, r) {
    const d = Math.sqrt(x ** 2 + y ** 2);
    if (d > r) {
        console.log(`Error: point outside of sphere ${d} > ${r}`);
    }
    // d/r is sin theta where theta is angle from sphere
    // center to point (away from the front direction).
    const squash = 1 - (d / r) ** 2;
    context.translate(x, y);
    context.rotate(-Math.atan2(x, y));
    context.scale(1, squash);
    context.beginPath();
}

createPane();
canvasSketch(sketch, settings);