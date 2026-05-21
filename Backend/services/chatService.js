const { query } = require('../db');

const GEMINI_MODEL_FALLBACKS = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
];

function getGeminiConfig() {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
    const validKey =
        apiKey.length > 10 &&
        !apiKey.includes('your_api_key') &&
        apiKey !== 'your_api_key_here';
    return { apiKey: validKey ? apiKey : '', model };
}

async function buildInventoryContext(userId) {
    const userResult = await query(
        'SELECT name, email, role, location FROM users WHERE id = $1',
        [userId]
    );
    const user = userResult.rows[0] || { name: 'User', role: 'admin', location: 'All' };

    const stats = {
        totalProducts: parseInt((await query(`SELECT COUNT(*) FROM products WHERE "isActive" = true`)).rows[0].count),
        lowStockProducts: parseInt((await query(`SELECT COUNT(*) FROM products WHERE "isLowStock" = true AND "isActive" = true`)).rows[0].count),
        outOfStockProducts: parseInt((await query(`SELECT COUNT(*) FROM products WHERE "totalStock" = 0 AND "isActive" = true`)).rows[0].count),
        unreadAlerts: parseInt((await query(`SELECT COUNT(*) FROM stock_alerts WHERE "isRead" = false AND "userId" = $1`, [userId])).rows[0].count),
        locations: parseInt((await query(`SELECT COUNT(*) FROM locations WHERE "isActive" = true`)).rows[0].count),
    };

    const lowStockList = (await query(
        `SELECT "ProductName", "totalStock", "globalMinStock", "ProductCategory"
         FROM products WHERE "isLowStock" = true AND "isActive" = true
         ORDER BY "totalStock" ASC LIMIT 8`
    )).rows;

    const recentMovements = (await query(
        `SELECT sm.type, sm.quantity, sm.location, p."ProductName", sm.date
         FROM stock_movements sm
         JOIN products p ON sm.product_id = p.id
         ORDER BY sm.date DESC LIMIT 5`
    )).rows;

    return { user, stats, lowStockList, recentMovements };
}

function formatContextBlock(ctx) {
    const { user, stats, lowStockList, recentMovements } = ctx;
    const lowStockLines = lowStockList.length
        ? lowStockList.map(p => `- ${p.ProductName}: ${p.totalStock} units (min ${p.globalMinStock}, ${p.ProductCategory || 'General'})`).join('\n')
        : '- None currently flagged';

    const movementLines = recentMovements.length
        ? recentMovements.map(m => `- ${m.type} ${m.quantity}× ${m.ProductName} @ ${m.location}`).join('\n')
        : '- No recent movements';

    return `
User: ${user.name} (${user.role}) — location: ${user.location}
• Active products: ${stats.totalProducts}
• Low stock: ${stats.lowStockProducts}
• Out of stock: ${stats.outOfStockProducts}
• Locations: ${stats.locations}
• Unread alerts: ${stats.unreadAlerts}

Low-stock items:
${lowStockLines}

Recent movements:
${movementLines}`.trim();
}

function isInventoryRelated(message) {
    const q = message.toLowerCase();
    return /stock|inventory|product|alert|movement|warehouse|ims\b|dashboard|catalog|cart|transfer|inbound|outbound|insert|analytics|barcode|low stock|out of stock|replenish|sku|concierge|support desk app|navigate.*app/.test(q);
}

function buildGeneralPrompt() {
    return `You are a knowledgeable assistant inside an Inventory Management System app.
Answer the user's question clearly on ANY topic they ask — including geography, politics, history, science, culture, economics, and general knowledge.
For political questions: be factual, neutral, and balanced; cite no false claims.
For geography: include relevant facts (capitals, regions, borders) when useful.
Be concise unless the user asks for detail. No emojis.`;
}

function buildSystemPrompt(ctx) {
    const roleGuide = ctx.user.role === 'customer'
        ? 'If they ask about this app: they are a customer (browse products, cart, checkout).'
        : 'If they ask about this app: they are staff/admin (products, stock, transfers, analytics, alerts).';

    return `You are IMS Support Desk — a general-purpose assistant AND inventory specialist.

RULES:
1. **General questions** (politics, geography, history, science, world affairs, etc.): answer fully using your general knowledge. Do NOT refuse or say you only handle this project.
2. **Inventory / app questions**: use the LIVE INVENTORY DATA below. Never invent product names or stock numbers not in that data.
3. If a question mixes both (e.g. "countries we ship to" + stock), combine general knowledge with inventory data when available.
${roleGuide}
Be professional and helpful. No emojis.

--- LIVE INVENTORY DATA (for stock/app questions only) ---
${formatContextBlock(ctx)}`;
}

async function callGeminiOnce(apiKey, model, systemPrompt, message, history) {
    const historyText = history
        .slice(-8)
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

    const userText = historyText ? `${historyText}\nUser: ${message}` : message;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userText }] }],
            generationConfig: {
                temperature: 0.55,
                maxOutputTokens: 1024,
            },
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        return { ok: false, status: response.status, error: errText };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text ? { ok: true, text } : { ok: false, status: 200, error: 'Empty response' };
}

