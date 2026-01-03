/**
 * Deduplicates tracks by merging enhanced and standard quality variants.
 * Multiple qualities should NOT appear as separate tracks in the UI.
 * 
 * Rules:
 * - If an item has _enhanced suffix, merge with base version
 * - Keep one track, attach has_enhanced_version flag
 * - Use baseId (strip _enhanced) as key
 * - Preserve playCount, lastPlayedAt from base or enhanced (whichever is higher)
 */

type TrackLike = any; // Track | Album | Artist | Playlist with flexible shape

const getBaseId = (item: TrackLike): string | null => {
  // Try multiple ID fields (id, trackId, uri, etc.)
  const id = item.id || item.trackId || item.uri?.split(':').pop();
  if (!id || typeof id !== 'string') return null;
  
  // Remove _enhanced suffix if present
  return id.replace(/_enhanced$/i, '');
};

const getItemPlayCount = (item: TrackLike): number => {
  return item.playCount || item.play_count || 0;
};

const getItemLastPlayed = (item: TrackLike): number => {
  const ts = item.lastPlayedAt || item.last_played_at || item.played_at;
  if (!ts) return 0;
  return new Date(ts).getTime();
};

const isEnhancedVariant = (item: TrackLike): boolean => {
  return !!(
    item.id?.endsWith('_enhanced') ||
    item.trackId?.endsWith('_enhanced') ||
    item.uri?.endsWith('_enhanced')
  );
};

/**
 * Main deduplication function
 * Groups tracks by baseId, keeps highest play stats, marks has_enhanced_version
 */
export const deduplicateTracks = (items: TrackLike[]): TrackLike[] => {
  if (!Array.isArray(items) || items.length === 0) return items;

  const byBaseId = new Map<string, { base: TrackLike; enhanced?: TrackLike }>();

  for (const item of items) {
    const baseId = getBaseId(item);
    if (!baseId) {
      // No valid ID, keep as-is (shouldn't happen)
      byBaseId.set(Math.random().toString(), { base: item });
      continue;
    }

    const existing = byBaseId.get(baseId);
    const isEnhanced = isEnhancedVariant(item);

    if (!existing) {
      byBaseId.set(baseId, isEnhanced ? { base: item, enhanced: undefined } : { base: item });
    } else {
      if (isEnhanced) {
        existing.enhanced = item;
      } else {
        // Prefer non-enhanced as "base"
        if (isEnhancedVariant(existing.base)) {
          existing.enhanced = existing.base;
          existing.base = item;
        }
      }
    }
  }

  // Merge and emit deduplicated list
  const result: TrackLike[] = [];

  const valuesArray = Array.from(byBaseId.values());
  for (const { base, enhanced } of valuesArray) {
    // Use base as primary, fallback to enhanced
    const primary = base || enhanced;
    if (!primary) continue;

    // Mark if enhanced version exists
    const merged = {
      ...primary,
      has_enhanced_version: !!enhanced,
      availableQualities: enhanced ? ['standard', 'enhanced'] : ['standard'],
    };

    // Preserve highest play count and most recent play date
    const baseCount = getItemPlayCount(base);
    const enhancedCount = enhanced ? getItemPlayCount(enhanced) : 0;
    const baseTime = getItemLastPlayed(base);
    const enhancedTime = enhanced ? getItemLastPlayed(enhanced) : 0;

    if (enhancedCount > baseCount) {
      merged.playCount = enhancedCount;
    }
    if (enhancedTime > baseTime) {
      merged.lastPlayedAt = enhanced!.lastPlayedAt || enhanced!.last_played_at;
    }

    result.push(merged);
  }

  return result;
};

export default deduplicateTracks;
