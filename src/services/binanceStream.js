const WebSocket = require('ws');

// =============================================================================
// BINANCE STREAM SERVICE
// =============================================================================

class BinanceStreamService {
    constructor() {
        this.ws = null;
        this.currentStream = null;
        this.data = [];
        this.maxDataAgeMs = 3 * 60 * 1000; // 3 minutes
        this.listeners = new Set();
        this.isConnected = false;

        // Start cleanup interval
        setInterval(() => this.cleanupOldData(), 30 * 1000);
    }

    // Subscribe a client to receive updates
    addListener(callback) {
        this.listeners.add(callback);
    }

    removeListener(callback) {
        this.listeners.delete(callback);
    }

    // Notify all listeners of new data
    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (err) {
                console.error('Listener error:', err);
            }
        });
    }

    // Connect to a stream
    connect(symbol, streamType) {
        // Close existing connection
        if (this.ws) {
            this.ws.close();
        }

        // Clear old data when switching streams
        this.data = [];
        this.currentStream = { symbol, streamType };

        const streamName = `${symbol.toLowerCase()}@${streamType}`;
        // Using data-stream.binance.vision for public market data (no API key needed)
        // Format: wss://data-stream.binance.vision/ws/<streamName>
        const wsUrl = `wss://data-stream.binance.vision/ws/${streamName}`;

        console.log(`Connecting to: ${streamName}`);

        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
            this.isConnected = true;
            console.log(`Connected to ${streamName}`);
            this.notifyListeners('connected', { stream: streamName });
        });

        this.ws.on('message', (rawData) => {
            const parsed = JSON.parse(rawData.toString());
            const record = {
                ...parsed,
                _localTimestamp: Date.now()
            };

            this.data.push(record);
            this.notifyListeners('data', record);
        });

        this.ws.on('close', () => {
            this.isConnected = false;
            console.log('Disconnected from Binance');
            this.notifyListeners('disconnected', {});
        });

        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error.message);
            this.notifyListeners('error', { message: error.message });
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.currentStream = null;
            this.data = [];
        }
    }

    cleanupOldData() {
        const now = Date.now();
        const beforeCount = this.data.length;

        this.data = this.data.filter(item =>
            (now - item._localTimestamp) <= this.maxDataAgeMs
        );

        const removed = beforeCount - this.data.length;
        if (removed > 0) {
            console.log(`Cleaned up ${removed} old records`);
            this.notifyListeners('cleanup', { removed, remaining: this.data.length });
        }
    }

    getStatus() {
        return {
            isConnected: this.isConnected,
            currentStream: this.currentStream,
            dataCount: this.data.length
        };
    }

    getData() {
        return this.data;
    }
}

// Export singleton instance
module.exports = new BinanceStreamService();
