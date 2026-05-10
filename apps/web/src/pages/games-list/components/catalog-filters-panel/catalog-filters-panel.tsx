import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronDown,
} from 'lucide-react';
import { PlaytimeRangeSlider } from '../../../../components/ui/playtime-range-slider';
import {
  CATALOG_COMPLEXITY,
  CATALOG_GENRES,
  CATALOG_SORT,
} from '../../../../lib/catalog-enrichment';
import type { GamesListSearch } from '../../../../lib/games-route-defaults';
import styles from './catalog-filters-panel.module.scss';

export function CatalogFiltersPanel({
  search,
  genresExpanded,
  genreSet,
  playerSet,
  complexitySet,
  visibleGenres,
  playtimeMinBound,
  playtimeMaxBound,
  ptSliderLow,
  ptSliderHigh,
  setGenresExpanded,
  patchSearch,
  toggleGenre,
  togglePlayer,
  toggleComplexity,
  commitPlaytimeRange,
}: {
  search: GamesListSearch;
  genresExpanded: boolean;
  genreSet: Set<(typeof CATALOG_GENRES)[number]['id']>;
  playerSet: Set<number>;
  complexitySet: Set<(typeof CATALOG_COMPLEXITY)[number]['id']>;
  visibleGenres: readonly (typeof CATALOG_GENRES)[number][];
  playtimeMinBound: number;
  playtimeMaxBound: number;
  ptSliderLow: number;
  ptSliderHigh: number;
  setGenresExpanded: (updater: (value: boolean) => boolean) => void;
  patchSearch: (patch: Partial<GamesListSearch>) => void;
  toggleGenre: (id: (typeof CATALOG_GENRES)[number]['id']) => void;
  togglePlayer: (n: number) => void;
  toggleComplexity: (id: (typeof CATALOG_COMPLEXITY)[number]['id']) => void;
  commitPlaytimeRange: (low: number, high: number) => void;
}) {
  return (
    <>
      <div>
        <h3 className={styles.filterSectionTitle}>Sort by</h3>
        <div className={styles.sortRow}>
          <div className={styles.selectWrap}>
            <select
              className={styles.select}
              value={search.sort}
              aria-label="Sort catalog"
              onChange={(e) => {
                const v = e.target.value as GamesListSearch['sort'];
                const patch: Partial<GamesListSearch> = { sort: v, page: 1 };
                if (v === 'year') {
                  patch.order = 'desc';
                } else if (v === 'title') {
                  patch.order = 'asc';
                }
                patchSearch(patch);
              }}
            >
              {CATALOG_SORT.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className={styles.selectChevron} aria-hidden />
          </div>
          <button
            type="button"
            className={styles.sortOrderBtn}
            title={
              search.order === 'asc'
                ? 'Ascending — click for descending'
                : 'Descending — click for ascending'
            }
            aria-label={
              search.order === 'asc'
                ? 'Switch to descending sort'
                : 'Switch to ascending sort'
            }
            onClick={() =>
              patchSearch({
                order: search.order === 'asc' ? 'desc' : 'asc',
                page: 1,
              })
            }
          >
            {search.order === 'asc' ? (
              <ArrowUpNarrowWide size={18} aria-hidden />
            ) : (
              <ArrowDownWideNarrow size={18} aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div>
        <h3 className={styles.filterSectionTitle}>Genre</h3>
        {visibleGenres.map((g) => (
          <label key={g.id} className={styles.checkboxRow}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={genreSet.has(g.id)}
              onChange={() => toggleGenre(g.id)}
            />
            <span className={styles.checkboxLabel}>{g.label}</span>
            <span className={styles.countBadge}>{g.countLabel}</span>
          </label>
        ))}
        {CATALOG_GENRES.length > 5 && (
          <button
            type="button"
            className={styles.showMoreBtn}
            onClick={() => setGenresExpanded((v) => !v)}
          >
            {genresExpanded
              ? 'Show less'
              : `Show more (${CATALOG_GENRES.length - 5})`}
          </button>
        )}
      </div>

      <div>
        <h3 className={styles.filterSectionTitle}>Player count</h3>
        <div className={styles.playerGrid}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.playerBtn} ${playerSet.has(n) ? styles.playerBtnActive : ''}`}
              onClick={() => togglePlayer(n)}
            >
              {n === 6 ? '6+' : n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className={styles.filterSectionTitle}>Playtime (mins)</h3>
        <p className={styles.playtimeHint}>
          {playtimeMinBound}–{playtimeMaxBound} min · drag both handles
        </p>
        <PlaytimeRangeSlider
          minBound={playtimeMinBound}
          maxBound={playtimeMaxBound}
          step={15}
          low={ptSliderLow}
          high={ptSliderHigh}
          onChange={({ low, high }) => commitPlaytimeRange(low, high)}
        />
      </div>

      <div>
        <h3 className={styles.filterSectionTitle}>Complexity (weight)</h3>
        {CATALOG_COMPLEXITY.map((c) => (
          <label key={c.id} className={styles.checkboxRow}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={complexitySet.has(c.id)}
              onChange={() => toggleComplexity(c.id)}
            />
            <span className={styles.checkboxLabel}>{c.label}</span>
          </label>
        ))}
      </div>
    </>
  );
}
