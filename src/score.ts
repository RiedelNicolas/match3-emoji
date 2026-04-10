import { ScoreEntry, MAX_LEADERBOARD_ENTRIES } from './types';

const STORAGE_KEY = 'match3_emoji_scores';

export function loadLeaderboard(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ScoreEntry[];
  } catch {
    return [];
  }
}

export function saveScore(name: string, score: number): boolean {
  const entries = loadLeaderboard();
  const newEntry: ScoreEntry = {
    name: name.trim() || 'Anónimo',
    score,
    date: new Date().toLocaleDateString('es-AR'),
  };

  entries.push(newEntry);
  entries.sort((a, b) => b.score - a.score);
  const trimmed = entries.slice(0, MAX_LEADERBOARD_ENTRIES);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage unavailable
  }

  // Returns true if the score made it onto the leaderboard
  return trimmed.some(e => e === newEntry);
}

export function isNewHighScore(score: number): boolean {
  if (score === 0) return false;
  const entries = loadLeaderboard();
  if (entries.length < MAX_LEADERBOARD_ENTRIES) return true;
  return score > entries[entries.length - 1].score;
}
