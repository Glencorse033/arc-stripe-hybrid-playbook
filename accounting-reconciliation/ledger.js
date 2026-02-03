/**
 * ACCOUNTING LEDGER SYSTEM
 * 
 * Finance teams need "one source of truth". This service creates a dual-system 
 * audit trail that Circle's API doesn't provide natively.
 */

const fs = require('fs');
const path = require('path');

const LEDGER_PATH = path.join(__dirname, '../data/ledger.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(LEDGER_PATH))) {
    fs.mkdirSync(path.dirname(LEDGER_PATH));
}

/**
 * Records a cross-system mapping for reconciliation
 */
async function recordTransaction(entry) {
    const ledger = loadLedger();

    // Check if we already have this Stripe transaction
    if (ledger.some(t => t.stripeId === entry.stripeId)) {
        console.warn(`[Ledger] Duplicate Stripe ID detected: ${entry.stripeId}`);
        return;
    }

    ledger.push(entry);
    saveLedger(ledger);
    console.log(`[Ledger] Entry recorded: Stripe(${entry.stripeId}) <--> Circle(${entry.circleId})`);
}

function loadLedger() {
    if (!fs.existsSync(LEDGER_PATH)) return [];
    return JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
}

function saveLedger(data) {
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2));
}

module.exports = { recordTransaction, loadLedger };
