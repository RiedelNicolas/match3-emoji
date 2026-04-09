import './style.css';
import { GameController } from './controller';
import { GameRenderer } from './renderer';

const app = document.getElementById('app');
if (!app) throw new Error('No #app element found');

const controller = new GameController();
new GameRenderer(app, controller);
