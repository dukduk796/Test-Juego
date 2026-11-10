const imageUrl = 'British.png';
const cols = 4;
const rows = 3;
const maxContainerWidth = 400;

let app;
let texture;
let pieces = [];
let currentOrder = [];
let timer = null;
let timeLeft = 60;
let gameActive = false;
let draggedPiece = null;
let originalPosition = { posIndex: 0 };

const container = document.getElementById('puzzle-container');
const infoDiv = document.getElementById('game-info');
const messageDiv = document.getElementById('message');
const restartBtn = document.getElementById('restart-btn');

async function loadGameImage() {
    messageDiv.textContent = '';
    restartBtn.style.display = 'none';
    infoDiv.textContent = "Cargando imagen...";

    if (!app) {
        // Sintaxis de inicialización para PixiJS v7
        app = new PIXI.Application({
            width: 400,
            height: 300,
            backgroundColor: 0x000000
        });
        container.appendChild(app.view);
    } else {
        app.stage.removeChildren();
    }

    try {
        texture = await PIXI.Assets.load(imageUrl);
        setupGame();
    } catch (e) {
        infoDiv.textContent = "Error al cargar la imagen 'British.png'";
    }
}

function setupGame() {
    const imgAspect = texture.width / texture.height;
    const containerWidth = maxContainerWidth;
    const containerHeight = containerWidth / imgAspect;

    app.renderer.resize(containerWidth, containerHeight);
    container.style.width = `${containerWidth}px`;
    container.style.height = `${containerHeight}px`;

    const pieceWidth = containerWidth / cols;
    const pieceHeight = containerHeight / rows;

    // Fase 1: Previsualización de la imagen completa
    const fullSprite = new PIXI.Sprite(texture);
    fullSprite.width = containerWidth;
    fullSprite.height = containerHeight;
    app.stage.addChild(fullSprite);

    infoDiv.textContent = "¡Memoriza la imagen!";

    setTimeout(() => {
        app.stage.removeChildren();
        initPuzzlePieces(pieceWidth, pieceHeight);
    }, 1500);
}

function initPuzzlePieces(pieceWidth, pieceHeight) {
    pieces = [];
    currentOrder = [];

    const pieceW = texture.width / cols;
    const pieceH = texture.height / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const index = r * cols + c;
            
            const pieceContainer = new PIXI.Container();
            pieceContainer.interactive = true;
            pieceContainer.cursor = 'grab';
            pieceContainer.correctIndex = index;

            const rect = new PIXI.Rectangle(c * pieceW, r * pieceH, pieceW, pieceH);
            const subTexture = new PIXI.Texture(texture.baseTexture, rect);

            const sprite = new PIXI.Sprite(subTexture);
            sprite.width = pieceWidth;
            sprite.height = pieceHeight;
            pieceContainer.addChild(sprite);

            const border = new PIXI.Graphics();
            border.lineStyle(1, 0x000000, .8);
            border.drawRect(0, 0, pieceWidth, pieceHeight);
            pieceContainer.addChild(border);
            pieceContainer.borderGraphic = border;

            pieces.push(pieceContainer);
            currentOrder.push(index);
        }
    }

    shuffleAndStart(pieceWidth, pieceHeight);
}

function shuffleAndStart(pieceWidth, pieceHeight) {
    do {
        currentOrder.sort(() => Math.random() - 0.5);
    } while (isWon());

    renderPieces(pieceWidth, pieceHeight);
    gameActive = true;
    timeLeft = 60;
    infoDiv.textContent = `Tiempo restante: ${timeLeft}s`;

    if (timer) clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        infoDiv.textContent = `Tiempo restante: ${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            gameActive = false;
            messageDiv.textContent = "❌ ¡Se acabó el tiempo!";
            messageDiv.style.color = "#ff4d4d";
            restartBtn.style.display = 'block';
            disableInteraction();
        }
    }, 1500);
}

function renderPieces(pieceWidth, pieceHeight) {
    app.stage.removeChildren();

    currentOrder.forEach((pieceIndex, posIndex) => {
        const piece = pieces[pieceIndex];
        const r = Math.floor(posIndex / cols);
        const c = posIndex % cols;
        
        piece.x = c * pieceWidth;
        piece.y = r * pieceHeight;
        piece.posIndex = posIndex;

        const isCorrect = (pieceIndex === posIndex);

        if (isCorrect) {
            piece.interactive = false;
            piece.cursor = 'default';
            piece.borderGraphic.clear(); // Quita las líneas cuando encaja
        } else {
            piece.interactive = true;
            piece.cursor = 'grab';
            piece.borderGraphic.clear();
            piece.borderGraphic.lineStyle(1, 0x000000, 0.2);
            piece.borderGraphic.drawRect(0, 0, pieceWidth, pieceHeight);

            piece.removeAllListeners();

            piece.on('pointerdown', (event) => {
                if (!gameActive || isCorrect) return;
                draggedPiece = piece;
                originalPosition.posIndex = posIndex;
                originalPosition.x = piece.x;
                originalPosition.y = piece.y;
                app.stage.setChildIndex(piece, app.stage.children.length - 1);
            });

            piece.on('pointermove', (event) => {
                if (draggedPiece !== piece) return;
                const newPos = event.data.getLocalPosition(app.stage);
                piece.x = newPos.x - pieceWidth / 2;
                piece.y = newPos.y - pieceHeight / 2;
            });

            piece.on('pointerup', () => handleDrop(piece, pieceWidth, pieceHeight));
            piece.on('pointerupoutside', () => handleDrop(piece, pieceWidth, pieceHeight));
        }

        app.stage.addChild(piece);
    });
}

function handleDrop(piece, pieceWidth, pieceHeight) {
    if (!draggedPiece) return;

    const dropX = piece.x + pieceWidth / 2;
    const dropY = piece.y + pieceHeight / 2;

    const targetC = Math.floor(dropX / pieceWidth);
    const targetR = Math.floor(dropY / pieceHeight);

    if (targetC >= 0 && targetC < cols && targetR >= 0 && targetR < rows) {
        const targetPosIndex = targetR * cols + targetC;
        const sourcePosIndex = originalPosition.posIndex;

        // Evitar soltar en una celda ya bloqueada/correcta
        if (currentOrder[targetPosIndex] !== targetPosIndex) {
            let temp = currentOrder[sourcePosIndex];
            currentOrder[sourcePosIndex] = currentOrder[targetPosIndex];
            currentOrder[targetPosIndex] = temp;
        }

        renderPieces(pieceWidth, pieceHeight);

        if (isWon()) {
            clearInterval(timer);
            gameActive = false;
            infoDiv.textContent = "¡Completado con éxito!";
            messageDiv.textContent = "🎉 ¡Felicidades, ganaste un 10% de DESCUENTO!";
            messageDiv.style.color = "#4cd137";
            restartBtn.style.display = 'block';
        }
    } else {
        renderPieces(pieceWidth, pieceHeight);
    }

    draggedPiece = null;
}

function disableInteraction() {
    pieces.forEach(p => p.interactive = false);
}

function isWon() {
    return currentOrder.every((val, idx) => val === idx);
}

// Iniciar juego al cargar
loadGameImage();