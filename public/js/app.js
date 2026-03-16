// =============================================================================
// APP STATE
// =============================================================================

const state = {
    ws: null,
    isConnected: false,
    streamTypes: {},
    streamGroups: [],
    symbols: [],
    currentStream: null,
    dataCount: 0
};

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const elements = {
    symbolSelect: document.getElementById('symbolSelect'),
    streamSelect: document.getElementById('streamSelect'),
    connectBtn: document.getElementById('connectBtn'),
    disconnectBtn: document.getElementById('disconnectBtn'),
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    dataFeed: document.getElementById('dataFeed'),
    dataCount: document.getElementById('dataCount'),
    docsContent: document.getElementById('docsContent'),
    statsBar: document.getElementById('statsBar')
};

// =============================================================================
// INITIALIZATION
// =============================================================================

async function init() {
    // Load stream types, groups and symbols
    const [streamTypes, streamGroups, symbols] = await Promise.all([
        fetch('/api/stream-types').then(r => r.json()),
        fetch('/api/stream-groups').then(r => r.json()),
        fetch('/api/symbols').then(r => r.json())
    ]);

    state.streamTypes = streamTypes;
    state.streamGroups = streamGroups;
    state.symbols = symbols;

    // Populate dropdowns
    populateSymbols(symbols);
    populateStreamTypes(streamTypes, streamGroups);

    // Connect to local WebSocket
    connectToServer();

    // Event listeners
    elements.connectBtn.addEventListener('click', startStream);
    elements.disconnectBtn.addEventListener('click', stopStream);
    elements.streamSelect.addEventListener('change', updateDocs);

    // Initial docs
    updateDocs();
}

function populateSymbols(symbols) {
    symbols.forEach(sym => {
        const option = document.createElement('option');
        option.value = sym.value;
        option.textContent = `${sym.label} - ${sym.description}`;
        elements.symbolSelect.appendChild(option);
    });
}

function populateStreamTypes(types, groups) {
    groups.forEach(group => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = group.label;
        group.streams.forEach(streamKey => {
            if (!types[streamKey]) return;
            const option = document.createElement('option');
            option.value = streamKey;
            option.textContent = types[streamKey].name;
            optgroup.appendChild(option);
        });
        elements.streamSelect.appendChild(optgroup);
    });
}

// =============================================================================
// WEBSOCKET CONNECTION (to our local server)
// =============================================================================

function connectToServer() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    state.ws = new WebSocket(`${protocol}//${window.location.host}`);

    state.ws.onopen = () => {
        console.log('Connected to server');
    };

    state.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
    };

    state.ws.onclose = () => {
        console.log('Disconnected from server, reconnecting...');
        setTimeout(connectToServer, 2000);
    };
}

function handleServerMessage(msg) {
    switch (msg.type) {
        case 'connected':
            setConnectedState(true, msg.data.stream);
            break;
        case 'disconnected':
            setConnectedState(false);
            break;
        case 'data':
            addDataItem(msg.data);
            break;
        case 'cleanup':
            updateDataCount(msg.data.remaining);
            break;
        case 'status':
            if (msg.data.isConnected) {
                setConnectedState(true, `${msg.data.currentStream.symbol}@${msg.data.currentStream.streamType}`);
            }
            updateDataCount(msg.data.dataCount);
            break;
    }
}

// =============================================================================
// STREAM CONTROL
// =============================================================================

function startStream() {
    const symbol = elements.symbolSelect.value;
    const streamType = elements.streamSelect.value;

    // Clear previous data display
    elements.dataFeed.innerHTML = '';
    state.dataCount = 0;

    state.ws.send(JSON.stringify({
        action: 'connect',
        symbol,
        streamType
    }));
}

function stopStream() {
    state.ws.send(JSON.stringify({ action: 'disconnect' }));
    elements.dataFeed.innerHTML = '<div class="empty-state">Stream disconnected</div>';
}

function setConnectedState(connected, streamName = '') {
    state.isConnected = connected;
    state.currentStream = streamName;

    elements.statusDot.classList.toggle('connected', connected);
    elements.statusText.textContent = connected ? `Connected: ${streamName}` : 'Disconnected';
    elements.connectBtn.disabled = connected;
    elements.disconnectBtn.disabled = !connected;
}

// =============================================================================
// DATA DISPLAY
// =============================================================================

function addDataItem(data) {
    state.dataCount++;
    updateDataCount(state.dataCount);

    const streamType = elements.streamSelect.value;
    const html = formatDataItem(data, streamType);

    // Add to top of feed
    elements.dataFeed.insertAdjacentHTML('afterbegin', html);

    // Limit displayed items (keep feed performant)
    while (elements.dataFeed.children.length > 100) {
        elements.dataFeed.lastChild.remove();
    }

    // Update stats
    updateStats(data, streamType);
}

function formatPrice(price) {
    const p = parseFloat(price);
    if (p >= 100) return p.toFixed(2);
    if (p >= 1)   return p.toFixed(4);
    return p.toFixed(6);
}

function formatSpread(spread) {
    const s = Math.abs(parseFloat(spread));
    if (s < 0.001) return s.toFixed(6);
    if (s < 1)     return s.toFixed(4);
    return s.toFixed(2);
}

