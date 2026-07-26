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

let audioEnabled = true;
const bgMusic = new Audio("/assets/bgm.mp3");
bgMusic.loop = true;

bgMusic.play().catch(() => console.log("Click to play audio"));

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
let mousePos = { x: 0, y: 0 };

/////////////// - story box - /////////////////

const PROLOGUE_TEXTS = [
	"Where am I...?",
	"I can't see anything clearly...",
	"I don't remember what I was doing... or who I am."
];

const LEVELS = [
	{
		src: "/assets/memory1.png",
		time: 5,
		introTexts: [
			"Wait... what's that shape?",
			"I can't see it clearly, it's all fading away..."
		],
		focusText: "Maybe if I focus more... I can hold onto it.",
		outroText: "Oh! I loved being at the beach, diving and swimming all the time when I was little."
	},
	{
		src: "/assets/memory2.png",
		time: 4,
		introTexts: [
			"Another one? A shadow near the window...",
			"It feels so warm, so familiar."
		],
		focusText: "Let me focus... don't slip away!",
		outroText: "That's Ms. Peach looking at the window! I loved her so much, always so smart and cuddly."
	},
	{
		src: "/assets/memory3.png",
		time: 3,
		introTexts: [
			"This last one... my heart is beating so fast.",
			"Why does this silhouette make me want to cry?"
		],
		focusText: "Please, let me see them one last time...",
		outroText: "Me and my husband, young and deeply in love. The best days of my entire existence."
	}
];

const EPILOGUE_TEXTS = [
	"The fog is gone now. I remember everything.",
	"My time here has run out... but I'm not afraid anymore.",
	"Because in the end, the only thing we truly leave behind is the love we gave.",
	"And my life... was so full of it. I am ready. I am happy."
];

/////////////// - story box finished - /////////////////

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
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, 1280, 720);

	// smoothing is always disabled
	ctx.imageSmoothingEnabled = false;

	if (stage === "menu") {
		// draw menu
		ctx.font = "80px 'Tiny5-Regular'";
		ctx.fillStyle = "white";
		ctx.textAlign = "center";
		ctx.fillText("PROLOGUE MEMORIES", 1280 / 2, 200);

		ctx.fillStyle = isInside(mousePos, UI_BUTTONS.start) ? "#6f00ff" : "#333";
		ctx.fillRect(UI_BUTTONS.start.x, UI_BUTTONS.start.y, UI_BUTTONS.start.w, UI_BUTTONS.start.h);
		ctx.font = "40px 'Tiny5-Regular'";
		ctx.fillStyle = "white";
		ctx.fillText(UI_BUTTONS.start.text, UI_BUTTONS.start.x + UI_BUTTONS.start.w / 2, UI_BUTTONS.start.y + 52);

		ctx.fillStyle = isInside(mousePos, UI_BUTTONS.github) ? "#6f00ff" : "#333";
		ctx.fillRect(UI_BUTTONS.github.x, UI_BUTTONS.github.y, UI_BUTTONS.github.w, UI_BUTTONS.github.h);
		ctx.font = "28px 'Tiny5-Regular'";
		ctx.fillStyle = "#ccc";
		ctx.fillText(UI_BUTTONS.github.text, UI_BUTTONS.github.x + UI_BUTTONS.github.w / 2, UI_BUTTONS.github.y + 38);

		ctx.textAlign = "start";
	}

	// draw grid
	if (stage === "puzzle" || stage === "memorizing") {
		tiles.forEach(tile => {
			ctx.fillStyle = "#0a0a0a";
			ctx.fillRect(tile.homeX, tile.homeY, tile.w, tile.h);

			ctx.strokeStyle = "#2a2a2a";
			ctx.lineWidth = 2;
			ctx.strokeRect(tile.homeX, tile.homeY, tile.w, tile.h);
		});
	}

	// draw tiles
	if (stage === "level_intro" || stage === "memorizing" || stage === "puzzle" || stage === "victory") {

		// bw and blur  filters
		if (stage === "level_intro") {
			ctx.filter = "grayscale(100%) blur(10px)";
		} else if (stage === "memorizing") {
			ctx.filter = "grayscale(50%) blur(4px)";
		} else {
			ctx.filter = "none";
		}

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
				const sWidth = img.naturalWidth / COLS;
				const sHeight = img.naturalHeight / ROWS;
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

			ctx.restore();
		});

		ctx.filter = "none";
	}

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

	// audio button always drawed
	ctx.font = "20px 'Tiny5-Regular'";
	ctx.fillStyle = audioEnabled ? "#53a1e0" : "#de36f4";
	ctx.textAlign = "center";
	ctx.fillText(audioEnabled ? "AUDIO: ON" : "AUDIO: OFF", UI_BUTTONS.audio.x + UI_BUTTONS.audio.w / 2, UI_BUTTONS.audio.y + 26);
	ctx.textAlign = "start";

	// recall the loop
	requestAnimationFrame(countToZero);
}

