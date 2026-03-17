const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
const https = require('https');

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
// LIQUIDITY API ROUTES
// These proxy requests to Binance REST API to avoid CORS issues in the browser
// =============================================================================

/**
 * Fetch 24hr ticker data for a symbol
 *
 * Binance API: GET https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT
 *
 * Returns rolling 24-hour statistics:
 *   - lastPrice: Current price
 *   - priceChangePercent: 24h change %
 *   - volume: 24h volume in base asset
 *   - quoteVolume: 24h volume in quote asset (e.g., USDT value)
 *   - count: Number of trades in 24h
 *   - bidPrice/askPrice: Best bid/ask prices
 */
app.get('/api/liquidity/ticker', async (req, res) => {
    const symbol = req.query.symbol;
    if (!symbol) {
        return res.status(400).json({ error: 'Symbol parameter required' });
    }

    try {
        const data = await fetchFromBinance(`/api/v3/ticker/24hr?symbol=${symbol}`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Fetch order book depth for a symbol
 *
 * Binance API: GET https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=100
 *
 * Returns order book snapshot:
 *   - bids: Array of [price, quantity] buy orders (sorted highest first)
 *   - asks: Array of [price, quantity] sell orders (sorted lowest first)
 *
 * Limit options: 5, 10, 20, 50, 100, 500, 1000, 5000
 */
app.get('/api/liquidity/depth', async (req, res) => {
    const symbol = req.query.symbol;
    const limit = req.query.limit || 100;

    if (!symbol) {
        return res.status(400).json({ error: 'Symbol parameter required' });
    }

    try {
        const data = await fetchFromBinance(`/api/v3/depth?symbol=${symbol}&limit=${limit}`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Fetch all stablecoin and FX related pairs from Binance
 *
 * Binance API: GET https://api.binance.com/api/v3/exchangeInfo
 *
 * We filter for pairs involving stablecoins (USDT, USDC, FDUSD, TUSD, DAI, USDP, EURI, AEUR)
 * and fiat currencies (EUR, GBP, TRY, BRL, etc.)
 *
 * Returns categorized list of available pairs
 */
app.get('/api/liquidity/available-pairs', async (req, res) => {
    try {
        const data = await fetchFromBinance('/api/v3/exchangeInfo');

        // Define stablecoins and fiat currencies to look for
        const stablecoins = ['USDT', 'USDC', 'FDUSD', 'TUSD', 'DAI', 'USDP', 'EURI', 'AEUR', 'PYUSD', 'USDD', 'UST', 'USTC', 'BUSD'];
        const fiats = ['EUR', 'GBP', 'JPY', 'TRY', 'BRL', 'ARS', 'PLN', 'RON', 'AUD', 'RUB', 'UAH', 'NGN', 'ZAR', 'IDR', 'INR', 'PHP', 'THB', 'VND', 'KRW', 'MXN', 'COP', 'PEN', 'CZK', 'HUF', 'SEK', 'NOK', 'DKK', 'CHF', 'CAD', 'NZD', 'HKD', 'SGD', 'TWD', 'MYR'];

        const result = {
            stablecoins: [],           // List of stablecoins found
            stablecoinCrosses: [],     // Stablecoin vs stablecoin (e.g., USDC/USDT)
            fiatStablecoinPairs: [],   // Fiat vs stablecoin (e.g., EUR/USDT)
            fiatCrosses: [],           // Fiat vs fiat or fiat vs stablecoin crosses
            majorPairs: []             // BTC/ETH quoted in stablecoins (for reference)
        };

        const foundStablecoins = new Set();

        for (const symbol of data.symbols) {
            if (symbol.status !== 'TRADING') continue;

            const base = symbol.baseAsset;
            const quote = symbol.quoteAsset;
            const pair = symbol.symbol;

            const baseIsStable = stablecoins.includes(base);
            const quoteIsStable = stablecoins.includes(quote);
            const baseIsFiat = fiats.includes(base);
            const quoteIsFiat = fiats.includes(quote);

            // Track found stablecoins
            if (baseIsStable) foundStablecoins.add(base);
            if (quoteIsStable) foundStablecoins.add(quote);

            // Stablecoin cross pairs (USDC/USDT, FDUSD/USDT, etc.)
            if (baseIsStable && quoteIsStable) {
                result.stablecoinCrosses.push({
                    symbol: pair,
                    base,
                    quote,
                    label: `${base}/${quote}`
                });
            }
            // Fiat vs stablecoin (EUR/USDT, EUR/USDC, etc.)
            else if (baseIsFiat && quoteIsStable) {
                result.fiatStablecoinPairs.push({
                    symbol: pair,
                    base,
                    quote,
                    label: `${base}/${quote}`
                });
            }
            // Stablecoin vs fiat (EURI/EUR if exists)
            else if (baseIsStable && quoteIsFiat) {
                result.fiatStablecoinPairs.push({
                    symbol: pair,
                    base,
                    quote,
                    label: `${base}/${quote}`
                });
            }
            // Fiat crosses (EUR/GBP, etc.) - rare but possible
            else if (baseIsFiat && quoteIsFiat) {
                result.fiatCrosses.push({
                    symbol: pair,
                    base,
                    quote,
                    label: `${base}/${quote}`
                });
            }
            // Major crypto quoted in stablecoins (BTC/USDT, ETH/USDC, etc.)
            else if (['BTC', 'ETH', 'BNB'].includes(base) && quoteIsStable) {
                result.majorPairs.push({
                    symbol: pair,
                    base,
                    quote,
                    label: `${base}/${quote}`
                });
            }
        }

        result.stablecoins = Array.from(foundStablecoins).sort();

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Helper function to fetch data from Binance REST API
 * Uses native https module to avoid adding dependencies
 */
function fetchFromBinance(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `https://api.binance.com${endpoint}`;

        https.get(url, (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.code && parsed.msg) {
                        // Binance API error format
                        reject(new Error(parsed.msg));
                    } else {
                        resolve(parsed);
                    }
                } catch (e) {
                    reject(new Error('Failed to parse response'));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

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