function formatDataItem(data, streamType) {
    const time = new Date(data._localTimestamp).toLocaleTimeString();

    switch (streamType) {
        case 'aggTrade':
        case 'trade':
            return formatTradeItem(data, time);
        case 'bookTicker':
            return formatBookTickerItem(data, time);
        case 'ticker':
            return formatTickerItem(data, time);
        case 'miniTicker':
            return formatMiniTickerItem(data, time);
        case 'ticker_1h':
        case 'ticker_4h':
        case 'ticker_1d':
            return formatRollingTickerItem(data, time);
        case 'kline_1m':
            return formatKlineItem(data, time);
        default:
            return formatGenericItem(data, time);
    }
}

function formatTradeItem(data, time) {
    const price = formatPrice(data.p);
    const qty = parseFloat(data.q).toFixed(6);
    const side = data.m ? 'SELL' : 'BUY';
    const sideClass = data.m ? 'sell' : 'buy';

    return `
        <div class="data-item">
            <div class="time">${time}</div>
            <div class="price ${sideClass}">${side} @ $${price}</div>
            <div class="details">Qty: ${qty} | Trade ID: ${data.a || data.t}</div>
        </div>
    `;
}

function formatBookTickerItem(data, time) {
    const bid = formatPrice(data.b);
    const ask = formatPrice(data.a);
    const spread = formatSpread(parseFloat(data.a) - parseFloat(data.b));

    return `
        <div class="data-item">
            <div class="time">${time}</div>
            <div class="details">
                <span class="buy">BID: $${bid}</span> (${parseFloat(data.B).toFixed(4)}) |
                <span class="sell">ASK: $${ask}</span> (${parseFloat(data.A).toFixed(4)})
            </div>
            <div class="details">Spread: $${spread}</div>
        </div>
    `;
}

function formatTickerItem(data, time) {
    const price = formatPrice(data.c);
    const change = parseFloat(data.P).toFixed(2);
    const changeClass = parseFloat(data.P) >= 0 ? 'buy' : 'sell';
    const quoteVolume = Number(data.q).toLocaleString(undefined, { maximumFractionDigits: 0 });
    const tradeCount = Number(data.n).toLocaleString();

    return `
        <div class="data-item">
            <div class="time">${time}</div>
            <div class="price">$${price}</div>
            <div class="details">
                24h Change: <span class="${changeClass}">${change}%</span> |
                Trades: ${tradeCount}
            </div>
            <div class="details">24h Quote Volume: ${quoteVolume}</div>
        </div>
    `;
}

function formatMiniTickerItem(data, time) {
    const close = formatPrice(data.c);
    const open = formatPrice(data.o);
    const high = formatPrice(data.h);
    const low = formatPrice(data.l);
    const change = parseFloat(data.c) - parseFloat(data.o);
    const changePct = (change / parseFloat(data.o) * 100).toFixed(4);
    const changeClass = change >= 0 ? 'buy' : 'sell';
    const quoteVolume = Number(data.q).toLocaleString(undefined, { maximumFractionDigits: 0 });

    return `
        <div class="data-item">
            <div class="time">${time}</div>
            <div class="price"><span class="${changeClass}">${change >= 0 ? '+' : ''}${changePct}%</span> &nbsp; Close: $${close}</div>
            <div class="details">O: $${open} | H: $${high} | L: $${low}</div>
            <div class="details">24h Quote Vol: ${quoteVolume}</div>
        </div>
    `;
}

function formatRollingTickerItem(data, time) {
    const price = formatPrice(data.c);
    const changePct = parseFloat(data.P).toFixed(4);
    const changeClass = parseFloat(data.P) >= 0 ? 'buy' : 'sell';
    const avgPrice = formatPrice(data.w);
    const high = formatPrice(data.h);
    const low = formatPrice(data.l);
    const tradeCount = Number(data.n).toLocaleString();
    const quoteVolume = Number(data.q).toLocaleString(undefined, { maximumFractionDigits: 0 });
    const window = data.e; // "1hTicker", "4hTicker", "1dTicker"

    return `
        <div class="data-item">
            <div class="time">${time} <span style="opacity:0.6">[${window}]</span></div>
            <div class="price">$${price} &nbsp; <span class="${changeClass}">${parseFloat(data.P) >= 0 ? '+' : ''}${changePct}%</span></div>
            <div class="details">H: $${high} | L: $${low} | Avg: $${avgPrice}</div>
            <div class="details">Trades: ${tradeCount} | Quote Vol: ${quoteVolume}</div>
        </div>
    `;
}

function formatKlineItem(data, time) {
    const k = data.k;
    const open = formatPrice(k.o);
    const close = formatPrice(k.c);
    const high = formatPrice(k.h);
    const low = formatPrice(k.l);
    const closed = k.x ? '(CLOSED)' : '(forming)';

    return `
        <div class="data-item">
            <div class="time">${time} ${closed}</div>
            <div class="details">
                O: $${open} | H: $${high} | L: $${low} | C: $${close}
            </div>
            <div class="details">Trades: ${k.n} | Volume: ${parseFloat(k.v).toFixed(4)}</div>
        </div>
    `;
}

