// =============================================================================
// PLN SURVEY APP - Branching Helper Utilities
// =============================================================================

import { Tiang } from '../types';

/**
 * Gets the primary display code for a tiang (e.g. "T1", "T1R01", "T1R02L01").
 * Falls back to "T{nomorUrut}" if kodeTiang is not set.
 */
export function getTiangDisplayCode(tiang: Tiang): string {
  if (tiang.kodeTiang && tiang.kodeTiang.trim().length > 0) {
    return tiang.kodeTiang.trim();
  }
  return `T${tiang.nomorUrut}`;
}

/**
 * Generates the next sequential branch code for a child tiang sprouting from a parent tiang.
 * Examples:
 * - Parent "T1", direction "R" -> "T1R01", "T1R02"
 * - Parent "T4", direction "L" -> "T4L01", "T4L02"
 * - Parent "T1R02", direction "L" -> "T1R02L01", "T1R02L02"
 */
export function generateNextBranchCode(
  parentTiang: Tiang,
  direction: 'R' | 'L',
  tiangList: Tiang[]
): { kodeTiang: string; branchPath: string } {
  const parentCode = getTiangDisplayCode(parentTiang);
  const branchPrefix = `${parentCode}${direction}`;

  // Find all child poles directly branching from this parent in this direction
  const existingChildPoles = tiangList.filter(t => {
    if (t.parentTiangId === parentTiang.id && t.branchDirection === direction) {
      return true;
    }
    if (t.kodeTiang && t.kodeTiang.startsWith(branchPrefix)) {
      return true;
    }
    return false;
  });

  const nextIndex = existingChildPoles.length + 1;
  const formattedIndex = String(nextIndex).padStart(2, '0');
  const kodeTiang = `${branchPrefix}${formattedIndex}`;

  return {
    kodeTiang,
    branchPath: branchPrefix,
  };
}

/**
 * Formats a description label for the active branch mode banner.
 */
export function getBranchModeBannerLabel(
  parentTiang: Tiang | null,
  direction: 'R' | 'L' | null
): string {
  if (!parentTiang || !direction) return '';
  const parentCode = getTiangDisplayCode(parentTiang);
  const dirText = direction === 'R' ? 'Kanan (R)' : 'Kiri (L)';
  return `🌿 Mode Percabangan: ${parentCode}${direction} [${dirText}]`;
}
