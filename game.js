//add ?grid=4 to the address in browser to use 4 by 4 gird instead
const grid = new URLSearchParams(location.search).get('grid') === '4' ? 4 : 3;
const size = 336 / grid;


const animals = [
  'hedgehog' ,  'fox' , 'bear' 
];
const game = document.getElementById('game');
const piece = document.getElementById('piece');

const fingers = new Map();
let animal = 0;
let urrent = 0;
let placed = 0;
let remaining = [], status = 'ready';
let position = { x: 200, y: 536, angle: 0 };
let start = {}, move, win, hintAnimation, hintTimer, hold, resetId = null;


function get(name) {


  return document.getElementById(name);
}

function setStatus(value) {
  status = value;
  game.dataset.status = value;
}

function draw() {
  piece.setAttribute('transform', `translate(${position.x} ${position.y}) rotate(${position.angle})`);
}

function cell(index) {

  return {
     x: 32 + (index % grid + 0.5) * size,
     y: 80 + (Math.floor(index / grid) + 0.5) * size
           };
}

//show only one square from the original animal drawing
function tile(index) {


  const part = 300 / grid;
  const x = index % grid * part;
  const y = Math.floor(index / grid) * part;

  return `<svg x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}"
    viewBox="${x} ${y} ${part} ${part}"><use href="#${animals[animal]}"/></svg>`;
}

function stopHint() {

  clearTimeout(hintTimer);

  if (hintAnimation) hintAnimation.cancel();
  get('hint-outline').style.opacity = 0;
}

//anime.js line drawing shows where the current tile belongs

function showHint() {
  if (status !== 'ready' || fingers.size) return;

  const p = cell(current);
  const x = p.x - size / 2 + 3, y = p.y - size / 2 + 3;
  const outline = get('hint-outline');

  outline.setAttribute('d', `M${x} ${y} h${size - 6} v${size - 6} h${6 - size} Z`);
  outline.style.opacity = 1;

  hintAnimation = anime.animate(anime.svg.createDrawable(outline), {
    draw: ['0 0', '0 1'], duration: 1000, ease: 'linear'
  });
}

function newPiece() {

  let n = Math.floor(Math.random() * remaining.length);
  if (placed === 0) n = remaining.indexOf(Math.floor(grid / 2) * grid + Math.floor(grid / 2));

  current = remaining[n];
  remaining.splice(n, 1);

  piece.dataset.piece = current;


  piece.innerHTML = `<rect x="${-size / 2}" y="${6 - size / 2}" width="${size}" height="${size}" rx="9" fill="#c9c0ad"/>

    <g clip-path="url(#tile-clip)">${tile(current)}</g>
    
    <rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="8" fill="none" stroke="#fffaf0" stroke-width="2"/>`;



  position = { x: 200, y: 536, angle: 0 };
  draw();

  piece.style.opacity = 1;
  piece.style.pointerEvents = 'all';
  piece.setAttribute('aria-hidden', 'false');
  setStatus('ready');
  hintTimer = setTimeout(showHint, 1800);
}

function cancelHold() {

  if (hold) hold.cancel();
  resetId = null;

  get('reset-progress').style.opacity = 0;
}

function reset() {
  stopHint();
  cancelHold();

  if (move) move.cancel();
  if (win) win.cancel();

  clearFingers();

  placed = 0;
  remaining = [];

  for (let i = 0; i < grid * grid; i++) remaining.push(i);

  game.dataset.animal = animals[animal];

  game.dataset.grid = grid;
  game.dataset.placed = 0;


  get('board-hint').setAttribute('href', '#' + animals[animal]);
  get('finished-animal').setAttribute('href', '#' + animals[animal]);

  get('placed-tiles').innerHTML = '';
  get('grid').innerHTML = '';


  for (let i = 0; i < grid * grid; i++) {
    const p = cell(i);
    get('grid').innerHTML += `<rect x="${p.x - size / 2}" y="${p.y - size / 2}" width="${size}" height="${size}" fill="none" stroke="#f6f2e8" stroke-width="3"/>`;
  }

  get('tile-mask').setAttribute('x', -size / 2);
  get('tile-mask').setAttribute('y', -size / 2);
  get('tile-mask').setAttribute('width', size);
  get('tile-mask').setAttribute('height', size);
  get('grid').style.opacity = 1;

  for (let name of ['finished-picture', 'next-button', 'star-flight']) get(name).style.opacity = 0;
  get('next-button').style.pointerEvents = 'none';
  get('next-button').setAttribute('aria-hidden', 'true');
  newPiece();
}

// finoshing animation
function finish() {
  piece.style.opacity = 0;
  piece.style.pointerEvents = 'none';
  piece.setAttribute('aria-hidden', 'true');


  //stolen code
  get('spark-shape').setAttribute('d', 'M0 -10 A10 10 0 1 1 0 10 A10 10 0 1 1 0 -10 Z');


  get('star-flight').style.opacity = 1;

  get('star-flight').style.transform = 'translate(200px, 66px)';
  win = anime.createTimeline()

    .add(get('finished-picture'), { opacity: 1, duration: 300 }, 0)
    .add(get('grid'), { opacity: 0, duration: 300 }, 0)


    .add(get('spark-shape'), { d: anime.svg.morphTo('#spark-star'), duration: 300 }, 0)

    .add(get('star-flight'), { ...anime.svg.createMotionPath('#celebration-path'), duration: 1600, ease: 'linear' }, 300)
    .add(get('next-button'), { opacity: 1, duration: 250 }, 500)

    .call(() => {
      setStatus('complete');
      get('next-button').style.pointerEvents = 'all';
      get('next-button').setAttribute('aria-hidden', 'false');
    }, 600)

    .add(get('star-flight'), { opacity: 0, duration: 250 }, 1900);
}