function formatGenericItem(data, time) {
    return `
        <div class="data-item">
            <div class="time">${time}</div>
            <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>
    `;
}

function updateDataCount(count) {
    state.dataCount = count;
    elements.dataCount.textContent = count;
}

function updateStats(data, streamType) {
    let html = '';

    switch (streamType) {
        case 'aggTrade':
        case 'trade':
            html = `
                <div class="stat">
                    <span class="stat-label">Last Price</span>
                    <span class="stat-value price">$${formatPrice(data.p)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Last Quantity</span>
                    <span class="stat-value">${parseFloat(data.q).toFixed(6)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Side</span>
                    <span class="stat-value">${data.m ? 'SELL' : 'BUY'}</span>
                </div>
            `;
            break;
        case 'bookTicker':
            html = `
                <div class="stat">
                    <span class="stat-label">Best Bid</span>
                    <span class="stat-value price">$${formatPrice(data.b)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Best Ask</span>
                    <span class="stat-value price">$${formatPrice(data.a)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Spread</span>
                    <span class="stat-value">$${formatSpread(parseFloat(data.a) - parseFloat(data.b))}</span>
                </div>
            `;
            break;
        case 'ticker':
            html = `
                <div class="stat">
                    <span class="stat-label">Price</span>
                    <span class="stat-value price">$${formatPrice(data.c)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">24h Change</span>
                    <span class="stat-value">${parseFloat(data.P).toFixed(2)}%</span>
                </div>
                <div class="stat">
                    <span class="stat-label">24h Trades</span>
                    <span class="stat-value">${Number(data.n).toLocaleString()}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">24h Quote Vol</span>
                    <span class="stat-value">${Number(data.q).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
            `;
            break;
        case 'miniTicker':
            html = `
                <div class="stat">
                    <span class="stat-label">Close</span>
                    <span class="stat-value price">$${formatPrice(data.c)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Open</span>
                    <span class="stat-value">$${formatPrice(data.o)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">24h High</span>
                    <span class="stat-value">$${formatPrice(data.h)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">24h Low</span>
                    <span class="stat-value">$${formatPrice(data.l)}</span>
                </div>
            `;
            break;
        case 'ticker_1h':
        case 'ticker_4h':
        case 'ticker_1d':
            html = `
                <div class="stat">
                    <span class="stat-label">Price</span>
                    <span class="stat-value price">$${formatPrice(data.c)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Change</span>
                    <span class="stat-value">${parseFloat(data.P).toFixed(4)}%</span>
                </div>
                <div class="stat">
                    <span class="stat-label">High</span>
                    <span class="stat-value">$${formatPrice(data.h)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Low</span>
                    <span class="stat-value">$${formatPrice(data.l)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Avg Price</span>
                    <span class="stat-value">$${formatPrice(data.w)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Trades</span>
                    <span class="stat-value">${Number(data.n).toLocaleString()}</span>
                </div>
            `;
            break;
        case 'kline_1m':
            const k = data.k;
            html = `
                <div class="stat">
                    <span class="stat-label">Open</span>
                    <span class="stat-value">$${formatPrice(k.o)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">High</span>
                    <span class="stat-value">$${formatPrice(k.h)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Low</span>
                    <span class="stat-value">$${formatPrice(k.l)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Close</span>
                    <span class="stat-value price">$${formatPrice(k.c)}</span>
                </div>
            `;
            break;
    }

    elements.statsBar.innerHTML = html;
}

// =============================================================================
// DOCUMENTATION DISPLAY
// =============================================================================

function updateDocs() {
    const streamType = elements.streamSelect.value;
    const info = state.streamTypes[streamType];

    if (!info) return;

    const group = (state.streamGroups || []).find(g => g.streams.includes(streamType));
    const groupHtml = group ? `
        <div style="background:#161b22;border:1px solid #30363d;border-radius:6px;padding:12px 14px;margin-bottom:14px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#8b949e;margin-bottom:6px;">API Category</div>
            <div style="font-weight:600;color:#e6edf3;margin-bottom:6px;">${group.label}</div>
            <div style="font-size:13px;color:#8b949e;line-height:1.5;">${group.description}</div>
        </div>
    ` : '';

    elements.docsContent.innerHTML = `
        ${groupHtml}
        <h3>${info.name}</h3>
        <p>${info.description}</p>
        <div class="frequency-badge">${info.frequency}</div>
        <h4 style="color: #f0f6fc; margin-bottom: 10px;">JSON Fields:</h4>
        <ul class="field-list">
            ${renderFields(info.fields)}
        </ul>
    `;
}

function renderFields(fields) {
    let html = '';

    for (const [key, field] of Object.entries(fields)) {
        html += `
            <li class="field-item">
                <span class="field-key">${key}</span>
                <span class="field-name">${field.name}</span>
                <div class="field-desc">${field.description}</div>
                ${field.subfields ? `<div class="subfields">${renderFields(field.subfields)}</div>` : ''}
            </li>
        `;
    }

    return html;
}

// =============================================================================
// START APP
// =============================================================================

init();
