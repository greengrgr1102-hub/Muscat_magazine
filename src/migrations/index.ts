import * as migration_20261117_164211_initial from './20261117_164211_initial';

export const migrations = [
  {
    up: migration_20261117_164211_initial.up,
    down: migration_20261117_164211_initial.down,
    name: '20261117_164211_initial'
  },
];
