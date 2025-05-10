# ludo
Ludo in HTML, CSS &amp; JavaScript

![image](https://github.com/user-attachments/assets/8a4e9d58-95b7-44c3-9d9b-b455b2b2460e)


Ludo Game Project - How to Run

This document explains how to set up and run the Ludo game project. Please note that this project is currently a work in progress.

Project Files and Languages Used:

The Ludo game is built using standard web development languages:
HTML (index.html): Defines the structure of the game page.
CSS (style.css): Styles the visual appearance of the board, pieces, controls, etc.
JavaScript (script.js): Contains all the game logic, turn management, movement rules, etc.

How to Run the Project:

To run the game on your computer, follow these steps:
Create a new folder on your computer.
Inside this folder, create three new plain text files:
index.html
style.css
script.js
Copy the complete code provided for each of these files into the corresponding empty text files you just created.
Save all three files in the same folder.
Open the index.html file in your web browser (double-click it or drag it into the browser window).

Other Important Information:

Work in Progress: This is an ongoing project. Core Ludo rules are implemented, but you may encounter bugs or limitations.
Players: The game is designed for 4 human players taking turns on the same computer. There is no AI or multiplayer support.
Rules: Includes standard rules like moving pieces out with a 6, moving according to the dice roll, landing on safe squares (stars and start squares), capturing opponent pieces (on non-safe, non-blocked squares), and getting pieces home.
Special Squares: The board includes visually distinct stars (safe squares from capture) and specific squares that are implemented as places pieces cannot land on, based on the reference image provided.
Debugging: If you encounter issues, open your browser's developer console (usually F12) to check for error messages or game state logs.

--------------

Rules

-------------

1. Basic Setup & Objective:
4 Players: Red, Green, Yellow, Blue (players array).
4 Pieces per Player: (piecesPerPlayer = 4).
Objective: Be the first player to move all 4 of your pieces from your starting base, around the board, up your home path, and into the center "finish" area (checkWinCondition).
2. Dice Rolling & Turns:
Single Die: A standard 6-sided die is used (Math.floor(Math.random() * 6) + 1).
Turn Progression: Players take turns in a set order (Red -> Green -> Yellow -> Blue -> Red...). (nextTurn() and currentPlayerIndex).
Rolling a 6:
Extra Turn: If a player rolls a 6, they get an extra turn (unless it's their third consecutive 6). (handlePieceClick checks currentDiceRoll === 6).
Bringing a Piece Out: A 6 is required to move a piece from the player's base onto their starting square. (getMovablePieces and calculateTargetSquareId for 'base' type pieces).
Three Consecutive Sixes: If a player rolls three 6s in a row, their turn is forfeited, and any pieces moved by the first two 6s remain, but the third 6 is voided. (rolledSixStreak === 3 in rollDice).
3. Piece Movement:
Path: Pieces move clockwise around the main track (pathLength = 52). The getPathCoordinates function defines this path.
Counting: Pieces move the number of squares indicated by the dice roll.
Entering Home Path: Each color has a specific entry point to their home path. Pieces turn off the main track to enter their colored home path. (calculateTargetSquareId checks currentSimIndex === homeEntryOffset[pieceColor]).
Home Path Movement: Pieces move up their home path.
Reaching Finish: An exact dice roll is required to land a piece in the center "finish" area. If the roll is too high, the piece cannot move. (calculateTargetSquareId for type === 'home', checking targetHomeIndex === homePathSquares for exact finish, or null if overshot).
Piece Reaches Home (Extra Turn): When a piece successfully reaches the finish area, the player gets an extra turn. (handlePieceClick checks pieceReachedHome).
4. Capturing ("Killing") Opponent Pieces:
Landing on Opponent: If a player's piece lands on a square occupied by a single opponent's piece, the opponent's piece is "captured" and sent back to its starting base area. (handlePieceClick logic).
Capture Grants Extra Turn: Capturing an opponent's piece grants the player an extra turn. (handlePieceClick checks capturedOpponent).
No Capture on Safe Squares: Pieces on "safe squares" (see below) cannot be captured. (handlePieceClick checks !targetSquare.dataset.safe).
No Capture on Blocked Squares: The designated "blocked squares" cannot be landed on, thus no capture can occur there either. (handlePieceClick checks !targetSquareIsBlocked).
5. Special Squares:
Start Squares: Each player has a designated start square. These are marked as safe (dataset.safe = 'true').
A piece coming out of base with a 6 can land on its start square even if an opponent is there (and will capture them). This is handled by "Rule 1" in canLandOn.
For pieces already on the path, an opponent on another player's start square is safe.
Safe Squares (Star Squares): Certain squares on the board are marked as "safe" (visually with a star, safeSquareIndices = [9, 22, 35, 48]).
Pieces on these squares cannot be captured.
A player cannot land on a safe square if an opponent's piece is already occupying it. (canLandOn "Rule 4").
Blocked Squares: Specific squares (blockedSquareIndices = [0, 13, 26, 39], which are the squares immediately before each player's start square) cannot be landed on by any piece. This is a specific rule variant implemented. (canLandOn "Rule 2").
6. Blockades (Forming a "Block"):
Own Pieces: A player cannot land a piece on a square that already contains two of their own pieces. Essentially, you cannot form a stack of 3 or more of your own pieces. (canLandOn "Rule 3").
Opponent Pieces (on non-safe, non-blocked squares): If two or more opponent pieces occupy the same non-safe, non-blocked square, they form a blockade. A player cannot land their piece on such a square. (canLandOn "Rule 5").
7. Winning the Game:
The first player to move all four of their pieces into their finish area wins the game. (checkWinCondition).
Not Implemented (or not explicitly clear from the code):
Passing a Blockade: Some Ludo versions allow a player to pass an opponent's blockade if they roll the exact number to land on the square beyond the blockade. This code seems to prevent landing on the blockade square itself, implying you can't pass it with that piece.
Choice on Rolling a 6 when all pieces are out: If a 6 is rolled and all pieces are out of base, some rules force the player to move a piece 6 steps. This code allows the player to choose any valid move.
Getting a piece out if start is blocked by own piece(s): The canLandOn "Rule 1" allows moving out from base if fewer than 2 own pieces are on the start square. If 2 own pieces are on the start, the piece cannot come out.
This covers the main Ludo rules enforced by your script.js. The implementation includes common rules along with some specific interpretations like the "blocked squares" and the detailed interaction of safe squares with captures.