// =============================================================================
// APP STATE
// =============================================================================

const state = {
    ws: null,
    isConnected: false,
    streamTypes: {},
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
    // Load stream types and symbols
    const [streamTypes, symbols] = await Promise.all([
        fetch('/api/stream-types').then(r => r.json()),
        fetch('/api/symbols').then(r => r.json())
    ]);

    state.streamTypes = streamTypes;
    state.symbols = symbols;

    // Populate dropdowns
    populateSymbols(symbols);
    populateStreamTypes(streamTypes);

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

function populateStreamTypes(types) {
    Object.entries(types).forEach(([key, info]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = info.name;
        elements.streamSelect.appendChild(option);
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
        case 'kline_1m':
            return formatKlineItem(data, time);
        default:
            return formatGenericItem(data, time);
    }
}

function formatTradeItem(data, time) {
    const price = parseFloat(data.p).toFixed(2);
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
    const bid = parseFloat(data.b).toFixed(2);
    const ask = parseFloat(data.a).toFixed(2);
    const spread = (parseFloat(data.a) - parseFloat(data.b)).toFixed(2);

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
    const price = parseFloat(data.c).toFixed(2);
    const change = parseFloat(data.P).toFixed(2);
    const changeClass = parseFloat(data.P) >= 0 ? 'buy' : 'sell';

    return `
        <div class="data-item">
            <div class="time">${time}</div>
            <div class="price">$${price}</div>
            <div class="details">
                24h Change: <span class="${changeClass}">${change}%</span> |
                Volume: ${parseFloat(data.v).toFixed(2)}
            </div>
        </div>
    `;
}

function formatKlineItem(data, time) {
    const k = data.k;
    const open = parseFloat(k.o).toFixed(2);
    const close = parseFloat(k.c).toFixed(2);
    const high = parseFloat(k.h).toFixed(2);
    const low = parseFloat(k.l).toFixed(2);
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
                    <span class="stat-value price">$${parseFloat(data.p).toFixed(2)}</span>
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
                    <span class="stat-value price">$${parseFloat(data.b).toFixed(2)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Best Ask</span>
                    <span class="stat-value price">$${parseFloat(data.a).toFixed(2)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Spread</span>
                    <span class="stat-value">$${(parseFloat(data.a) - parseFloat(data.b)).toFixed(2)}</span>
                </div>
            `;
            break;
        case 'ticker':
            html = `
                <div class="stat">
                    <span class="stat-label">Price</span>
                    <span class="stat-value price">$${parseFloat(data.c).toFixed(2)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">24h Change</span>
                    <span class="stat-value">${parseFloat(data.P).toFixed(2)}%</span>
                </div>
                <div class="stat">
                    <span class="stat-label">24h Volume</span>
                    <span class="stat-value">${parseFloat(data.v).toFixed(0)}</span>
                </div>
            `;
            break;
        case 'kline_1m':
            const k = data.k;
            html = `
                <div class="stat">
                    <span class="stat-label">Open</span>
                    <span class="stat-value">$${parseFloat(k.o).toFixed(2)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">High</span>
                    <span class="stat-value">$${parseFloat(k.h).toFixed(2)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Low</span>
                    <span class="stat-value">$${parseFloat(k.l).toFixed(2)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Close</span>
                    <span class="stat-value price">$${parseFloat(k.c).toFixed(2)}</span>
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

    let fieldsHtml = renderFields(info.fields);

    elements.docsContent.innerHTML = `
        <h3>${info.name}</h3>
        <p>${info.description}</p>
        <div class="frequency-badge">${info.frequency}</div>
        <h4 style="color: #f0f6fc; margin-bottom: 10px;">JSON Fields:</h4>
        <ul class="field-list">
            ${fieldsHtml}
        </ul>
    `;
}

function renderFields(fields, isSubfield = false) {
    let html = '';

    for (const [key, field] of Object.entries(fields)) {
        html += `
            <li class="field-item">
                <span class="field-key">${key}</span>
                <span class="field-name">${field.name}</span>
                <div class="field-desc">${field.description}</div>
                ${field.subfields ? `<div class="subfields">${renderFields(field.subfields, true)}</div>` : ''}
            </li>
        `;
    }

    return html;
}

// =============================================================================
// START APP
// =============================================================================

init();
