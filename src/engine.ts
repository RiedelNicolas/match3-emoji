import {
  Cell,
  GameEmoji,
  GameState,
  GAME_EMOJIS,
  GRID_COLS,
  GRID_ROWS,
  MoveDirection,
  SCORE_MATCH_3,
  SCORE_MATCH_4,
  SCORE_MATCH_5,
  COMBO_MULTIPLIER,
  INITIAL_TIME,
} from './types';

// --- Utility ---

function randomEmoji(): GameEmoji {
  return GAME_EMOJIS[Math.floor(Math.random() * GAME_EMOJIS.length)];
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Simple fallback for older browsers
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function createCell(x: number, y: number, emoji: GameEmoji): Cell {
  return { id: generateId(), x, y, emoji };
}

// --- Grid Initialization ---

export function createGrid(): Cell[][] {
  const grid: Cell[][] = Array.from({ length: GRID_ROWS }, (_, y) =>
    Array.from({ length: GRID_COLS }, (_, x) => createCell(x, y, randomEmoji()))
  );
  resolveInitialMatches(grid);
  return grid;
}

function resolveInitialMatches(grid: Cell[][]): void {
  let hasMatches = true;
  let safetyLimit = 1000;
  while (hasMatches && safetyLimit-- > 0) {
    const matches = findAllMatches(grid);
    if (matches.size === 0) {
      hasMatches = false;
    } else {
      for (const key of matches) {
        const [y, x] = key.split(',').map(Number);
        let newEmoji: GameEmoji;
        do {
          newEmoji = randomEmoji();
        } while (wouldCreateMatch(grid, x, y, newEmoji));
        grid[y][x] = createCell(x, y, newEmoji);
      }
    }
  }
  // Ensure at least one valid move exists
  if (!hasValidMove(grid)) {
    reshuffleGrid(grid);
  }
}

function wouldCreateMatch(grid: Cell[][], x: number, y: number, emoji: GameEmoji): boolean {
  // Check horizontal
  let count = 1;
  let nx = x - 1;
  while (nx >= 0 && grid[y][nx].emoji === emoji) { count++; nx--; }
  nx = x + 1;
  while (nx < GRID_COLS && grid[y][nx].emoji === emoji) { count++; nx++; }
  if (count >= 3) return true;

  // Check vertical
  count = 1;
  let ny = y - 1;
  while (ny >= 0 && grid[ny][x].emoji === emoji) { count++; ny--; }
  ny = y + 1;
  while (ny < GRID_ROWS && grid[ny][x].emoji === emoji) { count++; ny++; }
  if (count >= 3) return true;

  return false;
}

// --- Match Detection ---

export function findAllMatches(grid: Cell[][]): Set<string> {
  const matched = new Set<string>();

  // Horizontal matches
  for (let y = 0; y < GRID_ROWS; y++) {
    let x = 0;
    while (x < GRID_COLS) {
      const emoji = grid[y][x].emoji;
      if (emoji === null) { x++; continue; }
      let len = 1;
      while (x + len < GRID_COLS && grid[y][x + len].emoji === emoji) len++;
      if (len >= 3) {
        for (let i = 0; i < len; i++) matched.add(`${y},${x + i}`);
      }
      x += len;
    }
  }

  // Vertical matches
  for (let x = 0; x < GRID_COLS; x++) {
    let y = 0;
    while (y < GRID_ROWS) {
      const emoji = grid[y][x].emoji;
      if (emoji === null) { y++; continue; }
      let len = 1;
      while (y + len < GRID_ROWS && grid[y + len][x].emoji === emoji) len++;
      if (len >= 3) {
        for (let i = 0; i < len; i++) matched.add(`${y + i},${x}`);
      }
      y += len;
    }
  }

  return matched;
}

function scoreForMatch(size: number): number {
  if (size >= 5) return SCORE_MATCH_5;
  if (size >= 4) return SCORE_MATCH_4;
  return SCORE_MATCH_3;
}

export function calculateMatchScore(matches: Set<string>, comboLevel: number): number {
  if (matches.size === 0) return 0;
  const multiplier = Math.pow(COMBO_MULTIPLIER, comboLevel);
  // Estimate scoring by grouping matches
  return Math.round(scoreForMatch(matches.size) * multiplier);
}

// --- Gravity / Cascade ---

export function applyGravity(grid: Cell[][]): boolean {
  let moved = false;
  for (let x = 0; x < GRID_COLS; x++) {
    // Collect non-null emojis from bottom to top
    const column: (GameEmoji | null)[] = [];
    for (let y = GRID_ROWS - 1; y >= 0; y--) {
      if (grid[y][x].emoji !== null) {
        column.push(grid[y][x].emoji);
      }
    }
    // Fill with nulls at top
    while (column.length < GRID_ROWS) column.push(null);
    // Apply back bottom to top
    for (let y = GRID_ROWS - 1; y >= 0; y--) {
      const newEmoji = column[GRID_ROWS - 1 - y];
      if (grid[y][x].emoji !== newEmoji) {
        moved = true;
        grid[y][x] = { ...grid[y][x], emoji: newEmoji };
      }
    }
  }
  return moved;
}

export function fillEmptyWithNew(grid: Cell[][]): boolean {
  let filled = false;
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (grid[y][x].emoji === null) {
        grid[y][x] = createCell(x, y, randomEmoji());
        filled = true;
      }
    }
  }
  return filled;
}

