import { TrendingUp, TrendingDown, Clock, DollarSign, AlertTriangle } from 'lucide-react';

function OpenTrades({ positions, balance }) {
    const formatTime = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    const calculateProfitLoss = (position) => {
        const pl = (position.bid_price || 0) - position.buy_price;
        return pl;
    };

    const getRiskLevel = (position) => {
        if (!balance) return 'low';
        const percent = (position.buy_price / balance) * 100;
        if (percent > 25) return 'critical';
        if (percent > 10) return 'high';
        if (percent > 5) return 'medium';
        return 'low';
    };

    if (!positions || positions.length === 0) {
        return (
            <div className="bg-surface rounded-xl p-8 border border-border text-center">
                <TrendingUp className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                    No Open Positions
                </h3>
                <p className="text-text-secondary">
                    You don't have any open trades at the moment.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-primary">
                    Open Positions ({positions.length})
                </h2>
                <div className="text-sm text-text-secondary">
                    Total Stake: {positions.reduce((sum, p) => sum + p.buy_price, 0).toFixed(2)}
                </div>
            </div>

            <div className="grid gap-4">
                {positions.map((position) => {
                    const pl = calculateProfitLoss(position);
                    const isProfit = pl >= 0;
                    const riskLevel = getRiskLevel(position);

                    return (
                        <div
                            key={position.contract_id}
                            className="bg-surface rounded-xl p-4 border border-border hover:border-accent/50 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-text-primary">
                                            {position.display_name || position.underlying}
                                        </h3>
                                        {riskLevel !== 'low' && (
                                            <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded ${riskLevel === 'critical'
                                                    ? 'bg-danger/20 text-danger'
                                                    : riskLevel === 'high'
                                                        ? 'bg-warning/20 text-warning'
                                                        : 'bg-yellow-400/20 text-yellow-400'
                                                }`}>
                                                <AlertTriangle className="w-3 h-3" />
                                                {riskLevel.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-text-secondary">
                                        {position.contract_type} • ID: {position.contract_id}
                                    </p>
                                </div>
                                <div className={`flex items-center gap-1 text-lg font-bold ${isProfit ? 'text-success' : 'text-danger'
                                    }`}>
                                    {isProfit ? (
                                        <TrendingUp className="w-5 h-5" />
                                    ) : (
                                        <TrendingDown className="w-5 h-5" />
                                    )}
                                    {isProfit ? '+' : ''}{pl.toFixed(2)}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-text-secondary block">Stake</span>
                                    <span className="text-text-primary font-medium flex items-center gap-1">
                                        <DollarSign className="w-3 h-3" />
                                        {position.buy_price?.toFixed(2)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-text-secondary block">Current Price</span>
                                    <span className="text-text-primary font-medium">
                                        {position.bid_price?.toFixed(2) || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-text-secondary block">Payout</span>
                                    <span className="text-text-primary font-medium">
                                        {position.payout?.toFixed(2) || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-text-secondary block">Expiry</span>
                                    <span className="text-text-primary font-medium flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {position.date_expiry ? formatTime(position.date_expiry) : '-'}
                                    </span>
                                </div>
                            </div>

                            {/* Progress bar for position size relative to balance */}
                            {balance && (
                                <div className="mt-3">
                                    <div className="flex justify-between text-xs text-text-secondary mb-1">
                                        <span>Position Size</span>
                                        <span>{((position.buy_price / balance) * 100).toFixed(1)}% of balance</span>
                                    </div>
                                    <div className="h-1.5 bg-background rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${riskLevel === 'critical'
                                                    ? 'bg-danger'
                                                    : riskLevel === 'high'
                                                        ? 'bg-warning'
                                                        : 'bg-accent'
                                                }`}
                                            style={{ width: `${Math.min((position.buy_price / balance) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default OpenTrades;
