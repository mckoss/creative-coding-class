const canvasSketch = require('canvas-sketch');
const { lerp } = require('canvas-sketch-util/math');
const math = require('canvas-sketch-util/math');
const random = require('canvas-sketch-util/random');

const MARGIN = 32;

const settings = {
  dimensions: [ 1024, 1024 ],
  animate: true
};

const sketch = ({width, height}) => {
  let agents = [];

  for (let i = 0; i < 40; i++) {
      agents.push(new Agent(random.range(MARGIN, width - MARGIN), random.range(MARGIN, width - MARGIN)));
  }

  const box = new Box(width, height);

  return ({ context, width, height }) => {
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    for (let agent of agents) {
        agent.update(box);
        agent.draw(context);
    }
  };
};

canvasSketch(sketch, settings);

class Vector {
    x;
    y;

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    translate(context) {
        context.translate(this.x, this.y);
    }

    add(other) {
        return new Vector(this.x + other.x, this.y + other.y);
    }
}

class Box {
    ul = new Vector(0, 0);
    lr;

    constructor(width, height) {
        this.lr = new Vector(width, height);
    }

    bounce(pt, margin, vel) {
        let x = constrain(pt.x, this.ul.x + margin, this.lr.x - margin);
        if (x !== pt.x) {
            pt.x = x;
            vel.x *= -1;
        }
        let y = constrain(pt.y, this.ul.y + margin, this.lr.y - margin);
        if (y !== pt.y) {
            pt.y = y;
            vel.y *= -1;
        }
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

const MAX_SPEED = 3;

class Agent {
    pos;
    vel;
    radius = random.range(6, 18);

    constructor(x, y) {
        this.pos = new Vector(x, y);
        this.vel = new Vector(random.range(-MAX_SPEED, MAX_SPEED), random.range(-MAX_SPEED, MAX_SPEED));
    }

    update(box) {
        this.pos = this.pos.add(this.vel);
        box.bounce(this.pos, this.radius, this.vel);
    }

    draw(context) {
        context.save();
        context.lineWidth = 4;
        this.pos.translate(context);

        context.beginPath();
        context.arc(0, 0, this.radius, 0, 2 * Math.PI);
        context.fill();
        context.stroke();

        context.restore();
    }
}