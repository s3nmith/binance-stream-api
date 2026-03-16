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
    },

    depth5: {
        name: 'Partial Depth (Top 5)',
        description: 'Top 5 bids and asks from the order book, delivered as a full snapshot on every update. No local state management needed — each message is self-contained. Best for tight spread checks and quick liquidity reads.',
        frequency: 'Real-time (~1 second)',
        fields: {
            lastUpdateId: { name: 'Last Update ID', description: 'Order book update ID for sequencing' },
            bids: { name: 'Bids', description: 'Array of top 5 buy orders: [[price, quantity], ...] sorted highest price first' },
            asks: { name: 'Asks', description: 'Array of top 5 sell orders: [[price, quantity], ...] sorted lowest price first' }
        }
    },

    depth10: {
        name: 'Partial Depth (Top 10)',
        description: 'Top 10 bids and asks from the order book, delivered as a full snapshot on every update. Good balance for checking liquidity walls and slippage impact around the mid price.',
        frequency: 'Real-time (~1 second)',
        fields: {
            lastUpdateId: { name: 'Last Update ID', description: 'Order book update ID for sequencing' },
            bids: { name: 'Bids', description: 'Array of top 10 buy orders: [[price, quantity], ...] sorted highest price first' },
            asks: { name: 'Asks', description: 'Array of top 10 sell orders: [[price, quantity], ...] sorted lowest price first' }
        }
    },

    depth20: {
        name: 'Partial Depth (Top 20)',
        description: 'Top 20 bids and asks from the order book, delivered as a full snapshot on every update. Maximum depth view for partial streams — useful for larger orders where you need to see further into the book.',
        frequency: 'Real-time (~1 second)',
        fields: {
            lastUpdateId: { name: 'Last Update ID', description: 'Order book update ID for sequencing' },
            bids: { name: 'Bids', description: 'Array of top 20 buy orders: [[price, quantity], ...] sorted highest price first' },
            asks: { name: 'Asks', description: 'Array of top 20 sell orders: [[price, quantity], ...] sorted lowest price first' }
        }
    },

    miniTicker: {
        name: 'Mini Ticker (24h)',
        description: 'Simplified 24-hour rolling statistics. Ideal for stablecoin pairs — shows OHLC and volume without noise. Stream name: &lt;symbol&gt;@miniTicker.',
        frequency: 'Every 1 second',
        fields: {
            e: { name: 'Event Type', description: 'Always "24hrMiniTicker"' },
            E: { name: 'Event Time', description: 'Unix timestamp (ms)' },
            s: { name: 'Symbol', description: 'Trading pair' },
            c: { name: 'Close Price', description: 'Latest/current price' },
            o: { name: 'Open Price', description: '24h rolling open price' },
            h: { name: 'High Price', description: '24h rolling high price' },
            l: { name: 'Low Price', description: '24h rolling low price' },
            v: { name: 'Base Volume', description: '24h total traded volume in base asset' },
            q: { name: 'Quote Volume', description: '24h total traded volume in quote asset' }
        }
    },

    ticker_1h: {
        name: 'Rolling Window Ticker (1h)',
        description: 'Full statistics computed over a 1-hour rolling window instead of 24h. Stream name: &lt;symbol&gt;@ticker_1h.',
        frequency: 'Every 1 second',
        fields: {
            e: { name: 'Event Type', description: 'Always "1hTicker"' },
            E: { name: 'Event Time', description: 'Unix timestamp (ms)' },
            s: { name: 'Symbol', description: 'Trading pair' },
            p: { name: 'Price Change', description: 'Absolute price change over the window' },
            P: { name: 'Price Change %', description: 'Percentage price change over the window' },
            o: { name: 'Open Price', description: 'Window open price' },
            h: { name: 'High Price', description: 'Window high price' },
            l: { name: 'Low Price', description: 'Window low price' },
            c: { name: 'Close Price', description: 'Latest/current price' },
            w: { name: 'Weighted Avg Price', description: 'Volume-weighted average price over window' },
            v: { name: 'Base Volume', description: 'Total traded volume in base asset' },
            q: { name: 'Quote Volume', description: 'Total traded volume in quote asset' },
            O: { name: 'Window Open Time', description: 'Unix timestamp (ms) when window opened' },
            C: { name: 'Window Close Time', description: 'Unix timestamp (ms) when window closes' },
            F: { name: 'First Trade ID', description: 'First trade ID in the window' },
            L: { name: 'Last Trade ID', description: 'Last trade ID in the window' },
            n: { name: 'Trade Count', description: 'Number of trades in the window' }
        }
    },

    ticker_4h: {
        name: 'Rolling Window Ticker (4h)',
        description: 'Full statistics computed over a 4-hour rolling window. Stream name: &lt;symbol&gt;@ticker_4h.',
        frequency: 'Every 1 second',
        fields: {
            e: { name: 'Event Type', description: 'Always "4hTicker"' },
            E: { name: 'Event Time', description: 'Unix timestamp (ms)' },
            s: { name: 'Symbol', description: 'Trading pair' },
            p: { name: 'Price Change', description: 'Absolute price change over the window' },
            P: { name: 'Price Change %', description: 'Percentage price change over the window' },
            o: { name: 'Open Price', description: 'Window open price' },
            h: { name: 'High Price', description: 'Window high price' },
            l: { name: 'Low Price', description: 'Window low price' },
            c: { name: 'Close Price', description: 'Latest/current price' },
            w: { name: 'Weighted Avg Price', description: 'Volume-weighted average price over window' },
            v: { name: 'Base Volume', description: 'Total traded volume in base asset' },
            q: { name: 'Quote Volume', description: 'Total traded volume in quote asset' },
            O: { name: 'Window Open Time', description: 'Unix timestamp (ms) when window opened' },
            C: { name: 'Window Close Time', description: 'Unix timestamp (ms) when window closes' },
            F: { name: 'First Trade ID', description: 'First trade ID in the window' },
            L: { name: 'Last Trade ID', description: 'Last trade ID in the window' },
            n: { name: 'Trade Count', description: 'Number of trades in the window' }
        }
    },

    ticker_1d: {
        name: 'Rolling Window Ticker (1d)',
        description: 'Full statistics computed over a 1-day rolling window. Stream name: &lt;symbol&gt;@ticker_1d.',
        frequency: 'Every 1 second',
        fields: {
            e: { name: 'Event Type', description: 'Always "1dTicker"' },
            E: { name: 'Event Time', description: 'Unix timestamp (ms)' },
            s: { name: 'Symbol', description: 'Trading pair' },
            p: { name: 'Price Change', description: 'Absolute price change over the window' },
            P: { name: 'Price Change %', description: 'Percentage price change over the window' },
            o: { name: 'Open Price', description: 'Window open price' },
            h: { name: 'High Price', description: 'Window high price' },
            l: { name: 'Low Price', description: 'Window low price' },
            c: { name: 'Close Price', description: 'Latest/current price' },
            w: { name: 'Weighted Avg Price', description: 'Volume-weighted average price over window' },
            v: { name: 'Base Volume', description: 'Total traded volume in base asset' },
            q: { name: 'Quote Volume', description: 'Total traded volume in quote asset' },
            O: { name: 'Window Open Time', description: 'Unix timestamp (ms) when window opened' },
            C: { name: 'Window Close Time', description: 'Unix timestamp (ms) when window closes' },
            F: { name: 'First Trade ID', description: 'First trade ID in the window' },
            L: { name: 'Last Trade ID', description: 'Last trade ID in the window' },
            n: { name: 'Trade Count', description: 'Number of trades in the window' }
        }
    }
};

