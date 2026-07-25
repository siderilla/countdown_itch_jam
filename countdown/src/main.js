import './style.css';

const COLS = 4;
const ROWS = 3;
const TILE_W = 200;
const TILE_H = 150;
const OFFSET_X = 60;
const OFFSET_Y = 135;

const canva = document.getElementById("prologue");
const ctx = canva.getContext("2d");

ctx.imageSmoothingEnabled = false;

let audioEnabled = false;
const bgMusic = new Audio("/assets/bgm.mp3");
bgMusic.loop = true;

function toggleAudio() {
	audioEnabled = !audioEnabled;
	if (audioEnabled) {
		bgMusic.play().catch(() => console.log("Your browser is blocking audio source"));
	} else {
		bgMusic.pause();
	}
}

function playSound(src) {
	if (!audioEnabled) return;
	const sfx = new Audio(src);
	sfx.play().catch(() => { });
}

let countdown = 5;
let lastTick = 0;
let stage = "menu";
let draggedTile = null;

const LEVELS = [
	{
		src: "/assets/memory1.png",
		time: 5,
		testo: "Il nostro primo giorno al mare. Il sole picchiava forte..."
	},
	{
		src: "/assets/memory2.png",
		time: 4,
		testo: "Quella volta che ci siamo persi nel bosco ma abbiamo trovato quella baita..."
	},
	{
		src: "/assets/memory3.png",
		time: 3,
		testo: "L'ultimo tramonto prima di partire. Non lo dimenticherò mai."
	}
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

const UI_BUTTONS = {
	start: { x: 440, y: 300, w: 400, h: 80, text: "[ START GAME ]" },
	github: { x: 440, y: 420, w: 400, h: 60, text: "GitHub & Credits" },
	audio: { x: 1120, y: 20, w: 140, h: 40 }
};

function countToZero(timestamp) {
	// aligns lastTick to actual time
	if (!lastTick) lastTick = timestamp;

	// background
	ctx.fillStyle = "grey";
	ctx.fillRect(0, 0, 1280, 720);

	// smoothing is always disabled
	ctx.imageSmoothingEnabled = false;

	// foreach tiles
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

			const sWidth = img.naturalWidth / COLS; // 160 / 4 = 40px
			const sHeight = img.naturalHeight / ROWS; // 90 / 3 = 30px
			const sx = tile.col * sWidth;
			const sy = tile.row * sHeight;

			ctx.drawImage(
				img,
				sx, sy, sWidth, sHeight,
				-tile.w / 2, -tile.h / 2, tile.w - gap, tile.h - gap
			);
		} else {
			ctx.fillStyle = "#222";
			ctx.fillRect(-tile.w / 2, -tile.h / 2, tile.w - 2, tile.h - 2);
		}

		// restore canva status for next tiles
		ctx.restore();
	});

	// draw the countdown
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

	// recall the loop
	requestAnimationFrame(countToZero);
}

// inizialize first level only one time before the loop
startLevel(0);
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

	while (drawed < tiles.length && attempts < 30) {
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

function getMousePos(e) { // mouse position
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

	// cycle from right to left
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

	// the tile will be centered to the pointer
	draggedTile.x = mouse.x - draggedTile.w / 2;
	draggedTile.y = mouse.y - draggedTile.h / 2;
});

window.addEventListener("mouseup", (e) => { // DROP and SNAP
	if (!draggedTile) return;

	// calculate the actual position of the tile and its home position
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

	// clean 
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

	// memory load
	img.src = levelData.src;

	// update narrative text
	const textContainer = document.getElementById("story-box");
	if (textContainer) {
		textContainer.innerText = levelData.testo;
	}

	// timer reset
	countdown = levelData.time;
	lastTick = 0;
	stage = "memorizing";
	draggedTile = null;

	// all tiles aligned
	tiles.forEach(tile => {
		tile.x = tile.homeX;
		tile.y = tile.homeY;
		tile.placed = true;
		tile.angle = 0;
	});
}