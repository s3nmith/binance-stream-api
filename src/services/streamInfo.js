// =============================================================================
// STREAM DOCUMENTATION
// Information about each stream type and their JSON fields
// =============================================================================

const STREAM_TYPES = {
    aggTrade: {
        name: 'Aggregate Trade',
        description: 'Aggregated trade information. Trades that fill at the same time, from the same order, with the same price are aggregated.',
        frequency: 'Real-time (varies: 1-100+ per second depending on market activity)',
        fields: {
            e: { name: 'Event Type', description: 'Always "aggTrade"' },
            E: { name: 'Event Time', description: 'Unix timestamp (ms) when event was generated' },
            s: { name: 'Symbol', description: 'Trading pair (e.g., BTCUSDT)' },
            a: { name: 'Aggregate Trade ID', description: 'Unique ID for this aggregated trade' },
            p: { name: 'Price', description: 'Trade execution price' },
            q: { name: 'Quantity', description: 'Trade quantity in base asset' },
            f: { name: 'First Trade ID', description: 'First trade ID in this aggregation' },
            l: { name: 'Last Trade ID', description: 'Last trade ID in this aggregation' },
            T: { name: 'Trade Time', description: 'Unix timestamp (ms) of the trade' },
            m: { name: 'Is Buyer Maker', description: 'true = SELL (buyer was maker), false = BUY (seller was maker)' },
            M: { name: 'Best Price Match', description: 'Ignore this field (deprecated)' }
        }
    },

    trade: {
        name: 'Trade',
        description: 'Individual trade information. Every single trade execution on the exchange.',
        frequency: 'Real-time (can be very high volume)',
        fields: {
            e: { name: 'Event Type', description: 'Always "trade"' },
            E: { name: 'Event Time', description: 'Unix timestamp (ms) when event was generated' },
            s: { name: 'Symbol', description: 'Trading pair (e.g., BTCUSDT)' },
            t: { name: 'Trade ID', description: 'Unique trade ID' },
            p: { name: 'Price', description: 'Trade execution price' },
            q: { name: 'Quantity', description: 'Trade quantity in base asset' },
            b: { name: 'Buyer Order ID', description: 'Order ID of the buyer' },
            a: { name: 'Seller Order ID', description: 'Order ID of the seller' },
            T: { name: 'Trade Time', description: 'Unix timestamp (ms) of the trade' },
            m: { name: 'Is Buyer Maker', description: 'true = SELL, false = BUY' },
            M: { name: 'Best Price Match', description: 'Ignore this field (deprecated)' }
        }
    },

    kline_1m: {
        name: 'Kline/Candlestick (1 minute)',
        description: 'Candlestick data for charting. Updates every ~2 seconds while the candle is forming.',
        frequency: 'Every ~2 seconds during candle formation',
        fields: {
            e: { name: 'Event Type', description: 'Always "kline"' },
            E: { name: 'Event Time', description: 'Unix timestamp (ms) when event was generated' },
            s: { name: 'Symbol', description: 'Trading pair' },
            k: {
                name: 'Kline Data', description: 'Candlestick object containing:',
                subfields: {
                    t: { name: 'Kline Start Time', description: 'Unix timestamp (ms)' },
                    T: { name: 'Kline Close Time', description: 'Unix timestamp (ms)' },
                    s: { name: 'Symbol', description: 'Trading pair' },
                    i: { name: 'Interval', description: 'Candle interval (1m, 5m, etc.)' },
                    f: { name: 'First Trade ID', description: 'First trade ID in this candle' },
                    L: { name: 'Last Trade ID', description: 'Last trade ID in this candle' },
                    o: { name: 'Open Price', description: 'Opening price of candle' },
                    c: { name: 'Close Price', description: 'Current/closing price' },
                    h: { name: 'High Price', description: 'Highest price in candle' },
                    l: { name: 'Low Price', description: 'Lowest price in candle' },
                    v: { name: 'Volume', description: 'Total volume in base asset' },
                    n: { name: 'Number of Trades', description: 'Trade count in this candle' },
                    x: { name: 'Is Closed', description: 'true if candle is final/closed' },
                    q: { name: 'Quote Volume', description: 'Total volume in quote asset' },
                    V: { name: 'Taker Buy Volume', description: 'Taker buy base asset volume' },
                    Q: { name: 'Taker Buy Quote Volume', description: 'Taker buy quote asset volume' }
                }
            }
        }
    },

    ticker: {
        name: '24hr Ticker',
        description: 'Rolling 24-hour price change statistics. Updates every second.',
        frequency: 'Every 1 second',
        fields: {
            e: { name: 'Event Type', description: 'Always "24hrTicker"' },
            E: { name: 'Event Time', description: 'Unix timestamp (ms)' },
            s: { name: 'Symbol', description: 'Trading pair' },
            p: { name: 'Price Change', description: 'Absolute price change in 24h' },
            P: { name: 'Price Change %', description: 'Percentage price change in 24h' },
            w: { name: 'Weighted Avg Price', description: 'Volume-weighted average price' },
            x: { name: 'Previous Close', description: 'Previous day close price' },
            c: { name: 'Current Price', description: 'Latest/current price' },
            Q: { name: 'Close Quantity', description: 'Quantity of last trade' },
            b: { name: 'Best Bid Price', description: 'Best bid price in order book' },
            B: { name: 'Best Bid Qty', description: 'Quantity at best bid' },
            a: { name: 'Best Ask Price', description: 'Best ask price in order book' },
            A: { name: 'Best Ask Qty', description: 'Quantity at best ask' },
            o: { name: 'Open Price', description: '24h opening price' },
            h: { name: 'High Price', description: '24h high price' },
            l: { name: 'Low Price', description: '24h low price' },
            v: { name: 'Volume', description: '24h volume in base asset' },
            q: { name: 'Quote Volume', description: '24h volume in quote asset' },
            O: { name: 'Stats Open Time', description: 'Statistics open time (ms)' },
            C: { name: 'Stats Close Time', description: 'Statistics close time (ms)' },
            F: { name: 'First Trade ID', description: 'First trade ID in 24h period' },
            L: { name: 'Last Trade ID', description: 'Last trade ID in 24h period' },
            n: { name: 'Trade Count', description: 'Number of trades in 24h' }
        }
    },

    bookTicker: {
        name: 'Book Ticker',
        description: 'Best bid and ask price/quantity in real-time. Extremely fast updates.',
        frequency: 'Real-time (can be 100+ per second)',
        fields: {
            u: { name: 'Update ID', description: 'Order book update ID' },
            s: { name: 'Symbol', description: 'Trading pair' },
            b: { name: 'Best Bid Price', description: 'Highest buy order price' },
            B: { name: 'Best Bid Qty', description: 'Quantity at best bid price' },
            a: { name: 'Best Ask Price', description: 'Lowest sell order price' },
            A: { name: 'Best Ask Qty', description: 'Quantity at best ask price' }
        }
    }
};

const SYMBOLS = [
    { value: 'btcusdt', label: 'BTC/USDT', description: 'Bitcoin' },
    { value: 'ethusdt', label: 'ETH/USDT', description: 'Ethereum' },
    { value: 'bnbusdt', label: 'BNB/USDT', description: 'Binance Coin' },
    { value: 'solusdt', label: 'SOL/USDT', description: 'Solana' },
    { value: 'xrpusdt', label: 'XRP/USDT', description: 'Ripple' },
    { value: 'dogeusdt', label: 'DOGE/USDT', description: 'Dogecoin' }
];

module.exports = { STREAM_TYPES, SYMBOLS };
