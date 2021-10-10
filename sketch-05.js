const canvasSketch = require('canvas-sketch');

const settings = {
  dimensions: [ 1080, 1080 ]
};

let manager;

const fontSize = 1080;
const fontFamily = 'Times';

let glyph = 'K';

const sketch = () => {
  return ({ context, width, height }) => {
    context.fillStyle = 'beige';
    context.fillRect(0, 0, width, height);

    context.fillStyle = 'black';
    context.font  = `${fontSize}px ${fontFamily}`;

    const metrics = context.measureText(glyph);
    const mx = -metrics.actualBoundingBoxLeft;
    const my = -metrics.actualBoundingBoxAscent;
    const mw = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
    const mh = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    const x = width/2 - mw/2 - mx;
    const y = height/2 - mh/2 - my;

    context.save();
    context.translate(x, y);

    context.beginPath();
    context.rect(mx, my, mw, mh);
    context.stroke();

    context.fillText(glyph, 0, 0);
    context.restore();

  };
};

async function start() {
    manager = await canvasSketch(sketch, settings);
}

document.addEventListener('keyup', (e) => {
    console.log(e);
    if (e.keyCode > 32 && !e.ctrlKey) {
        glyph = e.key;
        manager.render();
    }
});

start();
