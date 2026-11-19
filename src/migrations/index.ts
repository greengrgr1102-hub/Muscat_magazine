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
import * as migration_20261118_181558_spotify_rename from './20261118_181558_spotify_rename';
import * as migration_20261118_183226_pick_album from './20261118_183226_pick_album';
import * as migration_20261118_183834_spotify_pause from './20261118_183834_spotify_pause';
import * as migration_20261119_055910_editor_playlists from './20261119_055910_editor_playlists';
import * as migration_20261119_063538_about_editors from './20261119_063538_about_editors';
import * as migration_20261119_064500_about_content from './20261119_064500_about_content';
import * as migration_20261119_072641_essential from './20261119_072641_essential';
import * as migration_20261119_084647_essential_albums_only from './20261119_084647_essential_albums_only';
import * as migration_20261119_125330_youtube from './20261119_125330_youtube';
import * as migration_20261119_133000_youtube_official_reset from './20261119_133000_youtube_official_reset';
import * as migration_20261119_140000_youtube_miss_reset from './20261119_140000_youtube_miss_reset';
import * as migration_20261119_161430_filters from './20261119_161430_filters';
import * as migration_20261119_162147_english_names from './20261119_162147_english_names';

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
    name: '20261118_180732_spotify_scanned',
  },
  {
    up: migration_20261118_181558_spotify_rename.up,
    down: migration_20261118_181558_spotify_rename.down,
    name: '20261118_181558_spotify_rename',
  },
  {
    up: migration_20261118_183226_pick_album.up,
    down: migration_20261118_183226_pick_album.down,
    name: '20261118_183226_pick_album',
  },
  {
    up: migration_20261118_183834_spotify_pause.up,
    down: migration_20261118_183834_spotify_pause.down,
    name: '20261118_183834_spotify_pause',
  },
  {
    up: migration_20261119_055910_editor_playlists.up,
    down: migration_20261119_055910_editor_playlists.down,
    name: '20261119_055910_editor_playlists',
  },
  {
    up: migration_20261119_063538_about_editors.up,
    down: migration_20261119_063538_about_editors.down,
    name: '20261119_063538_about_editors',
  },
  {
    up: migration_20261119_064500_about_content.up,
    down: migration_20261119_064500_about_content.down,
    name: '20261119_064500_about_content',
  },
  {
    up: migration_20261119_072641_essential.up,
    down: migration_20261119_072641_essential.down,
    name: '20261119_072641_essential',
  },
  {
    up: migration_20261119_084647_essential_albums_only.up,
    down: migration_20261119_084647_essential_albums_only.down,
    name: '20261119_084647_essential_albums_only',
  },
  {
    up: migration_20261119_125330_youtube.up,
    down: migration_20261119_125330_youtube.down,
    name: '20261119_125330_youtube',
  },
  {
    up: migration_20261119_133000_youtube_official_reset.up,
    down: migration_20261119_133000_youtube_official_reset.down,
    name: '20261119_133000_youtube_official_reset',
  },
  {
    up: migration_20261119_140000_youtube_miss_reset.up,
    down: migration_20261119_140000_youtube_miss_reset.down,
    name: '20261119_140000_youtube_miss_reset',
  },
  {
    up: migration_20261119_161430_filters.up,
    down: migration_20261119_161430_filters.down,
    name: '20261119_161430_filters',
  },
  {
    up: migration_20261119_162147_english_names.up,
    down: migration_20261119_162147_english_names.down,
    name: '20261119_162147_english_names'
  },
];
