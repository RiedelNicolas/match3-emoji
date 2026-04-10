import {
  GameState,
  MoveDirection,
  GRID_COLS,
  GRID_ROWS,
} from './types';
import {
  createInitialState,
  findAllMatches,
  clearMatches,
  applyGravity,
  fillEmptyWithNew,
  swapCells,
  getNeighborCoords,
  isValidMove,
  hasValidMove,
  reshuffleGrid,
  calculateMatchScore,
  cloneGrid,
} from './engine';
import {
  playSwapSound,
  playErrorSound,
  playMatchSound,
  playGameOverSound,
  playReshuffleSound,
  resumeAudio,
} from './audio';
import { saveScore, isNewHighScore } from './score';

export type GameEventType =
  | 'stateChange'
  | 'matchFound'
  | 'comboFound'
  | 'gameOver'
  | 'reshuffled';

export type GameEventListener = (state: GameState) => void;

export class GameController {
  private state: GameState;
  private listeners: Map<GameEventType, GameEventListener[]> = new Map();
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private playerName: string = '';

  constructor() {
    this.state = createInitialState();
  }

  getState(): GameState {
    return this.state;
  }

  on(event: GameEventType, listener: GameEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  private emit(event: GameEventType): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(this.state);
    }
  }

  setPlayerName(name: string): void {
    this.playerName = name;
  }

  startGame(): void {
    resumeAudio();
    this.stopTimer();
    this.state = createInitialState();
    this.state.status = 'playing';
    this.emit('stateChange');
    this.startTimer();
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (this.state.status !== 'playing') return;
      this.state = { ...this.state, timeLeft: this.state.timeLeft - 1 };
      if (this.state.timeLeft <= 0) {
        this.endGame();
      } else {
        this.emit('stateChange');
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private endGame(): void {
    this.stopTimer();
    this.state = { ...this.state, status: 'game_over', timeLeft: 0 };
    playGameOverSound();
    saveScore(this.playerName, this.state.score);
    this.emit('stateChange');
    this.emit('gameOver');
  }

  async applyMove(fromX: number, fromY: number, direction: MoveDirection): Promise<void> {
    if (this.state.status !== 'playing') return;

    const neighbor = getNeighborCoords(fromX, fromY, direction);
    if (!neighbor) {
      playErrorSound();
      return;
    }
    const { nx, ny } = neighbor;

    // Check bounds
    if (fromX < 0 || fromX >= GRID_COLS || fromY < 0 || fromY >= GRID_ROWS) {
      playErrorSound();
      return;
    }

    const grid = cloneGrid(this.state.grid);
    if (!isValidMove(grid, fromX, fromY, direction)) {
      playErrorSound();
      return;
    }

    playSwapSound();
    this.state = { ...this.state, status: 'animating' };
    this.emit('stateChange');

    // Perform swap
    swapCells(grid, fromX, fromY, nx, ny);
    this.state = { ...this.state, grid };
    this.emit('stateChange');

    // Process cascades
    await this.processCascade(0);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async processCascade(comboLevel: number): Promise<void> {
    const grid = cloneGrid(this.state.grid);
    const matches = findAllMatches(grid);

    if (matches.size === 0) {
      // Check if reshuffle needed
      if (!hasValidMove(grid)) {
        playReshuffleSound();
        reshuffleGrid(grid);
        this.state = { ...this.state, grid, status: 'playing' };
        this.emit('stateChange');
        this.emit('reshuffled');
      } else {
        this.state = { ...this.state, grid, status: 'playing' };
        this.emit('stateChange');
      }
      return;
    }

    // Score and clear matches
    const score = calculateMatchScore(matches, comboLevel);
    clearMatches(grid, matches);
    this.state = {
      ...this.state,
      grid,
      score: this.state.score + score,
    };

    if (comboLevel === 0) {
      playMatchSound(0);
      this.emit('matchFound');
    } else {
      playMatchSound(comboLevel);
      this.emit('comboFound');
    }

    // Haptic feedback
    this.triggerVibrate();

    this.emit('stateChange');
    await this.delay(200);

    // Apply gravity
    applyGravity(grid);
    fillEmptyWithNew(grid);
    this.state = { ...this.state, grid };
    this.emit('stateChange');
    await this.delay(200);

    // Continue cascade
    await this.processCascade(comboLevel + 1);
  }

  isHighScore(): boolean {
    return isNewHighScore(this.state.score);
  }

  private triggerVibrate(): void {
    // Standard vibration (Android/Chrome)
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // iOS 18+ Workaround: click hidden label associated with a 'switch' input
    const hapticLabel = document.getElementById('haptic-label');
    if (hapticLabel) {
      hapticLabel.click();
    }
  }
}
