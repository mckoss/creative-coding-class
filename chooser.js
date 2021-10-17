import canvasSketch from 'canvas-sketch';

import { sketches } from './sketches';

const settings = {
  dimensions: [ 1024, 1024 ],
  animate: true
};

document.addEventListener('DOMContentLoaded', () => {
  addSketchMenu(sketches, (sketch, div) => {
    if (sketch === undefined) {
      console.log("Undefined sketch");
      return;
    }
  
    console.log(`Executing sketch ${sketch.name}`);
    
    if (sketch.createPane !== undefined) {
      sketch.createPane(div);
    }
  
    canvasSketch(sketch.sketch, settings);
  });
});

function addSketchMenu(sketches, onSketch) {
  const div = document.createElement('div');
  div.style = `width: 100%;
               position: absolute;
               top: 1em;
               left: 1em;
               text-align: center;
               `;
  
  const select = document.createElement('select');
  select.style = 'font-size: 2em;';
  div.appendChild(select);

  const disabledOption = makeOption("", "Choose a Sketch");
  disabledOption.select = true;
  disabledOption.disabled = true;
  select.add(disabledOption);

  for (let i = 0; i < sketches.length; i++) {
    select.add(makeOption(i, sketches[i].name));
  }

  select.addEventListener('change', (e) => {
    changeCurrentSketch();
  });

  const pane = document.createElement('div');
  pane.style = 'width: 400px; margin: 1em auto;';
  div.appendChild(pane);
  
  document.body.appendChild(div);
  changeCurrentSketch();

  function changeCurrentSketch() {
    let sketch = sketches[select.value];
    onSketch(sketch, pane);
  }
}

function makeOption(value, name) {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = name;
  return opt;
}