// inizialize always from menu
stage = "menu";
const textContainer = document.getElementById("story-box");
if (textContainer) {
	textContainer.innerText = "Ricompone i ricordi frammentati prima che svaniscano per sempre.";
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

function isInside(pos, rect) {
	return pos.x >= rect.x &&
		pos.x <= rect.x + rect.w &&
		pos.y >= rect.y &&
		pos.y <= rect.y + rect.h;
}

window.addEventListener("mousedown", (e) => {
	// dialogue by click
	if (stage === "prologue") {
		if (isTyping) return; // wait for the entire sentence
		currentDialogueIndex++;
		if (currentDialogueIndex < PROLOGUE_TEXTS.length) {
			showText(PROLOGUE_TEXTS[currentDialogueIndex]);
		} else {
			startLevel(0);
		}
		return;
	}

	if (stage === "level_intro") {
		if (isTyping) return;
		currentDialogueIndex++;
		const currentLevel = LEVELS[currentLevelIndex];

		if (currentDialogueIndex < currentLevel.introTexts.length) {
			showText(currentLevel.introTexts[currentDialogueIndex]);
		} else {
			stage = "memorizing";
			lastTick = 0;
			showText(currentLevel.focusText);
		}
		return;
	}

	if (stage === "gameover") {
		if (isTyping) return;
		currentDialogueIndex++;
		if (currentDialogueIndex < EPILOGUE_TEXTS.length) {
			showText(EPILOGUE_TEXTS[currentDialogueIndex]);
		} else {
			stage = "end";
			showText("");
		}
		return;
	}

	// if audio is on but browser doesn't want to, just click
	if (audioEnabled && bgMusic.paused) {
		bgMusic.play().catch(() => { });
	}

	const mouse = getMousePos(e);

	if (isInside(mouse, UI_BUTTONS.audio)) {
		toggleAudio();
		return;
	}

	// menu buttons control
	if (stage === "menu") {
		if (isInside(mouse, UI_BUTTONS.start)) {
			playSound("/assets/snap.wav");
			stage = "prologue";
			currentDialogueIndex = 0;
			showText(PROLOGUE_TEXTS[0]);
		}
		if (isInside(mouse, UI_BUTTONS.github)) {
			window.open("https://github.com/siderilla", "_blank");
		}
		return;
	}

	if (stage !== "puzzle") return; // only in puzzle stage

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
	mousePos = getMousePos(e);

	if (!draggedTile) return;

	// the tile will be centered to the pointer
	draggedTile.x = mousePos.x - draggedTile.w / 2;
	draggedTile.y = mousePos.y - draggedTile.h / 2;
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
		console.log("Completed");
		stage = "victory";
		showText(LEVELS[currentLevelIndex].outroText);

		setTimeout(() => {
			// check if there are other levels
			if (currentLevelIndex < LEVELS.length - 1) {
				// next level
				startLevel(currentLevelIndex + 1);
			} else {
				stage = "gameover";
				currentDialogueIndex = 0;
				showText(EPILOGUE_TEXTS[0]);
			}
		}, 5000);
	}
}

function startLevel(index) {
	currentLevelIndex = index;
	const levelData = LEVELS[currentLevelIndex];

	// memory load
	img.src = levelData.src;

	// timer reset
	countdown = levelData.time;
	lastTick = 0;
	stage = "level_intro";
	draggedTile = null;
	currentDialogueIndex = 0;
	showText(levelData.introTexts[0]);

	// all tiles aligned
	tiles.forEach(tile => {
		tile.x = tile.homeX;
		tile.y = tile.homeY;
		tile.placed = true;
		tile.angle = 0;
	});
}

let typewriterTimer = null;
let currentDialogueIndex = 0;
let isTyping = false;

function showText(text, onComplete = null) {
	const textContainer = document.getElementById("story-box");
	if (!textContainer) return;

	// cleans prev texts and stops timer
	textContainer.innerText = "";
	if (typewriterTimer) clearInterval(typewriterTimer);

	let charIndex = 0;
	isTyping = true;

	typewriterTimer = setInterval(() => {
		if (charIndex < text.length) {
			textContainer.textContent = text.slice(0, charIndex + 1);
			charIndex++;
		} else {
			clearInterval(typewriterTimer);
			isTyping = false;
			if (onComplete) onComplete();
		}
	}, 35); // 35ms typing speed
}