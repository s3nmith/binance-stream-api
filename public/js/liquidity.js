// =============================================================================
// STABLECOIN LIQUIDITY DASHBOARD
// =============================================================================
// This script fetches and displays liquidity data for stablecoins on Binance.
// It dynamically discovers available pairs and fetches real-time liquidity data.
// =============================================================================

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    // API endpoints (proxied through our server to avoid CORS)
    apiBase: '/api/liquidity',

    // How many pairs to fetch depth for in parallel (rate limiting)
    depthBatchSize: 5,

    // Delay between depth batches (ms) to avoid rate limits
    depthBatchDelay: 200
};

// =============================================================================
// STATE
// =============================================================================

const state = {
    refreshInterval: null,
    lastUpdated: null,
    isLoading: false,
    availablePairs: null  // Cached from /available-pairs endpoint
};

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const elements = {
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    refreshBtn: document.getElementById('refreshBtn'),
    refreshInterval: document.getElementById('refreshInterval'),
    lastUpdated: document.getElementById('lastUpdated'),
    stablecoinCrosses: document.getElementById('stablecoinCrosses'),
    fiatStablecoinPairs: document.getElementById('fiatStablecoinPairs'),
    eurPairs: document.getElementById('eurPairs'),
    majorPairs: document.getElementById('majorPairs')
};

// =============================================================================
// INITIALIZATION
// =============================================================================

async function init() {
    // Set up event listeners
    elements.refreshBtn.addEventListener('click', refreshData);
    elements.refreshInterval.addEventListener('change', updateRefreshInterval);

    // Initial data load
    await refreshData();

    // Set up auto-refresh based on default selection
    updateRefreshInterval();
}

// =============================================================================
// TOGGLE SECTION (for collapsible sections)
// =============================================================================

window.toggleSection = function(headerElement) {
    const section = headerElement.closest('.liquidity-section');
    const grid = section.querySelector('.liquidity-grid');
    const icon = headerElement.querySelector('.collapse-icon');

    if (grid.style.display === 'none') {
        grid.style.display = 'grid';
        icon.textContent = '−';
    } else {
        grid.style.display = 'none';
        icon.textContent = '+';
    }
};

// =============================================================================
// DATA FETCHING
// =============================================================================

/**
 * Main function to refresh all liquidity data
 *
 * Step 1: Fetch available pairs from Binance (via our server)
 * Step 2: For each category, fetch ticker + depth data
 * Step 3: Render the results
 */
async function refreshData() {
    if (state.isLoading) return;

    state.isLoading = true;
    setStatus('loading', 'Discovering pairs...');

    try {
        // Step 1: Get available stablecoin/fiat pairs from Binance
        const availablePairs = await fetchAvailablePairs();
        state.availablePairs = availablePairs;

        console.log('Available pairs:', availablePairs);

        setStatus('loading', 'Fetching liquidity data...');

        // Step 2: Fetch liquidity data for each category
        // We'll fetch in batches to avoid rate limiting

        // Stablecoin crosses (highest priority)
        const crossesData = await fetchLiquidityForPairs(availablePairs.stablecoinCrosses);
        renderCategory(elements.stablecoinCrosses, crossesData);

        // Fiat/Stablecoin pairs
        const fiatData = await fetchLiquidityForPairs(availablePairs.fiatStablecoinPairs);
        renderCategory(elements.fiatStablecoinPairs, fiatData);

        // EUR ecosystem (EURI pairs specifically)
        const eurPairs = [...availablePairs.stablecoinCrosses, ...availablePairs.fiatStablecoinPairs, ...availablePairs.majorPairs]
            .filter(p => p.base === 'EURI' || p.quote === 'EURI' || p.base === 'EUR' || p.quote === 'EUR' || p.base === 'AEUR' || p.quote === 'AEUR');
        const eurData = await fetchLiquidityForPairs(eurPairs);
        renderCategory(elements.eurPairs, eurData);

        // Major pairs (collapsed by default, fetch anyway for when user expands)
        const majorData = await fetchLiquidityForPairs(availablePairs.majorPairs.slice(0, 20)); // Limit to top 20
        renderCategory(elements.majorPairs, majorData);

        // Update status
        state.lastUpdated = new Date();
        elements.lastUpdated.textContent = state.lastUpdated.toLocaleTimeString();
        setStatus('connected', `Loaded ${crossesData.length + fiatData.length + eurData.length} pairs`);

    } catch (error) {
        console.error('Error fetching data:', error);
        setStatus('error', 'Error: ' + error.message);
    } finally {
        state.isLoading = false;
    }
}

/**
 * Fetch list of available stablecoin/fiat pairs from Binance
 *
 * API: GET /api/liquidity/available-pairs
 *
 * This endpoint queries Binance's /api/v3/exchangeInfo and filters
 * for stablecoin and fiat pairs, categorizing them.
 */
