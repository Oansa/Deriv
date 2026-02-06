/**
 * Risk Engine - Analyzes trading activity and detects potential risks
 */

export const RiskLevel = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
};

export const RiskType = {
    OVERTRADING: 'overtrading',
    HIGH_LOSS_STREAK: 'high_loss_streak',
    LARGE_POSITION: 'large_position',
    RAPID_TRADING: 'rapid_trading',
    MARTINGALE_PATTERN: 'martingale_pattern',
    BALANCE_DEPLETION: 'balance_depletion',
    BOT_ACTIVITY: 'bot_activity',
    UNUSUAL_HOURS: 'unusual_hours',
};

class RiskEngine {
  constructor() {
    this.thresholds = {
      martingaleMultiplier: 1.8, // Stake increase threshold
      martingaleOccurrences: 2,  // Min occurrences to flag
      overtradingCount: 5,       // Trades in timeframe
      overtradingWindow: 300000, // 5 minutes in ms
      lossStreakMin: 3,          // Consecutive losses to flag
      highRiskScore: 40,         // Below this is high risk
      mediumRiskScore: 70        // Below this is medium risk
    };
  }

  /**
   * Detect Martingale strategy (stake doubling after losses)
   */
  detectMartingale(trades) {
    if (!trades || trades.length < 3) return null;
    
    const recent = trades.slice(0, 10); // Check last 10 trades
    let doublingPattern = 0;
    let doublingInstances = [];
    
    for (let i = 1; i < recent.length; i++) {
      const currentStake = recent[i].buy_price;
      const previousStake = recent[i - 1].buy_price;
      const previousProfit = recent[i - 1].profit;
      
      // Check if stake increased after a loss
      if (previousProfit < 0 && currentStake >= previousStake * this.thresholds.martingaleMultiplier) {
        doublingPattern++;
        doublingInstances.push({
          previousStake,
          currentStake,
          increase: ((currentStake / previousStake - 1) * 100).toFixed(1)
        });
      }
    }
    
    if (doublingPattern >= this.thresholds.martingaleOccurrences) {
      return {
        severity: 'high',
        type: 'martingale',
        pattern: 'Martingale',
        count: doublingPattern,
        instances: doublingInstances,
        message: `Stake doubling detected after ${doublingPattern} losses - Classic Martingale pattern`,
        explanation: 'You increased your stake after losing. This is extremely risky and can wipe your account quickly.',
        recommendation: 'Use fixed stakes or stop trading after 2-3 consecutive losses.'
      };
    }
    
    return null;
  }

  /**
   * Detect overtrading (too many trades in short time)
   */
  detectOvertrading(trades) {
    if (!trades || trades.length === 0) return null;
    
    const now = Date.now();
    const windowStart = now - this.thresholds.overtradingWindow;
    
    const recentTrades = trades.filter(t => t.purchase_time > windowStart);
    
    if (recentTrades.length >= this.thresholds.overtradingCount) {
      return {
        severity: 'medium',
        type: 'overtrading',
        count: recentTrades.length,
        timeWindow: '5 minutes',
        message: `${recentTrades.length} trades in 5 minutes - Possible emotional or revenge trading`,
        explanation: 'Trading too frequently often indicates emotional decisions rather than strategic thinking.',
        recommendation: 'Take a break. Set a minimum time between trades (at least 5-10 minutes).'
      };
    }
    
    return null;
  }

  /**
   * Detect consecutive loss streaks
   */
  detectLossStreak(trades) {
    if (!trades || trades.length === 0) return null;
    
    let streak = 0;
    let totalLoss = 0;
    
    for (let trade of trades) {
      if (trade.profit < 0) {
        streak++;
        totalLoss += Math.abs(trade.profit);
      } else {
        break; // Stop at first win
      }
    }
    
    if (streak >= this.thresholds.lossStreakMin) {
      return {
        severity: streak >= 5 ? 'high' : 'medium',
        type: 'loss_streak',
        streak: streak,
        totalLoss: totalLoss.toFixed(2),
        message: `${streak} consecutive losses totaling $${totalLoss.toFixed(2)}`,
        explanation: 'Losing streaks are normal, but continuing to trade during one often makes it worse.',
        recommendation: 'Stop trading for at least 1 hour. Review your strategy before continuing.'
      };
    }
    
    return null;
  }

