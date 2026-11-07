const cells = Array.from(document.querySelectorAll('[data-cell]'));
const statusText = document.querySelector('#game-status');
const turnMark = document.querySelector('#turn-mark');
const resetButton = document.querySelector('#reset-button');
const roundNumber = document.querySelector('#round-number');
const drawMessage = document.querySelector('#draw-message');
const flyingTomato = document.querySelector('#flying-tomato');
const winOverlay = document.querySelector('#win-overlay');
const winPanel = document.querySelector('#win-panel');
const winArt = document.querySelector('#win-art');
const winKicker = document.querySelector('#win-kicker');
const winTitle = document.querySelector('#win-title');
const winCopy = document.querySelector('#win-copy');
const winClose = document.querySelector('#win-close');

const winningLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

let board = Array(9).fill('');
let currentPlayer = 'X';
let gameOver = false;
let round = 1;
let audioContext;

function drawTomato() {
  const context = flyingTomato.getContext('2d');
  const pixels = [
    '......GG..GG....',
    '.....GGGGGGG....',
    '....GRGGGGGRG...',
    '...RRRRRRRRRR...',
    '..RRRRRRRRRRRR..',
    '..RRRRRRRRRRRR..',
    '.RRRRRRRRRRRRRR.',
    '.RRRRRRRRRRRRRR.',
    '.RRRRRRRRRRRRRR.',
    '..RRRRRRRRRRRR..',
    '..RRRRRRRRRRRR..',
    '...RRRRRRRRRR...',
    '....RRRRRRRR....',
    '.....RRRRRR.....',
    '......RRRR......',
    '................',
  ];
  const palette = { R: '#e75145', G: '#2a7d61', r: '#ff9b70' };
  const pixelSize = flyingTomato.width / pixels[0].length;

  context.clearRect(0, 0, flyingTomato.width, flyingTomato.height);
  pixels.forEach((row, y) => {
    [...row].forEach((pixel, x) => {
      if (palette[pixel]) {
        context.fillStyle = palette[pixel];
        context.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    });
  });
}

function updateTurn() {
  turnMark.textContent = currentPlayer;
  turnMark.className = `turn-mark mark-${currentPlayer.toLowerCase()}`;
  statusText.textContent = `VAI, ${currentPlayer}!`;
}

function getWinningLine() {
  return winningLines.find(([first, second, third]) => (
    board[first] && board[first] === board[second] && board[first] === board[third]
  ));
}

function drawVictoryArt(isScary) {
  const context = winArt.getContext('2d');
  const skull = [
    '.....######.....',
    '...##########...',
    '..############..',
    '.##############.',
    '################',
    '##EE##....##EE##',
    '##EE##....##EE##',
    '################',
    '################',
    '###..########..#',
    '##....######....',
    '##.##.##.##.##.#',
    '...##..##..##...',
    '...##..##..##...',
    '....########....',
    '.....######.....',
  ];
  const soccerBall = [
    '.....######.....',
    '...##WWWWWW##...',
    '..##WWWWWWWW##..',
    '.##WWWWWWWWWW##.',
    '##WWWWWWWWWWWW##',
    '#WWWWWWWWWWWWWW#',
    '#WWWWWWWWWWWWWW#',
    '##WWWWWWWWWWWW##',
    '.##WWWWWWWWWW##.',
    '..##WWWWWWWW##..',
    '...##WWWWWW##...',
    '.....######.....',
    '....########....',
    '...##########...',
    '..############..',
    '...##########...',
  ];
  const pixels = isScary ? skull : soccerBall;
  const palette = isScary
    ? { '#': '#f7f5df', E: '#e75145' }
    : { '#': '#172a26', W: '#f7f5df' };
  const pixelSize = winArt.width / pixels[0].length;

  context.clearRect(0, 0, winArt.width, winArt.height);
  pixels.forEach((row, y) => {
    [...row].forEach((pixel, x) => {
      if (palette[pixel]) {
        context.fillStyle = palette[pixel];
        context.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    });
  });
}

function getAudioContext() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    return null;
  }

  try {
    audioContext ??= new AudioContextConstructor();
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  } catch {
    return null;
  }
}

