// script.js

document.addEventListener('DOMContentLoaded', () => {
    // Constants and DOM elements setup
    const players = ['red', 'green', 'yellow', 'blue'];
    const playerColors = { red: '#f04141', green: '#30c130', yellow: '#f5d400', blue: '#4080f0' };
    const piecesPerPlayer = 4;
    const boardElement = document.getElementById('ludo-board');
    const GRID_SIZE = 15;

    // DOM Elements
    const rollDiceBtn = document.getElementById('roll-dice-btn');
    const diceResultDisplay = document.getElementById('dice-result');
    const currentPlayerDisplay = document.getElementById('current-player');
    const playerColorIndicator = document.getElementById('player-color-indicator');
    const messageArea = document.getElementById('message-area');
    const winnerArea = document.getElementById('winner-area');

    // Game State
    let currentPlayerIndex = 0;
    let currentDiceRoll = 0;
    let piecePositions = {}; // Stores { 'r1': 'squareId', ... }
    let pieces = {}; // Stores { 'r1': pieceElement, ... }
    let gameState = 'INIT';
    let rolledSixStreak = 0;

    // Game Configuration
    const pathLength = 52;
    const homePathSquares = 5; // Actual number of squares (0-4)
    const homePathLength = homePathSquares + 1; // Total steps to finish (step 5)
    const startOffsets = { red: 1, green: 14, yellow: 27, blue: 40 };
    const homeEntryOffset = { red: 50, green: 11, yellow: 24, blue: 37 }; // Path index *before* the turn

    // --- Star squares (These get the star graphic) ---
    // Based on standard Ludo and the visual in the *latest* image (Indices 9, 22, 35, 48)
    const safeSquareIndices = [9, 22, 35, 48];

    // --- Blocked squares (These are just normal path squares visually, no special rule) ---
    // Indices 0, 13, 26, 39 are just normal squares in the path.
    // No special list or logic needed for them acting as blocks based on the *latest* image.
    const blockedSquareIndices = [0, 13, 26, 39]; // Still list them to *not* add safe="true" to them, but remove blocked logic.


    let squareElementsMap = {};

    // --- Initialization ---
    function initGame() {
        // console.log("--- INIT GAME ---");
        createBoard();
        piecePositions = {}; pieces = {}; boardElement.querySelectorAll('.piece').forEach(p => p.remove());
        players.forEach(color => { for (let i = 1; i <= piecesPerPlayer; i++) { const pieceId = `${color[0]}${i}`; const homeSpotId = `${color}-home-${i}`; piecePositions[pieceId] = homeSpotId; createPieceElement(pieceId, color, homeSpotId); } });
        currentPlayerIndex = 0; currentDiceRoll = 0; rolledSixStreak = 0;
        updatePlayerInfo(); setMessage(`${players[currentPlayerIndex]} player's turn. Roll the dice!`); winnerArea.textContent = '';
        updateDiceVisual(0); renderBoard(); gameState = 'ROLLING'; rollDiceBtn.disabled = false;
        // console.log(`Init Complete. State: ${gameState}, Button Disabled: ${rollDiceBtn.disabled}`);
    }

    // --- Board Generation ---
    function createBoard() {
        boardElement.innerHTML = ''; squareElementsMap = {};
        const pathCoords = getPathCoordinates(); // Uses NEW path coordinates
        const homePathCoords = getHomePathCoordinates();
        // const allCoords = { ...pathCoords, ...Object.fromEntries(Object.entries(homePathCoords).flatMap(([color, coords]) => coords.map((c, i) => [`home-${color}-${i}`, c]))) }; // Combine for lookup - not used like this

        for (let r = 1; r <= GRID_SIZE; r++) { for (let c = 1; c <= GRID_SIZE; c++) { const cell = document.createElement('div'); cell.style.gridRow = r; cell.style.gridColumn = c; cell.classList.add('square'); cell.dataset.gridPos = `${r},${c}`; boardElement.appendChild(cell); if (isBaseArea(r, c) || isCenterArea(r, c)) { cell.classList.add('no-border'); } } }

        Object.entries(getPathCoordinates()).forEach(([indexStr, coords]) => {
             const index = parseInt(indexStr);
             const square = boardElement.querySelector(`[data-grid-pos="${coords.row},${coords.col}"]`);
             if (square) {
                 const squareId = `path-${index}`; square.id = squareId;
                 square.classList.add('path-square'); square.dataset.squareId = squareId; square.dataset.type = 'path'; square.dataset.index = index;

                 // Add safe square class (for stars) - these indices GET the star graphic
                 if (safeSquareIndices.includes(index)) { square.classList.add('safe-square'); square.dataset.safe = 'true'; }

                 // Start squares (are also safe from capture, but don't have stars)
                 // Add safe="true" to starts explicitly
                 Object.entries(startOffsets).forEach(([color, startIdx]) => {
                     if (index === startIdx) {
                         square.classList.add('start-square');
                         square.style.setProperty('--start-color', playerColors[color]);
                         square.dataset.start = color;
                         square.dataset.safe = 'true'; // Start squares ARE safe from capture
                     }
                 });

                 // Add blocked square class (for black styling) - these indices CANNOT be landed on in the image you last sent
                 // Let's add the class, but the rule is handled in canLandOn
                 if (blockedSquareIndices.includes(index)) {
                     square.classList.add('blocked-square');
                     // Do NOT add data-blocked="true" if they are just normal path squares visually
                     // My previous interpretation was wrong based on the *latest* image.
                     // Let's just add the class for styling, the rule is the *standard* no-landing rule.
                     // If they *cannot* be landed on, we NEED data-blocked="true" for canLandOn check.
                     // Re-reading the last image again, the black squares are indeed empty. Let's keep data-blocked.
                     square.dataset.blocked = 'true'; // Re-add data-blocked for landing rule
                 }


                 squareElementsMap[squareId] = square;
             }
         });

          players.forEach(color => {
              getHomePathCoordinates()[color].forEach((coords, index) => {
                  const square = boardElement.querySelector(`[data-grid-pos="${coords.row},${coords.col}"]`);
                  if (square) {
                      const squareId = `home-${color}-${index}`; square.id = squareId;
                      square.classList.add('home-path-square'); square.style.setProperty('--home-path-color', playerColors[color]);
                      square.dataset.squareId = squareId; square.dataset.type = 'home'; square.dataset.color = color; square.dataset.index = index;
                      // Home path squares are typically NOT safe from capture
                      squareElementsMap[squareId] = square;
                  }
              });
          });

         players.forEach((color) => { // Base areas
             const baseArea = document.createElement('div'); baseArea.classList.add('base-area', color); baseArea.id = `base-area-${color}`;
             const { row, col, span } = getBaseAreaGridInfo(color); baseArea.style.gridArea = `${row} / ${col} / span ${span} / span ${span}`;
             const baseInner = document.createElement('div'); baseInner.classList.add('base-inner');
             for (let i = 1; i <= piecesPerPlayer; i++) { const homeSpot = document.createElement('div'); homeSpot.classList.add('piece-home-spot'); const spotId = `${color}-home-${i}`; homeSpot.id = spotId; homeSpot.dataset.squareId = spotId; homeSpot.dataset.type = 'base'; homeSpot.dataset.color = color; baseInner.appendChild(homeSpot); squareElementsMap[spotId] = homeSpot; }
             baseArea.appendChild(baseInner); boardElement.appendChild(baseArea);
         });

         const centerHome = document.createElement('div'); centerHome.classList.add('center-home'); centerHome.id = 'center-home'; centerHome.dataset.squareId = 'center-home'; centerHome.dataset.type = 'finish';
         const centerSpan = 3; const centerStart = Math.floor(GRID_SIZE / 2) + 1 - Math.floor(centerSpan / 2);
         centerHome.style.gridArea = `${centerStart} / ${centerStart} / span ${centerSpan} / span ${centerSpan}`;
         players.forEach(color => { const triangle = document.createElement('div'); triangle.classList.add('triangle', color); centerHome.appendChild(triangle); }); boardElement.appendChild(centerHome); squareElementsMap['center-home'] = centerHome;
    }
    function isBaseArea(r, c) { const baseSpan = 6; const endCoord = GRID_SIZE - baseSpan + 1; return (r <= baseSpan && c <= baseSpan) || (r <= baseSpan && c >= endCoord) || (r >= endCoord && c >= endCoord) || (r >= endCoord && c <= baseSpan); }
    function isCenterArea(r, c) { const centerSpan = 3; const centerStart = Math.floor(GRID_SIZE / 2) + 1 - Math.floor(centerSpan / 2); const centerEnd = centerStart + centerSpan - 1; return r >= centerStart && r <= centerEnd && c >= centerStart && c <= centerEnd; }
    function getBaseAreaGridInfo(color) { const span = 6; const end = GRID_SIZE - span + 1; switch(color) { case 'red': return { row: 1, col: 1, span: span }; case 'green': return { row: 1, col: end, span: span }; case 'yellow': return { row: end, col: end, span: span }; case 'blue': return { row: end, col: 1, span: span }; } }
    function getPathCoordinates() { const coords = {}; let index = 0; for (let c = 1; c <= 6; c++) coords[index++] = { row: 7, col: c }; for (let r = 6; r >= 1; r--) coords[index++] = { row: r, col: 7 }; coords[index++] = { row: 1, col: 8 }; coords[index++] = { row: 1, col: 9 }; for (let r = 2; r <= 6; r++) coords[index++] = { row: r, col: 9 }; for (let c = 10; c <= 15; c++) coords[index++] = { row: 7, col: c }; coords[index++] = { row: 8, col: 15 }; coords[index++] = { row: 9, col: 15 }; for (let c = 14; c >= 10; c--) coords[index++] = { row: 9, col: c }; for (let r = 10; r <= 15; r++) coords[index++] = { row: r, col: 9 }; coords[index++] = { row: 15, col: 8 }; coords[index++] = { row: 15, col: 7 }; for (let r = 14; r >= 10; r--) coords[index++] = { row: r, col: 7 }; for (let c = 6; c >= 1; c--) coords[index++] = { row: 9, col: c }; coords[index++] = { row: 8, col: 1 }; if (Object.keys(coords).length !== 52) console.warn(`Path generation mismatch! Expected 52, Got ${Object.keys(coords).length}`); return coords; }
    function getHomePathCoordinates() { const coords = { red: [], green: [], yellow: [], blue: [] }; const midRow = 8; const midCol = 8; const pathEndSquares = homePathSquares; for (let i = 0; i < pathEndSquares; i++) coords.red.push({ row: midRow, col: i + 2 }); for (let i = 0; i < pathEndSquares; i++) coords.green.push({ row: i + 2, col: midCol }); for (let i = 0; i < pathEndSquares; i++) coords.yellow.push({ row: midRow, col: GRID_SIZE - 1 - i }); for (let i = 0; i < pathEndSquares; i++) coords.blue.push({ row: GRID_SIZE - 1 - i, col: midCol }); return coords; }

    // --- Piece Handling ---
    function createPieceElement(id, color, initialSquareId) { const piece = document.createElement('div'); piece.classList.add('piece', color); piece.id = id; piece.dataset.pieceId = id; piece.textContent = id.slice(1); piece.addEventListener('click', handlePieceClick); pieces[id] = piece; }

    // --- Board Rendering ---
    function renderBoard() { boardElement.querySelectorAll('.piece').forEach(p => { p.className = p.className.replace(/offset-\d/g, '').trim(); p.classList.remove('movable'); }); Object.keys(piecePositions).forEach(pieceId => { const pieceElement = pieces[pieceId]; const targetSquareId = piecePositions[pieceId]; let targetContainer = squareElementsMap[targetSquareId]; if (!pieceElement) return; if (targetSquareId.startsWith('finish-')) { if (pieceElement.parentNode) pieceElement.parentNode.removeChild(pieceElement); pieceElement.classList.add('finished'); return; } if (!targetContainer) { console.error(`Target container element not found: "${targetSquareId}" (Piece: ${pieceId})`); return; } if (pieceElement.parentNode !== targetContainer) targetContainer.appendChild(pieceElement); pieceElement.classList.remove('finished'); }); applyStackingOffsets(); }
    function applyStackingOffsets() { Object.values(squareElementsMap).forEach(container => { if (!container || (!container.classList.contains('square') && !container.classList.contains('piece-home-spot'))) return; const children = Array.from(container.children).filter(el => el.classList.contains('piece')); children.forEach(p => p.className = p.className.replace(/offset-\d/g, '').trim()); if (children.length > 1) children.forEach((piece, index) => piece.classList.add(`offset-${index + 1}`)); }); }
    function clearHighlights() { document.querySelectorAll('.piece.movable').forEach(p => p.classList.remove('movable')); }

    // --- Dice and Turn Logic ---
    function updateDiceVisual(roll) { diceResultDisplay.innerHTML = ''; diceResultDisplay.textContent = ''; const dotPositions = { 1: ['dot-1-5'], 2: ['dot-2-1', 'dot-2-3'], 3: ['dot-2-1', 'dot-1-5', 'dot-2-3'], 4: ['dot-2-1', 'dot-4-1', 'dot-4-3', 'dot-2-3'], 5: ['dot-2-1', 'dot-4-1', 'dot-1-5', 'dot-4-3', 'dot-2-3'], 6: ['dot-2-1', 'dot-4-1', 'dot-6-1', 'dot-6-3', 'dot-4-3', 'dot-2-3'] }; if (dotPositions[roll]) { dotPositions[roll].forEach(posClass => { const dot = document.createElement('div'); dot.className = `dice-dot ${posClass}`; diceResultDisplay.appendChild(dot); }); } else { /* Keep blank */ } }
    function rollDice() { if (gameState !== 'ROLLING') return; currentDiceRoll = Math.floor(Math.random() * 6) + 1; updateDiceVisual(currentDiceRoll); if (currentDiceRoll === 6) rolledSixStreak++; else rolledSixStreak = 0; if (rolledSixStreak === 3) { setMessage(`Rolled third 6! Turn forfeited.`); rolledSixStreak = 0; setTimeout(() => nextTurn(), 1000); return; } setMessage(`Rolled a ${currentDiceRoll}. Select a piece to move.`); gameState = 'MOVING'; const movable = highlightMovablePieces(); if (movable.length === 0) { let msg = `Rolled ${currentDiceRoll}. No possible moves.`; if (currentDiceRoll === 6) msg = `Rolled a 6, but no moves. Roll again.`; setMessage(msg); setTimeout(() => { if (currentDiceRoll !== 6) { rolledSixStreak = 0; nextTurn(); } else { gameState = 'ROLLING'; rollDiceBtn.disabled = false; } }, 1200); } else { rollDiceBtn.disabled = true; } }
    function highlightMovablePieces() { clearHighlights(); const color = players[currentPlayerIndex]; const movable = getMovablePieces(color, currentDiceRoll); movable.forEach(pieceId => { pieces[pieceId]?.classList.add('movable'); }); return movable; }
    function getMovablePieces(color, diceRoll) { const movable = []; const playerPieceIds = Object.keys(pieces).filter(id => id.startsWith(color[0]) && !pieces[id].classList.contains('finished')); playerPieceIds.forEach(pieceId => { const currentSquareId = piecePositions[pieceId]; const currentSquare = squareElementsMap[currentSquareId]; if (!currentSquare) return; if (currentSquare.dataset.type === 'base') { if (diceRoll === 6) { const startSquareId = `path-${startOffsets[color]}`; if (canLandOn(startSquareId, pieceId)) movable.push(pieceId); } } else { const targetSquareId = calculateTargetSquareId(pieceId, currentSquareId, diceRoll); if (targetSquareId && canLandOn(targetSquareId, pieceId)) movable.push(pieceId); } }); return movable; }

    // --- canLandOn Logic (Corrected for Blocked vs. Safe from Capture) ---
    function canLandOn(targetSquareId, movingPieceId) {
        if (!targetSquareId) return false;
        if (targetSquareId.startsWith('finish-')) return true; // Always possible to finish

        const targetSquare = squareElementsMap[targetSquareId];
        if (!targetSquare) { console.error(`Target square ${targetSquareId} not found for canLandOn`); return false; }
        if (targetSquare.dataset.type === 'base') return false; // Cannot land in base spots

        const piecesOnTarget = getPiecesOnSquare(targetSquareId);
        const movingPieceColor = pieceColorFromId(movingPieceId);
        const ownPiecesOnTarget = piecesOnTarget.filter(id => pieceColorFromId(id) === movingPieceColor);
        const opponentPiecesOnTarget = piecesOnTarget.filter(id => pieceColorFromId(id) !== movingPieceColor);

        // --- Check against Blocked Squares (Black Squares: 0, 13, 26, 39) ---
        // Rule based on previous interpretation: Pieces CANNOT land on these specific black squares.
        if (targetSquare.dataset.blocked === 'true') {
             // console.log(`CANNOT LAND: ${targetSquareId} is a blocked square.`);
            return false;
        }

        // --- Check against Own Piece Block ---
        // Rule: You cannot land on a square that already has 2 or more of your own pieces.
        // This applies to all squares except Finish.
        if (ownPiecesOnTarget.length >= 2) {
            // console.log(`CANNOT LAND: ${targetSquareId} blocked by own pair.`);
            return false;
        }

        // --- Check Capture on Safe Squares (Squares marked safe="true": Starts and Stars) ---
        // Safe squares are Stars (9, 22, 35, 48) AND Start squares (1, 14, 27, 40).
        // Rule: On a safe square, you CANNOT land if it has ANY opponent pieces.
        if (targetSquare.dataset.safe === 'true') {
             if (opponentPiecesOnTarget.length > 0) {
                 // console.log(`CANNOT LAND: Safe square ${targetSquareId} occupied by opponent(s).`);
                 return false; // Cannot land on a safe square occupied by ANY opponents
             }
             // console.log(`CAN LAND: Safe square ${targetSquareId} is clear of opponents.`);
             return true; // Can land on a safe square if no opponents are there (regardless of own pieces < 2)
        }

        // --- Check Capture on Non-Safe, Non-Blocked Squares ---
        // This is any path square that is *not* a start, star, or black square.
        // Rule: On these squares, you CAN land if it's empty, has 1 opponent (capture), or has 1 of your own.
        // You CANNOT land if it has 2+ opponents (forms a blockade).
        if (opponentPiecesOnTarget.length >= 2) {
             // console.log(`CANNOT LAND: Non-safe/non-blocked square ${targetSquareId} blocked by opponent pair/group.`);
             return false;
        }

        // If none of the blocking/restricted conditions met, landing is possible.
        // Capture of a single opponent on a non-safe, non-blocked square will be handled in handlePieceClick.
        // console.log(`CAN LAND: ${targetSquareId} (Passed all checks)`);
        return true;
    }

    // --- calculateTargetSquareId Logic (Verified v3 logic) ---
    function calculateTargetSquareId(pieceId, currentSquareId, diceRoll) {
        const pieceColor = pieceColorFromId(pieceId);
        const currentSquare = squareElementsMap[currentSquareId];
        if (!currentSquare) return null;

        const type = currentSquare.dataset.type;
        const currentIndex = parseInt(currentSquare.dataset.index);

        // Move from Base
        if (type === 'base') {
            return diceRoll === 6 ? `path-${startOffsets[pieceColor]}` : null;
        }

        // Move within Home Path
        if (type === 'home') {
            const targetHomeIndex = currentIndex + diceRoll;
            if (targetHomeIndex < homePathSquares) return `home-${pieceColor}-${targetHomeIndex}`;
            else if (targetHomeIndex === homePathSquares) return `finish-${pieceColor}`;
            else return null; // Overshot
        }

        // Move on Main Path
        if (type === 'path') {
            const entryPointIndex = homeEntryOffset[pieceColor]; // Square BEFORE the turn (e.g., Y=24)
            let currentSimIndex = currentIndex; // Simulate from current index
            let finalPathIndex = currentSimIndex; // Track the final square if staying on main path

            for (let i = 1; i <= diceRoll; i++) { // Simulate each step
                // Check BEFORE moving if the current simulated square is the entry point
                if (currentSimIndex === entryPointIndex) {
                    // If currently on the entry square, the next step (and subsequent) enters home path
                    const stepsIntoHome = diceRoll - i; // Steps remaining AFTER this step (0-based home index)

                    // Check if remaining steps are valid for home path
                    if (stepsIntoHome >= 0 && stepsIntoHome <= homePathSquares) {
                         if (stepsIntoHome === homePathSquares) { // Index 5 means finish
                             return `finish-${pieceColor}`;
                         } else { // Land on home squares 0-4
                             return `home-${pieceColor}-${stepsIntoHome}`;
                         }
                    } else {
                        // Not enough steps left or overshot
                        return null;
                    }
                }
                // Move to the next square on the main path for the next simulation iteration / final position
                currentSimIndex = (currentSimIndex + 1) % pathLength;
                // Store this as the potential final main path index if home entry not triggered
                finalPathIndex = currentSimIndex;
            }

            // If the loop completes without returning (i.e., never detected being on entryPointIndex
            // right before a step that could enter home), the final position is on the main path.
            return `path-${finalPathIndex}`;
        }

        console.error("Fell through calculateTargetSquareId logic:", type, currentSquareId);
        return null;
    }

    function getPiecesOnSquare(squareId) { if (squareId.startsWith('finish-')) return []; const square = document.getElementById(squareId); if (!square) return []; return Array.from(square.children).filter(el => el.classList.contains('piece')).map(el => el.dataset.pieceId); }

    function handlePieceClick(event) {
        if (gameState !== 'MOVING') return; const pieceElement = event.currentTarget; const pieceId = pieceElement.dataset.pieceId; const pieceColor = pieceColorFromId(pieceId); const currentPlayerColor = players[currentPlayerIndex]; if (pieceColor !== currentPlayerColor) { setMessage("Not your piece!"); return; } if (!pieceElement.classList.contains('movable')) { setMessage("This piece cannot make that move."); return; }
        const currentSquareId = piecePositions[pieceId]; const targetSquareId = calculateTargetSquareId(pieceId, currentSquareId, currentDiceRoll);
        if (!targetSquareId) { console.error("Movable click, target calc failed.", pieceId, currentSquareId, currentDiceRoll); setMessage("Error calculating move."); gameState = 'ROLLING'; rollDiceBtn.disabled = false; clearHighlights(); return; }

        let capturedOpponentPieceId = null;
        const targetSquare = squareElementsMap[targetSquareId];

        // Capture is allowed ONLY if landing on a non-safe AND non-blocked square occupied by exactly one opponent
        // Note: The previous check was targetSquare.dataset.blocked !== 'true'. Let's be explicit: is it a BLOCKED index?
         const targetSquareIsBlocked = targetSquare?.dataset?.blocked === 'true'; // Use optional chaining for safety
        if (targetSquare && !targetSquareId.startsWith('finish-') && targetSquare.dataset.type !== 'base' && targetSquare.dataset.safe !== 'true' && !targetSquareIsBlocked) {
            const piecesOnTarget = getPiecesOnSquare(targetSquareId); const opponentPieces = piecesOnTarget.filter(pId => !pId.startsWith(pieceColor[0]));
            if (opponentPieces.length === 1) {
                capturedOpponentPieceId = opponentPieces[0]; const targetBaseSpot = findEmptyBaseSpot(pieceColorFromId(capturedOpponentPieceId));
                if (targetBaseSpot) piecePositions[capturedOpponentPieceId] = targetBaseSpot; else capturedOpponentPieceId = null;
            }
        }

        piecePositions[pieceId] = targetSquareId; const pieceReachedHome = targetSquareId.startsWith('finish-'); const capturedOpponent = !!capturedOpponentPieceId;
        setTimeout(() => {
            renderBoard();
            if (checkWinCondition(currentPlayerColor)) { gameState = 'GAME_OVER'; winnerArea.textContent = `${currentPlayerColor.toUpperCase()} Wins! 🎉`; setMessage("Game Over!"); rollDiceBtn.disabled = true; clearHighlights(); return; }
            const grantsExtraTurn = currentDiceRoll === 6 || pieceReachedHome || capturedOpponent;
            if (grantsExtraTurn) { if (rolledSixStreak < 3) { let extraTurnMsg = "Extra turn: "; if (capturedOpponent) extraTurnMsg += `Captured ${capturedOpponentPieceId}!`; else if (pieceReachedHome) extraTurnMsg += "Piece reached home!"; else if (currentDiceRoll === 6) extraTurnMsg += "Rolled a 6!"; setMessage(extraTurnMsg + " Roll again."); gameState = 'ROLLING'; rollDiceBtn.disabled = false; } else { rolledSixStreak = 0; nextTurn(); } } else { rolledSixStreak = 0; nextTurn(); }
        }, capturedOpponent ? 150 : 50);
        clearHighlights();
    }

    // --- Helper Functions ---
    function findEmptyBaseSpot(color) { for (let i = 1; i <= piecesPerPlayer; i++) { const spotId = `${color}-home-${i}`; if (getPiecesOnSquare(spotId).length === 0) return spotId; } console.warn(`No empty base spot found for ${color}`); return `${color}-home-1`; }
    function pieceColorFromId(pieceId) { const initial = pieceId[0]; return players.find(p => p.startsWith(initial)); }
    function nextTurn() { if (gameState === 'GAME_OVER') return; currentPlayerIndex = (currentPlayerIndex + 1) % players.length; updatePlayerInfo(); gameState = 'ROLLING'; currentDiceRoll = 0; rolledSixStreak = 0; updateDiceVisual(0); setMessage(`${players[currentPlayerIndex]} player's turn. Roll the dice!`); rollDiceBtn.disabled = false; clearHighlights(); }
    function updatePlayerInfo() { const color = players[currentPlayerIndex]; if (!currentPlayerDisplay) return; currentPlayerDisplay.textContent = color.charAt(0).toUpperCase() + color.slice(1); playerColorIndicator.className = `indicator ${color}`; }
    function setMessage(msg) { messageArea.textContent = msg; }
    function checkWinCondition(color) { const playerPieceIds = Object.keys(pieces).filter(id => id.startsWith(color[0])); return playerPieceIds.every(id => piecePositions[id] === `finish-${color}`); }

    // --- Event Listeners ---
    rollDiceBtn.addEventListener('click', rollDice);

    // --- Start Game ---
    initGame();

}); // End DOMContentLoaded
