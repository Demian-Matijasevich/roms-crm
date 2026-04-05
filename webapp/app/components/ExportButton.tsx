"use client";

interface Props {
  reportId: string;
  label?: string;
}

export default function ExportButton({ reportId, label = "Exportar PDF" }: Props) {
  function handleExport() {
    const reportEl = document.getElementById(reportId);
    if (!reportEl) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>7ROMS — Reporte</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', -apple-system, sans-serif; color: #111; background: white; padding: 40px; }
          h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
          h1 span { color: #7c3aed; }
          h2 { font-size: 16px; font-weight: 600; color: #7c3aed; margin-top: 24px; margin-bottom: 12px; border-bottom: 2px solid #7c3aed; padding-bottom: 4px; }
          h3 { font-size: 14px; font-weight: 600; margin-top: 16px; margin-bottom: 8px; }
          .subtitle { color: #666; font-size: 12px; margin-bottom: 24px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .kpi { border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px; text-align: center; }
          .kpi-label { font-size: 10px; color: #666; text-transform: uppercase; }
          .kpi-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
          .kpi-value.green { color: #16a34a; }
          .kpi-value.red { color: #dc2626; }
          .kpi-value.purple { color: #7c3aed; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
          th { text-align: left; padding: 8px; background: #f5f5f5; font-size: 10px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e5e5e5; }
          td { padding: 8px; border-bottom: 1px solid #e5e5e5; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 10px; border-top: 1px solid #e5e5e5; padding-top: 16px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1><span>7</span>ROMS</h1>
        <p class="subtitle">Reporte generado el ${new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}</p>
        ${reportEl.innerHTML}
        <div class="footer">7ROMS CRM — Reporte confidencial</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 text-xs text-muted hover:text-foreground border border-card-border hover:border-purple/50 px-3 py-1.5 rounded-lg transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {label}
    </button>
  );
}
