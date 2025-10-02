import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Copy, Download, ChevronDown, Trash2, Users, Package, GripVertical } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Printer, User } from '../types';
import { calculateTonerPrediction, updatePrinterTonerLevel } from '../utils/predictions';
import { getColorPrinterPrediction, COLOR_OPTIONS, calculateColorTonerPrediction } from '../utils/colorPrinterUtils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import PrinterSelectionForReportModal from './modals/PrinterSelectionForReportModal';
import UserManagementModal from './modals/UserManagementModal';
import { supabaseService } from '../services/supabaseService';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ReportPrinter extends Printer {
  reportUsers?: User[];
  reportBackupToner?: string;
}

export default function DailyReportContainer() {
  const { printers, users } = useStore();
  const [selectedPrinters, setSelectedPrinters] = useState<ReportPrinter[]>([]);
  const [showPrinterSelection, setShowPrinterSelection] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedPrinterIndex, setSelectedPrinterIndex] = useState<number | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // Función para actualizar automáticamente los niveles de toner de las impresoras seleccionadas
  const updateSelectedPrintersLevels = async () => {
    if (selectedPrinters.length === 0) return;

    let hasUpdates = false;
    const updatedPrinters = selectedPrinters.map(reportPrinter => {
      // Buscar la impresora actual en el store principal
      const currentPrinter = printers.find(p => p.id === reportPrinter.id);
      if (!currentPrinter) return reportPrinter;

      // Aplicar actualización automática de nivel de toner
      const updatedPrinter = updatePrinterTonerLevel(currentPrinter);
      
      // Verificar si hubo cambios significativos
      const levelChanged = Math.abs(currentPrinter.currentTonerLevel - updatedPrinter.currentTonerLevel) > 0.1;
      
      if (levelChanged) {
        hasUpdates = true;
        // Guardar en la base de datos si hubo cambios
        supabaseService.update('printers', updatedPrinter).catch(console.error);
      }

      // Mantener los datos específicos del reporte pero actualizar los datos de la impresora
      return {
        ...updatedPrinter,
        reportUsers: reportPrinter.reportUsers,
        reportBackupToner: reportPrinter.reportBackupToner
      };
    });

    if (hasUpdates) {
      setSelectedPrinters(updatedPrinters);
    }
  };

  // Ejecutar actualización automática cada 5 minutos
  useEffect(() => {
    const interval = setInterval(updateSelectedPrintersLevels, 300000); // 5 minutos
    
    // También ejecutar al cargar el componente
    updateSelectedPrintersLevels();
    
    return () => clearInterval(interval);
  }, [selectedPrinters.length, printers]);

  // Load persisted data on component mount
  useEffect(() => {
    const savedPrinters = localStorage.getItem('dailyReportPrinters');
    if (savedPrinters) {
      try {
        const parsedPrinters = JSON.parse(savedPrinters);
        // Validate that the parsed data is an array
        if (Array.isArray(parsedPrinters)) {
          setSelectedPrinters(parsedPrinters);
        }
      } catch (error) {
        console.error('Error loading saved printers:', error);
        // Clear invalid data
        localStorage.removeItem('dailyReportPrinters');
      }
    }
  }, []);

  // Save to localStorage whenever selectedPrinters changes
  useEffect(() => {
    if (selectedPrinters.length > 0) {
      localStorage.setItem('dailyReportPrinters', JSON.stringify(selectedPrinters));
    } else {
      localStorage.removeItem('dailyReportPrinters');
    }
  }, [selectedPrinters]);

  const handleAddPrinters = () => {
    setShowPrinterSelection(true);
  };

  const handlePrintersSelected = (newPrinters: Printer[]) => {
    // Replace with the new selection from the modal
    // This ensures that removed printers are properly excluded
    const updatedPrinters: ReportPrinter[] = [];
    
    // Add existing printers that are still in the new selection
    selectedPrinters.forEach(existingPrinter => {
      const stillSelected = newPrinters.find(p => p.id === existingPrinter.id);
      if (stillSelected) {
        // Keep the existing printer with its report data but update printer info
        const updatedPrinter = updatePrinterTonerLevel(stillSelected);
        updatedPrinters.push({
          ...updatedPrinter,
          reportUsers: existingPrinter.reportUsers,
          reportBackupToner: existingPrinter.reportBackupToner
        });
      }
    });
    
    // Add new printers that weren't previously selected
    newPrinters.forEach(newPrinter => {
      const exists = updatedPrinters.find(p => p.id === newPrinter.id);
      if (!exists) {
        const updatedPrinter = updatePrinterTonerLevel(newPrinter);
        updatedPrinters.push({
          ...updatedPrinter,
          reportUsers: [],
          reportBackupToner: ''
        });
      }
    });
    
    setSelectedPrinters(updatedPrinters);
    setShowPrinterSelection(false);
  };

  const handleRemovePrinter = (printerId: string) => {
    setSelectedPrinters(prev => prev.filter(p => p.id !== printerId));
  };

  const handleFieldEdit = (printerId: string, field: string, value: any) => {
    setSelectedPrinters(prev => 
      prev.map(p => 
        p.id === printerId 
          ? { ...p, [field]: value }
          : p
      )
    );
  };

  const handleUserSelection = (printerId: string) => {
    const printerIndex = selectedPrinters.findIndex(p => p.id === printerId);
    setSelectedPrinterIndex(printerIndex);
    setShowUserModal(true);
  };

  const handleUserSelect = (user: User) => {
    if (selectedPrinterIndex !== null) {
      setSelectedPrinters(prev => {
        const updated = [...prev];
        const currentUsers = updated[selectedPrinterIndex].reportUsers || [];
        
        // Check if user already exists
        const userExists = currentUsers.some(u => u.id === user.id);
        if (!userExists) {
          updated[selectedPrinterIndex] = {
            ...updated[selectedPrinterIndex],
            reportUsers: [...currentUsers, user]
          };
        }
        
        return updated;
      });
    }
  };

  const handleRemoveUser = (printerId: string, userId: string) => {
    setSelectedPrinters(prev => 
      prev.map(p => 
        p.id === printerId 
          ? { 
              ...p, 
              reportUsers: (p.reportUsers || []).filter(u => u.id !== userId) 
            }
          : p
      )
    );
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newPrinters = [...selectedPrinters];
    const draggedPrinter = newPrinters[draggedIndex];
    
    // Remove from old position
    newPrinters.splice(draggedIndex, 1);
    
    // Insert at new position
    const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newPrinters.splice(adjustedDropIndex, 0, draggedPrinter);
    
    setSelectedPrinters(newPrinters);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleCopyTable = async () => {
    if (!tableRef.current || selectedPrinters.length === 0) {
      toast.error('No hay datos para copiar');
      return;
    }

    try {
      // Crear un contenedor temporal para mejorar la calidad de captura
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.padding = '20px';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.fontSize = '14px';
      tempContainer.style.lineHeight = '1.4';
      document.body.appendChild(tempContainer);

      // Clonar la tabla y mejorar su presentación
      const tableClone = tableRef.current.cloneNode(true) as HTMLElement;
      
      // Mejorar estilos para mejor captura
      tableClone.style.width = '100%';
      tableClone.style.borderCollapse = 'collapse';
      tableClone.style.fontFamily = 'Arial, sans-serif';
      tableClone.style.fontSize = '12px';
      
      // Asegurar que todos los inputs muestren sus valores
      const inputs = tableClone.querySelectorAll('input, select, textarea');
      inputs.forEach((input: any) => {
        if (input.type === 'text' || input.tagName === 'TEXTAREA') {
          input.setAttribute('value', input.value);
          input.textContent = input.value;
          // Crear un span con el valor para mejor visualización
          const span = document.createElement('span');
          span.textContent = input.value || input.placeholder || '';
          span.style.display = 'block';
          span.style.padding = '8px';
          span.style.border = '1px solid #d1d5db';
          span.style.borderRadius = '6px';
          span.style.backgroundColor = '#f9fafb';
          span.style.minHeight = '20px';
          span.style.fontSize = '12px';
          span.style.fontWeight = '500';
          input.parentNode?.replaceChild(span, input);
        } else if (input.tagName === 'SELECT') {
          const selectedOption = input.options[input.selectedIndex];
          const span = document.createElement('span');
          span.textContent = selectedOption?.text || '';
          span.style.display = 'block';
          span.style.padding = '8px';
          span.style.border = '1px solid #d1d5db';
          span.style.borderRadius = '6px';
          span.style.backgroundColor = '#f0f9ff';
          span.style.minHeight = '20px';
          span.style.fontSize = '12px';
          span.style.fontWeight = '600';
          span.style.textAlign = 'center';
          input.parentNode?.replaceChild(span, input);
        }
      });

      // Mejorar las barras de progreso de toner
      const progressBars = tableClone.querySelectorAll('.overflow-x-auto');
      progressBars.forEach((bar: any) => {
        bar.style.overflow = 'visible';
      });

      // Asegurar que las celdas tengan el tamaño correcto
      const cells = tableClone.querySelectorAll('td, th');
      cells.forEach((cell: any) => {
        cell.style.padding = '12px 8px';
        cell.style.border = '1px solid #e5e7eb';
        cell.style.verticalAlign = 'middle';
        cell.style.textAlign = 'left';
        if (cell.tagName === 'TH') {
          cell.style.backgroundColor = '#3730a3';
          cell.style.color = '#ffffff';
          cell.style.fontWeight = 'bold';
          cell.style.fontSize = '11px';
          cell.style.textTransform = 'uppercase';
        }
      });

      tempContainer.appendChild(tableClone);

      const canvas = await html2canvas(tempContainer, {
        backgroundColor: '#ffffff',
        scale: 3, // Aumentar escala para mejor calidad
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
        logging: false,
        width: tempContainer.scrollWidth,
        height: tempContainer.scrollHeight,
        windowWidth: tempContainer.scrollWidth,
        windowHeight: tempContainer.scrollHeight
      });
      
      // Limpiar el contenedor temporal
      document.body.removeChild(tempContainer);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            toast.success('Tabla copiada como imagen en alta calidad al portapapeles');
          } catch (error) {
            // Fallback: descargar la imagen si no se puede copiar
            const link = document.createElement('a');
            link.download = `reporte_diario_${format(new Date(), 'ddMMyyyy_HHmm')}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast.success('Imagen descargada (no se pudo copiar al portapapeles)');
          }
        }
      }, 'image/png', 1.0);
    } catch (error) {
      toast.error('Error al generar la imagen de la tabla');
      console.error('Error:', error);
    }
  };

  const generateReportData = () => {
    return selectedPrinters.map(printer => {
      const prediction = printer.type === 'color' 
        ? getColorPrinterPrediction(printer)
        : calculateTonerPrediction(printer);

      const currentLevel = printer.type === 'color' && 'averageLevel' in prediction
        ? prediction.averageLevel
        : 'adjustedTonerLevel' in prediction 
          ? prediction.adjustedTonerLevel || printer.currentTonerLevel
          : printer.currentTonerLevel;

      return {
        'Ubicación': printer.location,
        'Modelo': printer.model,
        'HostName': printer.hostname || 'No definido',
        'Nivel de Toner (%)': Math.round(currentLevel),
        'Estado': printer.status,
        'Usuarios': (printer.reportUsers || []).map(u => u.name).join(', ') || 'Sin asignar',
        'Backup Toner': printer.reportBackupToner || 'No definido',
        'IP': printer.ip,
        'Serie': printer.serial,
        'Sede': printer.sede || 'Por definir'
      };
    });
  };

  const handleExportExcel = () => {
    if (selectedPrinters.length === 0) {
      toast.error('No hay impresoras seleccionadas para exportar');
      return;
    }

    const data = generateReportData();
    const filename = `reporte_diario_${format(new Date(), 'ddMMyyyy')}`;
    exportToExcel(data, filename);
    toast.success('Reporte exportado a Excel exitosamente');
    setShowExportDropdown(false);
  };

  const handleExportPDF = () => {
    if (selectedPrinters.length === 0) {
      toast.error('No hay impresoras seleccionadas para exportar');
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Título y fecha
      doc.setFontSize(18);
      doc.text('Reporte Diario de Impresoras', 14, 20);
      
      doc.setFontSize(12);
      doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 14, 30);
      doc.text(`Total de impresoras: ${selectedPrinters.length}`, 14, 38);

      const data = generateReportData();
      const columns = ['Ubicación', 'Modelo', 'HostName', 'Nivel (%)', 'Estado', 'Usuarios', 'Backup Toner'];
      
      const tableData = data.map(item => [
        item['Ubicación'],
        item['Modelo'],
        item['HostName'],
        item['Nivel de Toner (%)'].toString(),
        item['Estado'],
        item['Usuarios'],
        item['Backup Toner']
      ]);

      doc.autoTable({
        head: [columns],
        body: tableData,
        startY: 50,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 64, 175] },
        columnStyles: {
          0: { cellWidth: 25 }, // Ubicación
          1: { cellWidth: 30 }, // Modelo
          2: { cellWidth: 25 }, // HostName
          3: { cellWidth: 15 }, // Nivel
          4: { cellWidth: 20 }, // Estado
          5: { cellWidth: 35 }, // Usuarios
          6: { cellWidth: 25 }  // Backup Toner
        }
      });

      const filename = `reporte_diario_${format(new Date(), 'ddMMyyyy')}.pdf`;
      doc.save(filename);
      
      toast.success('Reporte exportado a PDF exitosamente');
      setShowExportDropdown(false);
    } catch (error) {
      toast.error('Error al exportar a PDF');
      console.error('Error:', error);
    }
  };

  const handleExportImage = async () => {
    if (!tableRef.current || selectedPrinters.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      // Usar la misma lógica mejorada para exportar imagen
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.padding = '20px';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      document.body.appendChild(tempContainer);

      const tableClone = tableRef.current.cloneNode(true) as HTMLElement;
      
      // Aplicar las mismas mejoras que en handleCopyTable
      const inputs = tableClone.querySelectorAll('input, select, textarea');
      inputs.forEach((input: any) => {
        if (input.type === 'text' || input.tagName === 'TEXTAREA') {
          const span = document.createElement('span');
          span.textContent = input.value || input.placeholder || '';
          span.style.display = 'block';
          span.style.padding = '8px';
          span.style.border = '1px solid #d1d5db';
          span.style.borderRadius = '6px';
          span.style.backgroundColor = '#f9fafb';
          span.style.minHeight = '20px';
          span.style.fontSize = '12px';
          span.style.fontWeight = '500';
          input.parentNode?.replaceChild(span, input);
        } else if (input.tagName === 'SELECT') {
          const selectedOption = input.options[input.selectedIndex];
          const span = document.createElement('span');
          span.textContent = selectedOption?.text || '';
          span.style.display = 'block';
          span.style.padding = '8px';
          span.style.border = '1px solid #d1d5db';
          span.style.borderRadius = '6px';
          span.style.backgroundColor = '#f0f9ff';
          span.style.minHeight = '20px';
          span.style.fontSize = '12px';
          span.style.fontWeight = '600';
          span.style.textAlign = 'center';
          input.parentNode?.replaceChild(span, input);
        }
      });

      const cells = tableClone.querySelectorAll('td, th');
      cells.forEach((cell: any) => {
        cell.style.padding = '12px 8px';
        cell.style.border = '1px solid #e5e7eb';
        cell.style.verticalAlign = 'middle';
        if (cell.tagName === 'TH') {
          cell.style.backgroundColor = '#3730a3';
          cell.style.color = '#ffffff';
          cell.style.fontWeight = 'bold';
        }
      });

      tempContainer.appendChild(tableClone);

      const canvas = await html2canvas(tempContainer, {
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
        logging: false
      });
      
      document.body.removeChild(tempContainer);
      
      const link = document.createElement('a');
      link.download = `reporte_diario_${format(new Date(), 'ddMMyyyy_HHmm')}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      
      toast.success('Reporte exportado como imagen en alta calidad exitosamente');
      setShowExportDropdown(false);
    } catch (error) {
      toast.error('Error al exportar como imagen');
      console.error('Error:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-indigo-100 p-3 rounded-lg mr-4">
              <FileText className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reporte Diario</h1>
              <p className="text-gray-600">Gestión y exportación de reportes de impresoras</p>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}
          </div>
        </div>
      </div>

      {/* Controls */}
      {selectedPrinters.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleAddPrinters}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Editar Selección de Impresoras
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyTable}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Copy size={16} />
                Copiar
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download size={16} />
                  Exportar
                  <ChevronDown size={16} />
                </button>
                
                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <button
                      onClick={handleExportPDF}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <FileText size={16} />
                      Exportar PDF
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <Download size={16} />
                      Exportar Excel
                    </button>
                    <button
                      onClick={handleExportImage}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <Copy size={16} />
                      Exportar Imagen
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {selectedPrinters.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-indigo-100 p-6 rounded-full w-24 h-24 mx-auto mb-6">
              <FileText className="h-12 w-12 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Crear Reporte Diario</h3>
            <p className="text-gray-600 mb-6">
              Selecciona las impresoras que deseas incluir en el reporte diario
            </p>
            <button
              onClick={handleAddPrinters}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus size={20} />
              Agregar Impresoras para Reporte
            </button>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Impresoras Seleccionadas ({selectedPrinters.length})
              </h3>
              <p className="text-sm text-gray-600">
                Edita los campos directamente en la tabla. Arrastra las filas para reordenar. Haz clic en los usuarios para gestionar.
              </p>
            </div>

            {/* Professional Table */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-4 shadow-inner">
              <div className="overflow-x-auto rounded-lg shadow-sm">
                <table ref={tableRef} className="w-full bg-white rounded-lg overflow-hidden shadow-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                      <th className="px-2 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-indigo-500 border-opacity-30 w-8">
                        <GripVertical size={14} className="text-indigo-200" />
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider border-r border-indigo-500 border-opacity-30 min-w-32">
                        Ubicación
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider border-r border-indigo-500 border-opacity-30 min-w-28">
                        Modelo
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider border-r border-indigo-500 border-opacity-30 min-w-24">
                        HostName
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider border-r border-indigo-500 border-opacity-30 min-w-28">
                        Nivel Toner
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider border-r border-indigo-500 border-opacity-30 min-w-24">
                        Estado
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider border-r border-indigo-500 border-opacity-30 min-w-32">
                        Usuarios
                      </th>
                      <th className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider min-w-28">
                        Backup Toner
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedPrinters.map((printer, index) => {
                      // Obtener la impresora actualizada del store principal
                      const currentPrinter = printers.find(p => p.id === printer.id) || printer;
                      const updatedPrinter = updatePrinterTonerLevel(currentPrinter);
                      
                      const prediction = updatedPrinter.type === 'color' 
                        ? getColorPrinterPrediction(updatedPrinter)
                        : calculateTonerPrediction(updatedPrinter);

                      const currentLevel = updatedPrinter.type === 'color' && 'averageLevel' in prediction
                        ? prediction.averageLevel
                        : 'adjustedTonerLevel' in prediction 
                          ? prediction.adjustedTonerLevel || updatedPrinter.currentTonerLevel
                          : updatedPrinter.currentTonerLevel;

                      return (
                        <motion.tr
                          key={printer.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${
                            dragOverIndex === index ? 'bg-blue-100 border-t-2 border-blue-500' : ''
                          } ${
                            draggedIndex === index ? 'opacity-50' : ''
                          }`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                        >
                          {/* Drag Handle */}
                          <td className="px-2 py-3 border-r border-gray-100 border-opacity-50 cursor-move">
                            <GripVertical size={16} className="text-gray-400 hover:text-gray-600" />
                          </td>

                          {/* Ubicación */}
                          <td className="px-2 py-3 border-r border-gray-100 border-opacity-50">
                            <input
                              type="text"
                              value={updatedPrinter.location}
                              onChange={(e) => handleFieldEdit(printer.id, 'location', e.target.value)}
                              className="w-full bg-transparent border-none outline-none text-xs font-medium text-gray-900 focus:bg-blue-50 focus:rounded px-1 py-0.5 transition-colors"
                            />
                          </td>

                          {/* Modelo */}
                          <td className="px-2 py-3 border-r border-gray-100 border-opacity-50">
                            <input
                              type="text"
                              value={updatedPrinter.model}
                              onChange={(e) => handleFieldEdit(printer.id, 'model', e.target.value)}
                              className="w-full bg-transparent border-none outline-none text-xs font-medium text-gray-900 focus:bg-blue-50 focus:rounded px-1 py-0.5 transition-colors"
                            />
                          </td>

                          {/* HostName */}
                          <td className="px-2 py-3 border-r border-gray-100 border-opacity-50">
                            <input
                              type="text"
                              value={updatedPrinter.hostname || ''}
                              onChange={(e) => handleFieldEdit(printer.id, 'hostname', e.target.value)}
                              className="w-full bg-transparent border-none outline-none text-xs text-gray-900 focus:bg-blue-50 focus:rounded px-1 py-0.5 transition-colors"
                              placeholder="No definido"
                            />
                          </td>

                          {/* Nivel de Toner */}
                          <td className="px-2 py-3 border-r border-gray-100 border-opacity-50">
                            {updatedPrinter.type === 'color' && updatedPrinter.colorToners ? (
                              <div className="space-y-1">
                                {updatedPrinter.colorToners.map((colorToner) => {
                                  const colorPrediction = calculateColorTonerPrediction(updatedPrinter, colorToner);
                                  const colorOption = COLOR_OPTIONS.find(c => c.id === colorToner.color);
                                  
                                  return (
                                    <div key={colorToner.id} className="flex items-center space-x-1">
                                      <div
                                        className="w-1.5 h-1.5 rounded-full border border-gray-300 shadow-sm flex-shrink-0"
                                        style={{ backgroundColor: colorToner.colorCode }}
                                      />
                                       <div className="flex-1 relative min-w-20">
                                         <div className="w-full bg-gray-200 rounded-full h-2.5 relative overflow-hidden">
                                          <div
                                            className={`h-2.5 rounded-full transition-all duration-300 ${
                                              colorPrediction.adjustedLevel < 20 ? 'bg-red-500' :
                                              colorPrediction.adjustedLevel < 50 ? 'bg-yellow-500' : 'bg-green-500'
                                            }`}
                                            style={{ width: `${colorPrediction.adjustedLevel}%` }}
                                          />
                                          <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold drop-shadow-sm ${
                                            colorPrediction.adjustedLevel < 50 ? 'text-gray-800' : 'text-white'
                                          }`}>
                                            {Math.round(colorPrediction.adjustedLevel)}%
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="relative min-w-24">
                                <div className="w-full bg-gray-200 rounded-full h-3.5 relative overflow-hidden shadow-inner">
                                  <div
                                    className={`h-3.5 rounded-full transition-all duration-300 ${
                                      currentLevel < 20 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                      currentLevel < 50 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 
                                      'bg-gradient-to-r from-green-500 to-green-600'
                                    }`}
                                    style={{ width: `${currentLevel}%` }}
                                  />
                                  <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold drop-shadow-sm ${
                                    currentLevel < 50 ? 'text-gray-800' : 'text-white'
                                  }`}>
                                    {Math.round(currentLevel)}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Estado */}
                          <td className="px-2 py-3 border-r border-gray-100 border-opacity-50">
                            <select
                              value={updatedPrinter.status}
                              onChange={(e) => handleFieldEdit(printer.id, 'status', e.target.value)}
                              className={`w-full border-2 rounded-lg outline-none text-xs font-semibold px-1 py-0.5 transition-all focus:ring-2 focus:ring-emerald-500 shadow-sm min-w-0 ${
                                updatedPrinter.status === 'operativa' ? 'bg-emerald-100 border-emerald-300 hover:bg-emerald-200 text-emerald-800' :
                                updatedPrinter.status === 'disponible' ? 'bg-sky-100 border-sky-300 hover:bg-sky-200 text-sky-800' :
                                updatedPrinter.status === 'backup' ? 'bg-amber-100 border-amber-300 hover:bg-amber-200 text-amber-800' :
                                'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-800'
                              }`}
                              style={{ minWidth: '90px', width: 'auto' }}
                            >
                              <option value="operativa">Operativa</option>
                              <option value="disponible">Disponible</option>
                              <option value="backup">Backup</option>
                              <option value="retirada">Retirada</option>
                            </select>
                          </td>

                          {/* Usuarios */}
                          <td className="px-2 py-3 border-r border-gray-100 border-opacity-50 min-w-32">
                            <div className="space-y-1">
                              {(printer.reportUsers || []).length === 0 ? (
                                <button
                                  onClick={() => handleUserSelection(printer.id)}
                                  className="w-full text-left px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 border border-blue-200 hover:border-blue-300"
                                >
                                  <Users size={10} />
                                  <span>Agregar usuarios</span>
                                </button>
                              ) : (
                                (printer.reportUsers || []).map((user) => (
                                  <div key={user.id} className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 px-2 py-1 rounded-lg text-xs border border-blue-200">
                                    <button
                                      onClick={() => handleUserSelection(printer.id)}
                                      className="truncate font-medium text-blue-900 hover:text-blue-700 transition-colors cursor-pointer flex-1 text-left"
                                    >
                                      {user.name}
                                    </button>
                                    <button
                                      onClick={() => handleRemoveUser(printer.id, user.id)}
                                      className="text-red-500 hover:text-red-700 ml-1 p-0.5 hover:bg-red-100 rounded transition-colors"
                                    >
                                      <Trash2 size={8} />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </td>

                          {/* Backup Toner */}
                          <td className="px-2 py-3 min-w-28">
                            <input
                              type="text"
                              value={printer.reportBackupToner || ''}
                              onChange={(e) => handleFieldEdit(printer.id, 'reportBackupToner', e.target.value)}
                              className="w-full bg-transparent border-none outline-none text-xs text-gray-900 focus:bg-blue-50 focus:rounded px-2 py-1 transition-colors"
                              placeholder="No definido"
                            />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Printer Selection Modal */}
      {showPrinterSelection && (
        <PrinterSelectionForReportModal
          isOpen={showPrinterSelection}
          onClose={() => setShowPrinterSelection(false)}
          onConfirm={handlePrintersSelected}
          initialSelectedPrinters={selectedPrinters}
        />
      )}

      {/* User Management Modal */}
      {showUserModal && (
        <UserManagementModal
          isOpen={showUserModal}
          onClose={() => {
            setShowUserModal(false);
            setSelectedPrinterIndex(null);
          }}
          onSelect={handleUserSelect}
        />
      )}
    </div>
  );
}