// =============================================================================
// STREAM GROUPS — defines how stream types are categorised in the UI
// =============================================================================

const STREAM_GROUPS = [
    {
        label: 'Trade Streams (Live Transactions)',
        description: 'Pushes raw trade data in real-time as transactions occur on the exchange. ' +
            '<b>Trade</b> shows every individual match (unique buyer + seller). ' +
            '<b>Aggregate Trade</b> bundles all matches for a single taker order into one event.',
        streams: ['trade', 'aggTrade']
    },
    {
        label: 'Price & Statistic Streams (Tickers)',
        description: 'Pushes rolling price statistics for a symbol, updating every second. ' +
            'Especially useful for stablecoin pairs where the signal lives in the 4th–6th decimal place. ' +
            '<b>Ticker</b> gives a full 24h breakdown. <b>Mini Ticker</b> gives a lightweight OHLCV view. ' +
            '<b>Rolling Window</b> lets you pick a 1h, 4h, or 1d window instead of the fixed 24h.',
        streams: ['ticker', 'miniTicker', 'ticker_1h', 'ticker_4h', 'ticker_1d']
    },
    {
        label: 'Charting Streams (Candlesticks)',
        description: 'Pushes live OHLCV candlestick updates every ~2 seconds as each candle forms. ' +
            'A <b>closed</b> flag marks when a candle is final. ' +
            'Intervals from 1 second up to 1 month are supported via the stream name.',
        streams: ['kline_1m']
    },
    {
        label: 'Order Book Streams (Liquidity & Depth)',
        description: 'Pushes real-time order book data. ' +
            '<b>Book Ticker</b> fires instantly whenever the best bid or ask changes — tightest spread view with 100+ updates per second. ' +
            '<b>Partial Depth</b> streams give you a full snapshot of the top 5, 10, or 20 price levels on every update — no state management needed.',
        streams: ['bookTicker', 'depth5', 'depth10', 'depth20']
    }
];

const SYMBOLS = [
    { value: 'btcusdt', label: 'BTC/USDT', description: 'Bitcoin' },
    { value: 'ethusdt', label: 'ETH/USDT', description: 'Ethereum' },
    { value: 'bnbusdt', label: 'BNB/USDT', description: 'Binance Coin' },
    { value: 'solusdt', label: 'SOL/USDT', description: 'Solana' },
    { value: 'xrpusdt', label: 'XRP/USDT', description: 'Ripple' },
    { value: 'dogeusdt', label: 'DOGE/USDT', description: 'Dogecoin' },
    { value: 'usdcusdt', label: 'USDC/USDT', description: 'Stablecoin cross with strong activity' },
    { value: 'btcusdc', label: 'BTC/USDC', description: 'Bitcoin quoted in USDC' },
    { value: 'ethusdc', label: 'ETH/USDC', description: 'Ethereum quoted in USDC' },
    { value: 'solusdc', label: 'SOL/USDC', description: 'Solana quoted in USDC' },
    { value: 'euriusdt', label: 'EURI/USDT', description: 'Euro stablecoin vs Tether' },
    { value: 'euriusdc', label: 'EURI/USDC', description: 'Euro stablecoin vs USDC' },
    { value: 'btceuri', label: 'BTC/EURI', description: 'Bitcoin quoted in euro stablecoin' },
    { value: 'eureuri', label: 'EUR/EURI', description: 'Euro vs euro stablecoin cross' }
];

module.exports = { STREAM_TYPES, STREAM_GROUPS, SYMBOLS };
