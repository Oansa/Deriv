import { useState } from 'react';
import useDerivConnection from './hooks/useDerivConnection';
import { AlertTriangle, TrendingUp, Activity, Bot, DollarSign, Clock, Wifi, WifiOff, Loader2, Shield } from 'lucide-react';

function App() {
  const {
    connected,
    loading,
    account,
    openTrades,
    tradeHistory,
    botActivity,
    riskScore,
    activeRisks,
    connect,
    error
  } = useDerivConnection();

  const [apiToken, setApiToken] = useState('');

  const handleConnect = async (e) => {
    e.preventDefault();
    if (apiToken.trim()) {
      await connect(apiToken);
    }
  };

  // Get risk score color
  const getRiskColor = (score) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRiskBgColor = (score) => {
    if (score >= 70) return 'bg-green-500/20 border-green-500/50';
    if (score >= 40) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-red-500/20 border-red-500/50';
  };

  // Get severity color for risk cards
  const getSeverityColor = (severity) => {
    if (severity === 'high') return 'bg-red-500/20 border-red-500/50 text-red-300';
    if (severity === 'medium') return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300';
    return 'bg-blue-500/20 border-blue-500/50 text-blue-300';
  };

  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  };

  // Check if trade shows Martingale pattern (stake increased from previous)
  const isMartingaleRow = (trade, index, trades) => {
    if (index === trades.length - 1) return false;
    const previousTrade = trades[index + 1];
    return previousTrade &&
      previousTrade.profit < 0 &&
      trade.buy_price >= previousTrade.buy_price * 1.5;
  };

  // Connection Form
  if (!connected) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <Shield className="w-10 h-10 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">Deriv Risk Coach AI</h1>
            </div>

            <p className="text-slate-400 text-center mb-6">
              Connect your Deriv account to analyze trading risks in real-time
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              </div>
            )}

            {/* Connection Form */}
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  API Token
                </label>
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Enter your Deriv API token"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !apiToken.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wifi className="w-5 h-5" />
                    Connect to Deriv
                  </>
                )}
              </button>
            </form>

            <p className="text-xs text-slate-500 text-center mt-4">
              Get your API token from{' '}
              <a
                href="https://app.deriv.com/account/api-token"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Deriv Settings
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" />
            <h1 className="text-xl font-bold">Deriv Risk Coach AI</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-400">
              <Wifi className="w-4 h-4" />
              <span className="text-sm">Connected</span>
            </div>
            <div className="px-3 py-1 bg-slate-700 rounded-lg text-sm text-slate-300">
              {account.loginid}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Debug Section - Verify Real Data */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-cyan-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <span className="text-cyan-400 text-xs font-semibold uppercase tracking-wide">Debug Info - Live API Data</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Account Login ID:</span>
              <span className="ml-2 text-white font-mono">{account.loginid || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500">Balance:</span>
              <span className="ml-2 text-white font-mono">{account.balance} {account.currency}</span>
            </div>
            <div>
              <span className="text-slate-500">Trade History Count:</span>
              <span className="ml-2 text-white font-mono">{tradeHistory.length}</span>
            </div>
            <div>
              <span className="text-slate-500">Bot Activity Count:</span>
              <span className="ml-2 text-white font-mono">{botActivity.length}</span>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Balance Card */}
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-slate-400 text-sm">Account Balance</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(account.balance, account.currency)}
            </div>
          </div>

          {/* Risk Score Card */}
          <div className={`bg-slate-800 rounded-xl p-5 border ${getRiskBgColor(riskScore)}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-slate-700 rounded-lg">
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-slate-400 text-sm">Risk Score</span>
            </div>
            <div className={`text-3xl font-bold ${getRiskColor(riskScore)}`}>
              {riskScore}
              <span className="text-lg text-slate-500">/100</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {riskScore >= 70 ? 'Low Risk' : riskScore >= 40 ? 'Medium Risk' : 'High Risk'}
            </div>
          </div>

          {/* Open Positions Card */}
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-slate-400 text-sm">Open Positions</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {openTrades.length}
            </div>
          </div>
        </div>

        {/* Risk Warnings */}
        {activeRisks.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-5 border border-red-500/30">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-semibold text-white">Risk Warnings</h2>
              <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-full">
                {activeRisks.length}
              </span>
            </div>

            <div className="space-y-3">
              {activeRisks.map((risk, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getSeverityColor(risk.severity)}`}
                >
                  <div className="font-semibold mb-2">{risk.message}</div>
                  <p className="text-sm opacity-80 mb-2">{risk.explanation}</p>
                  <div className="text-xs bg-black/20 p-2 rounded">
                    <strong>💡 Recommendation:</strong> {risk.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open Positions Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Open Positions</h2>
          </div>

          {openTrades.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No open positions
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium">Symbol</th>
                    <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium">Type</th>
                    <th className="px-4 py-3 text-right text-xs text-slate-400 font-medium">Stake</th>
                    <th className="px-4 py-3 text-right text-xs text-slate-400 font-medium">P/L</th>
                    <th className="px-4 py-3 text-right text-xs text-slate-400 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {openTrades.map((trade) => (
                    <tr key={trade.contract_id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                      <td className="px-4 py-3 text-slate-400">{trade.contract_type}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(trade.buy_price)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.profit >= 0 ? '+' : ''}{formatCurrency(trade.profit)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 text-sm">
                        {new Date(trade.date_start * 1000).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Trade History Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold">Trade History</h2>
            <span className="text-xs text-slate-500">(Last 10)</span>
          </div>

          {tradeHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No trade history on synthetic indices
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium">Time</th>
                    <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium">Symbol</th>
                    <th className="px-4 py-3 text-left text-xs text-slate-400 font-medium">Type</th>
                    <th className="px-4 py-3 text-right text-xs text-slate-400 font-medium">Stake</th>
                    <th className="px-4 py-3 text-right text-xs text-slate-400 font-medium">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.slice(0, 10).map((trade, index) => {
                    const isMartingale = isMartingaleRow(trade, index, tradeHistory.slice(0, 10));
                    return (
                      <tr
                        key={trade.transaction_id}
                        className={`border-b border-slate-700/50 ${isMartingale ? 'bg-red-500/10' : 'hover:bg-slate-700/30'}`}
                      >
                        <td className="px-4 py-3 text-slate-400 text-sm">
                          {new Date(trade.purchase_time).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {trade.symbol}
                          {isMartingale && (
                            <span className="ml-2 px-1.5 py-0.5 bg-red-500/30 text-red-300 text-xs rounded">
                              ⚠️ Stake ↑
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{trade.contract_type}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(trade.buy_price)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.profit >= 0 ? '+' : ''}{formatCurrency(trade.profit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bot Activity Panel */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
            <Bot className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold">Bot Activity</h2>
            {botActivity.length > 0 && (
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 text-xs rounded-full">
                {botActivity.length} detected
              </span>
            )}
          </div>

          {botActivity.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No DBot transactions detected
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {botActivity.slice(0, 10).map((tx) => {
                const isRisky = tx.longcode?.toLowerCase().includes('martingale') ||
                  tx.longcode?.toLowerCase().includes("d'alembert");
                return (
                  <div
                    key={tx.transaction_id}
                    className={`p-4 ${isRisky ? 'bg-red-500/10' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm text-slate-300 line-clamp-2">
                          {tx.longcode || 'Bot transaction'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {new Date(tx.transaction_time).toLocaleString()}
                        </div>
                      </div>
                      <div className={`ml-4 font-medium ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </div>
                    </div>
                    {isRisky && (
                      <div className="mt-2 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-300">
                        ⚠️ Risky strategy detected in bot
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
