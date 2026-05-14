import { useQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import type { MeetupListItem } from '@boardgame/shared';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  List,
  MapPin,
  Plus,
  Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { fetchGamesList } from '../../api/games';
import { fetchMeetups } from '../../api/meetups';
import seg from '../../components/ui/segmented.module.scss';
import { useAuthMe } from '../../hooks/use-auth-me';
import { requestAuthModal } from '../../lib/auth-modal-intent';
import {
  addDays,
  CALENDAR_EVENT_DEFAULT_DURATION_MIN,
  calendarBodyHeightPx,
  calendarHourRows,
  formatCalendarHourLabel,
  formatLocalDateKey,
  getCalendarEventLayout,
  monthGridCells,
  parseLocalDayKey,
  startOfWeekSunday,
  toIsoRangeFromLocalWeek,
  WEEKDAY_LABELS_SUN,
} from '../../lib/meetup-week';
import { queryKeys } from '../../lib/query-keys';
import { useAuth } from '../../lib/use-auth';
import styles from './meetups-list-page.module.scss';

const routeApi = getRouteApi('/meetups');

function calendarTimeZoneShortLabel(): string {
  const parts = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short',
  }).formatToParts(new Date());
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? 'Local';
}

function HeaderAvatar({
  avatarUrl,
  displayName,
}: {
  avatarUrl: string | null | undefined;
  displayName: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = displayName.trim().charAt(0).toUpperCase() || 'U';
  return (
    <Link to="/profile" className={styles.headerAvatar} title="Profile">
      {avatarUrl && !failed ? (
        <img
          src={avatarUrl}
          alt=""
          className={styles.headerAvatarImg}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={styles.headerAvatarPh}>{initial}</span>
      )}
    </Link>
  );
}

function spotsLine(m: MeetupListItem): string {
  if (m.maxPlayers == null) {
    return '';
  }
  const used = 1 + m.joinedParticipantCount;
  if (used >= m.maxPlayers) {
    return `${used}/${m.maxPlayers} full`;
  }
  const left = m.maxPlayers - used;
  return `${left} spot${left === 1 ? '' : 's'} left`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function MeetupsListPage() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { token } = useAuth();
  const me = useAuthMe();

  const weekSundayKey = useMemo(() => {
    if (search.week) {
      return search.week;
    }
    return formatLocalDateKey(startOfWeekSunday(new Date()));
  }, [search.week]);

  const weekStartDate = useMemo(
    () => parseLocalDayKey(weekSundayKey),
    [weekSundayKey],
  );

  const { from, to } = useMemo(
    () => toIsoRangeFromLocalWeek(weekSundayKey),
    [weekSundayKey],
  );

  const listQueryKey = useMemo(
    () => ({
      v: search.view,
      page: search.page,
      upcoming: search.upcoming,
      from: search.view === 'calendar' ? from : '',
      to: search.view === 'calendar' ? to : '',
      gameId: search.gameId,
      visibility: search.visibility,
      q: search.q,
      joined: search.joined,
    }),
    [
      from,
      search.gameId,
      search.joined,
      search.page,
      search.q,
      search.upcoming,
      search.view,
      search.visibility,
      to,
    ],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.meetups.list(listQueryKey),
    queryFn: () =>
      fetchMeetups(
        search.view === 'calendar'
          ? {
              page: 1,
              limit: 100,
              upcoming: 'false',
              from,
              to,
              gameId: search.gameId || undefined,
              visibility: search.visibility,
              q: search.q || undefined,
              ...(search.joined === 'me' ? { joined: 'me' } : {}),
            }
          : {
              page: search.page,
              limit: 20,
              upcoming: search.upcoming,
              gameId: search.gameId || undefined,
              visibility: search.visibility,
              q: search.q || undefined,
              ...(search.joined === 'me' ? { joined: 'me' } : {}),
            },
      ),
  });

  const sidebarQuery = useQuery({
    queryKey: queryKeys.meetups.sidebarUpcoming(),
    queryFn: () =>
      fetchMeetups({
        page: 1,
        limit: 8,
        upcoming: 'true',
        joined: 'me',
      }),
  });

  const gamesPickQuery = useQuery({
    queryKey: queryKeys.games.list({
      q: '',
      page: 1,
      limit: 80,
      genres: '',
      ptMin: '',
      ptMax: '',
      complexity: '',
      sort: 'title',
      order: 'asc',
    }),
    queryFn: () =>
      fetchGamesList({
        page: 1,
        limit: 80,
        sort: 'title',
        order: 'asc',
      }),
  });

  const totalPages =
    listQuery.data != null
      ? Math.max(
          1,
          Math.ceil(listQuery.data.meta.total / listQuery.data.meta.limit),
        )
      : 1;

  const meetupsByDayIndex = useMemo(() => {
    const buckets: MeetupListItem[][] = [[], [], [], [], [], [], []];
    const items = listQuery.data?.data;
    if (!items) {
      return buckets;
    }
    for (let idx = 0; idx < 7; idx += 1) {
      const dayKey = formatLocalDateKey(addDays(weekStartDate, idx));
      const forDay = items.filter(
        (m) => formatLocalDateKey(new Date(m.scheduledAt)) === dayKey,
      );
      forDay.sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );
      buckets[idx] = forDay;
    }
    return buckets;
  }, [listQuery.data, weekStartDate]);

  const todayKey = formatLocalDateKey(new Date());

  const monthLabel = weekStartDate.toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  /** Months added on top of the week strip’s month (sidebar mini-cal browse). */
  const [miniCalMonthOffset, setMiniCalMonthOffset] = useState(0);

  const miniBaseDate = useMemo(
    () =>
      new Date(
        weekStartDate.getFullYear(),
        weekStartDate.getMonth() + miniCalMonthOffset,
        1,
      ),
    [weekStartDate, miniCalMonthOffset],
  );

  const miniCalCells = useMemo(
    () => monthGridCells(miniBaseDate.getFullYear(), miniBaseDate.getMonth()),
    [miniBaseDate],
  );

  const miniCalTitleLabel = miniBaseDate.toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const weekEndKey = formatLocalDateKey(addDays(weekStartDate, 6));

  const goWeek = (delta: number) => {
    setMiniCalMonthOffset(0);
    const next = addDays(weekStartDate, delta * 7);
    void navigate({
      search: (prev) => ({
        ...prev,
        week: formatLocalDateKey(startOfWeekSunday(next)),
        page: 1,
      }),
    });
  };

  const goToday = () => {
    setMiniCalMonthOffset(0);
    void navigate({
      search: (prev) => ({
        ...prev,
        week: formatLocalDateKey(startOfWeekSunday(new Date())),
        page: 1,
      }),
    });
  };

  const clearFilters = () => {
    void navigate({
      search: (prev) => ({
        ...prev,
        gameId: '',
        visibility: 'ALL',
        q: '',
        joined: '',
        page: 1,
      }),
    });
  };

  const setMiniDay = (d: Date) => {
    setMiniCalMonthOffset(0);
    void navigate({
      search: (prev) => ({
        ...prev,
        week: formatLocalDateKey(startOfWeekSunday(d)),
        page: 1,
      }),
    });
  };

  return (
    <section className={`page ${styles.page} ${styles.meetupsRoot}`}>
      <header className={styles.meetupsHeader}>
        <div className={styles.meetupsHeaderLeft}>
          <span className={styles.meetupsHeaderKicker}>Meetups Hub</span>
          <span className={styles.headerRule} aria-hidden />
          <div className={styles.viewToggle} role="group" aria-label="Layout">
            <button
              type="button"
              className={
                search.view === 'calendar'
                  ? styles.viewToggleActive
                  : styles.viewToggleBtn
              }
              onClick={() =>
                void navigate({ search: { ...search, view: 'calendar' } })
              }
            >
              <CalendarDays size={15} strokeWidth={2} aria-hidden />
              Calendar
            </button>
            <button
              type="button"
              className={
                search.view === 'list'
                  ? styles.viewToggleActive
                  : styles.viewToggleBtn
              }
              onClick={() =>
                void navigate({ search: { ...search, view: 'list', page: 1 } })
              }
            >
              <List size={15} strokeWidth={2} aria-hidden />
              List
            </button>
          </div>
        </div>
        <div className={styles.meetupsHeaderRight}>
          <label className={styles.searchPill}>
            <Search size={16} aria-hidden className={styles.searchPillIcon} />
            <input
              type="search"
              placeholder="Search meetups…"
              value={search.q}
              onChange={(e) =>
                void navigate({
                  search: { ...search, q: e.target.value, page: 1 },
                })
              }
            />
          </label>
          {token && (
            <Link to="/meetups/new" className={styles.createMeetupCta}>
              <Plus size={18} strokeWidth={2.5} aria-hidden />
              Create Meetup
            </Link>
          )}
          {token && me.data && (
            <>
              <span className={styles.headerRule} aria-hidden />
              <HeaderAvatar
                avatarUrl={me.data.avatarUrl}
                displayName={me.data.displayName}
              />
            </>
          )}
        </div>
      </header>
      <div className={styles.meetupsHeaderSpacer} aria-hidden />
      <div className={styles.meetupsBody}>
        {!token && (
          <p className={`muted ${styles.signInHint}`}>
            Scheduled play sessions.{' '}
            <button
              type="button"
              className="link-button text-link"
              onClick={() => requestAuthModal('login')}
            >
              Sign in
            </button>{' '}
            to host or join.
          </p>
        )}

        <div className={styles.filtersBar}>
          <span className={styles.filtersIcon} aria-hidden>
            <Filter size={15} strokeWidth={2} />
          </span>
          <span className={styles.filtersLabel}>Filters:</span>
          <select
            className={styles.filterSelect}
            value={search.gameId}
            onChange={(e) =>
              void navigate({
                search: { ...search, gameId: e.target.value, page: 1 },
              })
            }
            aria-label="Game"
          >
            <option value="">Game: All</option>
            {gamesPickQuery.data?.data.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={search.visibility}
            onChange={(e) =>
              void navigate({
                search: {
                  ...search,
                  visibility: e.target.value as typeof search.visibility,
                  page: 1,
                },
              })
            }
            aria-label="Visibility"
          >
            <option value="ALL">Visibility: All</option>
            <option value="PUBLIC">Public only</option>
            <option value="FRIENDS">Friends-only</option>
          </select>
          {search.view === 'list' && (
            <div className={styles.timeSeg} role="group" aria-label="Time">
              <button
                type="button"
                className={search.upcoming === 'true' ? seg.tabActive : seg.tab}
                onClick={() =>
                  void navigate({
                    search: { ...search, page: 1, upcoming: 'true' },
                  })
                }
              >
                Upcoming
              </button>
              <button
                type="button"
                className={
                  search.upcoming === 'false' ? seg.tabActive : seg.tab
                }
                onClick={() =>
                  void navigate({
                    search: { ...search, page: 1, upcoming: 'false' },
                  })
                }
              >
                All times
              </button>
            </div>
          )}
          <button
            type="button"
            className={styles.clearLink}
            onClick={clearFilters}
          >
            Clear all
          </button>
        </div>

        <div className={styles.hub}>
          <div className={styles.main}>
            {listQuery.isLoading && <p>Loading…</p>}
            {listQuery.isError && (
              <p className="error" role="alert">
                {listQuery.error instanceof Error
                  ? listQuery.error.message
                  : 'Failed to load meetups'}
              </p>
            )}

            {listQuery.data && search.view === 'calendar' && (
              <>
                <div className={styles.calendarToolbar}>
                  <div className={styles.calendarToolbarPrimary}>
                    <span className={styles.calMonthTitle}>{monthLabel}</span>
                    <button
                      type="button"
                      className={styles.calNavIcon}
                      aria-label="Previous week"
                      onClick={() => goWeek(-1)}
                    >
                      <ChevronLeft size={16} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className={styles.calNavIcon}
                      aria-label="Next week"
                      onClick={() => goWeek(1)}
                    >
                      <ChevronRight size={16} strokeWidth={2} />
                    </button>
                  </div>
                  <div className={styles.calendarToolbarActions}>
                    <button
                      type="button"
                      className={styles.calToolbarBtn}
                      onClick={goToday}
                    >
                      Today
                    </button>
                  </div>
                </div>
                <div className={styles.calendarScroll}>
                  <div className={styles.calendarShell}>
                    <div className={styles.calHeaderGrid}>
                      <div className={styles.calCorner}>
                        {calendarTimeZoneShortLabel()}
                      </div>
                      {WEEKDAY_LABELS_SUN.map((label, idx) => {
                        const colDate = addDays(weekStartDate, idx);
                        const key = formatLocalDateKey(colDate);
                        const isToday = key === todayKey;
                        return (
                          <div
                            key={label}
                            className={`${styles.calHeaderCell} ${isToday ? styles.calHeaderCellToday : ''}`}
                          >
                            <div className={styles.calHeaderDow}>{label}</div>
                            {isToday ? (
                              <div className={styles.calHeaderDateCircle}>
                                {colDate.getDate()}
                              </div>
                            ) : (
                              <div className={styles.calHeaderDateNum}>
                                {colDate.getDate()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className={styles.calBody}>
                      <div
                        className={styles.timeGutter}
                        style={{ height: calendarBodyHeightPx() }}
                      >
                        {calendarHourRows().map((h) => (
                          <div key={h} className={styles.timeGutterCell}>
                            {formatCalendarHourLabel(h)}
                          </div>
                        ))}
                      </div>
                      <div className={styles.dayTracks}>
                        {meetupsByDayIndex.map((dayMeetups, idx) => {
                          const colDate = addDays(weekStartDate, idx);
                          const key = formatLocalDateKey(colDate);
                          const isToday = key === todayKey;
                          return (
                            <div
                              key={key}
                              className={`${styles.dayTrack} ${isToday ? styles.dayTrackToday : ''}`}
                              style={{ minHeight: calendarBodyHeightPx() }}
                            >
                              {dayMeetups.map((m) => {
                                const layout = getCalendarEventLayout(
                                  new Date(m.scheduledAt),
                                  CALENDAR_EVENT_DEFAULT_DURATION_MIN,
                                );
                                if (!layout) {
                                  return null;
                                }
                                return (
                                  <Link
                                    key={m.id}
                                    to="/meetups/$meetupId"
                                    params={{ meetupId: m.id }}
                                    className={styles.calEvent}
                                    style={{
                                      top: layout.top,
                                      height: layout.height,
                                    }}
                                  >
                                    <div className={styles.calEventHead}>
                                      <span
                                        className={styles.calEventDot}
                                        aria-hidden
                                      />
                                      <span className={styles.calEventTitle}>
                                        {m.title}
                                      </span>
                                    </div>
                                    <div className={styles.calEventTime}>
                                      {formatTime(m.scheduledAt)}
                                      {m.game ? ` · ${m.game.title}` : ''}
                                    </div>
                                    {spotsLine(m) && (
                                      <div className={styles.calEventMeta}>
                                        {spotsLine(m)}
                                      </div>
                                    )}
                                  </Link>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                {listQuery.data.data.length === 0 && (
                  <p className="muted">No meetups this week.</p>
                )}
              </>
            )}

            {listQuery.data && search.view === 'list' && (
              <>
                <ul className={styles.meetupCards}>
                  {listQuery.data.data.map((m) => (
                    <li key={m.id}>
                      <Link
                        to="/meetups/$meetupId"
                        params={{ meetupId: m.id }}
                        className={styles.meetupCard}
                      >
                        <div className={styles.meetupCardTitle}>{m.title}</div>
                        <div className="muted">
                          {new Date(m.scheduledAt).toLocaleString()}
                          {m.location && ` · ${m.location}`}
                        </div>
                        <div className="muted">
                          Host: {m.host.displayName}
                          {m.game && ` · ${m.game.title}`}
                          {m.maxPlayers != null &&
                            ` · ${1 + m.joinedParticipantCount}/${m.maxPlayers} spots`}
                        </div>
                        <div className={styles.meetupStatus}>{m.status}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
                {listQuery.data.data.length === 0 && (
                  <p className="muted">No meetups match this filter.</p>
                )}
                <div className="pagination">
                  <button
                    type="button"
                    className="button ghost"
                    disabled={search.page <= 1}
                    onClick={() =>
                      void navigate({
                        search: { ...search, page: search.page - 1 },
                      })
                    }
                  >
                    Previous
                  </button>
                  <span className="muted">
                    Page {search.page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="button ghost"
                    disabled={search.page >= totalPages}
                    onClick={() =>
                      void navigate({
                        search: { ...search, page: search.page + 1 },
                      })
                    }
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>

          <aside className={styles.aside} aria-label="Upcoming sidebar">
            <div className={styles.miniCal}>
              <div className={styles.miniCalHeadRow}>
                <span className={styles.miniCalTitle}>{miniCalTitleLabel}</span>
                <div className={styles.miniCalNav}>
                  <button
                    type="button"
                    className={styles.miniCalNavBtn}
                    aria-label="Previous month"
                    onClick={() => setMiniCalMonthOffset((o) => o - 1)}
                  >
                    <ChevronLeft size={16} strokeWidth={2} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={styles.miniCalNavBtn}
                    aria-label="Next month"
                    onClick={() => setMiniCalMonthOffset((o) => o + 1)}
                  >
                    <ChevronRight size={16} strokeWidth={2} aria-hidden />
                  </button>
                </div>
              </div>
              <div className={styles.miniDow}>
                {WEEKDAY_LABELS_SUN.map((d) => (
                  <span key={d}>{d.charAt(0)}</span>
                ))}
              </div>
              <div className={styles.miniCells}>
                {miniCalCells.map((cell, i) => {
                  if (!cell) {
                    return <span key={`p-${i}`} className={styles.miniEmpty} />;
                  }
                  const k = formatLocalDateKey(cell);
                  const inWeek = k >= weekSundayKey && k <= weekEndKey;
                  const isToday = k === todayKey;
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`${styles.miniDay} ${inWeek ? styles.miniDayInWeek : ''} ${isToday ? styles.miniDayToday : ''}`}
                      onClick={() => setMiniDay(cell)}
                    >
                      {cell.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.upcomingHead}>
              <h2 className={styles.upcomingTitle}>Upcoming for you</h2>
              <button
                type="button"
                className={styles.viewAll}
                onClick={() =>
                  void navigate({
                    search: {
                      ...search,
                      view: 'list',
                      upcoming: 'true',
                      joined: 'me',
                      page: 1,
                    },
                  })
                }
              >
                View All
              </button>
            </div>
            {sidebarQuery.isLoading && (
              <p className={`muted ${styles.fine}`}>Loading your RSVPs…</p>
            )}
            {sidebarQuery.isError && (
              <p className={`error ${styles.fine}`} role="alert">
                Could not load RSVPs.
              </p>
            )}
            {sidebarQuery.data && (
              <ul className={styles.upcomingList}>
                {sidebarQuery.data.data.length === 0 && (
                  <li className={`muted ${styles.fine}`}>
                    You have no upcoming RSVPs. Join a meetup from the calendar
                    or list.
                  </li>
                )}
                {sidebarQuery.data.data.map((m) => {
                  const d = new Date(m.scheduledAt);
                  const monthShort = d
                    .toLocaleString(undefined, { month: 'short' })
                    .toUpperCase();
                  return (
                    <li key={m.id} className={styles.upcomingCard}>
                      <div className={styles.upcomingCardInner}>
                        <div className={styles.upcomingDateBadge} aria-hidden>
                          <span className={styles.upcomingDateBadgeMonth}>
                            {monthShort}
                          </span>
                          <span className={styles.upcomingDateBadgeDay}>
                            {d.getDate()}
                          </span>
                        </div>
                        <div className={styles.upcomingCardMain}>
                          <Link
                            to="/meetups/$meetupId"
                            params={{ meetupId: m.id }}
                            className={styles.upcomingCardTitle}
                          >
                            {m.title}
                          </Link>
                          <div className={styles.upcomingMetaRow}>
                            <Clock
                              size={13}
                              strokeWidth={2}
                              className={styles.upcomingMetaIcon}
                              aria-hidden
                            />
                            <span>
                              {d.toLocaleString(undefined, {
                                weekday: 'short',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {m.location ? (
                            <div className={styles.upcomingMetaRow}>
                              <MapPin
                                size={13}
                                strokeWidth={2}
                                className={styles.upcomingMetaIcon}
                                aria-hidden
                              />
                              <span>{m.location}</span>
                            </div>
                          ) : null}
                          <div className={styles.upcomingFoot}>
                            <Link
                              to="/meetups/$meetupId"
                              params={{ meetupId: m.id }}
                              className={styles.rsvpSecondaryBtn}
                            >
                              Manage RSVP
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
