import React, { useState } from 'react';
import { X, Calendar, Users, FileDown, Search } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { reportService, UserReportData } from '../../services/reportService';
import toast from 'react-hot-toast';
import UserManagementModal from './UserManagementModal';

interface UserReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserReportModal({ isOpen, onClose }: UserReportModalProps) {
  const { tickets, users } = useStore();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('Todos');
  const [generatePDF, setGeneratePDF] = useState(true);
  const [generateExcel, setGenerateExcel] = useState(false);
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);

  if (!isOpen) return null;

  const getPeruDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0);
  };

  const isDateInRange = (ticketDate: Date, start: Date, end: Date): boolean => {
    const ticketDateOnly = new Date(ticketDate.getFullYear(), ticketDate.getMonth(), ticketDate.getDate());
    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    return ticketDateOnly >= startDateOnly && ticketDateOnly <= endDateOnly;
  };

  const handleUserSelect = (userName: string) => {
    setSelectedUser(userName);
    setShowUserManagementModal(false);
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

    const filteredTickets = tickets.filter(ticket => {
      const ticketDate = new Date(ticket.createdAt);
      const inDateRange = isDateInRange(ticketDate, start, end);

      if (selectedUser === 'Todos') {
        return inDateRange;
      }

      return inDateRange && ticket.userName === selectedUser;
    });

    if (filteredTickets.length === 0) {
      toast.error('No se encontraron tickets en el rango de fechas seleccionado');
      return;
    }

    let reportData: UserReportData[];

    if (selectedUser === 'Todos') {
      const userTicketsMap = new Map<string, { count: number; tickets: typeof tickets }>();

      filteredTickets.forEach(ticket => {
        if (!userTicketsMap.has(ticket.userName)) {
          userTicketsMap.set(ticket.userName, { count: 0, tickets: [] });
        }
        const userData = userTicketsMap.get(ticket.userName)!;
        userData.count++;
        userData.tickets.push(ticket);
      });

      reportData = Array.from(userTicketsMap.entries()).map(([userName, data]) => ({
        userName,
        ticketCount: data.count,
        tickets: data.tickets
      }));
    } else {
      reportData = [{
        userName: selectedUser,
        ticketCount: filteredTickets.length,
        tickets: filteredTickets
      }];
    }

    reportData.sort((a, b) => b.ticketCount - a.ticketCount);

    try {
      if (generatePDF) {
        reportService.generateUserReportPDF(reportData, start, end);
        toast.success('Reporte PDF generado exitosamente');
      }

      if (generateExcel) {
        reportService.generateUserReportExcel(reportData, start, end);
        toast.success('Reporte Excel generado exitosamente');
      }

      onClose();
    } catch (error) {
      console.error('Error al generar reporte:', error);
      toast.error('Error al generar el reporte');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Users className="text-blue-600" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">
                Reporte de Usuarios
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users size={16} className="inline mr-2" />
                Selección de Usuario
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedUser}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <button
                  onClick={() => setShowUserManagementModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Search size={16} />
                  Buscar
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Por defecto se mostrarán todos los usuarios. Haz clic en "Buscar" para seleccionar un usuario específico.
              </p>
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
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Generar PDF</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateExcel}
                    onChange={(e) => setGenerateExcel(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Generar Excel</span>
                </label>
              </div>
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FileDown size={16} />
              Generar
            </button>
          </div>
        </div>
      </div>

      {showUserManagementModal && (
        <UserManagementModal
          isOpen={showUserManagementModal}
          onClose={() => setShowUserManagementModal(false)}
          onUserSelect={handleUserSelect}
        />
      )}
    </>
  );
}
