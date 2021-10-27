import math from 'canvas-sketch-util/math';
import random from 'canvas-sketch-util/random';

const name = "SeaLark";
export { name, sketch };

const NUM_AGENTS = 50;

const sketch = ({ context, width, height }) => {
	context.fillStyle = 'black';
	context.fillRect(0, 0, width, height);
	const agents = Array.from({ length: NUM_AGENTS}).map(_ => new Agent(width, height));

	return ({ context, width, height }) => {

		// context.lineWidth = width * 0.01;
		// context.strokeStyle = "white";

		for (let agent of agents) {
			agent.move();
			agent.draw(context);
		}

	};
};

const MAX_SPEED = 5;
const MIN_SIZE = 2;
const MAX_SIZE = 10;

const randomValue = () => random.rangeFloor(128, 255);
const randomColor = () => `rgba(${randomValue()},
								${randomValue()},
								${randomValue()},
								${random.range(0.01, 0.1)})`;

class Agent {
	x;
	y;
	vx = random.range(-MAX_SPEED, MAX_SPEED);
	vy = random.range(-MAX_SPEED, MAX_SPEED);
	r = random.range(MIN_SIZE, MAX_SIZE);
	interval = random.rangeFloor(1 * 60, 10 * 60);
	color = randomColor();
	width;
	height

	constructor(width, height) {
		this.width = width;
		this.height = height;

		this.x = random.range(0, width);
		this.y = random.range(0, height);
	}

	move() {
		this.x += this.vx;
		this.y += this.vy;

		this.x = (this.x + this.width) % this.width;
		this.y = (this.y + this.height) % this.height;

		this.interval--;
		if (this.interval <= 0) {
			console.log("change");
			this.interval = random.rangeFloor(1 * 60, 10 * 60);
			this.vx = random.range(-MAX_SPEED, MAX_SPEED);
			this.vy = random.range(-MAX_SPEED, MAX_SPEED);
		}
	}

	draw(context) {
		context.save();
		context.fillStyle = this.color;
		context.translate(this.x, this.y);
		context.beginPath();
		context.arc(0, 0, this.r, 0, 2 * Math.PI);
		context.fill();
		context.restore();
	}
}
