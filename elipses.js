const canvasSketch = require('canvas-sketch');
const math = require('canvas-sketch-util/math');
const random = require('canvas-sketch-util/random');

const settings = {
  dimensions: [ 1024, 1024 ]
};

const sketch = () => {
  return ({ context, width, height }) => {
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    const radius = width / 3;
    context.fillStyle = 'red';

    context.translate(width / 2, height / 2);

    for (let {x, y, z} of fibPack(75, radius)) {
      if (z > 0) {
        context.save();
        context.translate(x, y);
        context.beginPath();
        context.arc(0, 0, 20, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }
  };
};

// Packing n points around a sphere.
function *fibPack(n, radius) {
  const phi = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < n; i++) {
    // i/n * -1 + (1 - i/n) * 1 == 
    const y = 1 - i / (n - 1) * 2;
    const r = Math.sqrt(1 - y * y);

    const theta = phi * i;

    const x = r * Math.cos(theta) * radius;
    const z = r * Math.sin(theta) * radius;
    yield {x, y: y * radius, z};
  }
}

for (let i of fibPack(20, 10)) {
  console.log(i);
}

canvasSketch(sketch, settings);