  /**
   * Detect risky bot strategies
   */
  detectBotRisk(botTransactions) {
    if (!botTransactions || botTransactions.length === 0) return null;
    
    const riskyPatterns = [
      { keyword: 'martingale', severity: 'high', name: 'Martingale' },
      { keyword: "d'alembert", severity: 'high', name: "D'Alembert" },
      { keyword: 'anti-martingale', severity: 'medium', name: 'Anti-Martingale' },
      { keyword: 'grid', severity: 'medium', name: 'Grid Trading' }
    ];
    
    for (let pattern of riskyPatterns) {
      const detected = botTransactions.some(t => 
        t.longcode?.toLowerCase().includes(pattern.keyword) ||
        t.shortcode?.toLowerCase().includes(pattern.keyword)
      );
      
      if (detected) {
        return {
          severity: pattern.severity,
          type: 'bot_risk',
          botType: `${pattern.name} DBot`,
          transactionCount: botTransactions.length,
          message: `Automated ${pattern.name} strategy detected - High account risk`,
          explanation: `${pattern.name} strategies automatically increase stakes after losses. This can drain your account in minutes during volatility.`,
          recommendation: 'Stop the bot immediately. Use fixed-stake strategies or manual trading with strict limits.'
        };
      }
    }
    
    return null;
  }

  /**
   * Detect position sizing issues
   */
  detectPositionSizing(trades, accountBalance) {
    if (!trades || trades.length === 0 || !accountBalance) return null;
    
    const recent = trades.slice(0, 5);
    const avgStake = recent.reduce((sum, t) => sum + t.buy_price, 0) / recent.length;
    const stakePercentage = (avgStake / accountBalance) * 100;
    
    if (stakePercentage > 5) {
      return {
        severity: stakePercentage > 10 ? 'high' : 'medium',
        type: 'position_sizing',
        stakePercentage: stakePercentage.toFixed(1),
        avgStake: avgStake.toFixed(2),
        message: `Average stake is ${stakePercentage.toFixed(1)}% of account balance - Too high`,
        explanation: 'Risk management experts recommend never risking more than 1-2% per trade.',
        recommendation: `Reduce your stake to $${(accountBalance * 0.02).toFixed(2)} or less per trade.`
      };
    }
    
    return null;
  }

  /**
   * Calculate overall risk score (0-100)
   */
  calculateRiskScore(trades, botActivity, accountBalance) {
    let score = 100;
    
    const martingale = this.detectMartingale(trades);
    const overtrading = this.detectOvertrading(trades);
    const lossStreak = this.detectLossStreak(trades);
    const botRisk = this.detectBotRisk(botActivity);
    const positionSizing = this.detectPositionSizing(trades, accountBalance);
    
    // Deduct points for each risk
    if (martingale) score -= 40;
    if (overtrading) score -= 20;
    if (lossStreak) {
      score -= lossStreak.severity === 'high' ? 25 : 15;
    }
    if (botRisk) score -= 30;
    if (positionSizing) {
      score -= positionSizing.severity === 'high' ? 25 : 15;
    }
    
    return Math.max(0, score);
  }

  /**
   * Get all detected risks
   */
  getAllRisks(trades, botActivity, accountBalance) {
    const risks = [];
    
    const martingale = this.detectMartingale(trades);
    if (martingale) risks.push(martingale);
    
    const overtrading = this.detectOvertrading(trades);
    if (overtrading) risks.push(overtrading);
    
    const lossStreak = this.detectLossStreak(trades);
    if (lossStreak) risks.push(lossStreak);
    
    const botRisk = this.detectBotRisk(botActivity);
    if (botRisk) risks.push(botRisk);
    
    const positionSizing = this.detectPositionSizing(trades, accountBalance);
    if (positionSizing) risks.push(positionSizing);
    
    return risks;
  }

  /**
   * Get risk level label
   */
  getRiskLevel(score) {
    if (score >= this.thresholds.mediumRiskScore) return 'low';
    if (score >= this.thresholds.highRiskScore) return 'medium';
    return 'high';
  }

  /**
   * Get risk color for UI
   */
  getRiskColor(score) {
    if (score >= this.thresholds.mediumRiskScore) return 'green';
    if (score >= this.thresholds.highRiskScore) return 'yellow';
    return 'red';
  }

  /**
   * Static method to analyze all risks at once
   * This is what the React hook calls
   */
  static analyzeRisks({ openTrades, tradeHistory, botActivity, balance }) {
    const engine = new RiskEngine();
    
    const risks = engine.getAllRisks(tradeHistory, botActivity, balance);
    const score = engine.calculateRiskScore(tradeHistory, botActivity, balance);
    
    return {
      score,
      risks,
      level: engine.getRiskLevel(score),
      color: engine.getRiskColor(score)
    };
  }
}

export default RiskEngine;