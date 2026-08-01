/**
 * SROP Phase 3: Recommendation Engine Service
 * Implements Field-Operator-Value Structured Rules, Score Explainability, and Workload Fairness Penalty.
 */

export class RecommendationService {
  constructor(rules = [], history = []) {
    // Default rules if none provided
    this.rules = rules.length > 0 ? rules : [
      { id: 'r1', field: 'subjectCode', operator: 'equals', weight: 40, name: 'Same Subject' },
      { id: 'r2', field: 'departmentId', operator: 'equals', weight: 25, name: 'Same Department' },
      { id: 'r3', field: 'building', operator: 'equals', weight: 10, name: 'Same Building' }
    ];
    this.history = history;
  }

  /**
   * Evaluate a single candidate against target context and calculate Match Score with Explainability.
   */
  evaluateCandidate(candidate, targetContext) {
    let totalScore = 0;
    const breakdown = [];

    // 1. Evaluate Structured Rules
    for (const rule of this.rules) {
      let isMatch = false;
      const candidateValue = candidate[rule.field];
      const targetValue = targetContext[rule.field];

      if (rule.operator === 'equals') {
        isMatch = candidateValue !== undefined && candidateValue === targetValue;
      } else if (rule.operator === 'contains') {
        isMatch = String(candidateValue || '').includes(String(targetValue || ''));
      }

      if (isMatch) {
        totalScore += rule.weight;
        breakdown.push({ rule: rule.name, score: rule.weight });
      }
    }

    // 2. Workload Fairness Penalty (Subtract 10 points for each recent substitution in past 30 days)
    const recentSubCount = this.history.filter(h => h.teacherId === candidate.id).length;
    if (recentSubCount > 0) {
      const penalty = recentSubCount * 10;
      totalScore = Math.max(0, totalScore - penalty);
      breakdown.push({ rule: `Workload Fairness Penalty (-${penalty})`, score: -penalty });
    }

    return {
      candidate,
      totalScore,
      matchPercentage: Math.min(100, Math.max(0, totalScore)),
      explainabilityBreakdown: breakdown
    };
  }

  /**
   * Rank a pool of candidates sorted by Match Percentage (highest first).
   */
  rankCandidates(candidates, targetContext) {
    const evaluated = candidates.map(c => this.evaluateCandidate(c, targetContext));
    evaluated.sort((a, b) => b.totalScore - a.totalScore);
    return evaluated;
  }
}
