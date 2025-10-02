import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Calendar, FileText, CheckCircle } from 'lucide-react';
import { Ticket, Printer } from '../../types';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { exportToExcel } from '../../utils/exportUtils';
import toast from 'react-hot-toast';

interface TicketExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: Ticket[];
  printers: Printer[];
}

export default function TicketExportModal({ isOpen, onClose, tickets, printers }: TicketExportModalProps) {
  const [exportType, setExportType] = useState<'all' | 'filtered'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const generateTicketExportData = (ticketsToExport: Ticket[]) => {
    return ticketsToExport.map(ticket => {
      const printer = printers.find(p => p.id === ticket.printerId);
      return {
        'ID del Ticket': ticket.id.slice(0, 8),
        'Fecha de Creación': format(ticket.createdAt, 'dd/MM/yyyy HH:mm', { locale: es }),
        'Nombre de Usuario': ticket.userName,
        'Área': ticket.area,
        'Modelo de Impresora': printer?.model || 'No encontrada',
        'Ubicación de Impresora': printer?.location || 'N/A',
        'IP de Impresora': printer?.ip || 'N/A',
        'Serie de Impresora': printer?.serial || 'N/A',
        'Título de Asistencia': ticket.assistanceTitle,
        'Detalle de Asistencia': ticket.assistanceDetail,
        'Tipo': ticket.isServiceRequest ? 'Solicitud de Servicio' : 'Incidente',
        'Es Solicitud de Servicio': ticket.isServiceRequest ? 'Sí' : 'No',
        'Es Incidente': ticket.isIncident ? 'Sí' : 'No',
        'Fecha de Actualización': format(ticket.updatedAt, 'dd/MM/yyyy HH:mm', { locale: es })
      };
    });
  };

  const getFilteredTickets = () => {
    if (exportType === 'all') {
      return tickets;
    }

    if (!startDate || !endDate) {
      return [];
    }

    // Crear fechas exactas para evitar pérdida de datos
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    return tickets.filter(ticket => {
      const ticketDate = new Date(ticket.createdAt);
      return ticketDate >= start && ticketDate <= end;
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const ticketsToExport = getFilteredTickets();
      
      if (ticketsToExport.length === 0) {
        toast.error('No hay tickets para exportar con los filtros seleccionados');
        return;
      }

      const data = generateTicketExportData(ticketsToExport);
      
      const filename = exportType === 'all' 
        ? 'tickets_completo'
        : `tickets_${format(new Date(startDate), 'ddMMyyyy', { locale: es })}_${format(new Date(endDate), 'ddMMyyyy', { locale: es })}`;
      
      exportToExcel(data, filename);
      
      toast.success(`${ticketsToExport.length} ticket(s) exportado(s) exitosamente`);
      onClose();
    } catch (error) {
      toast.error('Error al exportar los tickets');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredTickets = getFilteredTickets();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-green-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Download size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Exportar Tickets</h2>
                    <p className="text-green-100">Exportar historial de tickets a Excel</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-6">
                {/* Tipo de Exportación */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo de Exportación
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="exportType"
                        value="all"
                        checked={exportType === 'all'}
                        onChange={(e) => setExportType(e.target.value as 'all' | 'filtered')}
                        className="mr-3"
                      />
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-lg mr-3">
                          <FileText size={16} className="text-blue-600" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">Exportar Todo el Historial</span>
                          <p className="text-sm text-gray-600">Exportar todos los tickets registrados ({tickets.length} tickets)</p>
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <input
                        type="radio"
                        name="exportType"
                        value="filtered"
                        checked={exportType === 'filtered'}
                        onChange={(e) => setExportType(e.target.value as 'all' | 'filtered')}
                        className="mr-3"
                      />
                      <div className="flex items-center">
                        <div className="bg-green-100 p-2 rounded-lg mr-3">
                          <Calendar size={16} className="text-green-600" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">Exportar por Rango de Fechas</span>
                          <p className="text-sm text-gray-600">Filtrar tickets por fecha específica</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Filtros de Fecha */}
                {exportType === 'filtered' && (
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-4">Rango de Fechas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fecha Inicial *
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fecha Final *
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          min={startDate}
                          required
                        />
                      </div>
                    </div>
                    
                    {startDate && endDate && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center mb-2">
                          <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-blue-800">Vista Previa del Filtro</span>
                        </div>
                        <div className="text-sm text-blue-700">
                          <p>Desde: {format(startOfDay(new Date(startDate)), 'dd/MM/yyyy 00:00', { locale: es })}</p>
                          <p>Hasta: {format(endOfDay(new Date(endDate)), 'dd/MM/yyyy 23:59', { locale: es })}</p>
                          <p className="font-medium mt-2">
                            Tickets a exportar: {filteredTickets.length}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Información del archivo */}
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Información del Archivo</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>• Formato: Excel (.xlsx)</p>
                    <p>• Incluye toda la información de los tickets</p>
                    <p>• Compatible con Excel, Google Sheets y LibreOffice</p>
                    <p>• Se descargará automáticamente al confirmar</p>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={isExporting || (exportType === 'filtered' && (!startDate || !endDate)) || filteredTickets.length === 0}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Exportando...
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        Exportar {exportType === 'all' ? `${tickets.length}` : `${filteredTickets.length}`} Ticket(s)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}