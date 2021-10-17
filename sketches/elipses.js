import math from 'canvas-sketch-util/math';
import random from 'canvas-sketch-util/random';
import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

const name = "Circles on a Sphere";
export { name, sketch, createPane };

const params = {
  speed: 10,
  tumble: 2,
  dots: 75,
  radius: 40,
};

function createPane(container) {
  const pane = new Pane({container});
  pane.registerPlugin(EssentialsPlugin);

  const fParams = pane.addFolder({title: 'Params'});
  fParams.addInput(params, 'speed', {min: -20, max: 20});
  fParams.addInput(params, 'tumble', {min: -10, max: 10});
  fParams.addInput(params, 'dots', {min: 1, max: 400, step: 1});
  fParams.addInput(params, 'radius', {min: 2, max: 60});
}

const sketch = () => {
  let rot = 0;
  let tumble = 0;

  return ({ context, width, height }) => {
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    rot += Math.PI/32/60 * params.speed;
    tumble += Math.PI/32/60 * params.tumble;

    const radius = width / 3;
    context.fillStyle = 'red';

    // Move the origin to the center of the screen
    context.translate(width / 2, height / 2);

    context.fillStyle = 'rgba(200, 200, 200, 1.0)';
    for (let point of fibPack(params.dots, radius, rot)) {
        point = rotX(point, tumble);
        if (point.z < 0) {
            continue;
        }
        context.save();
        transformSpherePoint(context, point);
        context.beginPath();
        context.arc(0, 0, params.radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    let [x, y, z] = [0, radius, 0];
    ({x, y, z} = rotX({x, y, z}, tumble));
    context.save();
    context.strokeStyle = 'DodgerBlue';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x, -y);
    context.stroke();
    context.restore();
    
    context.fillStyle = 'rgba(255, 0, 0, 0.6)';
    for (let point of fibPack(params.dots, radius, rot)) {
        point = rotX(point, tumble);
        if (point.z > 0) {
            continue;
        }
        context.save();
        transformSpherePoint(context, point);
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

// Rotate points around the x axis.
function rotX({x, y, z}, theta) {
  [y, z] = rot2(y, z, theta);
  return {x, y, z};
};

const rot2 = (x, y, theta) => [
    x * Math.cos(theta) - y * Math.sin(theta),
    x * Math.sin(theta) + y * Math.cos(theta)];

// Transform canvas so drawing appears on the surface
// of a radius r sphere centered at the origin at point x,y,z.
function transformSpherePoint(context, {x, y, z}) {
    const r = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
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