async function fetchAvailablePairs() {
    const response = await fetch(`${CONFIG.apiBase}/available-pairs`);
    if (!response.ok) {
        throw new Error(`Failed to fetch available pairs: ${response.status}`);
    }
    return response.json();
}

/**
 * Fetch liquidity data (ticker + depth) for a list of pairs
 * Fetches in batches to avoid rate limiting
 */
async function fetchLiquidityForPairs(pairs) {
    const results = [];

    // Process in batches
    for (let i = 0; i < pairs.length; i += CONFIG.depthBatchSize) {
        const batch = pairs.slice(i, i + CONFIG.depthBatchSize);

        const batchResults = await Promise.all(
            batch.map(async (pair) => {
                try {
                    const [ticker, depth] = await Promise.all([
                        fetchTicker(pair.symbol),
                        fetchDepth(pair.symbol)
                    ]);

                    return {
                        ...pair,
                        ticker,
                        depth,
                        error: null
                    };
                } catch (error) {
                    return {
                        ...pair,
                        ticker: null,
                        depth: null,
                        error: error.message
                    };
                }
            })
        );

        results.push(...batchResults);

        // Small delay between batches to avoid rate limits
        if (i + CONFIG.depthBatchSize < pairs.length) {
            await sleep(CONFIG.depthBatchDelay);
        }
    }

    return results;
}

/**
 * Fetches 24hr ticker data for a symbol
 *
 * Binance API: GET /api/v3/ticker/24hr?symbol=USDCUSDT
 *
 * Key fields returned:
 *   - lastPrice: Current/last traded price
 *   - bidPrice: Best bid (highest buy order)
 *   - askPrice: Best ask (lowest sell order)
 *   - priceChangePercent: 24h price change as percentage
 *   - volume: 24h volume in BASE asset
 *   - quoteVolume: 24h volume in QUOTE asset (this is what we show)
 *   - count: Number of trades in 24h
 */
async function fetchTicker(symbol) {
    const response = await fetch(`${CONFIG.apiBase}/ticker?symbol=${symbol}`);
    if (!response.ok) {
        throw new Error(`Ticker fetch failed: ${response.status}`);
    }
    return response.json();
}

/**
 * Fetches order book depth for a symbol
 *
 * Binance API: GET /api/v3/depth?symbol=USDCUSDT&limit=100
 *
 * Returns:
 *   - bids: Array of [price, quantity] - buy orders sorted highest first
 *   - asks: Array of [price, quantity] - sell orders sorted lowest first
 *
 * We use this to calculate "depth within X%" - how much liquidity
 * is available at tight prices around the current market.
 */
