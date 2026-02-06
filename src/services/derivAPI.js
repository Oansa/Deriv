import DerivAPI from '@deriv/deriv-api';

class DerivAPIService {
  constructor(appId) {
    this.appId = appId;
    this.ws = null;
    this.accountInfo = null;
    this.messageHandlers = new Map();
    this.requestId = 0;
  }

  async connect() {
    try {
      this.ws = new WebSocket(
        `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`
      );
      
      return new Promise((resolve, reject) => {
        this.ws.onopen = () => {
          console.log('✅ Connected to Deriv WebSocket');
          
          // Set up message handler
          this.ws.onmessage = (msg) => {
            const response = JSON.parse(msg.data);
            console.log('📥 Received:', response);
            
            // Handle subscriptions and responses
            if (response.req_id && this.messageHandlers.has(response.req_id)) {
              const handler = this.messageHandlers.get(response.req_id);
              handler(response);
              
              // Remove one-time handlers (not subscriptions)
              if (response.msg_type !== 'balance') {
                this.messageHandlers.delete(response.req_id);
              }
            }
          };
          
          resolve({ success: true, data: true });
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject({ success: false, message: 'WebSocket connection failed' });
        };
        
        this.ws.onclose = () => {
          console.log('🔌 WebSocket closed');
        };
      });
    } catch (error) {
      console.error('Connection failed:', error);
      return { success: false, message: error.message };
    }
  }

  async sendRequest(request) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const req_id = ++this.requestId;
      const requestWithId = { ...request, req_id };

      this.messageHandlers.set(req_id, (response) => {
        if (response.error) {
          reject(response.error);
        } else {
          resolve(response);
        }
      });

      console.log('📤 Sending:', requestWithId);
      this.ws.send(JSON.stringify(requestWithId));
    });
  }

  async authorize(token) {
    try {
      console.log('🔑 Authorizing with token...');
      
      const response = await this.sendRequest({ authorize: token });
      
      if (!response.authorize) {
        return { 
          success: false, 
          message: 'No authorization data in response' 
        };
      }
      
      this.accountInfo = {
        loginid: response.authorize.loginid,
        currency: response.authorize.currency,
        balance: response.authorize.balance,
        email: response.authorize.email,
        country: response.authorize.country || 'Unknown'
      };
      
      console.log('✅ Authorized:', this.accountInfo.loginid);
      return { success: true, data: this.accountInfo };
      
    } catch (error) {
      console.error('❌ Authorization failed:', error);
      return { 
        success: false, 
        message: error.message || 'Invalid API token' 
      };
    }
  }

  async getBalance() {
    try {
      const response = await this.sendRequest({ balance: 1 });
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
      const response = await this.sendRequest({ portfolio: 1 });
      
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
      const response = await this.sendRequest({ 
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
      const response = await this.sendRequest({ 
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
      const req_id = ++this.requestId;
      
      this.messageHandlers.set(req_id, (response) => {
        if (response.balance) {
          callback({
            balance: response.balance.balance,
            currency: response.balance.currency
          });
        }
      });

      this.ws.send(JSON.stringify({ 
        balance: 1, 
        subscribe: 1,
        req_id 
      }));

      return () => {
        this.messageHandlers.delete(req_id);
        this.ws.send(JSON.stringify({ 
          forget: req_id 
        }));
      };
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.messageHandlers.clear();
      console.log('🔌 Disconnected from Deriv');
    }
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export default DerivAPIService;