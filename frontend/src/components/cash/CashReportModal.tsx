import { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { X, Printer, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface CashReportModalProps {
    sessionId: string;
    onClose: () => void;
}

export default function CashReportModal({ sessionId, onClose }: CashReportModalProps) {
    const [sessionData, setSessionData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSessionDetails = async () => {
            try {
                const { data } = await api.get(`/cash/sessions/${sessionId}`);
                if (data.success) {
                    setSessionData(data.data);
                }
            } catch (error) {
                alert("Error cargando los detalles del corte.");
            } finally {
                setLoading(false);
            }
        };
        fetchSessionDetails();
    }, [sessionId]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!sessionData) return null;

    // Calcular desglose avanzado para el reporte interactivo
    const transactions = sessionData.transactions || [];

    // CASH vs TARJETA inference (We tag them in payment descriptions in POS)
    const txSales = transactions.filter((t: any) => t.type === 'SALE');
    const totalSales = txSales.reduce((acc: number, t: any) => acc + Number(t.amount), 0);

    const cardSales = txSales.filter((t: any) => t.description.includes('CARD')).reduce((acc: number, t: any) => acc + Number(t.amount), 0);
    const transferSales = txSales.filter((t: any) => t.description.includes('TRANSFER')).reduce((acc: number, t: any) => acc + Number(t.amount), 0);
    const cashSales = totalSales - cardSales - transferSales; // El resto asumimos efectivo

    const totalIncomes = transactions.filter((t: any) => t.type === 'INCOME').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
    const totalExpenses = transactions.filter((t: any) => t.type === 'EXPENSE').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
    const totalRefunds = transactions.filter((t: any) => t.type === 'REFUND').reduce((acc: number, t: any) => acc + Number(t.amount), 0);

    const isClosed = sessionData.status === 'CLOSED';
    const reportTitle = isClosed ? 'CORTE Z (Cierre de Turno)' : 'CORTE X (Lectura Parcial)';

    const exportPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(reportTitle, 14, 20);

        doc.setFontSize(10);
        doc.text(`Cajero: ${sessionData.user.fullName}`, 14, 30);
        doc.text(`Sucursal: ${sessionData.register.branch.name}`, 14, 35);
        doc.text(`Terminal: ${sessionData.register.name}`, 14, 40);
        doc.text(`Apertura: ${new Date(sessionData.openedAt).toLocaleString()}`, 100, 30);
        if (isClosed) doc.text(`Cierre: ${new Date(sessionData.closedAt).toLocaleString()}`, 100, 35);

        // Overview Summary table
        autoTable(doc, {
            startY: 45,
            head: [['Concepto', 'Monto ($)']],
            body: [
                ['Fondo de Apertura (Efectivo)', Number(sessionData.openingBalance).toFixed(2)],
                ['Ventas Efectivo', cashSales.toFixed(2)],
                ['Ventas Tarjeta', cardSales.toFixed(2)],
                ['Ventas Transferencia', transferSales.toFixed(2)],
                ['Ingresos Manuales', totalIncomes.toFixed(2)],
                ['Retiros / Pagos (Egresos)', `-${totalExpenses.toFixed(2)}`],
                ['Anulaciones de Venta', `-${totalRefunds.toFixed(2)}`],
                ['----------------------------------', '--------'],
                ['Total Calculado (Sistema)', Number(sessionData.expectedBalance || (Number(sessionData.openingBalance) + cashSales + totalIncomes - totalExpenses - totalRefunds)).toFixed(2)],
            ],
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
        });

        if (isClosed) {
            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(12);
            doc.text(`Total Declarado por Cajero: $${Number(sessionData.closingBalance).toFixed(2)}`, 14, finalY);

            const diff = Number(sessionData.discrepancy);
            if (diff >= 0) {
                doc.setTextColor(0, 128, 0); 
                doc.text(`Cierre Cuadrado Exactamente (Sin Faltantes)`, 14, finalY + 7);
            } else {
                doc.setTextColor(255, 0, 0); 
                doc.text(`Diferencia Faltante: ${diff.toFixed(2)}`, 14, finalY + 7);
            }
            doc.setTextColor(0, 0, 0); // reset
        }

        // Transactions Table
        const finalYHeader = isClosed ? (doc as any).lastAutoTable.finalY + 25 : (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text('Detalle de Movimientos', 14, finalYHeader);

        const txBody = transactions.map((t: any) => [
            new Date(t.date).toLocaleTimeString(),
            t.type,
            t.description || '-',
            t.reference || '-',
            `$${Number(t.amount).toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: finalYHeader + 5,
            head: [['Hora', 'Tipo', 'Descripción', 'Referencia', 'Monto']],
            body: txBody,
            theme: 'striped',
            headStyles: { fillColor: [100, 100, 100] },
        });

        doc.save(`Reporte_Caja_${sessionData.id.substring(0, 8)}.pdf`);
    };

    const exportExcel = () => {
        // Build rows for the summary
        const summaryData = [
            ['Concepto', 'Monto'],
            ['Fondo de Apertura (Efectivo)', Number(sessionData.openingBalance)],
            ['Ventas Totales', totalSales],
            ['Ventas en Efectivo', cashSales],
            ['Ventas con Tarjeta', cardSales],
            ['Ventas con Transf.', transferSales],
            ['Ingresos Manueles', totalIncomes],
            ['Retiros Generales', totalExpenses],
            ['Devoluciones', totalRefunds],
            ['Total Esperado en Sistema', Number(sessionData.expectedBalance || (Number(sessionData.openingBalance) + cashSales + totalIncomes - totalExpenses - totalRefunds))],
        ];

        if (isClosed) {
            summaryData.push(['Total Declarado Contado', Number(sessionData.closingBalance)]);
            summaryData.push(['Descuadre Calculado', Number(sessionData.discrepancy)]);
        }

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

        // Build rows for transactions
        const txData = transactions.map((t: any) => ({
            Fecha: new Date(t.date).toLocaleString(),
            Tipo: t.type,
            Monto: Number(t.amount),
            Descripción: t.description,
            Referencia: t.reference
        }));
        const wsTx = XLSX.utils.json_to_sheet(txData);

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");
        XLSX.utils.book_append_sheet(wb, wsTx, "Transacciones");

        XLSX.writeFile(wb, `Reporte_Caja_${sessionData.id.substring(0, 8)}.xlsx`);
    };

    const generatePrintable = () => {
        // Generic browser print action.
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:fixed print:inset-0 print:flex-col print:overflow-hidden print:w-full">
            <div className="w-full max-w-2xl bg-card border rounded-xl shadow-2xl flex flex-col h-full max-h-[90vh] animate-in zoom-in-95 duration-200 print:shadow-none print:border-none print:max-w-full print:h-auto print:max-h-none">

                {/* Header (No print action buttons in PDF) */}
                <div className="p-4 border-b flex justify-between items-center bg-muted/40 print:hidden">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {reportTitle} <span className="text-muted-foreground text-sm font-mono font-normal">#{sessionData.id.substring(0, 8).toUpperCase()}</span>
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={generatePrintable} className="p-2 border rounded-md hover:bg-muted font-medium text-sm flex items-center gap-2" title="Imprimir Recibo">
                            <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Imprimir (Ticket)</span>
                        </button>
                        <button onClick={exportPDF} className="p-2 border rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium text-sm flex items-center gap-2" title="Descargar PDF">
                            <Download className="h-4 w-4" /> <span className="hidden sm:inline">PDF</span>
                        </button>
                        <button onClick={exportExcel} className="p-2 border rounded-md bg-[#217346] text-white hover:bg-[#1e6b41] font-medium text-sm flex items-center gap-2" title="Descargar Excel">
                            <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">Excel</span>
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded text-muted-foreground ml-2 border border-transparent hover:border-border"><X className="h-5 w-5" /></button>
                    </div>
                </div>

                {/* Report Content */}
                <div className="flex-1 overflow-auto p-6 bg-white text-black print:overflow-visible print:p-0 print:flex-none" id="printable-report">
                    <div className="text-center mb-6 border-b border-gray-200 pb-4">
                        <h1 className="text-2xl font-black uppercase tracking-widest">{reportTitle}</h1>
                        <p className="text-sm text-gray-500 font-mono mt-1">Terminal: {sessionData.register.name} | Sede: {sessionData.register.branch.name}</p>
                        <p className="text-sm font-semibold mt-1">Cajero/a: {sessionData.user.fullName}</p>
                        <div className="flex justify-center gap-8 mt-3 text-xs text-gray-500">
                            <div><strong>APERTURA:</strong> {new Date(sessionData.openedAt).toLocaleString()}</div>
                            {isClosed && <div><strong>CIERRE:</strong> {new Date(sessionData.closedAt).toLocaleString()}</div>}
                        </div>
                    </div>

                    <div className="max-w-md mx-auto space-y-2 mb-8 text-sm">
                        <div className="flex justify-between border-b border-gray-100 py-1"><span>Fondo Inicial Mínimo (Efectivo):</span> <span className="font-mono">${Number(sessionData.openingBalance).toFixed(2)}</span></div>

                        <div className="py-2">
                            <div className="flex justify-between font-bold"><span>+ Venta Total General:</span> <span className="font-mono">${totalSales.toFixed(2)}</span></div>
                            <div className="flex justify-between pl-4 text-xs text-gray-600"><span>Ventas Efectivo:</span> <span className="font-mono">${cashSales.toFixed(2)}</span></div>
                            <div className="flex justify-between pl-4 text-xs text-gray-600"><span>Ventas Tarjeta:</span> <span className="font-mono">${cardSales.toFixed(2)}</span></div>
                            <div className="flex justify-between pl-4 text-xs text-gray-600"><span>Ventas Transf.:</span> <span className="font-mono">${transferSales.toFixed(2)}</span></div>
                        </div>

                        <div className="flex justify-between border-b border-gray-100 py-1 text-emerald-700"><span>+ Otros Ingresos / Aportes:</span> <span className="font-mono"> ${totalIncomes.toFixed(2)}</span></div>
                        <div className="flex justify-between border-b border-gray-100 py-1 text-red-700"><span>- Pagos Extraídos / Compras:</span> <span className="font-mono">-${totalExpenses.toFixed(2)}</span></div>
                        <div className="flex justify-between border-b border-gray-300 py-1 pb-2 text-red-700"><span>- Devoluciones por Anulación:</span> <span className="font-mono">-${totalRefunds.toFixed(2)}</span></div>

                        <div className="flex justify-between font-black text-lg pt-2">
                            <span>= TOTAL CALCULADO SISTEMA (Efectivo Esperado):</span>
                            <span className="font-mono">
                                ${Number(sessionData.expectedBalance || (Number(sessionData.openingBalance) + cashSales + totalIncomes - totalExpenses - totalRefunds)).toFixed(2)}
                            </span>
                        </div>

                        {isClosed && (
                            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="flex justify-between font-bold"><span>Total Reportado por Cajero en Gaveta:</span> <span className="font-mono">${Number(sessionData.closingBalance).toFixed(2)}</span></div>
                                <div className={`flex justify-between font-bold mt-1 text-lg ${Number(sessionData.discrepancy) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    <span>{Number(sessionData.discrepancy) >= 0 ? 'TURNO CERRADO CORRECTAMENTE (SIN FALTANTES)' : 'DIFERENCIA (FALTANTE):'}</span>
                                    <span className="font-mono">{Number(sessionData.discrepancy) >= 0 ? '' : `$${Number(sessionData.discrepancy).toFixed(2)}`}</span>
                                </div>
                                {sessionData.notes && (
                                    <div className="mt-2 text-xs italic text-gray-600 border-t pt-2">Notas guardadas: {sessionData.notes}</div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mb-4">
                        <h3 className="font-bold text-sm uppercase tracking-wider mb-3 text-gray-500">Bitácora de Transacciones</h3>
                        <table className="w-full text-xs text-left">
                            <thead className="bg-gray-100 uppercase tracking-wider text-[10px] text-gray-600">
                                <tr>
                                    <th className="p-2">Hora</th>
                                    <th className="p-2">Tipo</th>
                                    <th className="p-2">Descripción</th>
                                    <th className="p-2">Referencia</th>
                                    <th className="p-2 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transactions.map((t: any) => (
                                    <tr key={t.id}>
                                        <td className="p-2 font-mono whitespace-nowrap">{new Date(t.date).toLocaleTimeString()}</td>
                                        <td className="p-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${t.type === 'SALE' ? 'bg-blue-100 text-blue-700' : t.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="p-2">{t.description || '-'}</td>
                                        <td className="p-2 font-mono">{t.reference || '-'}</td>
                                        <td className="p-2 text-right font-mono font-bold">${Number(t.amount).toFixed(2)}</td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && (
                                    <tr><td colSpan={5} className="text-center p-4 text-gray-400">Sin movimientos registrados</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-center text-xs text-gray-400 mt-12 pb-4">
                        Reporte Generado Automáticamente por Sistema POS Avanzado.<br />
                        Validez Operativa Interna.
                    </p>
                </div>

            </div>
            {/* For print styling to be hidden normally */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-report, #printable-report * { visibility: visible; }
                    #printable-report { position: absolute; left: 0; top: 0; width: 100%; }
                }
            `}</style>
        </div>
    );
}
