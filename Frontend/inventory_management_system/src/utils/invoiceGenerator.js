/**
 * Invoice Generator Utility
 * Generates a clean, professional, print-optimized invoice overlay
 * and opens the browser print dialog automatically.
 */
export const generateInvoice = (purchase, user) => {
    const invoiceWindow = window.open('', '_blank', 'width=800,height=900');
    
    const amount = purchase.productPrice * purchase.quantity;
    const dateStr = new Date(purchase.date || Date.now()).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Invoice #${purchase.orderId || Math.random().toString(36).substring(2, 9).toUpperCase()}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono&display=swap');
            
            body {
                font-family: 'Inter', sans-serif;
                color: #18181b;
                margin: 0;
                padding: 40px;
                background-color: #ffffff;
                -webkit-print-color-adjust: exact;
            }

            .invoice-card {
                max-width: 700px;
                margin: 0 auto;
                border: 1px solid #e4e4e7;
                padding: 40px;
                border-radius: 8px;
            }

            .invoice-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 2px solid #f4f4f5;
                padding-bottom: 24px;
                margin-bottom: 30px;
            }

            .brand {
                font-weight: 700;
                font-size: 1.5rem;
                letter-spacing: -0.03em;
                color: #000000;
            }

            .brand span {
                font-weight: 300;
                color: #71717a;
            }

            .invoice-title {
                text-align: right;
            }

            .invoice-title h1 {
                margin: 0 0 4px 0;
                font-size: 1.75rem;
                font-weight: 800;
                letter-spacing: -0.02em;
            }

            .invoice-title p {
                margin: 0;
                color: #71717a;
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.85rem;
            }

            .meta-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 40px;
                font-size: 0.9rem;
            }

            .meta-block h3 {
                margin: 0 0 8px 0;
                font-size: 0.75rem;
                text-transform: uppercase;
                color: #71717a;
                letter-spacing: 0.05em;
            }

            .meta-block p {
                margin: 0 0 4px 0;
                font-weight: 500;
            }

            .meta-block span {
                color: #71717a;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 40px;
            }

            th {
                text-align: left;
                padding: 12px;
                border-bottom: 2px solid #e4e4e7;
                color: #71717a;
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }

            td {
                padding: 16px 12px;
                border-bottom: 1px solid #f4f4f5;
                font-size: 0.9rem;
            }

            .mono {
                font-family: 'JetBrains Mono', monospace;
            }

            .total-section {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 8px;
                border-top: 2px solid #f4f4f5;
                padding-top: 20px;
            }

            .total-row {
                display: flex;
                width: 250px;
                justify-content: space-between;
                font-size: 0.9rem;
            }

            .total-row.grand-total {
                font-size: 1.15rem;
                font-weight: 700;
                border-top: 1px solid #e4e4e7;
                padding-top: 8px;
                margin-top: 4px;
            }

            .footer-note {
                margin-top: 50px;
                text-align: center;
                color: #a1a1aa;
                font-size: 0.75rem;
                border-top: 1px solid #f4f4f5;
                padding-top: 20px;
            }

            @media print {
                body {
                    padding: 0;
                }
                .invoice-card {
                    border: none;
                    padding: 0;
                }
            }
        </style>
    </head>
    <body>
        <div class="invoice-card">
            <div class="invoice-header">
                <div class="brand">INVENTORY<span>HUB</span></div>
                <div class="invoice-title">
                    <h1>INVOICE</h1>
                    <p>ID: ${purchase._id ? purchase._id.substring(10, 24).toUpperCase() : 'SIM-' + Math.random().toString(36).substring(2, 8).toUpperCase()}</p>
                </div>
            </div>

            <div class="meta-grid">
                <div class="meta-block">
                    <h3>Billed To</h3>
                    <p>${user?.name || 'Valued Customer'}</p>
                    <span>Email: ${user?.email || 'N/A'}</span><br>
                    <span>Location: ${purchase.location ? purchase.location.toUpperCase() : 'Global'}</span>
                </div>
                <div class="meta-block" style="text-align: right;">
                    <h3>Invoice Details</h3>
                    <p>Date: ${dateStr}</p>
                    <span>Status: PAID</span><br>
                    <span>Method: Razorpay Payment Gateway</span>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 50%;">Description</th>
                        <th style="text-align: center;">Price</th>
                        <th style="text-align: center;">Quantity</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <strong style="display:block; margin-bottom:4px; font-weight: 600;">${purchase.productName}</strong>
                            <span style="font-size:0.75rem; color:#71717a;">Standard MERN Fulfillment</span>
                        </td>
                        <td class="mono" style="text-align: center;">₹${purchase.productPrice.toLocaleString()}</td>
                        <td class="mono" style="text-align: center;">${purchase.quantity}</td>
                        <td class="mono" style="text-align: right; font-weight: 500;">₹${amount.toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>

            <div class="total-section">
                <div class="total-row">
                    <span style="color:#71717a;">Subtotal</span>
                    <span class="mono">₹${amount.toLocaleString()}</span>
                </div>
                <div class="total-row">
                    <span style="color:#71717a;">Tax (0%)</span>
                    <span class="mono">₹0</span>
                </div>
                <div class="total-row grand-total">
                    <span>Total Paid</span>
                    <span class="mono">₹${amount.toLocaleString()}</span>
                </div>
            </div>

            <div class="footer-note">
                <p>Thank you for your business! If you have any questions, please contact support.</p>
                <span class="mono" style="font-size:0.65rem;">System Verified Transaction • Secured via Razorpay</span>
            </div>
        </div>

        <script>
            window.onload = function() {
                setTimeout(function() {
                    window.print();
                }, 500);
            }
        </script>
    </body>
    </html>
    `;

    invoiceWindow.document.write(htmlContent);
    invoiceWindow.document.close();
};
