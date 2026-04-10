import './style.css';
import { GameController } from './controller';
import { GameRenderer } from './renderer';

try {
  const app = document.getElementById('app');
  if (!app) throw new Error('No #app element found');

  const controller = new GameController();
  new GameRenderer(app, controller);
} catch (err) {
  console.error('Initialization failed:', err);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div style="padding: 20px; color: white; text-align: center; font-family: sans-serif;">
        <h2>Oops! El juego no pudo cargar 🍎</h2>
        <p>Hubo un error al iniciar. Por favor intenta recargar la página.</p>
        <p style="font-size: 0.8rem; color: #9d8ec0; margin-top: 10px;">
          ${err instanceof Error ? err.message : 'Error desconocido'}
        </p>
      </div>
    `;
  }
}
