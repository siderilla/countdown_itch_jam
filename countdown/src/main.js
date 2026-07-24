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
let draggedTile = null;

const LEVELS = [
	{ src: "/assets/test.jpg", time: 5 },
	{ src: "/assets/test2.jpg", time: 4 }, // Magari qui metti un timer più breve per aumentare la sfida!
	{ src: "/assets/test3.jpg", time: 3 }
];

let currentLevelIndex = 0;
const img = new Image();

const tiles = [];

for (let row = 0; row < ROWS; row++) {

	for (let col = 0; col < COLS; col++) {

		let x = OFFSET_X + col * TILE_W;
		let y = OFFSET_Y + row * TILE_H;

		tiles.push({
			x: x,
			y: y,
			homeX: x,
			homeY: y,
			w: TILE_W,
			h: TILE_H,
			col: col,
			row: row,
			placed: true,
			angle: 0
		});
	}

}

function countToZero(timestamp) {
	//aligns lastTick to actual time
	if (!lastTick) lastTick = timestamp;

	//background
	ctx.fillStyle = "grey";
	ctx.fillRect(0, 0, 1280, 720);

	//foreach tiles
	tiles.forEach(tile => {
		ctx.save();

		ctx.translate(tile.x + tile.w / 2, tile.y + tile.h / 2);
		ctx.rotate(tile.angle || 0);

		if (tile === draggedTile) {
			ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
			ctx.shadowBlur = 15;
			ctx.shadowOffsetX = 10;
			ctx.shadowOffsetY = 10;
			ctx.scale(1.05, 1.05);
		}

		let gap = (stage === "victory") ? 0 : 2;

		if (img.complete && img.naturalWidth > 0) {
			ctx.drawImage(
				img, tile.homeX - OFFSET_X, tile.homeY - OFFSET_Y, tile.w, tile.h,
				-tile.w / 2, -tile.h / 2, tile.w - gap, tile.h - gap
			);
		} else {
			ctx.fillStyle = "#222";
			ctx.fillRect(-tile.w / 2, -tile.h / 2, tile.w - 2, tile.h - 2);
		}

		// restore canva status for next tiles
		ctx.restore();
	});

	//draw the countdown
	if (stage === "memorizing") {

		ctx.font = "50px 'Tiny5-Regular'";
		ctx.fillStyle = "white";
		ctx.fillText(countdown, 50, 90);

	}


	if (stage === "memorizing" && timestamp - lastTick >= 1000) {
		countdown -= 1;
		lastTick = timestamp;

		if (countdown === 0) {
			stage = "puzzle";
			scatterTiles();
		}
	}

	//recall the loop
	requestAnimationFrame(countToZero);

}

document.fonts.ready.then(() => requestAnimationFrame(countToZero));

console.log(tiles);

function scatterTiles() {

	let drawed = 0;
	let attempts = 0;

	// the center of the plate for scattered tiles
	const TRAY_X = 1000;
	const TRAY_Y = 300;

	// max random positioning of scattered tiles
	const JITTER = 50;

	while (drawed < 6 && attempts < 30) {

		let drawedTile = Math.floor(Math.random() * tiles.length);

		if (tiles[drawedTile].placed) {

			let tile = tiles[drawedTile];
			tile.placed = false;

			// random positioning around the plate
			tile.x = TRAY_X + (Math.random() * JITTER - JITTER / 2);
			tile.y = TRAY_Y + (Math.random() * JITTER - JITTER / 2);

			// random rotation (looks realistic)
			tile.angle = (Math.random() * 30 - 15) * (Math.PI / 180);

			drawed++;

		}

		attempts++;

	}
}

function getMousePos(e) { // mouseposition

	const rect = canva.getBoundingClientRect();
	const scaleX = canva.width / rect.width;
	const scaleY = canva.height / rect.height;
	return {
		x: (e.clientX - rect.left) * scaleX,
		y: (e.clientY - rect.top) * scaleY
	};

}

window.addEventListener("mousedown", (e) => { // GRAB
	if (stage !== "puzzle") return; // only in puzzle stage

	const mouse = getMousePos(e);

	//cycle from right to left
	for (let i = tiles.length - 1; i >= 0; i--) {
		const tile = tiles[i];

		if (tile.placed) continue;

		if (
			mouse.x >= tile.x &&
			mouse.x <= tile.x + tile.w &&
			mouse.y >= tile.y &&
			mouse.y <= tile.y + tile.h
		) {
			draggedTile = tile;
			draggedTile.angle = 0;
			break;
		}
	}
});

window.addEventListener("mousemove", (e) => { // DRAG
	if (!draggedTile) return;

	const mouse = getMousePos(e);

	// the tile will be centerd to the pointer
	draggedTile.x = mouse.x - draggedTile.w / 2;
	draggedTile.y = mouse.y - draggedTile.h / 2;
});

window.addEventListener("mouseup", (e) => { // DROP and SNAP
	if (!draggedTile) return;

	//caculate the actual position of the tile and its home position
	const dx = draggedTile.x - draggedTile.homeX;
	const dy = draggedTile.y - draggedTile.homeY;
	const distance = Math.sqrt(dx * dx + dy * dy);

	// if the tile is being released in less than 50 px of distance from its home position will hook up
	if (distance < 50) {
		draggedTile.x = draggedTile.homeX;
		draggedTile.y = draggedTile.homeY;
		draggedTile.placed = true;

		draggedTile.angle = 0;

		checkWin();
	}

	//clean 
	draggedTile = null;
});

function checkWin() {
	const isCompleted = tiles.every(tile => tile.placed === true);

	if (isCompleted) {
		console.log("🎉 LIVELLO COMPLETATO! 🎉");
		stage = "victory";

		setTimeout(() => {
			// check if there are other levels
			if (currentLevelIndex < LEVELS.length - 1) {
				// next level
				startLevel(currentLevelIndex + 1);
			} else {
				stage = "gameover";
				console.log("🏆 GIOCO TERMINATO WITH SUCCESS! 🏆");
			}
		}, 2500);
	}
}

function startLevel(index) {
	currentLevelIndex = index;
	const levelData = LEVELS[currentLevelIndex];

	// load new memory
	img.src = levelData.src;

	// timer for this level
	countdown = levelData.time;
	lastTick = 0;
	stage = "memorizing";

	// back to order
	tiles.forEach(tile => {
		tile.x = tile.homeX;
		tile.y = tile.homeY;
		tile.placed = true;
		tile.angle = 0;
	});
}