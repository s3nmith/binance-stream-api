const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');

const binanceStream = require('./services/binanceStream');
const { STREAM_TYPES, STREAM_GROUPS, SYMBOLS } = require('./services/streamInfo');

// =============================================================================
// SERVER SETUP
// =============================================================================

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Serve static files from public folder
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// =============================================================================
// API ROUTES
// =============================================================================

// Get available stream types and their documentation
app.get('/api/stream-types', (req, res) => {
    res.json(STREAM_TYPES);
});

// Get available symbols
app.get('/api/symbols', (req, res) => {
    res.json(SYMBOLS);
});

// Get stream groups (categories for UI grouping)
app.get('/api/stream-groups', (req, res) => {
    res.json(STREAM_GROUPS);
});

// Get current status
app.get('/api/status', (req, res) => {
    res.json(binanceStream.getStatus());
});

// Get stored data
app.get('/api/data', (req, res) => {
    res.json(binanceStream.getData());
});

// =============================================================================
// WEBSOCKET SERVER (for pushing live data to browser)
// =============================================================================

const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs) => {
    console.log('Browser client connected');

    // Send current status immediately
    clientWs.send(JSON.stringify({
        type: 'status',
        data: binanceStream.getStatus()
    }));

    // Handle messages from browser
    clientWs.on('message', (message) => {
        try {
            const msg = JSON.parse(message.toString());

            if (msg.action === 'connect') {
                binanceStream.connect(msg.symbol, msg.streamType);
            } else if (msg.action === 'disconnect') {
                binanceStream.disconnect();
            }
        } catch (err) {
            console.error('Invalid message:', err);
        }
    });

    // Forward Binance data to this browser client
    const listener = (event, data) => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: event, data }));
        }
    };

    binanceStream.addListener(listener);

    clientWs.on('close', () => {
        console.log('Browser client disconnected');
        binanceStream.removeListener(listener);
    });
});

// =============================================================================
// START SERVER
// =============================================================================

server.listen(PORT, () => {
    console.log('=====================================================');
    console.log('BINANCE STREAM VIEWER');
    console.log('=====================================================');
    console.log(`Server running at: http://localhost:${PORT}`);
    console.log('=====================================================');
});
