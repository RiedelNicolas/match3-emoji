import { Cell, GameState, GRID_COLS, GRID_ROWS, MoveDirection } from './types';
import { GameController } from './controller';
import { loadLeaderboard } from './score';

type InputMode = 'idle' | 'selected';

export class GameRenderer {
  private app: HTMLElement;
  private controller: GameController;

  // Input state
  private inputMode: InputMode = 'idle';
  private selectedCell: { x: number; y: number } | null = null;
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchStartCellX: number = -1;
  private touchStartCellY: number = -1;

  constructor(app: HTMLElement, controller: GameController) {
    this.app = app;
    this.controller = controller;

    this.controller.on('stateChange', () => this.render());
    this.controller.on('gameOver', () => this.showGameOver());

    this.renderHome();
  }

  // ─── Screen: Home ───────────────────────────────────────────────────────────

  private renderHome(): void {
    const entries = loadLeaderboard();
    const leaderboardHtml = entries.length === 0
      ? '<p class="no-scores">¡Sé el primero en jugar!</p>'
      : `<table class="leaderboard-table">
          <thead><tr><th>#</th><th>Jugador</th><th>Puntaje</th><th>Fecha</th></tr></thead>
          <tbody>
            ${entries.map((e, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(e.name)}</td>
                <td>${e.score.toLocaleString()}</td>
                <td>${e.date}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;

    this.app.innerHTML = `
      <div class="screen home-screen">
        <div class="home-header">
          <h1 class="game-title">🍎 Emoji Match-3 🥝</h1>
          <p class="game-subtitle">¡Combina 3 emojis iguales antes de que se acabe el tiempo!</p>
        </div>
        <div class="home-body">
          <div class="leaderboard-section">
            <h2>🏆 Mejores Puntajes</h2>
            ${leaderboardHtml}
          </div>
          <div class="start-section">
            <input
              type="text"
              id="player-name"
              class="player-name-input"
              placeholder="Tu nombre"
              maxlength="20"
              autocomplete="off"
            />
            <button id="start-btn" class="btn btn-primary">▶ Iniciar Partida</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('start-btn')!.addEventListener('click', () => {
      const nameInput = document.getElementById('player-name') as HTMLInputElement;
      this.controller.setPlayerName(nameInput.value);
      this.controller.startGame();
    });

    document.getElementById('player-name')!.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const nameInput = e.target as HTMLInputElement;
        this.controller.setPlayerName(nameInput.value);
        this.controller.startGame();
      }
    });
  }

  // ─── Screen: Game ───────────────────────────────────────────────────────────

  private render(): void {
    const state = this.controller.getState();
    if (state.status === 'idle') {
      this.renderHome();
      return;
    }

    const existing = this.app.querySelector('.game-screen');
    if (!existing) {
      this.renderGameScreen(state);
    } else {
      this.updateHUD(state);
      this.updateGrid(state);
    }
  }

  private renderGameScreen(state: GameState): void {
    this.app.innerHTML = `
      <div class="screen game-screen">
        <div class="hud">
          <div class="hud-timer">
            <span class="hud-label">⏱</span>
            <span id="timer-value" class="hud-value">${state.timeLeft}</span>
          </div>
          <div class="hud-score">
            <span class="hud-label">⭐</span>
            <span id="score-value" class="hud-value">${state.score.toLocaleString()}</span>
          </div>
        </div>
        <div id="grid-container" class="grid-container">
          ${this.buildGridHtml(state)}
        </div>
        ${state.status === 'game_over' ? this.buildGameOverModal(state) : ''}
      </div>
    `;
    this.attachGridListeners();
  }

  private updateHUD(state: GameState): void {
    const timer = document.getElementById('timer-value');
    const score = document.getElementById('score-value');
    if (timer) {
      timer.textContent = String(state.timeLeft);
      timer.className = 'hud-value' + (state.timeLeft <= 10 ? ' hud-urgent' : '');
    }
    if (score) score.textContent = state.score.toLocaleString();
  }

  private updateGrid(state: GameState): void {
    const container = document.getElementById('grid-container');
    if (!container) return;
    container.innerHTML = this.buildGridHtml(state);
    this.attachGridListeners();
  }

  private buildGridHtml(state: GameState): string {
    const animating = state.status === 'animating';
    let html = `<div class="grid${animating ? ' grid-animating' : ''}" style="--cols:${GRID_COLS};--rows:${GRID_ROWS};">`;
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const cell: Cell = state.grid[y][x];
        const isSelected = this.selectedCell?.x === x && this.selectedCell?.y === y;
        html += `<div
          class="cell${isSelected ? ' cell-selected' : ''}${cell.emoji === null ? ' cell-empty' : ''}"
          data-x="${x}"
          data-y="${y}"
          data-id="${cell.id}"
          draggable="${cell.emoji !== null ? 'true' : 'false'}"
        >${cell.emoji ?? ''}</div>`;
      }
    }
    html += '</div>';
    return html;
  }

  private showGameOver(): void {
    const state = this.controller.getState();
    const container = document.querySelector('.game-screen');
    if (!container) return;

    // Remove existing modal if any
    container.querySelector('.game-over-modal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'game-over-modal';
    modal.innerHTML = this.buildGameOverModal(state);
    container.appendChild(modal);

    modal.querySelector('#play-again-btn')?.addEventListener('click', () => {
      this.renderHome();
    });
  }

  private buildGameOverModal(state: GameState): string {
    const isHigh = this.controller.isHighScore();
    return `
      <div class="game-over-modal">
        <h2>⏰ ¡Fin del juego!</h2>
        <p class="final-score">Puntaje: <strong>${state.score.toLocaleString()}</strong></p>
        ${isHigh ? '<p class="high-score-msg">🏆 ¡Nuevo récord!</p>' : ''}
        <button id="play-again-btn" class="btn btn-primary">↩ Volver a jugar</button>
      </div>
    `;
  }

  // ─── Input Handling ──────────────────────────────────────────────────────────

  private attachGridListeners(): void {
    const grid = document.querySelector('.grid');
    if (!grid) return;

    // Desktop: click-to-click and drag-and-drop
    grid.addEventListener('click', (e) => this.handleClick(e as MouseEvent));
    grid.addEventListener('dragstart', (e) => this.handleDragStart(e as DragEvent));
    grid.addEventListener('dragover', (e) => e.preventDefault());
    grid.addEventListener('drop', (e) => this.handleDrop(e as DragEvent));

    // Mobile: touch swipe
    grid.addEventListener('touchstart', (e) => this.handleTouchStart(e as TouchEvent), { passive: true });
    grid.addEventListener('touchend', (e) => this.handleTouchEnd(e as TouchEvent), { passive: true });
  }

  private getCellCoords(target: Element): { x: number; y: number } | null {
    const cell = target.closest('[data-x]');
    if (!cell) return null;
    const x = parseInt((cell as HTMLElement).dataset['x'] ?? '-1');
    const y = parseInt((cell as HTMLElement).dataset['y'] ?? '-1');
    if (x < 0 || y < 0) return null;
    return { x, y };
  }

  private handleClick(e: MouseEvent): void {
    if (this.controller.getState().status !== 'playing') return;
    const coords = this.getCellCoords(e.target as Element);
    if (!coords) return;
    const { x, y } = coords;

    if (this.inputMode === 'idle') {
      this.selectedCell = { x, y };
      this.inputMode = 'selected';
      this.updateGrid(this.controller.getState());
    } else if (this.inputMode === 'selected' && this.selectedCell) {
      const dx = x - this.selectedCell.x;
      const dy = y - this.selectedCell.y;
      const direction = this.getDirectionFromDelta(dx, dy);

      if (direction && (Math.abs(dx) === 1 && dy === 0 || dx === 0 && Math.abs(dy) === 1)) {
        this.controller.applyMove(this.selectedCell.x, this.selectedCell.y, direction);
      } else if (x === this.selectedCell.x && y === this.selectedCell.y) {
        // Deselect same cell
      } else {
        // Select new cell
        this.selectedCell = { x, y };
        this.updateGrid(this.controller.getState());
        return;
      }
      this.selectedCell = null;
      this.inputMode = 'idle';
    }
  }

  private handleDragStart(e: DragEvent): void {
    const coords = this.getCellCoords(e.target as Element);
    if (!coords) return;
    this.selectedCell = coords;
    e.dataTransfer?.setData('text/plain', `${coords.x},${coords.y}`);
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    if (this.controller.getState().status !== 'playing') return;
    const data = e.dataTransfer?.getData('text/plain');
    if (!data) return;
    const [fromX, fromY] = data.split(',').map(Number);
    const toCoords = this.getCellCoords(e.target as Element);
    if (!toCoords) return;
    const dx = toCoords.x - fromX;
    const dy = toCoords.y - fromY;
    const direction = this.getDirectionFromDelta(dx, dy);
    if (direction && (Math.abs(dx) === 1 && dy === 0 || dx === 0 && Math.abs(dy) === 1)) {
      this.controller.applyMove(fromX, fromY, direction);
    }
    this.selectedCell = null;
    this.inputMode = 'idle';
  }

  private handleTouchStart(e: TouchEvent): void {
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    const coords = this.getCellCoords(e.target as Element);
    if (coords) {
      this.touchStartCellX = coords.x;
      this.touchStartCellY = coords.y;
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (this.controller.getState().status !== 'playing') return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;

    const minSwipe = 20;
    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    const direction = this.getDirectionFromDelta(dx, dy);
    if (direction && this.touchStartCellX >= 0 && this.touchStartCellY >= 0) {
      this.controller.applyMove(this.touchStartCellX, this.touchStartCellY, direction);
    }
  }

  private getDirectionFromDelta(dx: number, dy: number): MoveDirection | null {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'RIGHT' : 'LEFT';
    } else if (Math.abs(dy) > Math.abs(dx)) {
      return dy > 0 ? 'DOWN' : 'UP';
    }
    return null;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
