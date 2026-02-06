import { useState, useEffect, useCallback } from 'react';
import derivAPI from '../services/derivAPI';

export function useDerivConnection(appId) {
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [accountInfo, setAccountInfo] = useState(null);
    const [balance, setBalance] = useState(null);

    const connect = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            await derivAPI.connect(appId);
            setIsConnected(true);
        } catch (err) {
            setError(err.message || 'Failed to connect');
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    }, [appId]);

    const authorize = useCallback(async (token) => {
        if (!isConnected) {
            setError('Not connected. Please connect first.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await derivAPI.authorize(token);
            setIsAuthorized(true);
            setAccountInfo(response.authorize);

            // Subscribe to balance updates
            const balanceResponse = await derivAPI.getBalance();
            setBalance(balanceResponse.balance);
        } catch (err) {
            setError(err.message || 'Authorization failed');
            setIsAuthorized(false);
        } finally {
            setIsLoading(false);
        }
    }, [isConnected]);

    const disconnect = useCallback(() => {
        derivAPI.disconnect();
        setIsConnected(false);
        setIsAuthorized(false);
        setAccountInfo(null);
        setBalance(null);
    }, []);

    useEffect(() => {
        return () => {
            derivAPI.disconnect();
        };
    }, []);

    return {
        isConnected,
        isAuthorized,
        isLoading,
        error,
        accountInfo,
        balance,
        connect,
        authorize,
        disconnect,
    };
}

export default useDerivConnection;