function playTone(context, frequency, start, duration, volume, type = 'triangle') {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playScareSound() {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const start = context.currentTime + 0.02;
  const shriek = context.createOscillator();
  const shriekGain = context.createGain();
  shriek.type = 'sawtooth';
  shriek.frequency.setValueAtTime(880, start);
  shriek.frequency.exponentialRampToValueAtTime(95, start + 0.7);
  shriekGain.gain.setValueAtTime(0.0001, start);
  shriekGain.gain.exponentialRampToValueAtTime(0.2, start + 0.04);
  shriekGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.72);
  shriek.connect(shriekGain);
  shriekGain.connect(context.destination);
  shriek.start(start);
  shriek.stop(start + 0.74);
}

function playVictoryFanfare() {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const notes = [523, 659, 784, 1047, 784, 1047, 1318, 1568];
  const durations = [0.2, 0.2, 0.2, 0.4, 0.2, 0.2, 0.2, 0.4];
  let start = context.currentTime + 0.02;

  notes.forEach((note, index) => {
    playTone(context, note, start, durations[index] - 0.02, 0.12);
    start += durations[index];
  });
}

function showVictory(winner) {
  const isScary = winner === 'X';
  winOverlay.hidden = false;
  winOverlay.className = `win-overlay ${isScary ? 'is-scary' : 'is-vasco'}`;
  winPanel.className = `win-panel ${isScary ? 'panel-scary' : 'panel-vasco'}`;

  if (isScary) {
    winKicker.textContent = 'SUSTO DO ARCADE';
    winTitle.textContent = 'X TE PEGOU!';
    winCopy.textContent = 'O JOGADOR X VENCEU. BOO!';
    playScareSound();
  } else {
    winKicker.textContent = 'VITÓRIA DO JOGADOR O';
    winTitle.textContent = 'bem vindo ao VASCO DA GAMA';
    winCopy.textContent = 'A FESTA DA TORCIDA COMEÇOU!';
    playVictoryFanfare();
  }

  drawVictoryArt(isScary);
  winClose.focus();
}

function closeVictory() {
  winOverlay.hidden = true;
  resetButton.focus();
}

function showDraw() {
  drawMessage.textContent = 'perdeu, newba';
  drawMessage.classList.remove('show');
  flyingTomato.classList.remove('fly');
  void drawMessage.offsetWidth;
  drawMessage.classList.add('show');
  flyingTomato.classList.add('fly');
  statusText.textContent = 'DEU VELHA!';
  turnMark.textContent = '✳';
  turnMark.className = 'turn-mark';
}

function playCell(event) {
  const cell = event.currentTarget;
  const index = Number(cell.dataset.cell);

  if (gameOver || board[index]) {
    return;
  }

  board[index] = currentPlayer;
  cell.textContent = currentPlayer;
  cell.classList.add(`mark-${currentPlayer.toLowerCase()}`);
  cell.setAttribute('aria-label', `Casa ${index + 1}, ${currentPlayer}`);

  const winningLine = getWinningLine();
  if (winningLine) {
    gameOver = true;
    winningLine.forEach((winningIndex) => cells[winningIndex].classList.add('winning-cell'));
    statusText.textContent = `${currentPlayer} VENCEU!`;
    turnMark.textContent = '★';
    turnMark.className = `turn-mark mark-${currentPlayer.toLowerCase()}`;
    cells.forEach((gameCell) => { gameCell.disabled = true; });
    showVictory(currentPlayer);
    return;
  }

  if (board.every(Boolean)) {
    gameOver = true;
    cells.forEach((gameCell) => { gameCell.disabled = true; });
    showDraw();
    return;
  }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateTurn();
}

function resetGame() {
  board = Array(9).fill('');
  currentPlayer = 'X';
  gameOver = false;
  round += 1;
  roundNumber.textContent = String(round).padStart(2, '0');
  drawMessage.classList.remove('show');
  flyingTomato.classList.remove('fly');
  winOverlay.hidden = true;

  cells.forEach((cell, index) => {
    cell.textContent = '';
    cell.disabled = false;
    cell.className = 'cell';
    cell.setAttribute('aria-label', `Casa ${index + 1}, vazia`);
  });

  updateTurn();
}

cells.forEach((cell) => cell.addEventListener('click', playCell));
resetButton.addEventListener('click', resetGame);
winClose.addEventListener('click', closeVictory);
drawTomato();
updateTurn();