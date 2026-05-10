import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  LayoutList,
  RotateCcw,
  X,
} from 'lucide-react';
import type { CollectionStatus } from '@boardgame/shared';
import { addToCollection, fetchMyCollection } from '../../api/collection';
import { fetchGamesList } from '../../api/games';
import {
  CATALOG_COMPLEXITY,
  CATALOG_GENRES,
  enrichGame,
  genreLabel,
  sortEnrichedGames,
  type EnrichedGame,
} from '../../lib/catalog-enrichment';
import {
  gamesListSearchDefault,
  parseComplexitySet,
  parseGenreSet,
  parsePlayerSet,
  useCatalogBatchMode,
  type GamesListSearch,
} from '../../lib/games-route-defaults';
import { queryKeys } from '../../lib/query-keys';
import { useAuth } from '../../lib/use-auth';
import { CatalogFiltersPanel } from './components/catalog-filters-panel/catalog-filters-panel';
import { CatalogGameCard } from './components/catalog-game-card/catalog-game-card';
import { CatalogSearchShell } from './components/catalog-search-shell/catalog-search-shell';
import styles from './games-list-page.module.scss';

const routeApi = getRouteApi('/games');
const PAGE_SIZE = 20;

function buildPageList(
  current: number,
  total: number,
): (number | 'ellipsis')[] {
  if (total <= 0) {
    return [1];
  }
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) {
    pages.push('ellipsis');
  }
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (end < total - 1) {
    pages.push('ellipsis');
  }
  if (total > 1) {
    pages.push(total);
  }
  return pages;
}

