import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, TrendingUp, Clock, Bot, Shield } from 'lucide-react';
import AccountStatus from './AccountStatus';
import OpenTrades from './OpenTrades';
import TradeHistory from './TradeHistory';
import RiskWarnings from './RiskWarnings';
import BotActivity from './BotActivity';
import useDerivConnection from '../hooks/useDerivConnection';
import riskEngine from '../services/riskEngine';
import derivAPI from '../services/derivAPI';

function Dashboard() {
    const [appId, setAppId] = useState('');
    const [token, setToken] = useState('');
    const [trades, setTrades] = useState([]);
    const [openPositions, setOpenPositions] = useState([]);
    const [riskAnalysis, setRiskAnalysis] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    const {
        isConnected,
        isAuthorized,
        isLoading,
        error,
        accountInfo,
        balance,
        connect,
        authorize,
        disconnect,
    } = useDerivConnection(appId);

    // Fetch data when authorized
    useEffect(() => {
        if (isAuthorized) {
            fetchTradingData();
        }
    }, [isAuthorized]);

    // Analyze risks when data changes
    useEffect(() => {
        if (trades.length > 0 && balance) {
            const analysis = riskEngine.analyzeTradeHistory(
                trades,
                balance.balance,
                accountInfo?.balance || balance.balance
            );

            const positionWarnings = riskEngine.analyzeOpenPositions(
                openPositions,
                balance.balance
            );

            setRiskAnalysis({
                ...analysis,
                warnings: [...analysis.warnings, ...positionWarnings],
            });
        }
    }, [trades, openPositions, balance]);

    const fetchTradingData = async () => {
        try {
            const [statementRes, positionsRes] = await Promise.all([
                derivAPI.getProfitTable({ limit: 100 }),
                derivAPI.getOpenPositions(),
            ]);

            if (statementRes.profit_table?.transactions) {
                setTrades(statementRes.profit_table.transactions);
            }

            if (positionsRes.proposal_open_contract) {
                setOpenPositions(
                    Array.isArray(positionsRes.proposal_open_contract)
                        ? positionsRes.proposal_open_contract
                        : [positionsRes.proposal_open_contract]
                );
            }
        } catch (err) {
            console.error('Failed to fetch trading data:', err);
        }
    };

    const handleConnect = async () => {
        if (!appId) return;
        await connect();
    };

    const handleAuthorize = async () => {
        if (!token) return;
        await authorize(token);
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'trades', label: 'Open Trades', icon: TrendingUp },
        { id: 'history', label: 'History', icon: Clock },
        { id: 'risks', label: 'Risk Warnings', icon: AlertTriangle },
        { id: 'bot', label: 'Bot Activity', icon: Bot },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-surface border-b border-border px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="w-8 h-8 text-accent" />
                        <h1 className="text-xl font-bold text-text-primary">
                            Deriv Risk Analyzer
                        </h1>
                    </div>

                    {isAuthorized && (
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm text-text-secondary">Balance</p>
                                <p className="text-lg font-semibold text-success">
                                    {balance?.currency} {balance?.balance?.toFixed(2)}
                                </p>
                            </div>
                            <button
                                onClick={disconnect}
                                className="px-4 py-2 bg-danger/20 text-danger rounded-lg hover:bg-danger/30 transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="p-6">
                {/* Connection Form */}
                {!isAuthorized && (
                    <div className="max-w-md mx-auto bg-surface rounded-xl p-6 border border-border">
                        <h2 className="text-lg font-semibold mb-4">Connect to Deriv</h2>

                        {error && (
                            <div className="mb-4 p-3 bg-danger/20 border border-danger/50 rounded-lg text-danger text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-text-secondary mb-1">
                                    App ID
                                </label>
                                <input
                                    type="text"
                                    value={appId}
                                    onChange={(e) => setAppId(e.target.value)}
                                    placeholder="Enter your Deriv App ID"
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
                                    disabled={isConnected}
                                />
                            </div>

                            {!isConnected ? (
                                <button
                                    onClick={handleConnect}
                                    disabled={!appId || isLoading}
                                    className="w-full py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Connecting...' : 'Connect'}
                                </button>
                            ) : (
                                <>
                                    <div className="text-sm text-success flex items-center gap-2">
                                        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                                        Connected
                                    </div>

                                    <div>
                                        <label className="block text-sm text-text-secondary mb-1">
                                            API Token
                                        </label>
                                        <input
                                            type="password"
                                            value={token}
                                            onChange={(e) => setToken(e.target.value)}
                                            placeholder="Enter your API token"
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent"
                                        />
                                    </div>

                                    <button
                                        onClick={handleAuthorize}
                                        disabled={!token || isLoading}
                                        className="w-full py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? 'Authorizing...' : 'Authorize'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Dashboard Content */}
                {isAuthorized && (
                    <div className="space-y-6">
                        {/* Tabs */}
                        <div className="flex gap-2 border-b border-border pb-2">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === tab.id
                                                ? 'bg-accent text-white'
                                                : 'text-text-secondary hover:bg-surface-elevated'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {tab.label}
                                        {tab.id === 'risks' && riskAnalysis?.warnings?.length > 0 && (
                                            <span className="ml-1 px-2 py-0.5 text-xs bg-danger rounded-full">
                                                {riskAnalysis.warnings.length}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'overview' && (
                            <AccountStatus
                                accountInfo={accountInfo}
                                balance={balance}
                                riskAnalysis={riskAnalysis}
                            />
                        )}

                        {activeTab === 'trades' && (
                            <OpenTrades positions={openPositions} balance={balance?.balance} />
                        )}

                        {activeTab === 'history' && (
                            <TradeHistory trades={trades} />
                        )}

                        {activeTab === 'risks' && (
                            <RiskWarnings warnings={riskAnalysis?.warnings || []} />
                        )}

                        {activeTab === 'bot' && (
                            <BotActivity trades={trades} />
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

export default Dashboard;
