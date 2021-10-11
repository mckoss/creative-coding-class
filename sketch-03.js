const canvasSketch = require('canvas-sketch');
const math = require('canvas-sketch-util/math');
const random = require('canvas-sketch-util/random');

import {Pane} from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
const interpolate = require('color-interpolate');

const MARGIN = 32;

const settings = {
  dimensions: [ 1080, 1080 ],
  animate: true
};

// Tweakpane parameters
const params = {
  speed: 4,
  agents: 40,
  sizeRange: { min: 1, max: 30},
  colorRange: { min: 128, max: 255 },
  track: false
}

function createPane() {
  const pane = new Pane();
  pane.registerPlugin(EssentialsPlugin);

  const fParams = pane.addFolder({title: 'Params'});
  fParams.addInput(params, 'agents', { min: 0, max: 100, step: 1 });
  fParams.addInput(params, 'speed', {min: 1, max: 20});
  fParams.addInput(params, 'sizeRange', { min: 1, max: 100, step: 1 });
  fParams.addInput(params, 'colorRange', { min: 0, max: 255, step: 1 });
  fParams.addInput(params, 'track');
}

const sketch = ({width, height}) => {
  let agents = [];

  function regenerateAgents() {
      while (agents.length > params.agents) {
          agents = agents.slice(0, params.agents);
          return;
      }

      for (let i = agents.length; i < params.agents; i++) {
          agents.push(new Agent(random.range(MARGIN, width - MARGIN), random.range(MARGIN, width - MARGIN)));
      }

      // Put the larger agents behind (first) so smaller ones are visible when they overlap.
      agents.sort((a, b) => b.radius - a.radius);
  }

  regenerateAgents();
  const box = new Box(width, height);

  return ({ context, width, height }) => {
    if (agents.length !== params.agents) {
        regenerateAgents();
    }

    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    // Draw without moving

    context.save();
    if (params.track) {
        console.log('tracking');
        context.translate(-agents[0].pos.x + width/2, -agents[0].pos.y + height/2);
    }

    for (let i = 0; i < agents.length; i++) {
        for (let j = i + 1; j < agents.length; j++) {
            if (agents[i].pairsWith(agents[j])) {
                let dist = agents[i].pos.dist(agents[j].pos);
                if (dist > 4) {
                    context.lineWidth = math.mapRange(dist, 0, 5 * params.sizeRange.max, 7, 1)
                    context.beginPath();
                    context.moveTo(agents[i].pos.x, agents[i].pos.y);
                    context.lineTo(agents[j].pos.x, agents[j].pos.y);
                    context.stroke();
                }
            }
        }
    }

    for (let agent of agents) {
        agent.draw(context);
    }

    context.restore();

    // Move
    for (let agent of agents) {
        agent.update(box);
    }

    // Update velocities
    for (let i = 0; i < agents.length; i++) {
        for (let j = i + 1; j < agents.length; j++) {
            if (agents[i].pairsWith(agents[j])) {
                agents[i].attract(agents[j]);
            }
        }
    }

  };
};

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

    sub(other) {
        return new Vector(this.x - other.x, this.y - other.y);
    }

    dist(other) {
        return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
    }

    mult(c) {
        return new Vector(this.x * c, this.y * c);
    }

    unit() {
        let d = Math.sqrt(this.x ** 2 + this.y ** 2);
        return this.mult(1/d);
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

const colorValue = () => random.rangeFloor(params.colorRange.min, params.colorRange.max);

class Agent {
    pos;
    vel;
    radius = random.range(params.sizeRange.min, params.sizeRange.max);
    color = `rgb(${colorValue()}, ${colorValue()}, ${colorValue()})`;

    constructor(x, y) {
        this.pos = new Vector(x, y);
        this.vel = new Vector(random.range(-params.speed, params.speed), random.range(-params.speed, params.speed));
    }

    update(box) {
        this.pos = this.pos.add(this.vel);
        this.vel = this.vel.mult(0.999);
        box.bounce(this.pos, this.radius, this.vel);
    }

    draw(context) {
        context.save();
        context.lineWidth = 4;
        this.pos.translate(context);

        context.fillStyle = this.color;

        context.beginPath();
        context.arc(0, 0, this.radius, 0, 2 * Math.PI);
        context.fill();
        context.stroke();

        context.restore();
    }

    pairsWith(other) {
        let dist = this.pos.dist(other.pos);
        return dist < params.sizeRange.max * 5;
    }

    attract(other) {
        let mass = this.radius ** 2 + other.radius ** 2;
        let dist2 = this.pos.dist(other.pos) ** 2;

        let a = 50 * mass / dist2 / this.radius ** 2;
        if (a > 1) {
            a = 1;
        }
        let a2 = 50 * mass / dist2 / other.radius ** 2;
        if (a2 > 1) {
            a2 = 1;
        }
        let d = other.pos.sub(this.pos).unit();
        this.vel = this.vel.add(d.mult(a));
        other.vel = other.vel.sub(d.mult(a2));
    }
}

createPane();
canvasSketch(sketch, settings);
