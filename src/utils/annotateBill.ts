// Draws the red circle onto the bill picture and saves it as a PNG the user can attach.
export function ellipseFromBox(box?: number[]) {
  const has = Boolean(box && box.length === 4);
  const [ymin, xmin, ymax, xmax] = has && box ? box : [455, 60, 510, 940];
  return {
    has,
    cx: (xmin + xmax) / 2,
    cy: (ymin + ymax) / 2,
    rx: Math.max(20, (xmax - xmin) / 2 + 12),
    ry: Math.max(16, (ymax - ymin) / 2 + 8),
  };
}

export async function downloadAnnotatedBill(imageUrl: string, box: number[] | undefined, fileName: string) {
  const img = new Image();
  img.src = imageUrl;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  const e = ellipseFromBox(box);
  if (e.has) {
    const sx = canvas.width / 1000;
    const sy = canvas.height / 1000;
    ctx.beginPath();
    ctx.ellipse(e.cx * sx, e.cy * sy, e.rx * sx, e.ry * sy, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(220, 38, 38, 0.10)';
    ctx.fill();
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = Math.max(4, Math.round(canvas.width / 200));
    ctx.stroke();
  }

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png')
  );
  const file = new File([blob], fileName, { type: 'image/png' });

  // Phones: share sheet lets people attach it straight to WhatsApp/email; fallback is a normal download
  const nav: any = navigator;
  if (nav.canShare && nav.canShare({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try {
      await nav.share({ files: [file], title: fileName });
      return;
    } catch (err: any) {
      if (err && err.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
