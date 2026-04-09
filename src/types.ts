// Domain types for Emoji Match-3

export type GameEmoji = '🍎' | '🍊' | '🍇' | '🍉' | '🍌' | '🥝';

export type MoveDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Cell {
  id: string;
  x: number;
  y: number;
  emoji: GameEmoji | null;
}

export interface GameState {
  grid: Cell[][];
  score: number;
  timeLeft: number;
  status: 'idle' | 'playing' | 'animating' | 'game_over';
}

export interface PlayerMove {
  fromX: number;
  fromY: number;
  direction: MoveDirection;
}

export interface ScoreEntry {
  name: string;
  score: number;
  date: string;
}

export const GRID_ROWS = 7;
export const GRID_COLS = 7;
export const GAME_EMOJIS: GameEmoji[] = ['🍎', '🍊', '🍇', '🍉', '🍌', '🥝'];
export const INITIAL_TIME = 60;
export const MAX_LEADERBOARD_ENTRIES = 10;

export const SCORE_MATCH_3 = 100;
export const SCORE_MATCH_4 = 250;
export const SCORE_MATCH_5 = 500;
export const COMBO_MULTIPLIER = 1.5;