//getting the piece in place/ back and animation
function drop(cancelled = false) {
  const col = Math.floor((position.x - 32) / size);
  const row = Math.floor((position.y - 80) / size);

  const correct = !cancelled && col >= 0 && col < grid && row >= 0 && row < grid && row * grid + col === current;
  const target = correct ? cell(current) : { x: 200, y: 536 };


  setStatus('moving');

  move = anime.animate(position, {
    x: target.x, y: target.y, angle: 0, duration: 300, ease: 'outCubic', onUpdate: draw,
    onComplete: () => {

      if (correct) {

        get('placed-tiles').innerHTML += `<g transform="translate(${target.x} ${target.y})" clip-path="url(#tile-clip)" data-cell="${current}">${tile(current)}</g>`;
        placed++;
        game.dataset.placed = placed;
        if (remaining.length) newPiece();
        
        else finish();
      } 
      
      else {
        setStatus('ready');
        hintTimer = setTimeout(showHint, 600);
      }
    }
  });
}

//convert screen pixels into svg coordinates
function point(event) {

  return new DOMPoint(event.clientX, event.clientY).matrixTransform(game.getScreenCTM().inverse());


}


function heldFingers() {

  return [...fingers.values()].filter(f => f.type === 'piece');
}

function middle(list) {

  let x = 0, y = 0;

  for (let f of list) { x += f.x; y += f.y; }

  return { x: x / list.length, y: y / list.length };
}

function angle(list) {

  if (list.length < 2) return 0;


  return Math.atan2(list[1].y - list[0].y, list[1].x - list[0].x) * 180 / Math.PI;
}

//remember a new starting point when a finger is added or removed
function remember() {

  const list = heldFingers();
  const p = middle(list);

  start = { x: position.x, y: position.y, angle: position.angle, cx: p.x, cy: p.y, turn: angle(list) };
}

game.onpointerdown = function (event) {


  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  stopHint();

  const p = point(event);
  let type = 'background';


  if (event.target.closest('#piece') && (status === 'ready' || status === 'dragging')) type = 'piece';


  if (event.target.closest('#reset-button') && !heldFingers().length && resetId === null) type = 'reset';

  if (event.target.closest('#next-button') && status === 'complete') type = 'next';


  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', p.x);
  circle.setAttribute('cy', p.y);
  circle.setAttribute('fill', '#83a58b');
  circle.style.opacity = 0.35;


  get('touch-feedback').append(circle);
  anime.animate(circle, { r: [8, 16], duration: 180 });
  fingers.set(event.pointerId, { x: p.x, y: p.y, type, circle, sx: p.x, sy: p.y });
  game.setPointerCapture(event.pointerId);


  if (type === 'piece') { cancelHold(); remember(); setStatus('dragging'); }
  if (type === 'reset') {

    resetId = event.pointerId;

    const ring = get('reset-progress');
    ring.style.opacity = 1;

    ring.setAttribute('stroke-dasharray', Math.PI * 44);
    hold = anime.animate(ring, { 'stroke-dashoffset': [Math.PI * 44, 0], duration: 2000, ease: 'linear', onComplete: reset });
  }
};

game.onpointermove = function (event) {

  const f = fingers.get(event.pointerId);
  if (!f) return;


  const p = point(event);

  f.x = p.x; f.y = p.y;
  f.circle.setAttribute('cx', p.x); f.circle.setAttribute('cy', p.y);



  if (f.type === 'reset' && Math.hypot(p.x - f.sx, p.y - f.sy) > 20) cancelHold();
  if (f.type !== 'piece') return;

  const list = heldFingers();
  const mid = middle(list);

  position.x = start.x + mid.x - start.cx;
  position.y = start.y + mid.y - start.cy;

  if (list.length > 1) position.angle = start.angle + ((angle(list) - start.turn + 540) % 360 - 180);

  draw();
};

function release(event, cancelled = false) {

  const f = fingers.get(event.pointerId);

  if (!f) return;

  fingers.delete(event.pointerId);

  if (game.hasPointerCapture(event.pointerId)) game.releasePointerCapture(event.pointerId);

  anime.animate(f.circle, { r: 24, opacity: 0, duration: 200, onComplete: () => f.circle.remove() });

  if (resetId === event.pointerId) cancelHold();

  if (f.type === 'piece') {


    if (heldFingers().length) remember();

    else drop(cancelled);


  }


  if (f.type === 'next' && !cancelled) {

    const p = point(event);


    if (Math.hypot(p.x - 200, p.y - 536) <= 55) { animal = (animal + 1) % animals.length; reset(); }

  }


  if (!fingers.size && status === 'ready') hintTimer = setTimeout(showHint, 1800);
}

function clearFingers() {


  const ids = [...fingers.keys()];

  fingers.clear();

  for (let id of ids) if (game.hasPointerCapture(id)) game.releasePointerCapture(id);
  get('touch-feedback').innerHTML = '';
}



function cancelInput() {

  cancelHold(); stopHint(); clearFingers();
  if (status === 'dragging') drop(true);

}


game.onpointerup = event => release(event);
game.onpointercancel = event => release(event, true);
game.onlostpointercapture = event => release(event, true);
game.oncontextmenu = event => event.preventDefault();

window.onblur = cancelInput;
window.onresize = cancelInput;


document.onvisibilitychange = () => { if (document.hidden) cancelInput(); };
reset();
