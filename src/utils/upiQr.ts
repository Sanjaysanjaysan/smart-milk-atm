import QRCode from 'qrcode';

export const DEFAULT_MERCHANT_UPI_ID = '9353944629@ibl';

/**
 * Generates the standardized NPCI UPI payment URI for Smart Milk ATM.
 * Format:
 * upi://pay?pa=9353944629@ibl&pn=Smart%20Milk%20ATM&am=AMOUNT&cu=INR&tn=Milk%20Purchase
 */
export function buildUpiPaymentUri(
  amountInr: number,
  upiId: string = DEFAULT_MERCHANT_UPI_ID
): string {
  const cleanUpi = (upiId || DEFAULT_MERCHANT_UPI_ID).trim();
  const formattedAmount = Number.isInteger(amountInr)
    ? String(amountInr)
    : Number(amountInr).toFixed(2);
  return `upi://pay?pa=${cleanUpi}&pn=Smart%20Milk%20ATM&am=${formattedAmount}&cu=INR&tn=Milk%20Purchase`;
}

export function formatMilkQuantityLabel(quantityMl: number): string {
  if (quantityMl === 1000) return '1 Litre (1000 ml)';
  return `${quantityMl} ml`;
}

export async function generateUpiQrDataUrl(upiUri: string): Promise<string> {
  return QRCode.toDataURL(upiUri, {
    width: 320,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}

export async function downloadUpiQrPng(params: {
  upiUri: string;
  upiId: string;
  quantityMl: number;
  amountInr: number;
  orderId?: string;
}): Promise<void> {
  const qrDataUrl = await generateUpiQrDataUrl(params.upiUri);

  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 530;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    // Fallback direct download of raw QR PNG
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `Smart-Milk-ATM-UPI-QR-${params.quantityMl}ml.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // White card background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header bar
  ctx.fillStyle = '#059669';
  ctx.fillRect(0, 0, canvas.width, 72);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SMART MILK ATM — UPI QR', canvas.width / 2, 34);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#d1fae5';
  ctx.fillText('Fresh Milk | Smart Payment | Zero Plastic Pouches', canvas.width / 2, 56);

  // Load QR image
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 50, 90, 320, 320);
      resolve();
    };
    img.onerror = () => reject(new Error('Failed to render QR code image'));
    img.src = qrDataUrl;
  });

  // Details footer
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(
    `${formatMilkQuantityLabel(params.quantityMl)}  •  ₹${params.amountInr}`,
    canvas.width / 2,
    438
  );

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`UPI ID: ${params.upiId}`, canvas.width / 2, 466);

  if (params.orderId) {
    ctx.fillStyle = '#64748b';
    ctx.font = '11px monospace';
    ctx.fillText(`Order: ${params.orderId}`, canvas.width / 2, 490);
  }

  ctx.fillStyle = '#b45309';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText(
    'Note: Scan/pay requires confirmation; demo uses SIMULATE PAYMENT.',
    canvas.width / 2,
    514
  );

  const finalUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = finalUrl;
  link.download = `Smart-Milk-ATM-UPI-QR-${params.quantityMl}ml.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
