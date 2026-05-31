// gst-invoice.js — VibeStore GST Invoice Generator
// Generates legally compliant GST invoices as downloadable PDFs
// Uses jsPDF loaded via CDN

const GST_CONFIG = {
  platform: {
    name: 'VibeStore Marketplace Pvt Ltd',
    gstin: '09AABCV1234F1ZX',
    address: '4th Floor, Tech Park, Sector 62, Noida, UP 201301',
    pan: 'AABCV1234F',
    email: 'gst@vibestore.in',
    phone: '+91 1800 123 4567',
    state: 'Uttar Pradesh',
    stateCode: '09'
  },
  // HSN codes by category
  hsnCodes: {
    Electronics: '8518', Fashion: '6211', Home: '9403',
    Grocery: '2106', Books: '4901', Sports: '9506',
    Beauty: '3304', Handmade: '6307', Other: '9999'
  },
  // GST rates by category
  gstRates: {
    Electronics: 18, Fashion: 12, Home: 18, Grocery: 5,
    Books: 0, Sports: 12, Beauty: 18, Handmade: 5, Other: 18
  }
};

let _invoiceCounter = parseInt(localStorage.getItem('vs_invoice_counter') || '1000');

function vsGenerateInvoiceNumber() {
  _invoiceCounter++;
  localStorage.setItem('vs_invoice_counter', String(_invoiceCounter));
  const yr = new Date().getFullYear().toString().slice(2);
  const mo = String(new Date().getMonth() + 1).padStart(2, '0');
  return `VS/${yr}-${parseInt(yr)+1}/${mo}/${_invoiceCounter}`;
}

function vsGetGSTBreakdown(amount, category, buyerState) {
  const rate = GST_CONFIG.gstRates[category] || 18;
  const baseAmount = Math.round(amount / (1 + rate / 100) * 100) / 100;
  const totalGST = Math.round((amount - baseAmount) * 100) / 100;

  // Inter-state = IGST. Intra-state (UP) = CGST + SGST
  const isInterstate = buyerState && buyerState !== GST_CONFIG.platform.stateCode;

  if (isInterstate) {
    return { baseAmount, igst: totalGST, cgst: 0, sgst: 0, totalGST, rate, isInterstate: true };
  } else {
    return { baseAmount, igst: 0, cgst: totalGST/2, sgst: totalGST/2, totalGST, rate, isInterstate: false };
  }
}

