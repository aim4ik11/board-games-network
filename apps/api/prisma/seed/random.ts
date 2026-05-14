export type Rng = {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  shuffle: <T>(items: readonly T[]) => T[];
  chance: (probability: number) => boolean;
};

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number) => {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    return Math.floor(next() * (hi - lo + 1)) + lo;
  };

  const pick = <T>(items: readonly T[]) => {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty array');
    }
    return items[int(0, items.length - 1)]!;
  };

  const shuffle = <T>(items: readonly T[]) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = int(0, i);
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  };

  const chance = (probability: number) => next() < probability;

  return { next, int, pick, shuffle, chance };
};
