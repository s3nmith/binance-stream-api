const WebSocket = require('ws');

// =============================================================================
// CONFIGURATION
// =============================================================================

const BINANCE_WS_URL = 'wss://data-stream.binance.vision/ws';
const SYMBOL = 'btcusdt';
const STREAM_TYPE = 'bookTicker'; // Options: aggTrade, trade, kline_1m, ticker, bookTicker

// Data older than this (in milliseconds) will be deleted
const MAX_DATA_AGE_MS = 3 * 60 * 1000; // 3 minutes

// =============================================================================
// DATA STORAGE
// =============================================================================

// Store incoming trades with timestamps
const tradeData = [];

// =============================================================================
// CLEANUP - Remove data older than 3 minutes
// =============================================================================

function cleanupOldData() {
    const now = Date.now();
    let removedCount = 0;

    while (tradeData.length > 0 && (now - tradeData[0].localTimestamp) > MAX_DATA_AGE_MS) {
        tradeData.shift();
        removedCount++;
    }

    if (removedCount > 0) {
        console.log(`🗑️  Cleaned up ${removedCount} old records. Current data count: ${tradeData.length}`);
    }
}

// Run cleanup every 30 seconds
setInterval(cleanupOldData, 30 * 1000);

// =============================================================================
// WEBSOCKET CONNECTION
// =============================================================================

function connect() {
    const streamName = `${SYMBOL}@${STREAM_TYPE}`;
    const wsUrl = `${BINANCE_WS_URL}/${streamName}`;

    console.log('=====================================================');
    console.log('BINANCE MARKET DATA STREAM');
    console.log('=====================================================');
    console.log(`Connecting to: ${wsUrl}`);
    console.log(`Stream: ${streamName}`);
    console.log(`Data retention: ${MAX_DATA_AGE_MS / 1000 / 60} minutes`);
    console.log('=====================================================\n');

    const ws = new WebSocket(wsUrl);

    // Connection opened
    ws.on('open', () => {
        console.log('✅ Connected to Binance WebSocket\n');
        console.log('Waiting for data...\n');
    });

    // Receive messages
    ws.on('message', (data) => {
        const trade = JSON.parse(data.toString());

        // Add local timestamp for cleanup tracking
        const record = {
            ...trade,
            localTimestamp: Date.now()
        };

        tradeData.push(record);

        // Pretty print the incoming data
        printTrade(trade);
    });

    // Handle ping/pong (ws library does this automatically, but we can log it)
    ws.on('ping', (data) => {
        console.log('📡 Received ping from server');
        // ws library automatically sends pong
    });

    // Handle errors
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
    });

    // Handle close
    ws.on('close', (code, reason) => {
        console.log(`\n🔌 Connection closed. Code: ${code}, Reason: ${reason.toString() || 'None'}`);
        console.log('Reconnecting in 5 seconds...\n');
        setTimeout(connect, 5000);
    });

    return ws;
}

// =============================================================================
// DISPLAY HELPER
// =============================================================================

function printTrade(trade) {
    // Format for aggTrade stream
    if (trade.e === 'aggTrade') {
        const time = new Date(trade.T).toLocaleTimeString();
        const price = parseFloat(trade.p).toFixed(2);
        const qty = parseFloat(trade.q).toFixed(6);
        const side = trade.m ? 'SELL' : 'BUY ';
        const sideColor = trade.m ? '\x1b[31m' : '\x1b[32m'; // Red for sell, Green for buy
        const reset = '\x1b[0m';

        console.log(
            `${time} | ${sideColor}${side}${reset} | ` +
            `Price: $${price} | Qty: ${qty} BTC | ` +
            `Stored: ${tradeData.length}`
        );
    } else {
        // Generic print for other stream types
        console.log(JSON.stringify(trade, null, 2));
    }
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down...');
    console.log(`Total records stored: ${tradeData.length}`);
    process.exit(0);
});

// =============================================================================
// START
// =============================================================================

connect();
