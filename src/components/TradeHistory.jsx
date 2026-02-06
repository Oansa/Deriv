import { useState } from 'react';
import { History, TrendingUp, TrendingDown, Calendar, Filter } from 'lucide-react';

function TradeHistory({ trades }) {
    const [filter, setFilter] = useState('all'); // all, wins, losses
    const [sortOrder, setSortOrder] = useState('desc');

    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    const filteredTrades = trades
        .filter((trade) => {
            if (filter === 'wins') return trade.sell_price > trade.buy_price;
            if (filter === 'losses') return trade.sell_price < trade.buy_price;
            return true;
        })
        .sort((a, b) => {
            return sortOrder === 'desc'
                ? b.purchase_time - a.purchase_time
                : a.purchase_time - b.purchase_time;
        });

    const stats = {
        total: trades.length,
        wins: trades.filter((t) => t.sell_price > t.buy_price).length,
        losses: trades.filter((t) => t.sell_price < t.buy_price).length,
        totalProfit: trades.reduce((sum, t) => sum + (t.sell_price - t.buy_price), 0),
    };

    const winRate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0;

    if (!trades || trades.length === 0) {
        return (
            <div className="bg-surface rounded-xl p-8 border border-border text-center">
                <History className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                    No Trade History
                </h3>
                <p className="text-text-secondary">
                    Your completed trades will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface rounded-xl p-4 border border-border">
                    <span className="text-text-secondary text-sm">Total Trades</span>
                    <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
                </div>
                <div className="bg-surface rounded-xl p-4 border border-border">
                    <span className="text-text-secondary text-sm">Win Rate</span>
                    <div className={`text-2xl font-bold ${parseFloat(winRate) >= 50 ? 'text-success' : 'text-danger'}`}>
                        {winRate}%
                    </div>
                </div>
                <div className="bg-surface rounded-xl p-4 border border-border">
                    <span className="text-text-secondary text-sm">Wins / Losses</span>
                    <div className="text-2xl font-bold">
                        <span className="text-success">{stats.wins}</span>
                        <span className="text-text-muted"> / </span>
                        <span className="text-danger">{stats.losses}</span>
                    </div>
                </div>
                <div className="bg-surface rounded-xl p-4 border border-border">
                    <span className="text-text-secondary text-sm">Net P/L</span>
                    <div className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-text-secondary" />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent"
                    >
                        <option value="all">All Trades</option>
                        <option value="wins">Wins Only</option>
                        <option value="losses">Losses Only</option>
                    </select>
                </div>
                <button
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                    <Calendar className="w-4 h-4" />
                    {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                </button>
            </div>

            {/* Trades List */}
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left px-4 py-3 text-text-secondary font-medium text-sm">Asset</th>
                            <th className="text-left px-4 py-3 text-text-secondary font-medium text-sm">Type</th>
                            <th className="text-right px-4 py-3 text-text-secondary font-medium text-sm">Stake</th>
                            <th className="text-right px-4 py-3 text-text-secondary font-medium text-sm">Payout</th>
                            <th className="text-right px-4 py-3 text-text-secondary font-medium text-sm">P/L</th>
                            <th className="text-right px-4 py-3 text-text-secondary font-medium text-sm">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTrades.slice(0, 50).map((trade, index) => {
                            const pl = trade.sell_price - trade.buy_price;
                            const isWin = pl > 0;

                            return (
                                <tr
                                    key={`${trade.transaction_id}-${index}`}
                                    className="border-b border-border/50 hover:bg-surface-elevated transition-colors"
                                >
                                    <td className="px-4 py-3">
                                        <span className="font-medium text-text-primary">
                                            {trade.shortcode?.split('_')[0] || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-text-secondary text-sm">
                                            {trade.shortcode?.split('_')[1] || trade.contract_type || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-text-primary">
                                        {trade.buy_price?.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-text-primary">
                                        {trade.sell_price?.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`flex items-center justify-end gap-1 font-medium ${isWin ? 'text-success' : 'text-danger'
                                            }`}>
                                            {isWin ? (
                                                <TrendingUp className="w-4 h-4" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4" />
                                            )}
                                            {isWin ? '+' : ''}{pl.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-text-secondary text-sm">
                                        {formatDate(trade.purchase_time)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filteredTrades.length > 50 && (
                    <div className="px-4 py-3 bg-surface-elevated text-center text-text-secondary text-sm">
                        Showing 50 of {filteredTrades.length} trades
                    </div>
                )}
            </div>
        </div>
    );
}

export default TradeHistory;
