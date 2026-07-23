import './style.css';

const COLS = 4;
const ROWS = 3;
const TILE_W = 200;
const TILE_H = 150;
const OFFSET_X = 60;
const OFFSET_Y = 135;

const canva = document.getElementById("prologue");
const ctx = canva.getContext("2d");

let countdown = 5;
let lastTick = 0;
let stage = "memorizing";
function countToZero(timestamp) {

	//background
	ctx.fillStyle = "grey";
	ctx.fillRect(0, 0, 1280, 720);

	//foreach tiles
	tiles.forEach(tile => {

		if (!tile.visible) return;
		ctx.fillStyle = "black";
		ctx.fillRect(tile.x, tile.y, tile.w - 2, tile.h - 2);

	});

	//draw the countdown
	if (stage === "memorizing") {

		ctx.font = "50px 'Tiny5-Regular'";
		ctx.fillStyle = "white";
		ctx.fillText(countdown, 50, 90);

	}


	if (timestamp - lastTick >= 1000) {

		lastTick = timestamp;
		countdown -= 1;
		if (countdown === 0) {
			stage = "puzzle";
			hideTiles();
		}
		lastTick = timestamp;

	}

	//recall the loop
	requestAnimationFrame(countToZero);

}

document.fonts.ready.then(() => requestAnimationFrame(countToZero));

const tiles = [];

for (let row = 0; row < ROWS; row++) {

	for (let col = 0; col < COLS; col++) {

		let x = OFFSET_X + col * TILE_W;
		let y = OFFSET_Y + row * TILE_H;
		tiles.push({ x: x, y: y, homeX: x, homeY: y, w: TILE_W, h: TILE_H, col: col, row: row, visible: true });
	
	}

}

console.log(tiles);

function hideTiles() {
	for (let i = 0; i < 6; i++) {
		let hiddenTile = Math.floor(Math.random() * tiles.length);
		tiles[hiddenTile].visible = false;
	}
}
