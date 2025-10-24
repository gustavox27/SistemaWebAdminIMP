import React, { useState } from 'react';
import { X, Calendar, FileDown, History } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { reportService, HistoryReportData } from '../../services/reportService';
import toast from 'react-hot-toast';

interface HistoryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HistoryReportModal({ isOpen, onClose }: HistoryReportModalProps) {
  const { changes } = useStore();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generatePDF, setGeneratePDF] = useState(true);
  const [generateExcel, setGenerateExcel] = useState(false);

  if (!isOpen) return null;

  const getPeruDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0);
  };

  const isDateInRange = (changeDate: Date, start: Date, end: Date): boolean => {
    const changeDateOnly = new Date(changeDate.getFullYear(), changeDate.getMonth(), changeDate.getDate());
    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    return changeDateOnly >= startDateOnly && changeDateOnly <= endDateOnly;
  };

  const handleGenerate = () => {
    if (!startDate || !endDate) {
      toast.error('Por favor selecciona las fechas de inicio y fin');
      return;
    }

    if (!generatePDF && !generateExcel) {
      toast.error('Selecciona al menos un formato de reporte (PDF o Excel)');
      return;
    }

    const start = getPeruDate(startDate);
    const end = getPeruDate(endDate);

    if (start > end) {
      toast.error('La fecha de inicio no puede ser mayor a la fecha de fin');
      return;
    }

    const filteredChanges = changes.filter(change => {
      const changeDate = new Date(change.changeDate);
      return isDateInRange(changeDate, start, end);
    });

    if (filteredChanges.length === 0) {
      toast.error('No se encontraron cambios en el rango de fechas seleccionado');
      return;
    }

    const reportData: HistoryReportData = {
      changes: filteredChanges,
      startDate: start,
      endDate: end
    };

    try {
      if (generatePDF) {
        reportService.generateHistoryReportPDF(reportData);
        toast.success('Reporte PDF generado exitosamente');
      }

      if (generateExcel) {
        reportService.generateHistoryReportExcel(reportData);
        toast.success('Reporte Excel generado exitosamente');
      }

      onClose();
    } catch (error) {
      console.error('Error al generar reporte:', error);
      toast.error('Error al generar el reporte');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <History className="text-green-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">
              Reporte de Historial
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-2" />
              Fecha de Inicio
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-2" />
              Fecha de Fin
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileDown size={16} className="inline mr-2" />
              Formato de Salida
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generatePDF}
                  onChange={(e) => setGeneratePDF(e.target.checked)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Generar PDF</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateExcel}
                  onChange={(e) => setGenerateExcel(e.target.checked)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Generar Excel</span>
              </label>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Este reporte incluirá todos los cambios de toner realizados en el período seleccionado, mostrando información detallada de cada cambio.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <FileDown size={16} />
            Generar
          </button>
        </div>
      </div>
    </div>
  );
}
