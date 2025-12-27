import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const generateAndShareInvoice = async (saleDetails: any) => {
  const { customer, product, date, priceDetails, id, amcSchedule } = saleDetails;
  
  // Helpers
  const formatCurrency = (amount: any) => `₹${Number(amount).toLocaleString('en-IN')}`;
  const discountAmount = priceDetails.actual - priceDetails.sale;
  const hasDiscount = discountAmount > 0;

  // Generate AMC Rows
  const amcRows = amcSchedule && amcSchedule.length > 0 
    ? amcSchedule.map((s: any, index: number) => `
        <tr style="background-color: ${index % 2 === 0 ? '#fff' : '#f9fafb'};">
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px;">${s.service_type}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; text-align: right;">${new Date(s.due_date).toDateString()}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; text-align: right;">${s.status}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="3" style="padding: 10px; text-align: center; color: #888; font-size: 11px;">No AMC Schedule</td></tr>';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.5; }
          
          /* HEADER BRANDING */
          .brand-header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #2563eb; padding-bottom: 25px; }
          .logo-text { font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; margin-bottom: 5px; display: flex; align-items: center; justify-content: center; gap: 10px; }
          .logo-icon { font-size: 24px; } 
          .prop-name { font-size: 14px; font-weight: 600; color: #64748b; margin-bottom: 4px; }
          .contact-info { font-size: 14px; font-weight: 700; color: #2563eb; margin-bottom: 8px; }
          .address { font-size: 11px; color: #64748b; max-width: 400px; margin: 0 auto; line-height: 1.4; }

          /* INVOICE INFO GRID */
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .box-title { font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 8px; }
          .customer-name { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
          .customer-detail { font-size: 13px; color: #475569; }
          
          .invoice-box { text-align: right; }
          .invoice-number { font-size: 16px; font-weight: 700; color: #0f172a; }

          /* PRODUCT TABLE */
          .table-container { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f8fafc; text-align: left; padding: 12px 15px; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; border-bottom: 1px solid #e2e8f0; }
          td { padding: 15px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9; }
          .text-right { text-align: right; }
          .bold { font-weight: 700; color: #0f172a; }
          .strike { text-decoration: line-through; color: #94a3b8; font-size: 12px; margin-right: 8px; }
          .discount-badge { display: inline-block; background: #dcfce7; color: #166534; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; }

          /* TOTALS */
          .totals { display: flex; justify-content: flex-end; }
          .totals-box { width: 250px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #64748b; }
          .grand-total { border-top: 2px solid #0f172a; padding-top: 12px; margin-top: 12px; color: #0f172a; font-weight: 800; font-size: 18px; }

          /* AMC SECTION */
          .amc-section { margin-top: 50px; }
          .amc-header { font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; }

          /* FOOTER */
          .footer { margin-top: 60px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 30px; }
          .thank-you { font-size: 16px; font-weight: 700; color: #2563eb; margin-bottom: 5px; }
          .footer-note { font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>

        <div class="brand-header">
          <div class="logo-text"><span class="logo-icon">💧</span> BHARATH WATER PURIFIERS</div>
          <div class="prop-name">Prop: Lakshman Menakuru</div>
          <div class="contact-info">📞 +91 81850 81875</div>
          <div class="address">
            Besides Meridian Restaurant, Opposite Balabarathi School,<br>
            Vidyanagar, 524413, Tirupati, Andhra Pradesh.
          </div>
        </div>

        <div class="info-grid">
          <div>
            <div class="box-title">Bill To</div>
            <div class="customer-name">${customer.name}</div>
            <div class="customer-detail">${customer.mobile}</div>
            <div class="customer-detail" style="max-width: 200px;">${customer.address || ''}</div>
          </div>
          <div class="invoice-box">
            <div class="box-title">Invoice Details</div>
            <div class="invoice-number">#INV-${id.slice(0, 6).toUpperCase()}</div>
            <div class="customer-detail">Date: ${new Date(date).toDateString()}</div>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th width="50%">Description</th>
                <th width="15%" class="text-right">Qty</th>
                <th width="35%" class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div class="bold">${product.name}</div>
                  <div style="font-size: 12px; color: #64748b;">Model: ${product.model || 'Standard'}</div>
                </td>
                <td class="text-right">1</td>
                <td class="text-right">
                  ${hasDiscount ? `<span class="strike">${formatCurrency(priceDetails.actual)}</span>` : ''}
                  <span class="bold">${formatCurrency(priceDetails.sale)}</span>
                  ${hasDiscount ? `<br/><span class="discount-badge">Save ₹${discountAmount}</span>` : ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="totals">
          <div class="totals-box">
            <div class="row">
              <span>Subtotal</span>
              <span>${formatCurrency(priceDetails.actual)}</span>
            </div>
            ${hasDiscount ? `
            <div class="row" style="color: #166534;">
              <span>Discount</span>
              <span>- ${formatCurrency(discountAmount)}</span>
            </div>` : ''}
            <div class="row grand-total">
              <span>Total</span>
              <span>${formatCurrency(priceDetails.sale)}</span>
            </div>
          </div>
        </div>

        ${amcSchedule && amcSchedule.length > 0 ? `
          <div class="amc-section">
            <div class="amc-header">AMC Service Schedule</div>
            <div class="table-container" style="border: none;">
              <table style="font-size: 12px;">
                <thead>
                  <tr>
                    <th style="background: #fff; border-bottom: 2px solid #e2e8f0;">Service</th>
                    <th style="background: #fff; border-bottom: 2px solid #e2e8f0;" class="text-right">Due Date</th>
                    <th style="background: #fff; border-bottom: 2px solid #e2e8f0;" class="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${amcRows}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <div class="thank-you">Thank You for Your Business!</div>
          <div class="footer-note">For service requests, please contact us at the number above.</div>
        </div>

      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (error) {
    console.log("Error generating PDF:", error);
  }
};