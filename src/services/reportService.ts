import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Ticket, TonerChange, User } from '../types';

export interface UserReportData {
  userName: string;
  ticketCount: number;
  tickets: Ticket[];
}

export interface HistoryReportData {
  changes: TonerChange[];
  startDate: Date;
  endDate: Date;
}

export class ReportService {
  private formatDate(date: Date): string {
    const utcDate = new Date(date.toISOString());
    return format(utcDate, 'dd/MM/yyyy HH:mm', { locale: es });
  }

  private formatDateShort(date: Date): string {
    const utcDate = new Date(date.toISOString());
    return format(utcDate, 'dd/MM/yyyy', { locale: es });
  }

  generateUserReportPDF(data: UserReportData[], startDate: Date, endDate: Date): void {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Reporte de Tickets por Usuario', 14, 22);

    doc.setFontSize(11);
    doc.text(`Período: ${this.formatDateShort(startDate)} - ${this.formatDateShort(endDate)}`, 14, 30);
    doc.text(`Fecha de generación: ${this.formatDate(new Date())}`, 14, 36);

    const tableData = data.map(user => [
      user.userName,
      user.ticketCount.toString()
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Usuario', 'Cantidad de Tickets']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 }
    });

    const totalTickets = data.reduce((sum, user) => sum + user.ticketCount, 0);
    const finalY = (doc as any).lastAutoTable.finalY || 45;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total de tickets: ${totalTickets}`, 14, finalY + 10);

    doc.save(`reporte_usuarios_${this.formatDateShort(startDate)}_${this.formatDateShort(endDate)}.pdf`);
  }

  generateUserReportExcel(data: UserReportData[], startDate: Date, endDate: Date): void {
    const worksheetData = [
      ['Reporte de Tickets por Usuario'],
      [`Período: ${this.formatDateShort(startDate)} - ${this.formatDateShort(endDate)}`],
      [`Fecha de generación: ${this.formatDate(new Date())}`],
      [],
      ['Usuario', 'Cantidad de Tickets']
    ];

    data.forEach(user => {
      worksheetData.push([user.userName, user.ticketCount]);
    });

    worksheetData.push([]);
    worksheetData.push(['Total de tickets:', data.reduce((sum, user) => sum + user.ticketCount, 0)]);

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 20 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte Usuarios');

    XLSX.writeFile(workbook, `reporte_usuarios_${this.formatDateShort(startDate)}_${this.formatDateShort(endDate)}.xlsx`);
  }

  generateHistoryReportPDF(data: HistoryReportData): void {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Reporte de Historial de Cambios', 14, 22);

    doc.setFontSize(11);
    doc.text(`Período: ${this.formatDateShort(data.startDate)} - ${this.formatDateShort(data.endDate)}`, 14, 30);
    doc.text(`Fecha de generación: ${this.formatDate(new Date())}`, 14, 36);

    const tableData = data.changes.map(change => [
      this.formatDate(new Date(change.changeDate)),
      change.printerSerial,
      change.tonerModel,
      change.motorCycle.toString(),
      change.responsible,
      change.operator,
      change.isBackup ? 'Sí' : 'No'
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Fecha', 'Serie', 'Modelo Toner', 'Motor Cycle', 'Responsable', 'Operador', 'Backup']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 },
        6: { cellWidth: 15 }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 45;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total de cambios: ${data.changes.length}`, 14, finalY + 10);

    doc.save(`reporte_historial_${this.formatDateShort(data.startDate)}_${this.formatDateShort(data.endDate)}.pdf`);
  }

  generateHistoryReportExcel(data: HistoryReportData): void {
    const worksheetData = [
      ['Reporte de Historial de Cambios'],
      [`Período: ${this.formatDateShort(data.startDate)} - ${this.formatDateShort(data.endDate)}`],
      [`Fecha de generación: ${this.formatDate(new Date())}`],
      [],
      ['Fecha', 'Serie', 'Modelo Toner', 'Motor Cycle', 'Responsable', 'Operador', 'Backup']
    ];

    data.changes.forEach(change => {
      worksheetData.push([
        this.formatDate(new Date(change.changeDate)),
        change.printerSerial,
        change.tonerModel,
        change.motorCycle,
        change.responsible,
        change.operator,
        change.isBackup ? 'Sí' : 'No'
      ]);
    });

    worksheetData.push([]);
    worksheetData.push(['Total de cambios:', data.changes.length]);

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 10 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial');

    XLSX.writeFile(workbook, `reporte_historial_${this.formatDateShort(data.startDate)}_${this.formatDateShort(data.endDate)}.xlsx`);
  }
}

export const reportService = new ReportService();
