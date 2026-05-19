export type ThemeName = 'Pond' | 'NightForest' | 'Desert';

export interface ThemeConfig {
  ambientCol: number;
  ambientInt: number;
  sunCol: number;
  sunInt: number;
  label: string;
  particles: string[];
  emoji: string;
}

export type GameState = 'start' | 'playing' | 'gameover';

export interface LeaderboardEntry {
  name: string;
  score: number;
  theme: ThemeName;
  date: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  type: 'score' | 'theme' | 'first';
  targetValue: number;
}
