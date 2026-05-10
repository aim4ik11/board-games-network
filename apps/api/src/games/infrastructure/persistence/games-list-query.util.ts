import type { Prisma } from '@prisma/client';

const COMPLEXITY_BANDS = [
  'very-light',
  'light',
  'medium',
  'heavy',
  'expert',
] as const;

export type ComplexityBandId = (typeof COMPLEXITY_BANDS)[number];

export function parseComplexityBands(
  raw: string | undefined,
): ComplexityBandId[] {
  if (!raw?.trim()) {
    return [];
  }
  const allowed = new Set<string>(COMPLEXITY_BANDS);
  const out: ComplexityBandId[] = [];
  for (const part of raw.split(',')) {
    const id = part.trim() as ComplexityBandId;
    if (allowed.has(id)) {
      out.push(id);
    }
  }
  return [...new Set(out)];
}

export function parseGenreSlugs(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const s = part.trim().toLowerCase();
    if (s.length > 0 && s.length <= 64) {
      out.push(s);
    }
  }
  return [...new Set(out)];
}

export function complexityBandWhere(
  bands: ComplexityBandId[],
): Prisma.BoardGameWhereInput | null {
  if (bands.length === 0) {
    return null;
  }
  const or: Prisma.BoardGameWhereInput[] = [];
  for (const b of bands) {
    switch (b) {
      case 'very-light':
        or.push({ complexity: { gte: 0, lte: 1 } });
        break;
      case 'light':
        or.push({ complexity: { gte: 1, lt: 2 } });
        break;
      case 'medium':
        or.push({ complexity: { gte: 2, lt: 3 } });
        break;
      case 'heavy':
        or.push({ complexity: { gte: 3, lt: 4 } });
        break;
      case 'expert':
        or.push({ complexity: { gte: 4, lte: 5 } });
        break;
      default:
        break;
    }
  }
  if (or.length === 0) {
    return null;
  }
  return {
    AND: [{ complexity: { not: null } }, { OR: or }],
  };
}

/** Interval overlap: game [playTimeMin, coalesce(playTimeMax, playTimeMin)] vs filter [ptMin, ptMax]. */
export function playtimeOverlapWhere(
  ptMin?: number,
  ptMax?: number,
): Prisma.BoardGameWhereInput | null {
  if (ptMin == null && ptMax == null) {
    return null;
  }
  const fMin = ptMin ?? 0;
  const fMax = ptMax ?? 99_999;
  return {
    AND: [
      { playTimeMin: { not: null } },
      { playTimeMin: { lte: fMax } },
      {
        OR: [
          {
            AND: [
              { playTimeMax: { not: null } },
              { playTimeMax: { gte: fMin } },
            ],
          },
          {
            AND: [{ playTimeMax: null }, { playTimeMin: { gte: fMin } }],
          },
        ],
      },
    ],
  };
}

export function listGamesOrderBy(
  sort: 'title' | 'year',
  order: 'asc' | 'desc',
): Prisma.BoardGameOrderByWithRelationInput {
  if (sort === 'year') {
    return { yearPublished: order };
  }
  return { title: order };
}