export function GamesListPage() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const [genresExpanded, setGenresExpanded] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filterAsideOpen, setFilterAsideOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [addMenuSlug, setAddMenuSlug] = useState<string | null>(null);

  const batchMode = useCatalogBatchMode(search);

  const genreSet = useMemo(() => parseGenreSet(search.genres), [search.genres]);
  const playerSet = useMemo(
    () => parsePlayerSet(search.players),
    [search.players],
  );
  const complexitySet = useMemo(
    () => parseComplexitySet(search.complexity),
    [search.complexity],
  );

  const ptMinN = search.ptMin ? Number.parseInt(search.ptMin, 10) : null;
  const ptMaxN = search.ptMax ? Number.parseInt(search.ptMax, 10) : null;

  const apiSort: 'title' | 'year' = search.sort === 'year' ? 'year' : 'title';

  const listFetchArgs = {
    q: search.q.trim() || undefined,
    genres: search.genres.trim() || undefined,
    ptMin: Number.isFinite(ptMinN) ? ptMinN! : undefined,
    ptMax: Number.isFinite(ptMaxN) ? ptMaxN! : undefined,
    complexity: search.complexity.trim() || undefined,
  };

  const listQuery = useQuery({
    queryKey: batchMode
      ? queryKeys.games.batch({
          q: search.q,
          genres: search.genres,
          ptMin: search.ptMin,
          ptMax: search.ptMax,
          complexity: search.complexity,
        })
      : queryKeys.games.list({
          q: search.q,
          page: search.page,
          limit: PAGE_SIZE,
          genres: search.genres,
          ptMin: search.ptMin,
          ptMax: search.ptMax,
          complexity: search.complexity,
          sort: apiSort,
          order: search.order,
        }),
    queryFn: () =>
      batchMode
        ? fetchGamesList({
            ...listFetchArgs,
            page: 1,
            limit: 100,
            sort: 'title',
          })
        : fetchGamesList({
            ...listFetchArgs,
            page: search.page,
            limit: PAGE_SIZE,
            sort: apiSort,
            order: search.order,
          }),
  });

  const collectionQuery = useQuery({
    queryKey: queryKeys.collection.allEntries(),
    queryFn: () => fetchMyCollection(),
    enabled: Boolean(token),
  });

  const addCollection = useMutation({
    mutationFn: ({
      slug,
      status,
    }: {
      slug: string;
      status: CollectionStatus;
    }) => addToCollection({ slug, status }),
    onSuccess: () => {
      setAddMenuSlug(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.collection.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.collection.allEntries(),
      });
    },
  });

  const slugToStatus = useMemo(() => {
    const m = new Map<string, CollectionStatus>();
    for (const e of collectionQuery.data ?? []) {
      m.set(e.game.slug, e.status);
    }
    return m;
  }, [collectionQuery.data]);

  const filteredSorted = useMemo(() => {
    const rows = listQuery.data?.data ?? [];
    const enriched = rows.map(enrichGame);
    if (!batchMode) {
      return enriched;
    }
    return sortEnrichedGames(enriched, search.sort, search.order);
  }, [listQuery.data, batchMode, search.sort, search.order]);

  const totalCatalog = listQuery.data?.meta.total ?? 0;

  const totalPages = batchMode
    ? Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE))
    : Math.max(1, Math.ceil(totalCatalog / PAGE_SIZE));

  const pageItems: EnrichedGame[] = batchMode
    ? filteredSorted.slice(
        (search.page - 1) * PAGE_SIZE,
        search.page * PAGE_SIZE,
      )
    : filteredSorted;

  useEffect(() => {
    if (!listQuery.isSuccess || !batchMode) {
      return;
    }
    const tp = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
    if (search.page > tp) {
      void navigate({
        search: { ...search, page: tp },
      });
    }
  }, [listQuery.isSuccess, batchMode, filteredSorted.length, search, navigate]);

  useEffect(() => {
    if (!addMenuSlug) {
      return;
    }
    const onPointerDown = (e: MouseEvent) => {
      const el = document.getElementById(`catalog-add-${addMenuSlug}`);
      if (el && !el.contains(e.target as Node)) {
        setAddMenuSlug(null);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [addMenuSlug]);

  const toggleFiltersPanel = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches
    ) {
      setFilterAsideOpen((prev) => !prev);
      return;
    }
    setFilterDrawerOpen((prev) => !prev);
  }, []);

  const patchSearch = useCallback(
    (patch: Partial<GamesListSearch>) => {
      void navigate({
        search: {
          ...search,
          ...patch,
          page: patch.page ?? 1,
        },
      });
    },
    [navigate, search],
  );

  const toggleGenre = (id: (typeof CATALOG_GENRES)[number]['id']) => {
    const next = new Set(genreSet);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    patchSearch({ genres: [...next].join(','), page: 1 });
  };

  const togglePlayer = (n: number) => {
    const next = new Set(playerSet);
    if (next.has(n)) {
      next.delete(n);
    } else {
      next.add(n);
    }
    patchSearch({
      players: [...next].sort((a, b) => a - b).join(','),
      page: 1,
    });
  };

  const toggleComplexity = (id: (typeof CATALOG_COMPLEXITY)[number]['id']) => {
    const next = new Set(complexitySet);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    patchSearch({ complexity: [...next].join(','), page: 1 });
  };

  const resetFilters = () => {
    setFilterDrawerOpen(false);
    void navigate({
      search: {
        ...gamesListSearchDefault,
        q: search.q,
      },
    });
  };

  const visibleGenres = genresExpanded
    ? CATALOG_GENRES
    : CATALOG_GENRES.slice(0, 5);

  const playtimeMinBound = 15;
  const playtimeMaxBound = 240;
  const rawPtLo = Number.isFinite(ptMinN) ? ptMinN! : playtimeMinBound;
  const rawPtHi = Number.isFinite(ptMaxN) ? ptMaxN! : playtimeMaxBound;
  const ptSliderLow = Math.max(playtimeMinBound, Math.min(rawPtLo, rawPtHi));
  const ptSliderHigh = Math.min(playtimeMaxBound, Math.max(rawPtLo, rawPtHi));

  const commitPlaytimeRange = (low: number, high: number) => {
    const lo = Math.max(playtimeMinBound, Math.min(low, high));
    const hi = Math.min(playtimeMaxBound, Math.max(low, high));
    patchSearch({
      ptMin: lo <= playtimeMinBound ? '' : String(lo),
      ptMax: hi >= playtimeMaxBound ? '' : String(hi),
      page: 1,
    });
  };

  const activeChips: { key: string; label: string; onRemove: () => void }[] =
    [];
  for (const id of genreSet) {
    activeChips.push({
      key: `g-${id}`,
      label: genreLabel(id),
      onRemove: () => {
        const next = new Set(genreSet);
        next.delete(id);
        patchSearch({ genres: [...next].join(','), page: 1 });
      },
    });
  }
  if (playerSet.size > 0) {
    const nums = [...playerSet].sort((a, b) => a - b);
    const label =
      nums.length === 1
        ? nums[0] === 6
          ? '6+ players'
          : `${nums[0]} players`
        : `${nums.map((n) => (n === 6 ? '6+' : String(n))).join(', ')} players`;
    activeChips.push({
      key: 'players',
      label,
      onRemove: () => patchSearch({ players: '', page: 1 }),
    });
  }
  if (search.ptMin || search.ptMax) {
    activeChips.push({
      key: 'pt',
      label: `${ptSliderLow}–${ptSliderHigh} min`,
      onRemove: () => patchSearch({ ptMin: '', ptMax: '', page: 1 }),
    });
  }
  for (const id of complexitySet) {
    const c = CATALOG_COMPLEXITY.find((x) => x.id === id);
    activeChips.push({
      key: `c-${id}`,
      label: c?.label ?? id,
      onRemove: () => {
        const next = new Set(complexitySet);
        next.delete(id);
        patchSearch({ complexity: [...next].join(','), page: 1 });
      },
    });
  }

  const filterPanel = (
    <CatalogFiltersPanel
      search={search}
      genresExpanded={genresExpanded}
      genreSet={genreSet}
      playerSet={playerSet}
      complexitySet={complexitySet}
      visibleGenres={visibleGenres}
      playtimeMinBound={playtimeMinBound}
      playtimeMaxBound={playtimeMaxBound}
      ptSliderLow={ptSliderLow}
      ptSliderHigh={ptSliderHigh}
      setGenresExpanded={setGenresExpanded}
      patchSearch={patchSearch}
      toggleGenre={toggleGenre}
      togglePlayer={togglePlayer}
      toggleComplexity={toggleComplexity}
      commitPlaytimeRange={commitPlaytimeRange}
    />
  );

  const showingFrom =
    totalCatalog === 0 ? 0 : (search.page - 1) * PAGE_SIZE + 1;
  const showingTo = batchMode
    ? Math.min(search.page * PAGE_SIZE, filteredSorted.length)
    : Math.min(search.page * PAGE_SIZE, totalCatalog);

  return (
    <CatalogSearchShell
      key={search.q}
      searchQ={search.q}
      onSubmit={(q) => patchSearch({ q, page: 1 })}
    >
      {({ desktopForm, mobileForm }) => (
        <div className={styles.layout}>
          <header
            className={`${styles.pageHeader} ${filterAsideOpen ? styles.pageHeaderWithAside : ''}`}
          >
            <div className={styles.titleBlock}>
              <h1 className={styles.catalogTitle}>Catalog</h1>
              <div className={styles.divider} aria-hidden />
              <p className={styles.catalogStat}>
                {listQuery.isSuccess
                  ? `${totalCatalog.toLocaleString()} games available`
                  : '…'}
              </p>
            </div>
            <div className={styles.headerActions}>
              {desktopForm}
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={filterAsideOpen ? 'Hide filters' : 'Show filters'}
                onClick={toggleFiltersPanel}
              >
                <Filter size={18} />
              </button>
            </div>
          </header>

          <div
            className={`${styles.body} ${filterAsideOpen ? styles.bodyWithAside : ''}`}
          >
            <aside
              className={`${styles.filterAside} ${!filterAsideOpen ? styles.filterAsideHidden : ''}`}
              aria-label="Catalog filters"
              aria-hidden={!filterAsideOpen}
            >
              <div className={styles.filterAsideScroll}>
                <div className={styles.filterAsideInner}>{filterPanel}</div>
              </div>
              <div className={styles.filterAsideFooter}>
                <button
                  type="button"
                  className={styles.resetFilters}
                  onClick={resetFilters}
                >
                  <RotateCcw size={16} aria-hidden />
                  Reset filters
                </button>
              </div>
            </aside>

            <div
              className={`${styles.filterDrawerBackdrop} ${filterDrawerOpen ? styles.open : ''}`}
              role="presentation"
              onClick={() => setFilterDrawerOpen(false)}
            />
            <aside
              className={`${styles.filterDrawer} ${filterDrawerOpen ? styles.open : ''}`}
              aria-hidden={!filterDrawerOpen}
            >
              <div className={styles.filterAsideScroll}>
                <div className={styles.filterAsideInner}>{filterPanel}</div>
              </div>
              <div className={styles.filterAsideFooter}>
                <button
                  type="button"
                  className={styles.resetFilters}
                  onClick={resetFilters}
                >
                  <RotateCcw size={16} aria-hidden />
                  Reset filters
                </button>
              </div>
            </aside>

            <div className={styles.main}>
              {mobileForm}
              <div className={styles.toolbar}>
                <div className={styles.chipsRow}>
                  {activeChips.length > 0 && (
                    <>
                      <span className={styles.chipsLabel}>Filters:</span>
                      {activeChips.map((c) => (
                        <span key={c.key} className={styles.chip}>
                          {c.label}
                          <button
                            type="button"
                            className={styles.chipRemove}
                            aria-label={`Remove ${c.label}`}
                            onClick={c.onRemove}
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        className={styles.clearAll}
                        onClick={() =>
                          patchSearch({
                            genres: '',
                            players: '',
                            ptMin: '',
                            ptMax: '',
                            complexity: '',
                            page: 1,
                          })
                        }
                      >
                        Clear all
                      </button>
                    </>
                  )}
                </div>
                <div className={styles.toolbarRight}>
                  <button
                    type="button"
                    className={styles.mobileFilterBtn}
                    onClick={() => setFilterDrawerOpen(true)}
                  >
                    <Filter size={16} aria-hidden />
                    Filters
                  </button>
                  <div className={styles.viewToggle}>
                    <button
                      type="button"
                      className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
                      aria-label="List view"
                      onClick={() => setViewMode('list')}
                    >
                      <LayoutList size={16} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
                      aria-label="Grid view"
                      onClick={() => setViewMode('grid')}
                    >
                      <LayoutGrid size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.resultsScroll}>
                {batchMode && (
                  <p className={styles.batchNote}>
                    This sort uses up to 100 titles from your search; filters
                    still apply on the server. Add list-level rating/rank fields
                    to sort the full catalog here.
                  </p>
                )}

                {listQuery.isLoading && <p className="muted">Loading…</p>}
                {listQuery.isError && (
                  <p className="error" role="alert">
                    {listQuery.error instanceof Error
                      ? listQuery.error.message
                      : 'Failed to load games'}
                  </p>
                )}

                {listQuery.isSuccess && pageItems.length === 0 && (
                  <p className="muted">No games match your filters.</p>
                )}

                {listQuery.isSuccess && pageItems.length > 0 && (
                  <ul
                    className={`${styles.grid} ${viewMode === 'list' ? styles.gridList : ''}`}
                  >
                    {pageItems.map((game) => (
                      <li key={game.id}>
                        <CatalogGameCard
                          game={game}
                          status={slugToStatus.get(game.slug)}
                          listView={viewMode === 'list'}
                          addMenuOpen={addMenuSlug === game.slug}
                          addPending={addCollection.isPending}
                          isAuthenticated={Boolean(token)}
                          onToggleAddMenu={(slug) =>
                            setAddMenuSlug((s) => (s === slug ? null : slug))
                          }
                          onAddToCollection={(slug, status) =>
                            addCollection.mutate({ slug, status })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}

                {listQuery.isSuccess && pageItems.length > 0 && (
                  <div className={styles.pagination}>
                    <p className={styles.paginationInfo}>
                      Showing {showingFrom.toLocaleString()}–
                      {showingTo.toLocaleString()} of{' '}
                      {(batchMode
                        ? filteredSorted.length
                        : totalCatalog
                      ).toLocaleString()}{' '}
                      games
                    </p>
                    <div className={styles.pageBtns}>
                      <button
                        type="button"
                        className={styles.pageBtn}
                        disabled={search.page <= 1}
                        aria-label="Previous page"
                        onClick={() =>
                          patchSearch({ page: Math.max(1, search.page - 1) })
                        }
                      >
                        <ChevronLeft size={18} />
                      </button>
                      {buildPageList(search.page, totalPages).map((item, i) =>
                        item === 'ellipsis' ? (
                          <span key={`e-${i}`} className={styles.pageEllipsis}>
                            …
                          </span>
                        ) : (
                          <button
                            key={item}
                            type="button"
                            className={`${styles.pageBtn} ${item === search.page ? styles.pageBtnCurrent : ''}`}
                            onClick={() => patchSearch({ page: item })}
                          >
                            {item}
                          </button>
                        ),
                      )}
                      <button
                        type="button"
                        className={styles.pageBtn}
                        disabled={search.page >= totalPages}
                        aria-label="Next page"
                        onClick={() =>
                          patchSearch({
                            page: Math.min(totalPages, search.page + 1),
                          })
                        }
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </CatalogSearchShell>
  );
}
