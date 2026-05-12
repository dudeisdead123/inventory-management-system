const nodemailer = require('nodemailer');
const SystemSettings = require('../Models/SystemSettings');

// Internal state
let emailConfig = {
    adminEmail: '',
    appPassword: '',
    isConfigured: false
};

let transporter = null;

// Initialize transporter from DB on startup
async function initEmailService() {
    try {
        const settings = await SystemSettings.findOne({ key: 'email_config' });
        if (settings && settings.value) {
            const { adminEmail, appPassword } = settings.value;
            await configureTransporter(adminEmail, appPassword, false); // false = don't save again
            console.log('Email service initialized from persistent settings.');
        } else {
            console.log('No email configuration found in database.');
        }
    } catch (err) {
        console.error('Failed to initialize email service:', err.message);
    }
}

// Configure the email transporter
async function configureTransporter(email, appPassword, shouldSave = true) {
    emailConfig.adminEmail = email;
    emailConfig.appPassword = appPassword;
    emailConfig.isConfigured = true;

    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: email,
            pass: appPassword
        }
    });

    if (shouldSave) {
        await SystemSettings.findOneAndUpdate(
            { key: 'email_config' },
            { 
                value: { adminEmail: email, appPassword: appPassword },
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );
    }

    return transporter;
}

// Get current config status (without exposing password)
function getEmailConfigStatus() {
    return {
        isConfigured: emailConfig.isConfigured,
        adminEmail: emailConfig.adminEmail ? 
            emailConfig.adminEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '',
    };
}

// Send low stock alert email
async function sendLowStockEmail(product, location, currentQty, minQty, severity) {
    if (!emailConfig.isConfigured || !transporter) {
        console.log('Email not configured — skipping low stock alert email');
        return false;
    }

    const severityColors = {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#f59e0b',
        low: '#22c55e'
    };

    const severityColor = severityColors[severity] || '#6b7280';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
            .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 40px; text-align: center; }
            .header h1 { color: #f4c430; margin: 0; font-size: 24px; letter-spacing: -0.5px; }
            .header p { color: #94a3b8; margin: 8px 0 0 0; font-size: 14px; }
            .severity-bar { height: 4px; background: ${severityColor}; }
            .content { padding: 32px 40px; }
            .alert-badge { display: inline-block; background: ${severityColor}; color: white; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
            .product-name { font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 0 0 24px 0; }
            .info-grid { display: table; width: 100%; border-collapse: separate; border-spacing: 0 8px; }
            .info-row { display: table-row; }
            .info-label { display: table-cell; padding: 10px 16px; background: #f1f5f9; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 8px 0 0 8px; width: 140px; }
            .info-value { display: table-cell; padding: 10px 16px; background: #f8fafc; color: #1e293b; font-size: 15px; font-weight: 500; border-radius: 0 8px 8px 0; }
            .stock-warning { background: linear-gradient(135deg, #fef3c7, #fef9c3); border: 1px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center; }
            .stock-warning .qty { font-size: 36px; font-weight: 800; color: ${severityColor}; }
            .stock-warning .label { font-size: 13px; color: #92400e; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
            .footer { background: #f8f9fa; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
            .footer p { color: #94a3b8; font-size: 12px; margin: 0; }
            .footer a { color: #f4c430; text-decoration: none; font-weight: 600; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⚠️ Stock Alert — IMS</h1>
                <p>Inventory Management System Notification</p>
            </div>
            <div class="severity-bar"></div>
            <div class="content">
                <span class="alert-badge">${severity} severity</span>
                <h2 class="product-name">${product.ProductName}</h2>
                
                <div class="stock-warning">
                    <div class="qty">${currentQty}</div>
                    <div class="label">Current Stock at ${location}</div>
                </div>

                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-label">Product</div>
                        <div class="info-value">${product.ProductName}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Barcode</div>
                        <div class="info-value">${product.ProductBarcode}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Location</div>
                        <div class="info-value">${location}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Current Qty</div>
                        <div class="info-value" style="color: ${severityColor}; font-weight: 700;">${currentQty}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Min Level</div>
                        <div class="info-value">${minQty}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Severity</div>
                        <div class="info-value" style="color: ${severityColor}; font-weight: 700;">${severity.toUpperCase()}</div>
                    </div>
                </div>
            </div>
            <div class="footer">
                <p>This is an automated alert from your <a href="http://localhost:3000/stock-dashboard">IMS Dashboard</a></p>
                <p style="margin-top: 8px;">Please take action to restock this item.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"IMS Stock Alerts" <${emailConfig.adminEmail}>`,
            to: emailConfig.adminEmail,
            subject: `⚠️ ${severity.toUpperCase()} — Low Stock Alert: ${product.ProductName} at ${location}`,
            html: htmlContent
        });

        console.log('Low stock alert email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Failed to send low stock email:', error.message);
        return false;
    }
}

// Send test email
async function sendTestEmail() {
    if (!emailConfig.isConfigured || !transporter) {
        throw new Error('Email is not configured');
    }

    try {
        const info = await transporter.sendMail({
            from: `"IMS Stock Alerts" <${emailConfig.adminEmail}>`,
            to: emailConfig.adminEmail,
            subject: '✅ IMS Email Alerts — Test Successful',
            html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 30px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 32px; text-align: center;">
                    <h1 style="color: #f4c430; margin: 0;">✅ Test Successful</h1>
                </div>
                <div style="padding: 32px; text-align: center;">
                    <p style="font-size: 16px; color: #374151;">Your email alerts are configured correctly!</p>
                    <p style="font-size: 14px; color: #6b7280;">You'll receive alerts when stock falls below minimum levels.</p>
                </div>
            </div>
            `
        });

        return { success: true, messageId: info.messageId };
    } catch (error) {
        throw new Error('Test email failed: ' + error.message);
    }
}

module.exports = {
    initEmailService,
    configureTransporter,
    getEmailConfigStatus,
    sendLowStockEmail,
    sendTestEmail
};
