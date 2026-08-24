/* ============================================================
   Certificate renderer — draws a participation certificate onto
   a <canvas> and offers it as a downloadable PNG. No external
   dependency (no PDF library), so it works fully offline.
   ============================================================ */

function drawCertificate(canvas, cert) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  // Background
  ctx.fillStyle = "#f6f5f1";
  ctx.fillRect(0, 0, W, H);

  // Outer border
  ctx.strokeStyle = "#17233f";
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  // Inner gold rule
  ctx.strokeStyle = "#c79a3f";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  const centerX = W / 2;

  // University name
  ctx.textAlign = "center";
  ctx.fillStyle = "#17233f";
  ctx.font = "600 22px Georgia, serif";
  ctx.fillText("SHAHEED ZULFIKAR ALI BHUTTO INSTITUTE OF SCIENCE & TECHNOLOGY", centerX, 100);
  ctx.font = "13px Arial";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("Computer Science Department", centerX, 124);

  // Title
  ctx.font = "700 40px Georgia, serif";
  ctx.fillStyle = "#c79a3f";
  ctx.fillText("Certificate of Participation", centerX, 195);

  // Body
  ctx.font = "16px Arial";
  ctx.fillStyle = "#3d4451";
  ctx.fillText("This certificate is proudly presented to", centerX, 240);

  ctx.font = "italic 700 34px Georgia, serif";
  ctx.fillStyle = "#17233f";
  ctx.fillText(cert.student.name, centerX, 290);

  ctx.font = "16px Arial";
  ctx.fillStyle = "#3d4451";
  ctx.fillText("for participating in", centerX, 328);

  ctx.font = "700 24px Georgia, serif";
  ctx.fillStyle = "#17233f";
  ctx.fillText(`"${cert.event.title}"`, centerX, 364);

  ctx.font = "15px Arial";
  ctx.fillStyle = "#3d4451";
  ctx.fillText(`held on ${formatDate(cert.event.date)} at ${cert.event.venue}`, centerX, 392);

  // Footer details
  ctx.textAlign = "left";
  ctx.font = "12.5px 'Courier New', monospace";
  ctx.fillStyle = "#6b7280";
  ctx.fillText(`Certificate No: ${cert.certificateNumber}`, 70, H - 70);
  ctx.fillText(`Issue Date: ${formatDate(cert.issueDate)}`, 70, H - 50);

  ctx.textAlign = "right";
  ctx.font = "italic 14px Georgia, serif";
  ctx.fillStyle = "#17233f";
  ctx.fillText("Office of Student Affairs", W - 70, H - 60);
  ctx.strokeStyle = "#3d4451";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W - 220, H - 80);
  ctx.lineTo(W - 70, H - 80);
  ctx.stroke();
}

function downloadCertificatePng(cert) {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 620;
  drawCertificate(canvas, cert);
  const link = document.createElement("a");
  link.download = `${cert.certificateNumber}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