async function fetchDepth(symbol) {
    const response = await fetch(`${CONFIG.apiBase}/depth?symbol=${symbol}`);
    if (!response.ok) {
        throw new Error(`Depth fetch failed: ${response.status}`);
    }
    return response.json();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// LIQUIDITY CALCULATIONS
// =============================================================================

/**
 * Calculate the spread between best bid and ask
 *
 * Spread = Ask - Bid
 * Spread % = (Ask - Bid) / Bid * 100
 *
 * Lower spread = more liquid market, better for trading
 */
function calculateSpread(ticker) {
    if (!ticker || !ticker.bidPrice || !ticker.askPrice) return null;
    const bid = parseFloat(ticker.bidPrice);
    const ask = parseFloat(ticker.askPrice);
    if (bid === 0) return null;

    return {
        absolute: ask - bid,
        percent: ((ask - bid) / bid) * 100,
        mid: (bid + ask) / 2
    };
}

/**
 * Calculate depth within a percentage of the best price
 *
 * For BIDS (buy orders):
 *   - Best bid = highest price someone will pay
 *   - We sum all bids from best bid down to (best bid * (1 - percent/100))
 *
 * For ASKS (sell orders):
 *   - Best ask = lowest price someone will sell at
 *   - We sum all asks from best ask up to (best ask * (1 + percent/100))
 *
 * @param {Array} orders - Array of [price, quantity] from order book
 * @param {number} bestPrice - Best bid or ask price
 * @param {number} percent - Percentage range (e.g., 0.1 for 0.1%)
 * @param {string} side - 'bid' or 'ask'
 * @returns {Object} - { quantity, value } within the range
 */
function calculateDepthWithinPercent(orders, bestPrice, percent, side) {
    if (!orders || !orders.length || !bestPrice) return { quantity: 0, value: 0 };

    const threshold = side === 'bid'
        ? bestPrice * (1 - percent / 100)
        : bestPrice * (1 + percent / 100);

    let totalQuantity = 0;
    let totalValue = 0;

    for (const [priceStr, qtyStr] of orders) {
        const price = parseFloat(priceStr);
        const qty = parseFloat(qtyStr);

        const withinRange = side === 'bid'
            ? price >= threshold
            : price <= threshold;

        if (withinRange) {
            totalQuantity += qty;
            totalValue += price * qty;
        } else {
            break; // Orders are sorted, so we can stop
        }
    }

    return { quantity: totalQuantity, value: totalValue };
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Render a category of pairs into the DOM
 */
function renderCategory(container, data) {
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="empty-state">No pairs available in this category</div>';
        return;
    }

    // Filter out pairs with errors and sort by volume (highest first)
    const validPairs = data
        .filter(pair => pair.ticker && !pair.error)
        .sort((a, b) => parseFloat(b.ticker.quoteVolume || 0) - parseFloat(a.ticker.quoteVolume || 0));

    const errorPairs = data.filter(pair => pair.error);

    let html = '';

    for (const pair of validPairs) {
        html += renderPairCard(pair);
    }

    // Show errors at the end (collapsed)
    if (errorPairs.length > 0) {
        html += `<div class="error-pairs-summary">${errorPairs.length} pair(s) unavailable</div>`;
    }

    container.innerHTML = html || '<div class="empty-state">No pairs available</div>';
}

/**
 * Render a single pair card with all liquidity metrics
 */
function renderPairCard(pair) {
    const ticker = pair.ticker;
    const depth = pair.depth;

    // Calculate metrics
    const spread = calculateSpread(ticker);
    const bidDepth = depth ? calculateDepthWithinPercent(
        depth.bids,
        parseFloat(ticker.bidPrice),
        0.1,
        'bid'
    ) : null;
    const askDepth = depth ? calculateDepthWithinPercent(
        depth.asks,
        parseFloat(ticker.askPrice),
        0.1,
        'ask'
    ) : null;

    // Format values
    const volume24h = formatLargeNumber(parseFloat(ticker.quoteVolume || 0));
    const trades24h = formatLargeNumber(parseInt(ticker.count || 0));
    const spreadPct = spread ? spread.percent.toFixed(4) + '%' : '-';
    const spreadAbs = spread ? formatPrice(spread.absolute, ticker.bidPrice) : '-';
    const price = spread ? formatPrice(spread.mid, ticker.bidPrice) : formatPrice(parseFloat(ticker.lastPrice), ticker.lastPrice);
    const change = parseFloat(ticker.priceChangePercent || 0);
    const changeClass = change >= 0 ? 'positive' : 'negative';

    // Depth formatting - show in quote currency value
    const bidDepthStr = bidDepth ? formatLargeNumber(bidDepth.value) : '-';
    const askDepthStr = askDepth ? formatLargeNumber(askDepth.value) : '-';

    return `
        <div class="pair-card">
            <div class="pair-header">
                <span class="pair-label">${pair.label}</span>
                <span class="pair-symbol">${pair.symbol}</span>
            </div>

            <div class="pair-price">
                <span class="price-value">${price}</span>
                <span class="price-change ${changeClass}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span>
            </div>

            <div class="pair-metrics">
                <div class="metric">
                    <span class="metric-label">24h Volume</span>
                    <span class="metric-value">${volume24h}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">24h Trades</span>
                    <span class="metric-value">${trades24h}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Spread</span>
                    <span class="metric-value">${spreadPct}</span>
                    <span class="metric-sub">${spreadAbs}</span>
                </div>
            </div>

            <div class="pair-depth">
                <div class="depth-item bid">
                    <span class="depth-label">Bid Depth (0.1%)</span>
                    <span class="depth-value">${bidDepthStr}</span>
                </div>
                <div class="depth-item ask">
                    <span class="depth-label">Ask Depth (0.1%)</span>
                    <span class="depth-value">${askDepthStr}</span>
                </div>
            </div>
        </div>
    `;
}

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

/**
 * Format large numbers with K, M, B suffixes
 * e.g., 1500000 -> "1.50M"
 */
function formatLargeNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '-';

    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

/**
 * Format price with appropriate decimals based on value
 *
 * Stablecoin pairs near 1.0 need more decimals (6)
 * High-value pairs (BTC) need fewer (2)
 */
function formatPrice(price, reference) {
    if (price === null || price === undefined || isNaN(price)) return '-';

    const ref = parseFloat(reference) || price;

    // For stablecoin pairs (close to 1), show more decimals
    if (ref >= 0.9 && ref <= 1.1) return price.toFixed(6);
    if (ref < 1) return price.toFixed(6);
    if (ref < 10) return price.toFixed(4);
    if (ref < 1000) return price.toFixed(2);
    return price.toFixed(2);
}

// =============================================================================
// UI STATE
// =============================================================================

function setStatus(status, text) {
    elements.statusDot.className = 'status-dot';
    if (status === 'connected') {
        elements.statusDot.classList.add('connected');
    } else if (status === 'loading') {
        elements.statusDot.classList.add('loading');
    } else if (status === 'error') {
        // Default red dot
    }
    elements.statusText.textContent = text;
}

function updateRefreshInterval() {
    if (state.refreshInterval) {
        clearInterval(state.refreshInterval);
        state.refreshInterval = null;
    }

    const interval = parseInt(elements.refreshInterval.value);
    if (interval > 0) {
        state.refreshInterval = setInterval(refreshData, interval);
    }
}

// =============================================================================
// START
// =============================================================================

init();
