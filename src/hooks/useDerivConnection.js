import { useState, useEffect, useCallback, useRef } from 'react';
import DerivAPIService from '../services/derivAPI';
import RiskEngine from '../services/riskEngine';

const REFRESH_INTERVAL = 10000; // 10 seconds

export function useDerivConnection() {
    // Connection state
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Account state
    const [account, setAccount] = useState({
        loginid: null,
        balance: 0,
        currency: 'USD',
        email: null
    });

    // Trading data state
    const [openTrades, setOpenTrades] = useState([]);
    const [tradeHistory, setTradeHistory] = useState([]);
    const [botActivity, setBotActivity] = useState([]);

    // Risk analysis state
    const [riskScore, setRiskScore] = useState(0);
    const [activeRisks, setActiveRisks] = useState([]);

    // Refs
    const apiRef = useRef(null);
    const refreshIntervalRef = useRef(null);
    const unsubscribeBalanceRef = useRef(null);

    // Initialize API service
    useEffect(() => {
        const appId = import.meta.env.VITE_DERIV_APP_ID;

        if (!appId) {
            console.warn('[useDerivConnection] VITE_DERIV_APP_ID not found in environment');
        }

        apiRef.current = new DerivAPIService(appId);

        // Cleanup on unmount
        return () => {
            cleanup();
        };
    }, []);

    /**
     * Clean up resources
     */
    const cleanup = useCallback(() => {
        // Clear refresh interval
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = null;
        }

        // Unsubscribe from balance updates
        if (unsubscribeBalanceRef.current) {
            unsubscribeBalanceRef.current();
            unsubscribeBalanceRef.current = null;
        }

        // Disconnect API
        if (apiRef.current) {
            apiRef.current.disconnect();
        }
    }, []);

    /**
     * Fetch all trading data and calculate risks
     */
    const fetchAllData = useCallback(async () => {
        if (!apiRef.current || !connected) return;

        try {
            // Fetch all data in parallel
            const [positionsResult, historyResult, botResult, balanceResult] = await Promise.all([
                apiRef.current.getOpenPositions(),
                apiRef.current.getTradeHistory(50),
                apiRef.current.getBotActivity(),
                apiRef.current.getBalance()
            ]);

            // Update open trades
            if (positionsResult.success) {
                setOpenTrades(positionsResult.data);
            }

            // Update trade history
            if (historyResult.success) {
                setTradeHistory(historyResult.data);
            }

            // Update bot activity
            if (botResult.success) {
                setBotActivity(botResult.data);
            }

            // Update balance
            if (balanceResult.success) {
                setAccount(prev => ({
                    ...prev,
                    balance: balanceResult.data.balance,
                    currency: balanceResult.data.currency
                }));
            }

            // Calculate risks using RiskEngine
            const riskAnalysis = RiskEngine.analyzeRisks({
                openTrades: positionsResult.success ? positionsResult.data : [],
                tradeHistory: historyResult.success ? historyResult.data : [],
                botActivity: botResult.success ? botResult.data : [],
                balance: balanceResult.success ? balanceResult.data.balance : 0
            });

            setRiskScore(riskAnalysis.score);
            setActiveRisks(riskAnalysis.risks);

        } catch (err) {
            console.error('[useDerivConnection] Error fetching data:', err);
            setError(`Failed to fetch data: ${err.message}`);
        }
    }, [connected]);

    /**
     * Connect to Deriv API and authorize
     * @param {string} token - API token
     */
    const connect = useCallback(async (token) => {
        if (!apiRef.current) {
            setError('API service not initialized');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Connect to WebSocket
            const connectResult = await apiRef.current.connect();
            if (!connectResult.success) {
                throw new Error(connectResult.message);
            }

            // Authorize with token
            const authResult = await apiRef.current.authorize(token);
            if (!authResult.success) {
                throw new Error(authResult.message);
            }

            // Update account info
            setAccount({
                loginid: authResult.data.loginid,
                balance: authResult.data.balance,
                currency: authResult.data.currency,
                email: authResult.data.email
            });

            setConnected(true);

            // Subscribe to balance updates
            unsubscribeBalanceRef.current = apiRef.current.subscribeToBalance((balanceData) => {
                setAccount(prev => ({
                    ...prev,
                    balance: balanceData.balance,
                    currency: balanceData.currency
                }));
            });

            // Fetch initial data
            await fetchAllDataInternal();

            // Set up auto-refresh every 10 seconds
            refreshIntervalRef.current = setInterval(() => {
                fetchAllDataInternal();
            }, REFRESH_INTERVAL);

        } catch (err) {
            console.error('[useDerivConnection] Connection error:', err);
            setError(err.message || 'Failed to connect');
            setConnected(false);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Internal fetch function (doesn't depend on connected state)
     */
    const fetchAllDataInternal = async () => {
        if (!apiRef.current) return;

        try {
            // Fetch all data in parallel
            const [positionsResult, historyResult, botResult, balanceResult] = await Promise.all([
                apiRef.current.getOpenPositions(),
                apiRef.current.getTradeHistory(50),
                apiRef.current.getBotActivity(),
                apiRef.current.getBalance()
            ]);

            // Update open trades
            if (positionsResult.success) {
                setOpenTrades(positionsResult.data);
            }

            // Update trade history
            if (historyResult.success) {
                setTradeHistory(historyResult.data);
            }

            // Update bot activity
            if (botResult.success) {
                setBotActivity(botResult.data);
            }

            // Update balance
            if (balanceResult.success) {
                setAccount(prev => ({
                    ...prev,
                    balance: balanceResult.data.balance,
                    currency: balanceResult.data.currency
                }));
            }

            // Calculate risks using RiskEngine
            const riskAnalysis = RiskEngine.analyzeRisks({
                openTrades: positionsResult.success ? positionsResult.data : [],
                tradeHistory: historyResult.success ? historyResult.data : [],
                botActivity: botResult.success ? botResult.data : [],
                balance: balanceResult.success ? balanceResult.data.balance : 0
            });

            setRiskScore(riskAnalysis.score);
            setActiveRisks(riskAnalysis.risks);

        } catch (err) {
            console.error('[useDerivConnection] Error fetching data:', err);
        }
    };

    /**
     * Disconnect from Deriv API
     */
    const disconnect = useCallback(() => {
        cleanup();

        // Reset state
        setConnected(false);
        setAccount({
            loginid: null,
            balance: 0,
            currency: 'USD',
            email: null
        });
        setOpenTrades([]);
        setTradeHistory([]);
        setBotActivity([]);
        setRiskScore(0);
        setActiveRisks([]);
        setError(null);
    }, [cleanup]);

    return {
        // Connection state
        connected,
        loading,
        error,

        // Account data
        account,

        // Trading data
        openTrades,
        tradeHistory,
        botActivity,

        // Risk analysis
        riskScore,
        activeRisks,

        // Actions
        connect,
        disconnect
    };
}

export default useDerivConnection;
