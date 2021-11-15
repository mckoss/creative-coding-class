import math from 'canvas-sketch-util/math';
import random from 'canvas-sketch-util/random';
import interpolate from 'color-interpolate';
import {Pane} from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

import { Vector, Box } from './vector.js';

const name = "Field Effect";
export { name, sketch, createPane };

// Tweakpane parameters
const params = {
  maxSpeed: 10,
  charges: 10,
  sizeRange: { min: 20, max: 50},
}

function createPane(container) {
  const pane = new Pane({container});
  pane.registerPlugin(EssentialsPlugin);

  const fParams = pane.addFolder({title: 'Params'});
  fParams.addInput(params, 'charges', { min: 1, max: 100, step: 1 });
  fParams.addInput(params, 'maxSpeed', {min: 0, max: 20});
  fParams.addInput(params, 'sizeRange', { min: 5, max: 200, step: 1 });
}

const sketch = ({width, height}) => {
    let charges = [];
    let box = new Box(width, height);

    function resetCharges() {
        charges = [];
        for (let i = 0; i < params.charges; i++) {
            charges.push(new Charge(box));
        }
    }

    return ({ context, width, height }) => {
        context.fillStyle = 'black';
        context.fillRect(0, 0, width, height);
        context.lineWidth = 4;
        context.strokeStyle = "yellow";

        if (charges.length !== params.charges) {
            resetCharges();
        }

        for (let charge of charges) {
            charge.move();
        }

        let step = width / 80;

        for (let y = step/2; y < height; y += step) {
            for (let x = step/2 ; x < width; x += step) {
                let pt = new Vector(x, y);
                let field = 0;
                for (let charge of charges) {
                    field += charge.fieldAt(pt);
                }
                let c = `rgb(${math.lerp(0, 255, field > 1)}, 0, 0)`;
                context.fillStyle = c;
                context.fillRect(x - step/2, y - step/2, step, step);
            }
        }

        for (let charge of charges) {
            charge.draw(context);
        }
    };
};

class Charge {
    box;
    pos;
    vel;
    r;

    constructor(box) {
        this.box = box;
        this.r = random.range(params.sizeRange.min, params.sizeRange.max);
        this.pos = box.randomPoint(this.r);
        this.vel = Vector.randomUnit().mult(random.range(0, params.maxSpeed));
    }

    move() {
        this.pos = this.pos.add(this.vel);
        this.box.bounce(this.pos, this.r, this.vel);
    }

    draw(ctx) {
        ctx.save();
        this.pos.translate(ctx);
        ctx.beginPath();
        ctx.arc(0, 0, this.r, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
    }

    // Inverse square power - with 1 at distance of r.
    fieldAt(pt) {
        let d2 = pt.dist2(this.pos);
        if (d2 === 0) {
            return Infinity;
        }
        return this.r ** 2 / d2;
    }
}
