import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Printer, TonerOrder, TonerChange, TonerInventory } from '../types';
import { calculateTonerPrediction } from './predictions';
import { getColorPrinterPrediction } from './colorPrinterUtils';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const exportToExcel = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToPDF = (data: any[], columns: string[], title: string, filename: string) => {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  
  const tableData = data.map(item => 
    columns.map(col => item[col] || '')
  );
  
  doc.autoTable({
    head: [columns],
    body: tableData,
    startY: 25,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175] }
  });
  
  doc.save(`${filename}.pdf`);
};

export const generatePrinterExportData = (printers: Printer[]) => {
  return printers.map(printer => {
    let prediction, currentLevel, nextChange, tonerCapacity, tonerModel;
    
    if (printer.type === 'color') {
      const colorPrediction = getColorPrinterPrediction(printer);
      prediction = colorPrediction;
      currentLevel = colorPrediction.averageLevel;
      nextChange = `${colorPrediction.criticalColor?.color}: ${colorPrediction.daysUntilChange} días`;
      tonerCapacity = printer.colorToners?.length > 0 
        ? Math.round(printer.colorToners.reduce((sum, t) => sum + t.capacity, 0) / printer.colorToners.length)
        : printer.tonerCapacity;
      tonerModel = 'MULTI-COLOR';
    } else {
      const monoPrediction = calculateTonerPrediction(printer);
      prediction = monoPrediction;
      currentLevel = monoPrediction.adjustedTonerLevel !== undefined ? 
        Math.round(monoPrediction.adjustedTonerLevel) : printer.currentTonerLevel;
      nextChange = `${prediction.daysUntilChange} días`;
      tonerCapacity = printer.tonerCapacity;
      tonerModel = printer.tonerModel || '';
    }
    
    return {
      'Tipo': printer.type === 'color' ? 'COLOR' : 'MONOCROMATICA',
      'Modelo': printer.model,
      'Ubicación': printer.location,
      'Sede': printer.sede || 'Por definir',
      'HostName - Server': printer.hostnameServer || 'Por definir',
      'IP Server': printer.ipServer || 'Por definir',
      'IP': printer.ip,
      'Serie': printer.serial,
      'Estado': printer.status,
      'Nivel de Toner (%)': currentLevel.toString(),
      'Próximo Cambio': nextChange,
      'Capacidad del Toner': tonerCapacity,
      'Uso Diario': printer.dailyUsage,
      'Ciclo de Motor': printer.motorCycle,
      'Hostname': printer.hostname || '',
      'Marca': printer.brand || '',
      'Modelo de Toner': tonerModel,
      'Comentario': printer.comment || ''
    };
  });
};

export const generateInventoryExportData = (inventory: TonerInventory[], printers: Printer[]) => {
  return inventory.map(item => {
    const printer = printers.find(p => p.id === item.printerId);
    return {
      'Impresora': printer?.location || 'No encontrada',
      'Modelo de Impresora': printer?.model || 'No encontrado',
      'Modelo de Toner': item.tonerModel,
      'Cantidad': item.quantity,
      'Descripción': item.description || '',
      'Última Actualización': item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('es-ES') : 'No disponible'
    };
  });
};

export const generateOrdersExportData = (orders: TonerOrder[], printers: Printer[]) => {
  return orders.map(order => {
    const printer = printers.find(p => p.id === order.printerId);
    return {
      'Fecha de Pedido': new Date(order.orderDate).toLocaleDateString('es-ES'),
      'Número de Envío': order.trackingNumber || 'No asignado',
      'Impresora': printer?.location || 'No encontrada',
      'Modelo de Impresora': printer?.model || 'No encontrado',
      'Serie de Impresora': printer?.serial || 'No disponible',
      'Modelo de Toner': order.tonerModel,
      'Cantidad': order.quantity,
      'Descripción': order.description || '',
      'Estado': order.status,
      'Motivo': order.reason || '',
      'Fecha de Llegada': order.arrivalDate ? new Date(order.arrivalDate).toLocaleDateString('es-ES') : 'Pendiente'
    };
  });
};

