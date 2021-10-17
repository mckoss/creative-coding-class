import math from 'canvas-sketch-util/math';
import random from 'canvas-sketch-util/random';

const name = "Dancing Lines";
export { name, sketch };

const settings = {
  dimensions: [ 1080, 1080 ],
  animate: true
};

const sketch = () => {
  const jiggle = new Jiggler();

  return ({ context, width, height }) => {
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

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
      context.translate(jiggle.range(-10, 10), jiggle.range(-h/5, h/5));

      context.beginPath();
      context.rect(-w/2, -h/2, w, h);
      context.fill();

      context.lineWidth = jiggle.range(5, 15);
      context.beginPath();
      context.arc(0, radius, radius + jiggle.range(-h/2, h/2),
        math.degToRad(jiggle.range(-60, 0)),
        math.degToRad(jiggle.range(0, 60)));
      context.stroke();

      context.restore();
    }

    jiggle.reset();
  };
};

class Jiggler {
    recording = true;
    index = 0;
    nums = [];
    v = [];

    constructor(jiggle) {
    }

    range(min, max) {
        if (this.recording) {
            let num = random.range(min, max);
            this.nums.push(num);
            this.v.push(random.range(-1, 1));
            return num;
        }

        const next = this.nums[this.index] + this.v[this.index];
        const set = constrain(next, min, max);
        this.nums[this.index] = set;
        if (set !== next) {
            this.v[this.index] *= -1;
        }
        this.index++;
        return next;
    }

    reset() {
        this.index = 0;
        this.recording = false;
    }
}

function constrain(x, min, max) {
    if (x < min) {
        return 2 * min - x;
    }
    if (x > max) {
        return 2 * max - x;
    }
    return x;
}
