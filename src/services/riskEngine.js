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
            maxDailyTrades: 50,
            maxLossStreak: 5,
            maxPositionPercent: 10, // % of balance
            minTimeBetweenTrades: 10, // seconds
            martingaleMultiplier: 1.8,
            balanceDropPercent: 20, // % drop warning
            botTradeInterval: 2, // seconds - suspicious if trades are this fast
        };

        this.warnings = [];
    }

    setThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
    }

    analyzeTradeHistory(trades, currentBalance, initialBalance) {
        this.warnings = [];

        if (!trades || trades.length === 0) {
            return { warnings: [], riskScore: 0 };
        }

        this.checkOvertrading(trades);
        this.checkLossStreak(trades);
        this.checkRapidTrading(trades);
        this.checkMartingalePattern(trades);
        this.checkBalanceDepletion(currentBalance, initialBalance);
        this.checkBotActivity(trades);
        this.checkUnusualHours(trades);

        const riskScore = this.calculateOverallRiskScore();

        return {
            warnings: this.warnings,
            riskScore,
            riskLevel: this.getRiskLevel(riskScore),
        };
    }

    checkOvertrading(trades) {
        const today = new Date().toDateString();
        const todayTrades = trades.filter(
            (t) => new Date(t.purchase_time * 1000).toDateString() === today
        );

        if (todayTrades.length > this.thresholds.maxDailyTrades) {
            this.warnings.push({
                type: RiskType.OVERTRADING,
                level: RiskLevel.HIGH,
                message: `High trading frequency: ${todayTrades.length} trades today (threshold: ${this.thresholds.maxDailyTrades})`,
                value: todayTrades.length,
            });
        }
    }

    checkLossStreak(trades) {
        let currentStreak = 0;
        let maxStreak = 0;

        for (const trade of trades) {
            if (trade.sell_price < trade.buy_price) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        }

        if (maxStreak >= this.thresholds.maxLossStreak) {
            this.warnings.push({
                type: RiskType.HIGH_LOSS_STREAK,
                level: maxStreak >= 8 ? RiskLevel.CRITICAL : RiskLevel.HIGH,
                message: `Consecutive losses detected: ${maxStreak} trades in a row`,
                value: maxStreak,
            });
        }
    }

    checkRapidTrading(trades) {
        const sortedTrades = [...trades].sort((a, b) => a.purchase_time - b.purchase_time);
        let rapidCount = 0;

        for (let i = 1; i < sortedTrades.length; i++) {
            const timeDiff = sortedTrades[i].purchase_time - sortedTrades[i - 1].purchase_time;
            if (timeDiff < this.thresholds.minTimeBetweenTrades) {
                rapidCount++;
            }
        }

        if (rapidCount > 5) {
            this.warnings.push({
                type: RiskType.RAPID_TRADING,
                level: RiskLevel.MEDIUM,
                message: `Rapid trading detected: ${rapidCount} trades with less than ${this.thresholds.minTimeBetweenTrades}s intervals`,
                value: rapidCount,
            });
        }
    }

    checkMartingalePattern(trades) {
        const sortedTrades = [...trades].sort((a, b) => a.purchase_time - b.purchase_time);
        let martingaleCount = 0;

        for (let i = 1; i < sortedTrades.length; i++) {
            const prevTrade = sortedTrades[i - 1];
            const currTrade = sortedTrades[i];

            // Check if previous was a loss and current stake is significantly higher
            if (
                prevTrade.sell_price < prevTrade.buy_price &&
                currTrade.buy_price >= prevTrade.buy_price * this.thresholds.martingaleMultiplier
            ) {
                martingaleCount++;
            }
        }

        if (martingaleCount >= 3) {
            this.warnings.push({
                type: RiskType.MARTINGALE_PATTERN,
                level: RiskLevel.CRITICAL,
                message: `Martingale pattern detected: ${martingaleCount} instances of doubled stakes after losses`,
                value: martingaleCount,
            });
        }
    }

    checkBalanceDepletion(currentBalance, initialBalance) {
        if (!initialBalance || initialBalance === 0) return;

        const dropPercent = ((initialBalance - currentBalance) / initialBalance) * 100;

        if (dropPercent >= this.thresholds.balanceDropPercent) {
            this.warnings.push({
                type: RiskType.BALANCE_DEPLETION,
                level: dropPercent >= 50 ? RiskLevel.CRITICAL : RiskLevel.HIGH,
                message: `Significant balance drop: ${dropPercent.toFixed(1)}% decrease from initial balance`,
                value: dropPercent,
            });
        }
    }

    checkBotActivity(trades) {
        const sortedTrades = [...trades].sort((a, b) => a.purchase_time - b.purchase_time);
        let suspiciousIntervals = 0;

        for (let i = 1; i < Math.min(sortedTrades.length, 20); i++) {
            const timeDiff = sortedTrades[i].purchase_time - sortedTrades[i - 1].purchase_time;
            if (timeDiff <= this.thresholds.botTradeInterval) {
                suspiciousIntervals++;
            }
        }

        if (suspiciousIntervals >= 5) {
            this.warnings.push({
                type: RiskType.BOT_ACTIVITY,
                level: RiskLevel.MEDIUM,
                message: `Potential bot activity: ${suspiciousIntervals} trades executed within ${this.thresholds.botTradeInterval}s intervals`,
                value: suspiciousIntervals,
                isBotLikely: true,
            });
        }
    }

    checkUnusualHours(trades) {
        const unusualHourTrades = trades.filter((trade) => {
            const hour = new Date(trade.purchase_time * 1000).getHours();
            return hour >= 0 && hour < 6; // Between midnight and 6 AM
        });

        if (unusualHourTrades.length >= 10) {
            this.warnings.push({
                type: RiskType.UNUSUAL_HOURS,
                level: RiskLevel.LOW,
                message: `Trading during unusual hours: ${unusualHourTrades.length} trades between 12 AM - 6 AM`,
                value: unusualHourTrades.length,
            });
        }
    }

    analyzeOpenPositions(positions, balance) {
        const positionWarnings = [];

        for (const position of positions) {
            const positionPercent = (position.buy_price / balance) * 100;

            if (positionPercent > this.thresholds.maxPositionPercent) {
                positionWarnings.push({
                    type: RiskType.LARGE_POSITION,
                    level: positionPercent > 25 ? RiskLevel.CRITICAL : RiskLevel.HIGH,
                    message: `Large position: ${positionPercent.toFixed(1)}% of balance on contract ${position.contract_id}`,
                    value: positionPercent,
                    contractId: position.contract_id,
                });
            }
        }

        return positionWarnings;
    }

    calculateOverallRiskScore() {
        let score = 0;

        for (const warning of this.warnings) {
            switch (warning.level) {
                case RiskLevel.LOW:
                    score += 5;
                    break;
                case RiskLevel.MEDIUM:
                    score += 15;
                    break;
                case RiskLevel.HIGH:
                    score += 30;
                    break;
                case RiskLevel.CRITICAL:
                    score += 50;
                    break;
            }
        }

        return Math.min(score, 100);
    }

    getRiskLevel(score) {
        if (score >= 70) return RiskLevel.CRITICAL;
        if (score >= 40) return RiskLevel.HIGH;
        if (score >= 20) return RiskLevel.MEDIUM;
        return RiskLevel.LOW;
    }
}

export const riskEngine = new RiskEngine();
export default riskEngine;
