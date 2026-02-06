import DerivAPI from '@deriv/deriv-api';

class DerivAPIService {
  constructor(appId) {
    this.appId = appId;
    this.api = null;
    this.connection = null;
    this.accountInfo = null;
  }

  async connect() {
    try {
      this.connection = new WebSocket(
        `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`
      );
      
      this.api = new DerivAPI({ connection: this.connection });
      
      return new Promise((resolve, reject) => {
        this.connection.onopen = () => {
          console.log('✅ Connected to Deriv WebSocket');
          resolve({ success: true, data: true });
        };
        
        this.connection.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject({ success: false, message: error.message });
        };
        
        this.connection.onclose = () => {
          console.log('🔌 WebSocket closed');
        };
      });
    } catch (error) {
      console.error('Connection failed:', error);
      return { success: false, message: error.message };
    }
  }

  async authorize(token) {
    try {
      const response = await this.api.authorize({ authorize: token });
      
      this.accountInfo = {
        loginid: response.authorize.loginid,
        currency: response.authorize.currency,
        balance: response.authorize.balance,
        email: response.authorize.email,
        country: response.authorize.country
      };
      
      console.log('✅ Authorized:', this.accountInfo.loginid);
      return { success: true, data: this.accountInfo };
    } catch (error) {
      console.error('Authorization failed:', error);
      return { success: false, message: 'Invalid API token' };
    }
  }

  async getBalance() {
    try {
      const response = await this.api.balance();
      return {
        success: true,
        data: {
          balance: response.balance.balance,
          currency: response.balance.currency
        }
      };
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return { success: false, message: error.message, data: null };
    }
  }

  async getOpenPositions() {
    try {
      const response = await this.api.portfolio({ portfolio: 1 });
      
      if (!response.portfolio || !response.portfolio.contracts) {
        return { success: true, data: [] };
      }

      // Filter for synthetic indices only
      const syntheticSymbols = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', 
                                 'BOOM300', 'BOOM500', 'BOOM1000', 
                                 'CRASH300', 'CRASH500', 'CRASH1000',
                                 '1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V'];
      
      const positions = response.portfolio.contracts
        .filter(contract => syntheticSymbols.includes(contract.symbol))
        .map(contract => ({
          contract_id: contract.contract_id,
          symbol: contract.symbol,
          contract_type: contract.contract_type,
          buy_price: contract.buy_price,
          profit: contract.profit,
          payout: contract.payout,
          currency: contract.currency,
          date_start: contract.date_start,
          expiry_time: contract.expiry_time,
          longcode: contract.longcode
        }));

      return { success: true, data: positions };
    } catch (error) {
      console.error('Failed to fetch positions:', error);
      return { success: false, message: error.message, data: [] };
    }
  }

  async getTradeHistory(limit = 20) {
    try {
      const response = await this.api.profitTable({ 
        profit_table: 1, 
        description: 1, 
        limit: limit,
        sort: 'DESC'
      });

      if (!response.profit_table || !response.profit_table.transactions) {
        return { success: true, data: [] };
      }

      // Filter for synthetic indices
      const syntheticSymbols = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', 
                                 'BOOM300', 'BOOM500', 'BOOM1000', 
                                 'CRASH300', 'CRASH500', 'CRASH1000',
                                 '1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V'];

      const trades = response.profit_table.transactions
        .filter(t => syntheticSymbols.some(sym => t.shortcode?.includes(sym)))
        .map(trade => ({
          transaction_id: trade.transaction_id,
          contract_id: trade.contract_id,
          symbol: this.extractSymbol(trade.shortcode),
          contract_type: trade.contract_type,
          buy_price: trade.buy_price,
          sell_price: trade.sell_price,
          profit: trade.sell_price - trade.buy_price,
          purchase_time: trade.purchase_time * 1000, // Convert to ms
          sell_time: trade.sell_time * 1000,
          longcode: trade.longcode,
          shortcode: trade.shortcode
        }));

      return { success: true, data: trades };
    } catch (error) {
      console.error('Failed to fetch trade history:', error);
      return { success: false, message: error.message, data: [] };
    }
  }

  async getBotActivity() {
    try {
      const response = await this.api.statement({ 
        statement: 1, 
        description: 1, 
        limit: 50 
      });

      if (!response.statement || !response.statement.transactions) {
        return { success: true, data: [] };
      }

      // Filter for DBot transactions (app_id 16929 or 19111)
      const botAppIds = [16929, 19111]; // DBot app IDs
      
      const botTransactions = response.statement.transactions
        .filter(t => botAppIds.includes(t.app_id))
        .map(transaction => ({
          transaction_id: transaction.transaction_id,
          action_type: transaction.action_type,
          amount: transaction.amount,
          balance_after: transaction.balance_after,
          contract_id: transaction.contract_id,
          longcode: transaction.longcode,
          shortcode: transaction.shortcode,
          transaction_time: transaction.transaction_time * 1000,
          app_id: transaction.app_id
        }));

      return { success: true, data: botTransactions };
    } catch (error) {
      console.error('Failed to fetch bot activity:', error);
      return { success: false, message: error.message, data: [] };
    }
  }

  subscribeToBalance(callback) {
    try {
      const subscription = this.api.subscribe({ balance: 1 });
      
      subscription.subscribe((response) => {
        if (response.balance) {
          callback({
            balance: response.balance.balance,
            currency: response.balance.currency
          });
        }
      });

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Balance subscription failed:', error);
      return () => {};
    }
  }

  extractSymbol(shortcode) {
    if (!shortcode) return 'UNKNOWN';
    
    const symbols = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', 
                     'BOOM300', 'BOOM500', 'BOOM1000', 
                     'CRASH300', 'CRASH500', 'CRASH1000',
                     '1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V'];
    
    const found = symbols.find(sym => shortcode.includes(sym));
    return found || 'UNKNOWN';
  }

  disconnect() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
      this.api = null;
      console.log('🔌 Disconnected from Deriv');
    }
  }

  isConnected() {
    return this.connection?.readyState === WebSocket.OPEN;
  }
}

export default DerivAPIService;