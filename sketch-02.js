const canvasSketch = require('canvas-sketch');
const math = require('canvas-sketch-util/math');
const random = require('canvas-sketch-util/random');

const settings = {
  dimensions: [ 1080, 1080 ]
};

const sketch = () => {
  return ({ context, width, height }) => {
    context.fillStyle = 'white';

    const cx = width / 2;
    const cy = height / 2;
    const w = width / 100;
    const h = height / 5;

    const radius = width / 3;

    const segments = 36;

    context.fillStyle = 'black';
    context.translate(cx, cy);

    for (let i = 0; i < segments; i++) {
      context.save();
      context.rotate(i * Math.PI * 2 / segments);
      context.translate(0, -radius);
      context.translate(random.range(-10, 10), random.range(-h/5, h/5));

      context.beginPath();
      context.rect(-w/2, -h/2, w, h);
      context.fill();

      context.lineWidth = random.range(5, 15);
      context.beginPath();
      context.arc(0, radius, radius + random.range(-h/2, h/2),
        math.degToRad(random.range(-60, 0)),
        math.degToRad(random.range(0, 60)));
      context.stroke();

      context.restore();
    }
  };
};

canvasSketch(sketch, settings);
