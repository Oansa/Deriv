import { AlertTriangle, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';
import { RiskLevel, RiskType } from '../services/riskEngine';

function RiskWarnings({ warnings }) {
    const getIcon = (level) => {
        switch (level) {
            case RiskLevel.CRITICAL:
                return <XCircle className="w-5 h-5" />;
            case RiskLevel.HIGH:
                return <AlertTriangle className="w-5 h-5" />;
            case RiskLevel.MEDIUM:
                return <AlertCircle className="w-5 h-5" />;
            default:
                return <Info className="w-5 h-5" />;
        }
    };

    const getColors = (level) => {
        switch (level) {
            case RiskLevel.CRITICAL:
                return 'bg-danger/10 border-danger/50 text-danger';
            case RiskLevel.HIGH:
                return 'bg-warning/10 border-warning/50 text-warning';
            case RiskLevel.MEDIUM:
                return 'bg-yellow-400/10 border-yellow-400/50 text-yellow-400';
            default:
                return 'bg-accent/10 border-accent/50 text-accent';
        }
    };

    const getTypeLabel = (type) => {
        const labels = {
            [RiskType.OVERTRADING]: 'Overtrading',
            [RiskType.HIGH_LOSS_STREAK]: 'Loss Streak',
            [RiskType.LARGE_POSITION]: 'Large Position',
            [RiskType.RAPID_TRADING]: 'Rapid Trading',
            [RiskType.MARTINGALE_PATTERN]: 'Martingale Pattern',
            [RiskType.BALANCE_DEPLETION]: 'Balance Depletion',
            [RiskType.BOT_ACTIVITY]: 'Bot Activity',
            [RiskType.UNUSUAL_HOURS]: 'Unusual Hours',
        };
        return labels[type] || type;
    };

    const getRecommendation = (type) => {
        const recommendations = {
            [RiskType.OVERTRADING]: 'Consider taking a break and reviewing your trading strategy.',
            [RiskType.HIGH_LOSS_STREAK]: 'Stop trading immediately. Review your strategy before continuing.',
            [RiskType.LARGE_POSITION]: 'Reduce position sizes to better manage risk.',
            [RiskType.RAPID_TRADING]: 'Slow down and make more calculated trading decisions.',
            [RiskType.MARTINGALE_PATTERN]: 'Avoid doubling stakes after losses. This strategy has high risk of total loss.',
            [RiskType.BALANCE_DEPLETION]: 'Stop trading. Your account has suffered significant losses.',
            [RiskType.BOT_ACTIVITY]: 'Ensure your trading bot has proper risk management settings.',
            [RiskType.UNUSUAL_HOURS]: 'Trading during off-hours may indicate impaired judgment.',
        };
        return recommendations[type] || 'Review your trading activity.';
    };

    const sortedWarnings = [...warnings].sort((a, b) => {
        const levelOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return levelOrder[a.level] - levelOrder[b.level];
    });

    if (!warnings || warnings.length === 0) {
        return (
            <div className="bg-surface rounded-xl p-8 border border-border text-center">
                <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                    No Risk Warnings
                </h3>
                <p className="text-text-secondary">
                    Your trading activity looks healthy. Keep it up!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-primary">
                    Risk Warnings ({warnings.length})
                </h2>
                <div className="flex gap-2 text-xs">
                    <span className="px-2 py-1 bg-danger/20 text-danger rounded">
                        {warnings.filter((w) => w.level === RiskLevel.CRITICAL).length} Critical
                    </span>
                    <span className="px-2 py-1 bg-warning/20 text-warning rounded">
                        {warnings.filter((w) => w.level === RiskLevel.HIGH).length} High
                    </span>
                    <span className="px-2 py-1 bg-yellow-400/20 text-yellow-400 rounded">
                        {warnings.filter((w) => w.level === RiskLevel.MEDIUM).length} Medium
                    </span>
                </div>
            </div>

            <div className="space-y-3">
                {sortedWarnings.map((warning, index) => (
                    <div
                        key={`${warning.type}-${index}`}
                        className={`rounded-xl p-4 border ${getColors(warning.level)}`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                                {getIcon(warning.level)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold">
                                        {getTypeLabel(warning.type)}
                                    </span>
                                    <span className={`px-2 py-0.5 text-xs rounded uppercase font-medium ${warning.level === RiskLevel.CRITICAL
                                            ? 'bg-danger/20'
                                            : warning.level === RiskLevel.HIGH
                                                ? 'bg-warning/20'
                                                : 'bg-yellow-400/20'
                                        }`}>
                                        {warning.level}
                                    </span>
                                </div>
                                <p className="text-sm opacity-90 mb-2">
                                    {warning.message}
                                </p>
                                <div className="text-xs opacity-75 bg-black/20 rounded p-2">
                                    <strong>Recommendation:</strong> {getRecommendation(warning.type)}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default RiskWarnings;
