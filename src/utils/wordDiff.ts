export interface WordDiffToken {
  type: 'unchanged' | 'added' | 'removed';
  value: string;
}

export interface WordDiffResult {
  addedCount: number;
  removedCount: number;
  totalChanged: number;
  originalWordCount: number;
  finalWordCount: number;
  tokens: WordDiffToken[];
}

/**
 * Computes a simple word-level diff between original draft and edited message.
 */
export function computeWordDiff(original: string, updated: string): WordDiffResult {
  const origWords = original.trim().split(/\s+/).filter(Boolean);
  const updatedWords = updated.trim().split(/\s+/).filter(Boolean);

  // Simple Longest Common Subsequence (LCS) for word arrays
  const m = origWords.length;
  const n = updatedWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origWords[i - 1].toLowerCase() === updatedWords[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find tokens
  let i = m;
  let j = n;
  const rawTokens: WordDiffToken[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origWords[i - 1].toLowerCase() === updatedWords[j - 1].toLowerCase()) {
      rawTokens.push({ type: 'unchanged', value: updatedWords[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawTokens.push({ type: 'added', value: updatedWords[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawTokens.push({ type: 'removed', value: origWords[i - 1] });
      i--;
    }
  }

  rawTokens.reverse();

  let addedCount = 0;
  let removedCount = 0;

  for (const token of rawTokens) {
    if (token.type === 'added') addedCount++;
    if (token.type === 'removed') removedCount++;
  }

  return {
    addedCount,
    removedCount,
    totalChanged: addedCount + removedCount,
    originalWordCount: origWords.length,
    finalWordCount: updatedWords.length,
    tokens: rawTokens,
  };
}