async function vsGenerateGSTInvoice(orderData) {
  // orderData: { orderId, items:[{name,category,price,qty,sellerName,sellerGSTIN}], buyer:{name,email,address,city,state,stateCode,pincode}, total }

  // Load jsPDF if not already loaded
  if (typeof window.jspdf === 'undefined') {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const invoiceNo = vsGenerateInvoiceNumber();
  const invoiceDate = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' });
  const buyer = orderData.buyer || {};
  const items = orderData.items || [];

  // ── COLORS ──
  const orange = [255, 153, 0];
  const dark = [15, 17, 17];
  const gray = [100, 100, 100];
  const lightGray = [240, 242, 245];
  const white = [255, 255, 255];
  const green = [6, 125, 98];

  // ── HEADER BACKGROUND ──
  doc.setFillColor(...dark);
  doc.rect(0, 0, 210, 40, 'F');

  // ── LOGO ──
  doc.setTextColor(...orange);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('⚡ VibeStore', 14, 16);

  doc.setTextColor(...white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Marketplace Pvt Ltd', 14, 22);
  doc.text(GST_CONFIG.platform.address, 14, 27);
  doc.text(`GSTIN: ${GST_CONFIG.platform.gstin}  |  PAN: ${GST_CONFIG.platform.pan}`, 14, 32);

  // ── TAX INVOICE LABEL ──
  doc.setFillColor(...orange);
  doc.rect(140, 5, 56, 12, 'F');
  doc.setTextColor(...dark);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', 168, 13, { align: 'center' });

  // ── INVOICE DETAILS BOX ──
  doc.setFillColor(...lightGray);
  doc.rect(140, 19, 56, 18, 'F');
  doc.setTextColor(...dark);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice No: ${invoiceNo}`, 143, 25);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${invoiceDate}`, 143, 30);
  doc.text(`Order: ${orderData.orderId || 'VS-' + Date.now()}`, 143, 35);

  // ── BILL TO / SELLER SECTIONS ──
  let y = 48;

  // Bill To
  doc.setFillColor(...lightGray);
  doc.rect(14, y, 85, 5, 'F');
  doc.setTextColor(...dark);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 16, y + 3.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(buyer.name || 'Customer', 14, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...gray);
  doc.text(buyer.address || '', 14, y + 15, { maxWidth: 83 });
  doc.text(`${buyer.city || ''}, ${buyer.state || ''} - ${buyer.pincode || ''}`, 14, y + 22);
  doc.text(`Email: ${buyer.email || ''}`, 14, y + 27);

  // Sold By
  doc.setFillColor(...lightGray);
  doc.rect(111, y, 85, 5, 'F');
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SOLD BY', 113, y + 3.5);

  const sellerName = items[0]?.sellerName || 'VibeStore Seller';
  const sellerGSTIN = items[0]?.sellerGSTIN || 'Pending Verification';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(sellerName, 111, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...gray);
  doc.text(`GSTIN: ${sellerGSTIN}`, 111, y + 15);
  doc.text('Fulfilled by: VibeStore Marketplace', 111, y + 20);

  // ── ITEMS TABLE ──
  y += 36;

  // Table header
  doc.setFillColor(...dark);
  doc.rect(14, y, 182, 7, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('#', 16, y + 4.5);
  doc.text('Product Description', 22, y + 4.5);
  doc.text('HSN', 100, y + 4.5);
  doc.text('Qty', 115, y + 4.5);
  doc.text('Rate', 125, y + 4.5);
  doc.text('Taxable', 140, y + 4.5);
  doc.text('GST%', 158, y + 4.5);
  doc.text('GST Amt', 168, y + 4.5);
  doc.text('Total', 185, y + 4.5);

  y += 7;

  let subtotal = 0, totalGSTAmt = 0;

  items.forEach((item, idx) => {
    const gst = vsGetGSTBreakdown(item.price * item.qty, item.category, buyer.stateCode);
    subtotal += gst.baseAmount;
    totalGSTAmt += gst.totalGST;

    const rowBg = idx % 2 === 0 ? white : lightGray;
    doc.setFillColor(...rowBg);
    doc.rect(14, y, 182, 8, 'F');

    doc.setTextColor(...dark);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(String(idx + 1), 16, y + 5);
    doc.text((item.name || 'Product').slice(0, 35), 22, y + 5);
    doc.setTextColor(...gray);
    doc.setFontSize(6.5);
    doc.text(item.category || '', 22, y + 8.5);
    doc.setTextColor(...dark);
    doc.setFontSize(7.5);
    doc.text(GST_CONFIG.hsnCodes[item.category] || '9999', 100, y + 5);
    doc.text(String(item.qty || 1), 115, y + 5);
    doc.text(`₹${gst.baseAmount.toFixed(2)}`, 125, y + 5);
    doc.text(`₹${gst.baseAmount.toFixed(2)}`, 140, y + 5);
    doc.text(`${gst.rate}%`, 158, y + 5);
    doc.text(`₹${gst.totalGST.toFixed(2)}`, 168, y + 5);
    doc.text(`₹${(item.price * item.qty).toFixed(2)}`, 185, y + 5);
    y += 10;
  });

  // Table border
  doc.setDrawColor(...dark);
  doc.setLineWidth(0.3);
  doc.rect(14, y - items.length * 10 - 7, 182, items.length * 10 + 7);

  // ── TOTALS ──
  y += 4;

  const gstBreakdown = vsGetGSTBreakdown(orderData.total || 0, items[0]?.category || 'Other', buyer.stateCode);

  const drawTotalRow = (label, value, bold, highlight) => {
    if (highlight) {
      doc.setFillColor(...dark);
      doc.rect(120, y - 1, 76, 7, 'F');
      doc.setTextColor(...white);
    } else {
      doc.setTextColor(...dark);
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, 122, y + 4);
    doc.text(value, 193, y + 4, { align: 'right' });
    y += 7;
  };

  drawTotalRow('Taxable Amount:', `₹${subtotal.toFixed(2)}`);
  if (gstBreakdown.isInterstate) {
    drawTotalRow(`IGST (${gstBreakdown.rate}%):`, `₹${totalGSTAmt.toFixed(2)}`);
  } else {
    drawTotalRow(`CGST (${gstBreakdown.rate/2}%):`, `₹${(totalGSTAmt/2).toFixed(2)}`);
    drawTotalRow(`SGST (${gstBreakdown.rate/2}%):`, `₹${(totalGSTAmt/2).toFixed(2)}`);
  }
  drawTotalRow(`GRAND TOTAL:`, `₹${(orderData.total || 0).toLocaleString('en-IN')}`, true, true);

  // Amount in words
  y += 4;
  doc.setTextColor(...gray);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.text(`Amount in words: ${numberToWords(Math.round(orderData.total || 0))} Rupees Only`, 14, y);

  // ── FOOTER ──
  y += 10;
  doc.setFillColor(...lightGray);
  doc.rect(14, y, 182, 0.5, 'F');
  y += 6;

  doc.setTextColor(...gray);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('This is a computer generated invoice and does not require a physical signature.', 14, y);
  doc.text(`For support: ${GST_CONFIG.platform.email}  |  ${GST_CONFIG.platform.phone}`, 14, y + 5);

  doc.setTextColor(...green);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for shopping with VibeStore!', 105, y + 12, { align: 'center' });

  // ── SAVE ──
  const filename = `VibeStore_Invoice_${invoiceNo.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
  return invoiceNo;
}

// Simple number to words
function numberToWords(n) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (n === 0) return 'Zero';
  if (n < 0) return 'Minus ' + numberToWords(-n);
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
  if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + numberToWords(n%100) : '');
  if (n < 100000) return numberToWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + numberToWords(n%1000) : '');
  if (n < 10000000) return numberToWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + numberToWords(n%100000) : '');
  return numberToWords(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + numberToWords(n%10000000) : '');
}