async function callGemini(systemPrompt, message, history = []) {
    const { apiKey, model } = getGeminiConfig();
    if (!apiKey) return null;

    const modelsToTry = [model, ...GEMINI_MODEL_FALLBACKS.filter((m) => m !== model)];

    for (const m of modelsToTry) {
        try {
            const result = await callGeminiOnce(apiKey, m, systemPrompt, message, history);
            if (result.ok) {
                console.log(`Gemini reply via model: ${m}`);
                return result.text;
            }
            console.warn(`Gemini model ${m} failed (${result.status}):`, result.error?.slice(0, 200));
        } catch (err) {
            console.warn(`Gemini model ${m} error:`, err.message);
        }
    }

    return null;
}

function localAssistantReply(message, ctx) {
    const q = message.toLowerCase();
    const { user, stats, lowStockList, recentMovements } = ctx;

    if (/hello|hi|hey|good (morning|afternoon|evening)/.test(q)) {
        return `Hello ${user.name.split(' ')[0]} — Support Desk is online. Ask about **inventory** (${stats.totalProducts} products, ${stats.unreadAlerts} alerts) or **anything else** — geography, politics, history, and more.`;
    }

    if (/low.?stock|running low|critical|alert/.test(q)) {
        if (lowStockList.length === 0) {
            return `No products are flagged low stock right now. You have ${stats.unreadAlerts} unread alert(s) — check **Stock Dashboard**.`;
        }
        const lines = lowStockList.map(
            (p, i) => `${i + 1}. **${p.ProductName}** — ${p.totalStock} on hand (min ${p.globalMinStock})`
        );
        return `**${stats.lowStockProducts}** low-stock item(s):\n\n${lines.join('\n')}\n\nOpen **Stock Dashboard** for alerts and transfers.`;
    }

    if (/out of stock|out-of-stock|zero stock/.test(q)) {
        return stats.outOfStockProducts === 0
            ? 'No active products are completely out of stock.'
            : `**${stats.outOfStockProducts}** product(s) are out of stock. Use **Stock Management** → inbound to replenish.`;
    }

    if (/how many|total|count|summary|overview|stats|dashboard|stock/.test(q)) {
        return `**Inventory overview**\n• Active products: ${stats.totalProducts}\n• Low stock: ${stats.lowStockProducts}\n• Out of stock: ${stats.outOfStockProducts}\n• Locations: ${stats.locations}\n• Unread alerts: ${stats.unreadAlerts}`;
    }

    if (/movement|transfer|inbound|outbound|recent/.test(q)) {
        if (recentMovements.length === 0) {
            return 'No recent movements yet. Record inbound/outbound/transfer in **Stock Management**.';
        }
        const lines = recentMovements.map(
            (m) => `• ${m.type.toUpperCase()} — ${m.quantity}× ${m.ProductName} @ ${m.location}`
        );
        return `**Latest movements**\n${lines.join('\n')}`;
    }

    if (/product|catalog|add product|insert/.test(q)) {
        return user.role === 'customer'
            ? 'Browse products on your **Customer Dashboard** and use the cart to checkout.'
            : 'Use **Products** to manage the catalog or **Insert Product** to add new items.';
    }

    if (/location|warehouse|store/.test(q)) {
        return `**${stats.locations}** active locations. Per-location stock is managed in **Stock Management** on each product.`;
    }

    if (/help|how to|guide|navigate|where/.test(q)) {
        if (user.role === 'customer') {
            return '**Customer guide:** Dashboard → browse & cart → checkout. Contact admin for stock issues.';
        }
        return '**Staff guide:** Home · Products · Stock Dashboard · Analytics · Insert Product. Ask about stock, alerts, or movements anytime.';
    }

    if (!isInventoryRelated(message)) {
        return null;
    }

    return `Here's your live inventory snapshot:\n\n${formatContextBlock(ctx)}\n\nTry: "stock overview", "low stock items", "recent movements", or "help navigating the app".`;
}

async function generateChatReply({ userId, message, history = [] }) {
    const ctx = await buildInventoryContext(userId);
    const systemPrompt = buildSystemPrompt(ctx);
    const { apiKey } = getGeminiConfig();

    let reply = await callGemini(systemPrompt, message, history);
    let poweredBy = 'gemini';

    if (!reply && apiKey && !isInventoryRelated(message)) {
        reply = await callGemini(buildGeneralPrompt(), message, history);
    }

    if (!reply) {
        const local = localAssistantReply(message, ctx);
        if (local) {
            reply = local;
        } else if (!isInventoryRelated(message)) {
            reply =
                'General topics (politics, geography, etc.) need the Gemini AI connection. Confirm **GEMINI_API_KEY** is set in `Backend/.env`, use model **gemini-2.5-flash**, and restart the backend with `npm run server`.';
        } else {
            reply = localAssistantReply('help', ctx);
        }
        poweredBy = 'local';
    }

    return {
        reply,
        poweredBy,
        contextSummary: {
            totalProducts: ctx.stats.totalProducts,
            lowStockProducts: ctx.stats.lowStockProducts,
            unreadAlerts: ctx.stats.unreadAlerts,
        },
    };
}

module.exports = { generateChatReply, buildInventoryContext };
