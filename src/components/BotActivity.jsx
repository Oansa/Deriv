import { useMemo } from 'react';
import { Bot, Clock, Zap, Activity, AlertTriangle } from 'lucide-react';

function BotActivity({ trades }) {
    const analysis = useMemo(() => {
        if (!trades || trades.length === 0) {
            return null;
        }

        const sortedTrades = [...trades].sort((a, b) => a.purchase_time - b.purchase_time);

        // Calculate intervals between trades
        const intervals = [];
        for (let i = 1; i < sortedTrades.length; i++) {
            intervals.push(sortedTrades[i].purchase_time - sortedTrades[i - 1].purchase_time);
        }

        // Calculate statistics
        const avgInterval = intervals.length > 0
            ? intervals.reduce((a, b) => a + b, 0) / intervals.length
            : 0;

        const minInterval = intervals.length > 0 ? Math.min(...intervals) : 0;
        const maxInterval = intervals.length > 0 ? Math.max(...intervals) : 0;

        // Count rapid trades (less than 5 seconds apart)
        const rapidTrades = intervals.filter((i) => i < 5).length;

        // Count consistent interval trades (within 1 second of average)
        const consistentTrades = intervals.filter(
            (i) => Math.abs(i - avgInterval) < 2
        ).length;

        // Bot likelihood score
        let botScore = 0;
        if (minInterval < 2) botScore += 30;
        else if (minInterval < 5) botScore += 15;

        if (consistentTrades > intervals.length * 0.5) botScore += 30;
        if (rapidTrades > intervals.length * 0.3) botScore += 25;
        if (avgInterval < 30) botScore += 15;

        // Detect trading patterns
        const patterns = detectPatterns(sortedTrades);

        return {
            totalTrades: trades.length,
            avgInterval,
            minInterval,
            maxInterval,
            rapidTrades,
            consistentTrades,
            botScore: Math.min(botScore, 100),
            isBotLikely: botScore >= 50,
            patterns,
            intervals,
        };
    }, [trades]);

    function detectPatterns(sortedTrades) {
        const patterns = [];

        // Check for consistent stake amounts
        const stakes = sortedTrades.map((t) => t.buy_price);
        const uniqueStakes = [...new Set(stakes)];
        if (uniqueStakes.length <= 3 && sortedTrades.length > 10) {
            patterns.push({
                name: 'Fixed Stake Pattern',
                description: `Only ${uniqueStakes.length} unique stake amounts detected`,
                confidence: 'high',
            });
        }

        // Check for consistent asset trading
        const assets = sortedTrades.map((t) => t.underlying);
        const uniqueAssets = [...new Set(assets)];
        if (uniqueAssets.length === 1 && sortedTrades.length > 10) {
            patterns.push({
                name: 'Single Asset Focus',
                description: `All trades on ${uniqueAssets[0]}`,
                confidence: 'medium',
            });
        }

        // Check for time-based patterns (hourly trading)
        const hours = sortedTrades.map((t) => new Date(t.purchase_time * 1000).getHours());
        const hourCounts = {};
        hours.forEach((h) => {
            hourCounts[h] = (hourCounts[h] || 0) + 1;
        });
        const maxHourCount = Math.max(...Object.values(hourCounts));
        if (maxHourCount > sortedTrades.length * 0.4) {
            patterns.push({
                name: 'Concentrated Trading Hours',
                description: `${maxHourCount} trades during peak hour`,
                confidence: 'medium',
            });
        }

        return patterns;
    }

    const formatDuration = (seconds) => {
        if (seconds < 60) return `${seconds.toFixed(1)}s`;
        if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
        return `${(seconds / 3600).toFixed(1)}h`;
    };

    if (!analysis) {
        return (
            <div className="bg-surface rounded-xl p-8 border border-border text-center">
                <Bot className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                    No Trading Data
                </h3>
                <p className="text-text-secondary">
                    Trade history is needed to analyze bot activity.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Bot Detection Banner */}
            <div className={`rounded-xl p-6 border ${analysis.isBotLikely
                    ? 'bg-warning/10 border-warning/50'
                    : 'bg-success/10 border-success/50'
                }`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${analysis.isBotLikely ? 'bg-warning/20' : 'bg-success/20'
                        }`}>
                        <Bot className={`w-8 h-8 ${analysis.isBotLikely ? 'text-warning' : 'text-success'
                            }`} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-text-primary">
                            {analysis.isBotLikely ? 'Bot Activity Detected' : 'Manual Trading Likely'}
                        </h2>
                        <p className="text-text-secondary">
                            Bot confidence score: <span className="font-semibold">{analysis.botScore}%</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 text-text-secondary mb-2">
                        <Activity className="w-4 h-4" />
                        <span className="text-sm">Total Trades</span>
                    </div>
                    <div className="text-2xl font-bold text-text-primary">
                        {analysis.totalTrades}
                    </div>
                </div>

                <div className="bg-surface rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 text-text-secondary mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Avg Interval</span>
                    </div>
                    <div className="text-2xl font-bold text-text-primary">
                        {formatDuration(analysis.avgInterval)}
                    </div>
                </div>

                <div className="bg-surface rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 text-text-secondary mb-2">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm">Rapid Trades</span>
                    </div>
                    <div className={`text-2xl font-bold ${analysis.rapidTrades > 10 ? 'text-warning' : 'text-text-primary'
                        }`}>
                        {analysis.rapidTrades}
                    </div>
                </div>

                <div className="bg-surface rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 text-text-secondary mb-2">
                        <Bot className="w-4 h-4" />
                        <span className="text-sm">Min Interval</span>
                    </div>
                    <div className={`text-2xl font-bold ${analysis.minInterval < 5 ? 'text-warning' : 'text-text-primary'
                        }`}>
                        {formatDuration(analysis.minInterval)}
                    </div>
                </div>
            </div>

            {/* Detected Patterns */}
            {analysis.patterns.length > 0 && (
                <div className="bg-surface rounded-xl p-5 border border-border">
                    <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                        Detected Patterns
                    </h3>
                    <div className="space-y-3">
                        {analysis.patterns.map((pattern, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-background rounded-lg"
                            >
                                <div>
                                    <span className="font-medium text-text-primary">
                                        {pattern.name}
                                    </span>
                                    <p className="text-sm text-text-secondary">
                                        {pattern.description}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded ${pattern.confidence === 'high'
                                        ? 'bg-warning/20 text-warning'
                                        : 'bg-accent/20 text-accent'
                                    }`}>
                                    {pattern.confidence} confidence
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Interval Distribution Chart (simplified) */}
            <div className="bg-surface rounded-xl p-5 border border-border">
                <h3 className="font-semibold text-text-primary mb-4">
                    Trade Interval Distribution
                </h3>
                <div className="flex items-end gap-1 h-32">
                    {(() => {
                        const buckets = [0, 0, 0, 0, 0]; // <5s, 5-30s, 30s-5m, 5-30m, >30m
                        analysis.intervals.forEach((i) => {
                            if (i < 5) buckets[0]++;
                            else if (i < 30) buckets[1]++;
                            else if (i < 300) buckets[2]++;
                            else if (i < 1800) buckets[3]++;
                            else buckets[4]++;
                        });
                        const maxBucket = Math.max(...buckets);

                        const labels = ['<5s', '5-30s', '30s-5m', '5-30m', '>30m'];
                        const colors = [
                            'bg-danger',
                            'bg-warning',
                            'bg-yellow-400',
                            'bg-accent',
                            'bg-success',
                        ];

                        return buckets.map((count, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className={`w-full ${colors[index]} rounded-t transition-all`}
                                    style={{ height: `${maxBucket > 0 ? (count / maxBucket) * 100 : 0}%`, minHeight: count > 0 ? '4px' : '0' }}
                                />
                                <span className="text-xs text-text-secondary">{labels[index]}</span>
                                <span className="text-xs text-text-muted">{count}</span>
                            </div>
                        ));
                    })()}
                </div>
            </div>
        </div>
    );
}

export default BotActivity;
