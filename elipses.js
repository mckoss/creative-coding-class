const canvasSketch = require('canvas-sketch');
const math = require('canvas-sketch-util/math');
const random = require('canvas-sketch-util/random');

const settings = {
  dimensions: [ 1024, 1024 ],
  animate: true
};

const sketch = () => {
  let rot = 0;
  return ({ context, width, height }) => {
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    rot += Math.PI/16/60;

    const radius = width / 3;
    context.fillStyle = 'red';

    context.translate(width / 2, height / 2);

    context.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let {x, y, z} of fibPack(75, radius, rot)) {
        if (z < 0) {
            continue;
        }
        context.save();
        transformSpherePoint(context, {x, y, z}, radius);
        context.beginPath();
        context.arc(0, 0, 40, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    context.fillStyle = 'rgba(255, 0, 0, 0.6)';
    for (let {x, y, z} of fibPack(75, radius, rot)) {
        if (z > 0) {
            continue;
        }
        context.save();

        transformSpherePoint(context, {x, y, z}, radius);
        context.beginPath();
        context.arc(0, 0, 40, 0, Math.PI * 2);
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

for (let i of fibPack(20, 10)) {
  console.log(i);
}

canvasSketch(sketch, settings);

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
