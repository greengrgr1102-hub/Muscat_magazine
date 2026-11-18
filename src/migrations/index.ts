import * as migration_20261117_164211_initial from './20261117_164211_initial';
import * as migration_20261118_043747_simplify_home from './20261118_043747_simplify_home';
import * as migration_20261118_053500_seed_genres from './20261118_053500_seed_genres';
import * as migration_20261118_110532_blob_object_key from './20261118_110532_blob_object_key';
import * as migration_20261118_112029_editor_picks from './20261118_112029_editor_picks';
import * as migration_20261118_114020_picks_custom_tags from './20261118_114020_picks_custom_tags';
import * as migration_20261118_114828_spotify_sync from './20261118_114828_spotify_sync';
import * as migration_20261118_122819_search_verification from './20261118_122819_search_verification';
import * as migration_20261118_150834_article_gallery from './20261118_150834_article_gallery';
import * as migration_20261118_155506_stats from './20261118_155506_stats';
import * as migration_20261118_162229_band_members from './20261118_162229_band_members';
import * as migration_20261118_164347_captions_face from './20261118_164347_captions_face';
import * as migration_20261118_180732_spotify_scanned from './20261118_180732_spotify_scanned';

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
    name: '20261118_110532_blob_object_key',
  },
  {
    up: migration_20261118_112029_editor_picks.up,
    down: migration_20261118_112029_editor_picks.down,
    name: '20261118_112029_editor_picks',
  },
  {
    up: migration_20261118_114020_picks_custom_tags.up,
    down: migration_20261118_114020_picks_custom_tags.down,
    name: '20261118_114020_picks_custom_tags',
  },
  {
    up: migration_20261118_114828_spotify_sync.up,
    down: migration_20261118_114828_spotify_sync.down,
    name: '20261118_114828_spotify_sync',
  },
  {
    up: migration_20261118_122819_search_verification.up,
    down: migration_20261118_122819_search_verification.down,
    name: '20261118_122819_search_verification',
  },
  {
    up: migration_20261118_150834_article_gallery.up,
    down: migration_20261118_150834_article_gallery.down,
    name: '20261118_150834_article_gallery',
  },
  {
    up: migration_20261118_155506_stats.up,
    down: migration_20261118_155506_stats.down,
    name: '20261118_155506_stats',
  },
  {
    up: migration_20261118_162229_band_members.up,
    down: migration_20261118_162229_band_members.down,
    name: '20261118_162229_band_members',
  },
  {
    up: migration_20261118_164347_captions_face.up,
    down: migration_20261118_164347_captions_face.down,
    name: '20261118_164347_captions_face',
  },
  {
    up: migration_20261118_180732_spotify_scanned.up,
    down: migration_20261118_180732_spotify_scanned.down,
    name: '20261118_180732_spotify_scanned'
  },
];
