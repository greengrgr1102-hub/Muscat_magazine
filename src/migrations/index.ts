import * as migration_20261117_164211_initial from './20261117_164211_initial';
import * as migration_20261118_043747_simplify_home from './20261118_043747_simplify_home';
import * as migration_20261118_053500_seed_genres from './20261118_053500_seed_genres';
import * as migration_20261118_110532_blob_object_key from './20261118_110532_blob_object_key';

export const migrations = [
  {
    up: migration_20261117_164211_initial.up,
    down: migration_20261117_164211_initial.down,
    name: '20261117_164211_initial',
  },
  {
    up: migration_20261118_043747_simplify_home.up,
    down: migration_20261118_043747_simplify_home.down,
    name: '20261118_043747_simplify_home',
  },
  {
    up: migration_20261118_053500_seed_genres.up,
    down: migration_20261118_053500_seed_genres.down,
    name: '20261118_053500_seed_genres',
  },
  {
    up: migration_20261118_110532_blob_object_key.up,
    down: migration_20261118_110532_blob_object_key.down,
    name: '20261118_110532_blob_object_key'
  },
];
