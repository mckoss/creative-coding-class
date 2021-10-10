const canvasSketch = require('canvas-sketch');
const math = require('canvas-sketch-util/math');
const random = require('canvas-sketch-util/random');

const settings = {
  dimensions: [ 1080, 1080 ],
  animate: true
};

const sketch = ({width, height}) => {
    const COLS = 10;
    const ROWS = 10;
    const CELLS = ROWS * COLS;

    const gridWidth = width * 0.8;
    const gridHeight = height * 0.8;

    const cellWidth = gridWidth / COLS;
    const cellHeight = gridHeight / ROWS;

    const marginX = (width - gridWidth) / 2;
    const marginY = (height - gridHeight) / 2;

    return ({ context, width, height, frame }) => {
        context.fillStyle = 'beige';
        context.lineWidth = 4;
        context.fillRect(0, 0, width, height);

        context.translate(marginX, marginY);

        for (let i = 0; i < CELLS; i++) {
            let col = i % COLS;
            let row = Math.floor(i / COLS);

            const x = col * cellWidth;
            const y = row * cellHeight;

            const noise = random.noise3D(x, y, frame * 20, 0.002);
            const rot = math.mapRange(noise, -1, 1,  -0.2 * Math.PI, 0.2 * Math.PI);
            const scale = math.mapRange(noise, -1, 1, 1, 30);

            context.lineWidth = scale;

            const w = cellWidth * 0.8;
            const h = cellHeight * 0.8;

            context.save()
            context.translate(x + cellWidth/2, y + cellHeight/2);
            context.rotate(rot);
            context.beginPath();
            context.moveTo(-w / 2, 0);
            context.lineTo(w / 2, 0);
            context.stroke();
            context.restore();
        }
    };
};

canvasSketch(sketch, settings);
