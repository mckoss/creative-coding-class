import random from 'canvas-sketch-util/random';

export { Vector, Box };

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
        return Math.sqrt(this.dist2);
    }

    dist2(other) {
        return (this.x - other.x) ** 2 + (this.y - other.y) ** 2;
    }

    mult(c) {
        return new Vector(this.x * c, this.y * c);
    }

    unit() {
        let d = Math.sqrt(this.x ** 2 + this.y ** 2);
        return this.mult(1/d);
    }

    static randomUnit() {
        const theta = random.range(0, 2 * Math.PI);
        return new Vector(Math.cos(theta), Math.sin(theta));
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

    randomPoint(margin = 0) {
        return new Vector(
            random.range(this.ul.x + margin, this.lr.x - margin),
            random.range(this.ul.y + margin, this.lr.y - margin));
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