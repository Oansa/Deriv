import DerivAPI from '@deriv/deriv-api';

// Synthetic indices symbols to filter for
const SYNTHETIC_INDICES = [
    'R_100', 'R_50', 'R_75', 'R_25', 'R_10',
    'BOOM1000', 'BOOM500', 'BOOM300',
    'CRASH1000', 'CRASH500', 'CRASH300',
    '1HZ100V', '1HZ75V', '1HZ50V', '1HZ25V', '1HZ10V', // Volatility indices
    'V75', 'V100', 'V50', 'V25', 'V10'
];

// DBot's official app_id
const DBOT_APP_ID = 16929;

class DerivAPIService {
    constructor(appId) {
        this.appId = appId;
        this.connection = null;
        this.api = null;
        this.accountInfo = null;
        this.subscriptions = new Map();
    }

    /**
     * Connect to Deriv WebSocket API
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async connect() {
        try {
            if (this.api) {
                return { success: true, message: 'Already connected' };
            }

            this.api = new DerivAPI({
                app_id: this.appId,
                endpoint: 'wss://ws.derivws.com/websockets/v3'
            });

            // Wait for connection to be established
            await this.api.ping();

            console.log('[DerivAPI] Connected successfully');
            return { success: true, message: 'Connected to Deriv API' };
        } catch (error) {
            console.error('[DerivAPI] Connection failed:', error);
            return {
                success: false,
                message: `Connection failed: ${error.message || 'Unknown error'}`
            };
        }
    }

    /**
     * Authorize with API token
     * @param {string} token - Deriv API token
     * @returns {Promise<{success: boolean, data?: object, message?: string}>}
     */
    async authorize(token) {
        try {
            if (!this.api) {
                throw new Error('Not connected. Call connect() first.');
            }

            const response = await this.api.authorize({ authorize: token });

            if (response.error) {
                throw new Error(response.error.message);
            }

            this.accountInfo = {
                loginid: response.authorize.loginid,
                currency: response.authorize.currency,
                balance: response.authorize.balance,
                email: response.authorize.email,
                fullname: response.authorize.fullname,
                is_virtual: response.authorize.is_virtual,
                country: response.authorize.country
            };

            console.log('[DerivAPI] Authorized successfully:', this.accountInfo.loginid);
            return { success: true, data: this.accountInfo };
        } catch (error) {
            console.error('[DerivAPI] Authorization failed:', error);
            return {
                success: false,
                message: `Authorization failed: ${error.message || 'Invalid token'}`
            };
        }
    }

    /**
     * Get current account balance
     * @returns {Promise<{success: boolean, data?: object, message?: string}>}
     */
    async getBalance() {
        try {
            if (!this.api) {
                throw new Error('Not connected. Call connect() first.');
            }

            const response = await this.api.balance();

            if (response.error) {
                throw new Error(response.error.message);
            }

            return {
                success: true,
                data: {
                    balance: response.balance.balance,
                    currency: response.balance.currency
                }
            };
        } catch (error) {
            console.error('[DerivAPI] Failed to get balance:', error);
            return {
                success: false,
                message: `Failed to get balance: ${error.message}`
            };
        }
    }

    /**
     * Get open positions filtered for synthetic indices
     * @returns {Promise<{success: boolean, data?: array, message?: string}>}
     */
    async getOpenPositions() {
        try {
            if (!this.api) {
                throw new Error('Not connected. Call connect() first.');
            }

            const response = await this.api.portfolio({ portfolio: 1 });

            if (response.error) {
                throw new Error(response.error.message);
            }

            const contracts = response.portfolio?.contracts || [];

            // Filter for synthetic indices only
            const filteredContracts = contracts
                .filter(contract => this.isSyntheticIndex(contract.symbol))
                .map(contract => ({
                    contract_id: contract.contract_id,
                    symbol: contract.symbol,
                    contract_type: contract.contract_type,
                    buy_price: contract.buy_price,
                    profit: contract.profit,
                    date_start: contract.date_start,
                    longcode: contract.longcode,
                    payout: contract.payout,
                    expiry_time: contract.expiry_time
                }));

            return { success: true, data: filteredContracts };
        } catch (error) {
            console.error('[DerivAPI] Failed to get open positions:', error);
            return {
                success: false,
                message: `Failed to get open positions: ${error.message}`
            };
        }
    }

