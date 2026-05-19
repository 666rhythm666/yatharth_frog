import { ThemeName, ThemeConfig, Achievement } from '../types';

export const THEMES_DATA: Record<ThemeName, ThemeConfig> = {
  Pond: {
    ambientCol: 0xffeedd,
    ambientInt: 0.7,
    sunCol: 0xfff6cc,
    sunInt: 1.2,
    label: 'POND',
    particles: ['#a8e06a', '#6bbb3a', '#d4f7a0'],
    emoji: '🌿'
  },
  NightForest: {
    ambientCol: 0x2244aa,
    ambientInt: 0.4,
    sunCol: 0x5599ff,
    sunInt: 0.6,
    label: 'NIGHT',
    particles: ['#88aaff', '#aa66ff', '#66ffcc'],
    emoji: '🌙'
  },
  Desert: {
    ambientCol: 0xffd080,
    ambientInt: 0.9,
    sunCol: 0xffa040,
    sunInt: 1.5,
    label: 'DESERT',
    particles: ['#ffcc44', '#ff8822', '#ffee88'],
    emoji: '🏜️'
  }
};

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_munch',
    title: 'First Insect',
    description: 'Catch your first insect.',
    icon: '🐛',
    unlocked: false,
    type: 'score',
    targetValue: 1
  },
  {
    id: 'munch_10',
    title: 'Hungry Hopper',
    description: 'Catch 10 insects in a single run.',
    icon: '🐞',
    unlocked: false,
    type: 'score',
    targetValue: 10
  },
  {
    id: 'munch_25',
    title: 'Munch Master',
    description: 'Catch 25 insects in a single run.',
    icon: '🪲',
    unlocked: false,
    type: 'score',
    targetValue: 25
  },
  {
    id: 'munch_50',
    title: 'Dragonfly Destroyer',
    description: 'Catch 50 insects in a single run.',
    icon: '🐝',
    unlocked: false,
    type: 'score',
    targetValue: 50
  },
  {
    id: 'theme_pond_15',
    title: 'Pond Sovereign',
    description: 'Score 15 points in the Pond environment.',
    icon: '🐸',
    unlocked: false,
    type: 'theme',
    targetValue: 15
  },
  {
    id: 'theme_night_15',
    title: 'Nocturnal Glider',
    description: 'Score 15 points in the Night Forest environment.',
    icon: '🦇',
    unlocked: false,
    type: 'theme',
    targetValue: 15
  },
  {
    id: 'theme_desert_15',
    title: 'Sandstorm Surfer',
    description: 'Score 15 points in the Desert environment.',
    icon: '🦎',
    unlocked: false,
    type: 'theme',
    targetValue: 15
  }
];
