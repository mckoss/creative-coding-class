const canvasSketch = require('canvas-sketch');

const settings = {
  dimensions: [ 1080, 1080 ]
};

let manager;

const fontSize = 1080;
const fontFamily = 'Times';

let glyph = 'K';

const glyphCanvas = document.createElement('canvas');
const glyphContext = glyphCanvas.getContext('2d');

const sketch = ({width, height}) => {
  const cell = 20;
  const cols = width / cell;
  const rows = height / cell;
  glyphCanvas.width = cols;
  glyphCanvas.height = rows;

  return ({ context, width, height }) => {
    glyphContext.fillStyle = 'black';
    glyphContext.fillRect(0, 0, cols, rows);

    glyphContext.fillStyle = 'white';
    glyphContext.font = `${cols}px ${fontFamily}`;

    const metrics = glyphContext.measureText(glyph);
    const mx = -metrics.actualBoundingBoxLeft;
    const my = -metrics.actualBoundingBoxAscent;
    const mw = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
    const mh = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    const x = cols/2 - mw/2 - mx;
    const y = rows/2 - mh/2 - my;

    glyphContext.save();
    glyphContext.translate(x, y);
    glyphContext.fillText(glyph, 0, 0);
    glyphContext.restore();

    // RGBA array - 4 bytes per pixel
    const glyphPixels = glyphContext.getImageData(0, 0, cols, rows).data;
    
    for (let i = 0; i < rows * cols; i++) {
        let col = i % cols;
        let row = Math.floor(i / cols);

        const r = glyphPixels[4 * i];
        const g = glyphPixels[4 * i + 1];
        const b = glyphPixels[4 * i + 2];
        const a = glyphPixels[4 * i + 3];

        context.fillStyle = `rgb(${r}, ${g}, ${b})`;

        context.save();
        context.translate(col * cell, row * cell);
        context.beginPath()
        context.arc(cell/2, cell/2, cell * 0.4, 0, 2 * Math.PI);
        context.fill();
        context.restore();
    }

    // context.drawImage(glyphCanvas, 0, 0);

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
