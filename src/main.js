import './style.css';

const CANVAS_W = window.innerWidth;
const CANVAS_H = window.innerHeight;

const COLS = 4;
const ROWS = 3;
const TILE_W = 200;
const TILE_H = 150;

const OFFSET_X = (CANVAS_W - (COLS * TILE_W)) / 2; // 400px
const OFFSET_Y = 135;

const canva = document.getElementById("prologue");
const ctx = canva.getContext("2d");

// ensure the canvas element and 2D rendering context exist before proceeding
if (!canva || !ctx) {
	console.error("Canvas element or 2D context not found!");
} else {
	// apply the new width and height directly to the canvas element
	canva.width = CANVAS_W;
	canva.height = CANVAS_H;
}

ctx.imageSmoothingEnabled = false;

let audioEnabled = true;
const bgMusic = new Audio("./audio/ost.mp3");
bgMusic.preload = "auto";
bgMusic.volume = 0.4;
bgMusic.loop = true;

function toggleAudio() {
	audioEnabled = !audioEnabled;

	if (audioEnabled) {
		startMusic();
		bgMusic.play().catch(() => { });
	}
	else {
		bgMusic.pause();
	}
}

let musicStarted = false;

function startMusic() {
	if (musicStarted || !audioEnabled) return;

	musicStarted = true;

	bgMusic.currentTime = 0;
	bgMusic.play().catch(() => {
		console.log("Browser blocked audio");
	});
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
let victoryScale = 1.0; // scale factor for the gradual zoom animation on victory

/////////////// - story box - /////////////////

const PROLOGUE_TEXTS = [
	"Where am I...?",
	"I can't see anything clearly...",
	"I don't remember what I was doing... or who I am."
];

const LEVELS = [
	{
		src: "./pics/memory1.png",
		time: 5,
		introTexts: [
			"Wait... what's that shape?",
			"I can't see it clearly, it's all fading away..."
		],
		focusText: "Maybe if I focus more... I can hold onto it.",
		outroText: "Oh! I loved being at the beach, diving and swimming all the time when I was little."
	},
	{
		src: "./pics/memory2.png",
		time: 5,
		introTexts: [
			"Another one? A shadow near the window...",
			"It feels so warm, so familiar."
		],
		focusText: "Let me focus... don't slip away!",
		outroText: "That's Ms. Peach looking at the window! I loved her so much, always so smart and cuddly."
	},
	{
		src: "./pics/memory3.png",
		time: 5,
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
	"And my life... was so full of it."
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
	start: { x: (CANVAS_W - 400) / 2, y: 300, w: 400, h: 80, text: "[ START GAME ]" },
	github: { x: (CANVAS_W - 400) / 2, y: 420, w: 400, h: 60, text: "GitHub & Credits" },
	audio: { x: CANVAS_W - 160, y: 20, w: 140, h: 40 }
};

function countToZero(timestamp) {
	// aligns lastTick to actual time
	if (!lastTick) lastTick = timestamp;

	// background
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

	// smoothing is always disabled
	ctx.imageSmoothingEnabled = false;

	if (stage === "menu") {
		// draw menu
		ctx.font = "80px 'Tiny5-Regular'";
		ctx.fillStyle = "white";
		ctx.textAlign = "center";
		ctx.fillText("Before I Go", CANVAS_W / 2, 200);

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

	// smoothly increment scale factor during victory stage for a gentle zoom-in effect
	if (stage === "victory" && victoryScale < 1.12) {
		victoryScale += 0.0015;
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

		ctx.save(); //save context state before applying victory zoom transformation

		// scale from center of the grid when puzzle complete
		if (stage === "victory") {
			const gridCenterX = OFFSET_X + (COLS * TILE_W) / 2;
			const gridCenterY = OFFSET_Y + (ROWS * TILE_H) / 2;
			ctx.translate(gridCenterX, gridCenterY);
			ctx.scale(victoryScale, victoryScale);
			ctx.translate(-gridCenterX, -gridCenterY);
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

			ctx.restore(); // restore context state after drawing zoomed tiles
		});

		ctx.restore(); // pop the victory zoom transformation so it never compounds across frames

		ctx.filter = "none";
	}

	// draw the countdown
	// theatrical countdown: large centered numbers that expand outward and fade out each second
	if (stage === "memorizing") {
		const elapsed = lastTick ? (timestamp - lastTick) : 0;
		const progress = Math.min(1, elapsed / 1000); // 0.0 to 1.0 over each second
		const alpha = Math.max(0, 1 - Math.pow(progress, 1.5)); // smooth fade out
		const scale = 1 + progress * 0.8; // expanding zoom effect

		ctx.save();
		ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
		ctx.scale(scale, scale);
		ctx.font = "160px 'Tiny5-Regular'";
		ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(countdown, 0, 0);
		ctx.restore();
	}

	if (stage === "memorizing" && timestamp - lastTick >= 1000) {
		countdown -= 1;
		lastTick = timestamp;

		if (countdown > 0) {
			playSound("./pics/tick.wav"); // play tick sound on every second
		} else {
			stage = "puzzle";
			scatterTiles();
		}
	}

	if (stage === "last_breath") {
		ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
		ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

		ctx.save();
		ctx.font = "120px 'Tiny5-Regular'";
		ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		const displayStr = lastBreathCountdown > 0 ? String(lastBreathCountdown) : "…";
		ctx.fillText(displayStr, CANVAS_W / 2, CANVAS_H / 2 - 50);
		ctx.restore();

		if (!lastBreathTick) lastBreathTick = timestamp;

		if (timestamp - lastBreathTick >= 1200) {
			lastBreathCountdown -= 1;
			lastBreathTick = timestamp;
			playSound("./pics/heartbeat.wav");

			if (lastBreathCountdown < 0) {
				stage = "menu";
				currentLevelIndex = 0;

				const textContainer = document.getElementById("story-box");
			}
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
document.fonts.ready.then(() => requestAnimationFrame(countToZero));

console.log(tiles);

function scatterTiles() {
	let drawed = 0;
	let attempts = 0;

	// the center of the plate for scattered tiles
	const TRAY_X = CANVAS_W - 250;
	const TRAY_Y = CANVAS_H / 2;

	// max random positioning of scattered tiles
	const JITTER = 70;

	for (let i = tiles.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[tiles[i], tiles[j]] = [tiles[j], tiles[i]];
	}

	// casual positioning
	tiles.forEach(tile => {
		tile.placed = false;
		tile.x = TRAY_X + (Math.random() * JITTER - JITTER / 2);
		tile.y = TRAY_Y + (Math.random() * JITTER - JITTER / 2);
		tile.angle = (Math.random() * 40 - 20) * (Math.PI / 180); // casual rotation
	});
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
	const mouse = getMousePos(e);

	// check audio button click first so the user can toggle sound at any stage, including during dialogues
	if (isInside(mouse, UI_BUTTONS.audio)) {
		toggleAudio();
		return;
	}

	startMusic();

	// a click can complete instantly the senteces
	if (isTyping) {
		clearInterval(typewriterTimer);
		const textContainer = document.getElementById("story-box");
		if (textContainer) textContainer.textContent = currentFullText;
		isTyping = false;
		return;
	}

	// dialogue by click
	if (stage === "prologue") {
		currentDialogueIndex++;
		if (currentDialogueIndex < PROLOGUE_TEXTS.length) {
			showText(PROLOGUE_TEXTS[currentDialogueIndex]);
		} else {
			startLevel(0);
		}
		return;
	}

	if (stage === "level_intro") {
		currentDialogueIndex++;
		const currentLevel = LEVELS[currentLevelIndex];

		if (currentDialogueIndex < currentLevel.introTexts.length) {
			showText(currentLevel.introTexts[currentDialogueIndex]);
		} else {
			stage = "memorizing";
			lastTick = 0;
			showText(currentLevel.focusText);
			playSound("./pics/tick.wav");
		}
		return;
	}

	// wait for user click after completing a puzzle
	if (stage === "victory") {
		if (currentLevelIndex < LEVELS.length - 1) {
			startLevel(currentLevelIndex + 1);
		} else {
			stage = "gameover";
			currentDialogueIndex = 0;
			showText(EPILOGUE_TEXTS[0]);
		}
		return;
	}

	// return to main menu after finishing the epilogue
	if (stage === "gameover") {
		currentDialogueIndex++;

		if (currentDialogueIndex < EPILOGUE_TEXTS.length) {
			showText(EPILOGUE_TEXTS[currentDialogueIndex]);
		} else {
			startLastBreath();
		}
		return;
	}

	// menu buttons control
	if (stage === "menu") {
		if (isInside(mouse, UI_BUTTONS.start)) {
			playSound("./pics/snap.wav");
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

			// bring the dragged tile to the end of the array so it is rendered on top of all other tiles during drag
			tiles.splice(i, 1);
			tiles.push(draggedTile);
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
		victoryScale = 1.0;
		showText(LEVELS[currentLevelIndex].outroText);
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
	victoryScale = 1.0;
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
let currentFullText = ""; // store the full sentence to allow instant completion on click

let lastBreathCountdown = 3;
let lastBreathTick = 0;

function startLastBreath() {
	stage = "last_breath";
	lastBreathCountdown = 3;
	lastBreathTick = 0;

	const textContainer = document.getElementById("story-box");
	if (textContainer) {
		textContainer.innerText = "";
	}
}

function showText(text, onComplete = null) {
	const textContainer = document.getElementById("story-box");
	if (!textContainer) return;

	// cleans prev texts and stops timer
	textContainer.innerText = "";
	if (typewriterTimer) clearInterval(typewriterTimer);

	currentFullText = text; // save the target text for fast forwarding
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