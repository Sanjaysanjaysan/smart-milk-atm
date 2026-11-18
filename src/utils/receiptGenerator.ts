import { jsPDF } from 'jspdf';
import { Order } from '../types';

export interface ReceiptOptions {
  download?: boolean;
  print?: boolean;
  kioskAddress?: string;
}

/**
 * Generates a clean, professional vector PDF receipt/tax invoice for Smart Milk ATM orders.
 * Compatible with desktop and mobile browsers.
 */
export function generateReceiptPdf(
  order: Order,
  options: ReceiptOptions = { download: true }
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 16;
  const contentWidth = pageWidth - margin * 2; // 178mm

  const isDemo =
    order.isSimulatedPayment === true ||
    order.gatewayMode === 'DEMO_SIMULATION' ||
    !order.razorpayPaymentId ||
    order.razorpayPaymentId.startsWith('pay_sim_') ||
    order.razorpayPaymentId.startsWith('pay_Demo') ||
    order.razorpayPaymentId.startsWith('pay_test_') ||
    order.razorpayOrderId?.startsWith('order_sim_') ||
    order.razorpayOrderId?.startsWith('order_Demo') ||
    order.razorpayOrderId?.startsWith('order_test_');

  const isPaid = order.paymentStatus === 'PAID';

  // -------------------------------------------------------------
  // 1. TOP HEADER ACCENT STRIPE & BUSINESS BRANDING
  // -------------------------------------------------------------
  // Forest Green Header bar
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.rect(0, 0, pageWidth, 7, 'F');

  // Decorative Accent Bar
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 7, pageWidth, 1.5, 'F');

  let currentY = 18;

  // Vector Logo Icon: Rounded bottle with leaf & drop
  doc.setFillColor(5, 150, 105);
  doc.roundedRect(margin, currentY, 14, 16, 2.5, 2.5, 'F');
  // Bottle neck & cap
  doc.setFillColor(4, 120, 87);
  doc.roundedRect(margin + 4, currentY - 2.5, 6, 3, 0.8, 0.8, 'F');
  // Drop accent in white
  doc.setFillColor(255, 255, 255);
  doc.circle(margin + 7, currentY + 9, 2.2, 'F');
  doc.triangle(
    margin + 7, currentY + 5.5,
    margin + 5.2, currentY + 8.5,
    margin + 8.8, currentY + 8.5,
    'F'
  );

  // Brand Name & Tagline
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text('SMART MILK ATM', margin + 18, currentY + 6);

  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(
    'Fresh Milk | Smart Payment | Zero Plastic Pouches',
    margin + 18,
    currentY + 11.5
  );

  // Top Right: Tax Invoice / Receipt Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DIGITAL TAX INVOICE', pageWidth - margin, currentY + 5, { align: 'right' });

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Receipt #: ${order.orderId}`, pageWidth - margin, currentY + 10, { align: 'right' });
  doc.text(
    `Date: ${new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
    pageWidth - margin,
    currentY + 14.5,
    { align: 'right' }
  );

  currentY += 21;

  // -------------------------------------------------------------
  // 2. KIOSK CONTACT & LOCATION SUB-HEADER
  // -------------------------------------------------------------
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 4;
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  const kioskAddress =
    options.kioskAddress ||
    '80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034';
  doc.text(
    `Kiosk ID: ${order.machineId}  |  Address: ${kioskAddress}  |  Support: contact@smartmilkatm.in`,
    margin,
    currentY
  );

  currentY += 5;

  // -------------------------------------------------------------
  // 3. PAYMENT VERIFICATION & SECURITY STATUS BANNER
  // -------------------------------------------------------------
  if (isPaid) {
    if (isDemo) {
      // Demo / Simulated Payment Banner
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(245, 158, 11); // amber-500
      doc.roundedRect(margin, currentY, contentWidth, 10.5, 2, 2, 'FD');

      doc.setTextColor(146, 64, 14); // amber-800
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(
        'DEMO / SIMULATED PAYMENT — AUDIT RECORD (DEMO MODE)',
        margin + 4,
        currentY + 4.8
      );
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(
        'Simulated UPI payment for academic demonstration. Milk dispensing authorized via software emulator / ESP32 test client.',
        margin + 4,
        currentY + 8.5
      );
    } else {
      // Genuine Live Razorpay Verified Banner
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.setDrawColor(16, 185, 129); // emerald-500
      doc.roundedRect(margin, currentY, contentWidth, 10.5, 2, 2, 'FD');

      doc.setTextColor(6, 95, 70); // emerald-800
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(
        'OFFICIAL RECEIPT — PAYMENT VERIFIED & CAPTURED (PAID)',
        margin + 4,
        currentY + 4.8
      );
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(
        `Verified via Razorpay Cryptographic HMAC-SHA256 Gateway. Transaction ID: ${order.razorpayPaymentId}`,
        margin + 4,
        currentY + 8.5
      );
    }
  } else {
    // Unverified / Pending Banner
    doc.setFillColor(254, 226, 226); // red-100
    doc.setDrawColor(239, 68, 68); // red-500
    doc.roundedRect(margin, currentY, contentWidth, 10.5, 2, 2, 'FD');

    doc.setTextColor(153, 27, 27);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(
      `PAYMENT UNVERIFIED / ${order.paymentStatus} — PENDING RECEIPT`,
      margin + 4,
      currentY + 4.8
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      'This receipt is not an proof of payment until verified by the banking gateway. Milk pump will not trigger without authorization.',
      margin + 4,
      currentY + 8.5
    );
  }

  currentY += 15.5;

  // -------------------------------------------------------------
  // 4. TWO-COLUMN DETAILS: CUSTOMER DETAILS vs ORDER DETAILS
  // -------------------------------------------------------------
  const colWidth = (contentWidth - 6) / 2; // ~86mm
  const cardHeight = 35;

  // Left Card: Customer Details
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, colWidth, cardHeight, 2.5, 2.5, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CUSTOMER DETAILS', margin + 4, currentY + 5.5);

  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 4, currentY + 7.5, margin + colWidth - 4, currentY + 7.5);

  doc.setFontSize(8);
  // Full Name
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Name:', margin + 4, currentY + 13);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(order.customerName || 'Registered Customer', margin + 22, currentY + 13);

  // Email
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Email:', margin + 4, currentY + 18.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(order.customerEmail || 'customer@smartmilkatm.in', margin + 22, currentY + 18.5);

  // Customer ID / Account
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('User UID:', margin + 4, currentY + 24);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.text(order.customerId || 'guest-user', margin + 22, currentY + 24);

  // BYOC Status
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Container:', margin + 4, currentY + 29.5);
  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Clean BYOC Reusable Vessel (Waived Packaging)', margin + 22, currentY + 29.5);

  // Right Card: Order & Machine Details
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin + colWidth + 6, currentY, colWidth, cardHeight, 2.5, 2.5, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ORDER & KIOSK METRICS', margin + colWidth + 10, currentY + 5.5);

  doc.setDrawColor(226, 232, 240);
  doc.line(margin + colWidth + 10, currentY + 7.5, margin + contentWidth - 4, currentY + 7.5);

  doc.setFontSize(8);
  // Order ID
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Order ID:', margin + colWidth + 10, currentY + 13);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(order.orderId, margin + colWidth + 30, currentY + 13);

  // Machine ID
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Machine ID:', margin + colWidth + 10, currentY + 18.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(order.machineId, margin + colWidth + 30, currentY + 18.5);

  // Payment Status
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Payment:', margin + colWidth + 10, currentY + 24);
  doc.setTextColor(isPaid ? 5 : 220, isPaid ? 150 : 38, isPaid ? 105 : 38);
  doc.setFont('helvetica', 'bold');
  doc.text(order.paymentStatus, margin + colWidth + 30, currentY + 24);

  // Dispensing Status
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Dispense:', margin + colWidth + 10, currentY + 29.5);
  doc.setTextColor(order.dispensingStatus === 'COMPLETED' ? 5 : 30, order.dispensingStatus === 'COMPLETED' ? 150 : 64, order.dispensingStatus === 'COMPLETED' ? 105 : 175);
  doc.setFont('helvetica', 'bold');
  doc.text(order.dispensingStatus, margin + colWidth + 30, currentY + 29.5);

  currentY += cardHeight + 7;

  // -------------------------------------------------------------
  // 5. ITEMIZED TABLE OF PRODUCT & DISPENSING
  // -------------------------------------------------------------
  // Table Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, currentY, contentWidth, 8, 1.5, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ITEM DESCRIPTION', margin + 4, currentY + 5.2);
  doc.text('QUANTITY', margin + 92, currentY + 5.2);
  doc.text('RATE / L', margin + 125, currentY + 5.2);
  doc.text('TOTAL (INR)', pageWidth - margin - 4, currentY + 5.2, { align: 'right' });

  currentY += 8;

  // Row 1: Milk item
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, currentY, contentWidth, 12, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, currentY + 12, pageWidth - margin, currentY + 12);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Farm-Fresh Pasteurized Cow Milk', margin + 4, currentY + 5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Fat: 4.5% min  |  SNF: 8.5% min  |  SS304 Food-Grade Valve Nozzle', margin + 4, currentY + 9);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`${order.quantityMl} ml`, margin + 92, currentY + 6.5);

  const ratePerLiter = (order.amountInr / (order.quantityMl / 1000)).toFixed(2);
  doc.setFont('helvetica', 'normal');
  doc.text(`Rs. ${ratePerLiter}/L`, margin + 125, currentY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${order.amountInr}.00`, pageWidth - margin - 4, currentY + 6.5, { align: 'right' });

  currentY += 12;

  // Row 2: Plastic Pouch Fee Waived
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, contentWidth, 9.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, currentY + 9.5, pageWidth - margin, currentY + 9.5);

  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Single-Use Plastic Milk Pouch Fee (BYOC Discount)', margin + 4, currentY + 4.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Customer brought clean reusable vessel - 1 pouch prevented', margin + 4, currentY + 8);

  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('1 Vessel', margin + 92, currentY + 6);
  doc.text('Waived', margin + 125, currentY + 6);
  doc.text('Rs. 0.00', pageWidth - margin - 4, currentY + 6, { align: 'right' });

  currentY += 9.5;

  // -------------------------------------------------------------
  // 6. TOTAL AMOUNT & PAYMENT SUMMARY BOX
  // -------------------------------------------------------------
  const summaryBoxY = currentY + 3;
  const summaryBoxWidth = 80;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth;

  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.roundedRect(summaryBoxX, summaryBoxY, summaryBoxWidth, 22, 2, 2, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Subtotal:', summaryBoxX + 4, summaryBoxY + 5.5);
  doc.text(`Rs. ${order.amountInr}.00`, summaryBoxX + summaryBoxWidth - 4, summaryBoxY + 5.5, { align: 'right' });

  doc.text('Plastic Pouch Charge:', summaryBoxX + 4, summaryBoxY + 10.5);
  doc.setTextColor(5, 150, 105);
  doc.text('Rs. 0.00 (Free)', summaryBoxX + summaryBoxWidth - 4, summaryBoxY + 10.5, { align: 'right' });

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.3);
  doc.line(summaryBoxX + 4, summaryBoxY + 13, summaryBoxX + summaryBoxWidth - 4, summaryBoxY + 13);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Total Amount Paid:', summaryBoxX + 4, summaryBoxY + 18.5);
  doc.setTextColor(5, 150, 105);
  doc.text(`Rs. ${order.amountInr}.00`, summaryBoxX + summaryBoxWidth - 4, summaryBoxY + 18.5, { align: 'right' });

  // Left side: Cryptographic Transaction & Dispense Audit Details
  const auditX = margin;
  const auditWidth = contentWidth - summaryBoxWidth - 6;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(auditX, summaryBoxY, auditWidth, 22, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TRANSACTION AUDIT PROOF', auditX + 4, summaryBoxY + 5);

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Payment Gateway:', auditX + 4, summaryBoxY + 9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    isDemo ? 'Simulated UPI Gateway (Demo Mode)' : 'Razorpay UPI (Live Signature)',
    auditX + 30,
    summaryBoxY + 9.5
  );

  doc.setTextColor(100, 116, 139);
  doc.text('Transaction ID:', auditX + 4, summaryBoxY + 13.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(order.razorpayPaymentId || 'N/A (Payment Pending)', auditX + 30, summaryBoxY + 13.5);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Dispense Token:', auditX + 4, summaryBoxY + 18);
  doc.setTextColor(71, 85, 105);
  const tokenSnippet = order.dispensingToken
    ? order.dispensingToken.slice(0, 26) + '...'
    : 'DSP-AUTH-SECURE';
  doc.text(tokenSnippet, auditX + 30, summaryBoxY + 18);

  currentY = summaryBoxY + 28;

  // -------------------------------------------------------------
  // 7. ENVIRONMENTAL & SUSTAINABILITY DECLARATION (BYOC)
  // -------------------------------------------------------------
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, currentY, contentWidth, 25, 2.5, 2.5, 'FD');

  doc.setTextColor(6, 95, 70); // emerald-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(
    'Thank you for choosing Smart Milk ATM!',
    margin + 6,
    currentY + 6
  );

  doc.setTextColor(4, 120, 87); // emerald-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(
    'Say No to Plastic Milk Pouches — Bring Your Own Container.',
    margin + 6,
    currentY + 11.5
  );

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    'Every refill at our automated dairy kiosk prevents one non-biodegradable single-use polyethylene pouch from reaching landfills.',
    margin + 6,
    currentY + 16.5
  );
  doc.text(
    '*Environmental benefits depend on customers consistently bringing and reusing clean, food-grade containers.',
    margin + 6,
    currentY + 20.5
  );

  currentY += 31;

  // -------------------------------------------------------------
  // 8. LEGAL FOOTER & COMPUTER GENERATED NOTICE
  // -------------------------------------------------------------
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 4;
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(
    'This is a computer-generated digital tax invoice issued by the Smart Milk ATM IoT Fleet Management Engine. No physical signature required.',
    margin,
    currentY
  );
  doc.text(
    `Smart Milk ATM Pvt Ltd • GSTIN: 29AABCS1429B1Z8 • Reg Address: ${kioskAddress}`,
    margin,
    currentY + 3.8
  );

  // -------------------------------------------------------------
  // 9. AUTOMATIC DOWNLOAD OR PRINT ACTION
  // -------------------------------------------------------------
  const filename = `SmartMilkATM_Receipt_${order.orderId}.pdf`;

  if (options.download) {
    doc.save(filename);
  }

  if (options.print) {
    try {
      const blobUrl = doc.output('bloburl');
      const printWindow = window.open(blobUrl as unknown as string, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    } catch {
      // Fallback: autoPrint or save
      doc.autoPrint();
      doc.save(filename);
    }
  }

  return doc;
}

/**
 * Convenience helper to download the PDF receipt directly.
 */
export function downloadReceiptPdf(order: Order, kioskAddress?: string): void {
  generateReceiptPdf(order, { download: true, print: false, kioskAddress });
}

/**
 * Convenience helper to open and print the PDF receipt.
 */
export function printReceiptPdf(order: Order, kioskAddress?: string): void {
  generateReceiptPdf(order, { download: false, print: true, kioskAddress });
}
