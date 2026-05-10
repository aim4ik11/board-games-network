import { useCallback, useMemo, useRef, useState } from 'react';
import styles from './playtime-range-slider.module.scss';

type PlaytimeRangeSliderProps = {
  minBound: number;
  maxBound: number;
  step: number;
  low: number;
  high: number;
  onChange: (range: { low: number; high: number }) => void;
};

type HandleName = 'low' | 'high';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function buildMarks(min: number, max: number, step: number): number[] {
  if (step <= 0) {
    return [min, max];
  }

  const marks: number[] = [];
  for (let value = min; value <= max; value += step) {
    marks.push(value);
  }

  if (marks[marks.length - 1] !== max) {
    marks.push(max);
  }

  return marks;
}

function nearestMarkIndex(marks: number[], value: number): number {
  if (marks.length === 0) {
    return 0;
  }

  let closest = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < marks.length; i += 1) {
    const distance = Math.abs(marks[i] - value);
    if (distance < closestDistance) {
      closest = i;
      closestDistance = distance;
    }
  }
  return closest;
}

export function PlaytimeRangeSlider({
  minBound,
  maxBound,
  step,
  low,
  high,
  onChange,
}: PlaytimeRangeSliderProps) {
  const marks = useMemo(
    () => buildMarks(minBound, maxBound, step),
    [minBound, maxBound, step],
  );
  const maxIndex = marks.length - 1;

  const [dragging, setDragging] = useState<HandleName | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  const rawLowIndex = nearestMarkIndex(marks, clamp(low, minBound, maxBound));
  const rawHighIndex = nearestMarkIndex(marks, clamp(high, minBound, maxBound));
  const lowIndex = Math.min(rawLowIndex, rawHighIndex);
  const highIndex = Math.max(rawLowIndex, rawHighIndex);

  const lowPercent = maxIndex <= 0 ? 0 : (lowIndex / maxIndex) * 100;
  const highPercent = maxIndex <= 0 ? 100 : (highIndex / maxIndex) * 100;
  const lowValue = marks[lowIndex] ?? minBound;
  const highValue = marks[highIndex] ?? maxBound;

  const commit = useCallback(
    (nextLowIndex: number, nextHighIndex: number) => {
      onChange({
        low: marks[nextLowIndex] ?? minBound,
        high: marks[nextHighIndex] ?? maxBound,
      });
    },
    [marks, maxBound, minBound, onChange],
  );

  const updateByClientX = useCallback(
    (clientX: number, activeHandle: HandleName) => {
      const rail = railRef.current;
      if (!rail || maxIndex <= 0) {
        return;
      }

      const rect = rail.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      const index = clamp(Math.round(ratio * maxIndex), 0, maxIndex);

      if (activeHandle === 'low') {
        const nextLow = Math.min(index, highIndex);
        commit(nextLow, highIndex);
        return;
      }

      const nextHigh = Math.max(index, lowIndex);
      commit(lowIndex, nextHigh);
    },
    [commit, highIndex, lowIndex, maxIndex],
  );

  const handleRailPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('button')) {
      return;
    }
    const lowDistance = Math.abs(event.clientX - ((railRef.current?.getBoundingClientRect().left ?? 0) + (lowPercent / 100) * (railRef.current?.clientWidth ?? 0)));
    const highDistance = Math.abs(event.clientX - ((railRef.current?.getBoundingClientRect().left ?? 0) + (highPercent / 100) * (railRef.current?.clientWidth ?? 0)));
    const handle: HandleName = lowDistance <= highDistance ? 'low' : 'high';
    updateByClientX(event.clientX, handle);
  };

  const handlePointerDown =
    (handle: HandleName) => (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(handle);
      updateByClientX(event.clientX, handle);
    };

  const handlePointerMove =
    (handle: HandleName) => (event: React.PointerEvent<HTMLButtonElement>) => {
      if (dragging !== handle) {
        return;
      }
      updateByClientX(event.clientX, handle);
    };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(null);
  };

  return (
    <div className={styles.root}>
      <div
        ref={railRef}
        className={styles.rail}
        onPointerDown={handleRailPointerDown}
      >
        <div className={styles.baseLine} />
        <div
          className={styles.track}
          style={{ left: `${lowPercent}%`, width: `${highPercent - lowPercent}%` }}
        />

        <button
          type="button"
          className={`${styles.handle} ${dragging === 'low' ? styles.active : ''}`}
          style={{ left: `${lowPercent}%` }}
          onPointerDown={handlePointerDown('low')}
          onPointerMove={handlePointerMove('low')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label="Minimum playtime"
        >
          {dragging === 'low' ? (
            <span className={styles.tooltip}>{lowValue}m</span>
          ) : null}
        </button>

        <button
          type="button"
          className={`${styles.handle} ${dragging === 'high' ? styles.active : ''}`}
          style={{ left: `${highPercent}%` }}
          onPointerDown={handlePointerDown('high')}
          onPointerMove={handlePointerMove('high')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label="Maximum playtime"
        >
          {dragging === 'high' ? (
            <span className={styles.tooltip}>{highValue}m</span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