export const generateHistoryExportData = (history: TonerChange[], printers: Printer[]) => {
  return history.map(change => {
    const printer = printers.find(p => p.id === change.printerId);
    return {
      'Fecha de Cambio': new Date(change.changeDate).toLocaleDateString('es-ES'),
      'Serie': printer?.serial || change.printerSerial || 'No disponible',
      'IP': printer?.ip || change.printerIp || 'No disponible',
      'Modelo de Impresora': printer?.model || 'No encontrado',
      'Ubicación': printer?.location || 'No encontrada',
      'Modelo de Toner': change.tonerModel,
      'Ciclo de Motor': change.motorCycle,
      'Responsable': change.responsible,
      'Operador': change.operator,
      'Es Backup': change.isBackup ? 'Sí' : 'No',
      'Ciclo Motor Pendiente': change.motorCyclePending ? 'Sí' : 'No'
    };
  });
};

export const downloadPrinterTemplate = () => {
  const templateData = [
    {
      'Tipo': 'MONOCROMATICA',
      'Modelo': 'HP LaserJet Pro M404dn',
      'Ubicación': 'OFICINA PRINCIPAL',
      'Sede': 'SEDE CENTRAL',
      'HostName - Server': 'server-central-01',
      'IP Server': '192.168.1.10',
      'IP': '192.168.1.100',
      'Serie': 'HP001234',
      'Estado': 'Operativa',
      'Nivel de Toner (%)': '75',
      'Capacidad del Toner': '3000',
      'Uso Diario': '50',
      'Ciclo de Motor': '15000',
      'Hostname': 'printer-hp-001',
      'Marca': 'HP',
      'Modelo de Toner': 'W9004mc',
      'Comentario': 'Impresora principal de la oficina - Mantenimiento cada 6 meses'
    },
    {
      'Tipo': 'COLOR',
      'Modelo': 'HP Color LaserJet Pro M454dn',
      'Ubicación': 'OFICINA DISEÑO',
      'Sede': 'SEDE CENTRAL',
      'HostName - Server': 'server-central-01',
      'IP Server': '192.168.1.10',
      'IP': '192.168.1.101',
      'Serie': 'HP001235',
      'Estado': 'Operativa',
      'Nivel de Toner (%)': '80',
      'Capacidad del Toner': '2500',
      'Uso Diario': '75',
      'Ciclo de Motor': '8500',
      'Hostname': 'printer-color-001',
      'Marca': 'HP',
      'Modelo de Toner': 'MULTI-COLOR',
      'Comentario': 'Impresora a color para departamento de diseño'
    }
  ];
  
  exportToExcel(templateData, 'plantilla_impresoras');
};

export const parsePrinterExcel = (file: File): Promise<Printer[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const printers: Printer[] = jsonData.map((row: any, index: number) => ({
          id: `imported-${Date.now()}-${index}`,
          type: row['Tipo']?.toString().toUpperCase() === 'COLOR' ? 'color' : 'monocromatica',
          model: row['Modelo'] || '',
          location: row['Ubicación'] || '',
          sede: row['Sede'] || 'Por definir',
          hostnameServer: row['HostName - Server'] || 'Por definir',
          ipServer: row['IP Server'] || 'Por definir',
          ip: row['IP'] || '',
          serial: row['Serie'] || '',
          status: (row['Estado']?.toString().toLowerCase() || 'operativa') as any,
          currentTonerLevel: parseInt(row['Nivel de Toner (%)']) || 100,
          tonerCapacity: parseInt(row['Capacidad del Toner']) || 3000,
          dailyUsage: parseInt(row['Uso Diario']) || 50,
          motorCycle: parseInt(row['Ciclo de Motor']) || 0,
          hostname: (row['Hostname'] || '').toString().toUpperCase(),
          brand: (row['Marca'] || '').toString().toUpperCase(),
          tonerModel: row['Modelo de Toner'] || (row['Tipo']?.toString().toUpperCase() === 'COLOR' ? 'MULTI-COLOR' : 'W9004mc'),
          colorToners: row['Tipo']?.toString().toUpperCase() === 'COLOR' ? [] : undefined,
          comment: (row['Comentario'] || '').toString().toUpperCase(),
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        resolve(printers);
      } catch (error) {
        reject(new Error('Error al procesar el archivo Excel'));
      }
    };
    
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
};