export function clearMatches(grid: Cell[][], matches: Set<string>): void {
  for (const key of matches) {
    const [y, x] = key.split(',').map(Number);
    grid[y][x] = { ...grid[y][x], emoji: null };
  }
}

// --- Move Validation and Execution ---

export function getNeighborCoords(x: number, y: number, direction: MoveDirection): { nx: number; ny: number } | null {
  let nx = x;
  let ny = y;
  switch (direction) {
    case 'UP': ny--; break;
    case 'DOWN': ny++; break;
    case 'LEFT': nx--; break;
    case 'RIGHT': nx++; break;
  }
  if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) return null;
  return { nx, ny };
}

export function swapCells(grid: Cell[][], x1: number, y1: number, x2: number, y2: number): void {
  const temp = grid[y1][x1].emoji;
  grid[y1][x1] = { ...grid[y1][x1], emoji: grid[y2][x2].emoji };
  grid[y2][x2] = { ...grid[y2][x2], emoji: temp };
}

export function isValidMove(grid: Cell[][], x: number, y: number, direction: MoveDirection): boolean {
  const neighbor = getNeighborCoords(x, y, direction);
  if (!neighbor) return false;
  const { nx, ny } = neighbor;

  // Perform swap
  swapCells(grid, x, y, nx, ny);
  const matches = findAllMatches(grid);
  // Revert swap
  swapCells(grid, x, y, nx, ny);

  return matches.size > 0;
}

// --- Valid Moves Check ---

export function hasValidMove(grid: Cell[][]): boolean {
  const directions: MoveDirection[] = ['RIGHT', 'DOWN'];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      for (const dir of directions) {
        if (isValidMove(grid, x, y, dir)) return true;
      }
    }
  }
  return false;
}

// --- Reshuffle ---

export function reshuffleGrid(grid: Cell[][]): void {
  // Collect all emojis
  const emojis: GameEmoji[] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (grid[y][x].emoji !== null) {
        emojis.push(grid[y][x].emoji as GameEmoji);
      }
    }
  }

  // Fisher-Yates shuffle
  for (let i = emojis.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [emojis[i], emojis[j]] = [emojis[j], emojis[i]];
  }

  // Re-place
  let idx = 0;
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (grid[y][x].emoji !== null) {
        grid[y][x] = { ...grid[y][x], emoji: emojis[idx++] };
      }
    }
  }

  // If still no valid move, recurse
  if (!hasValidMove(grid)) reshuffleGrid(grid);
}

// --- Game State Factory ---

export function createInitialState(): GameState {
  return {
    grid: createGrid(),
    score: 0,
    timeLeft: INITIAL_TIME,
    status: 'idle',
    lastMatchSize: 0,
  };
}

// --- Deep clone grid for state management ---

export function cloneGrid(grid: Cell[][]): Cell[][] {
  return grid.map(row => row.map(cell => ({ ...cell })));
}
