const BANNER_GRADIENTS = [
  'linear-gradient(135deg, #0c0e15 0%, #1a1033 35%, #4a2080 65%, color-mix(in oklab, var(--color-accent) 55%, #1a1033) 100%)',
  'linear-gradient(125deg, #0c0e15 0%, #102a43 40%, #1d4e6b 70%, color-mix(in oklab, var(--color-accent) 45%, #102a43) 100%)',
  'linear-gradient(140deg, #0c0e15 0%, #2d1b1b 35%, #6b2d3a 65%, color-mix(in oklab, var(--color-accent) 50%, #2d1b1b) 100%)',
  'linear-gradient(130deg, #0c0e15 0%, #1b2d1f 40%, #2d5a3d 70%, color-mix(in oklab, var(--color-accent) 40%, #1b2d1f) 100%)',
  'linear-gradient(145deg, #0c0e15 0%, #2a1f3d 35%, #4a3070 65%, color-mix(in oklab, var(--color-warning) 35%, #2a1f3d) 100%)',
  'linear-gradient(120deg, #0c0e15 0%, #1f2937 40%, #374151 70%, color-mix(in oklab, var(--color-accent) 48%, #1f2937) 100%)',
] as const;

function hashSlug(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function gameBannerGradient(slug: string): string {
  return BANNER_GRADIENTS[hashSlug(slug) % BANNER_GRADIENTS.length];
}