    /**
     * Get trade history filtered for synthetic indices
     * @param {number} limit - Maximum number of transactions to retrieve
     * @returns {Promise<{success: boolean, data?: array, message?: string}>}
     */
    async getTradeHistory(limit = 20) {
        try {
            if (!this.api) {
                throw new Error('Not connected. Call connect() first.');
            }

            const response = await this.api.profitTable({
                profit_table: 1,
                description: 1,
                limit: limit
            });

            if (response.error) {
                throw new Error(response.error.message);
            }

            const transactions = response.profit_table?.transactions || [];

            // Filter for synthetic indices only
            const filteredTransactions = transactions
                .filter(tx => this.isSyntheticIndex(tx.underlying_symbol || tx.shortcode?.split('_')[0]))
                .map(tx => ({
                    transaction_id: tx.transaction_id,
                    symbol: tx.underlying_symbol || tx.shortcode?.split('_')[0],
                    contract_type: tx.contract_type || tx.shortcode?.split('_')[1],
                    buy_price: tx.buy_price,
                    sell_price: tx.sell_price,
                    profit: tx.sell_price - tx.buy_price,
                    purchase_time: tx.purchase_time,
                    sell_time: tx.sell_time,
                    longcode: tx.longcode
                }));

            return { success: true, data: filteredTransactions };
        } catch (error) {
            console.error('[DerivAPI] Failed to get trade history:', error);
            return {
                success: false,
                message: `Failed to get trade history: ${error.message}`
            };
        }
    }

    /**
     * Get bot activity (transactions from DBot)
     * @returns {Promise<{success: boolean, data?: array, message?: string}>}
     */
    async getBotActivity() {
        try {
            if (!this.api) {
                throw new Error('Not connected. Call connect() first.');
            }

            const response = await this.api.statement({
                statement: 1,
                description: 1,
                limit: 50
            });

            if (response.error) {
                throw new Error(response.error.message);
            }

            const transactions = response.statement?.transactions || [];

            // Filter for DBot transactions (app_id === 16929)
            const botTransactions = transactions
                .filter(tx => tx.app_id === DBOT_APP_ID)
                .map(tx => ({
                    transaction_id: tx.transaction_id,
                    action_type: tx.action_type,
                    amount: tx.amount,
                    longcode: tx.longcode,
                    transaction_time: tx.transaction_time,
                    contract_id: tx.contract_id,
                    balance_after: tx.balance_after,
                    reference_id: tx.reference_id
                }));

            return { success: true, data: botTransactions };
        } catch (error) {
            console.error('[DerivAPI] Failed to get bot activity:', error);
            return {
                success: false,
                message: `Failed to get bot activity: ${error.message}`
            };
        }
    }

    /**
     * Subscribe to balance updates
     * @param {function} callback - Function to call with balance updates
     * @returns {function} Unsubscribe function
     */
    subscribeToBalance(callback) {
        if (!this.api) {
            console.error('[DerivAPI] Cannot subscribe: Not connected');
            return () => { };
        }

        const subscriptionId = Date.now().toString();

        const handleBalanceUpdate = async () => {
            try {
                const subscription = await this.api.subscribe({ balance: 1 });

                subscription.onUpdate((data) => {
                    if (data.balance) {
                        callback({
                            balance: data.balance.balance,
                            currency: data.balance.currency
                        });
                    }
                });

                this.subscriptions.set(subscriptionId, subscription);
            } catch (error) {
                console.error('[DerivAPI] Balance subscription failed:', error);
            }
        };

        handleBalanceUpdate();

        // Return unsubscribe function
        return () => {
            const subscription = this.subscriptions.get(subscriptionId);
            if (subscription && subscription.unsubscribe) {
                subscription.unsubscribe();
                this.subscriptions.delete(subscriptionId);
                console.log('[DerivAPI] Unsubscribed from balance updates');
            }
        };
    }

    /**
     * Disconnect from the API
     */
    disconnect() {
        try {
            // Clean up all subscriptions
            this.subscriptions.forEach((subscription, id) => {
                if (subscription && subscription.unsubscribe) {
                    subscription.unsubscribe();
                }
            });
            this.subscriptions.clear();

            // Close the connection
            if (this.api) {
                this.api.disconnect();
                this.api = null;
            }

            this.accountInfo = null;
            console.log('[DerivAPI] Disconnected');
        } catch (error) {
            console.error('[DerivAPI] Error during disconnect:', error);
        }
    }

    /**
     * Check if a symbol is a synthetic index
     * @param {string} symbol - Trading symbol
     * @returns {boolean}
     */
    isSyntheticIndex(symbol) {
        if (!symbol) return false;
        return SYNTHETIC_INDICES.some(
            synth => symbol.toUpperCase().includes(synth.toUpperCase())
        );
    }

    /**
     * Get current connection status
     * @returns {boolean}
     */
    isConnected() {
        return this.api !== null;
    }

    /**
     * Get stored account info
     * @returns {object|null}
     */
    getAccountInfo() {
        return this.accountInfo;
    }
}

export default DerivAPIService;
