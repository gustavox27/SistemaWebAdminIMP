import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Search,
  Filter,
  Download,
  Trash2,
  AlertTriangle,
  Plus,
  Mail
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import ConfirmDialog from './modals/ConfirmDialog';
import AddChangeModal from './modals/AddChangeModal';
import HistoryEmailTemplateModal from './modals/HistoryEmailTemplateModal';
import { exportToExcel, generateHistoryExportData } from '../utils/exportUtils';
import { supabaseService } from '../services/supabaseService';
import toast from 'react-hot-toast';
import { TonerChange } from '../types';

export default function HistoryTable() {
  const { changes, printers, fuserModels, deleteTonerChange, clearAllHistory } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);
  const [showAddChangeModal, setShowAddChangeModal] = useState(false);
  const [showEmailTemplateModal, setShowEmailTemplateModal] = useState(false);
  const [selectedChange, setSelectedChange] = useState<TonerChange | null>(null);

  const filteredChanges = useMemo(() => {
    return changes.filter(change => {
      const printer = printers.find(p => p.id === change.printerId);
      const printerInfo = printer ? `${printer.model} ${printer.location} ${printer.serial}` : '';
      
      const matchesSearch = 
        change.tonerModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        change.responsible.toLowerCase().includes(searchTerm.toLowerCase()) ||
        change.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
        printerInfo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = !dateFilter || 
        format(change.changeDate, 'yyyy-MM-dd') === dateFilter;

      return matchesSearch && matchesDate;
    });
  }, [changes, printers, searchTerm, dateFilter]);

  const handleDeleteChange = (changeId: string) => {
    setSelectedChangeId(changeId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteChange = async () => {
    if (!selectedChangeId) return;

    try {
      deleteTonerChange(selectedChangeId);
      await supabaseService.delete('changes', selectedChangeId);
      toast.success('Registro eliminado del historial');
    } catch (error) {
      toast.error('Error al eliminar el registro');
    }
  };

  const confirmDeleteAll = async () => {
    try {
      // Eliminar todos los registros de la base de datos
      for (const change of changes) {
        await supabaseService.delete('changes', change.id);
      }
      
      clearAllHistory();
      toast.success(`${changes.length} registros eliminados del historial`);
    } catch (error) {
      toast.error('Error al eliminar el historial');
    }
  };

  const handleExportData = () => {
    const data = generateHistoryExportData(filteredChanges, printers);
    exportToExcel(data, 'historial');
    toast.success('Historial exportado exitosamente');
  };

  const handleShowEmailTemplate = (change: TonerChange) => {
    setSelectedChange(change);
    setShowEmailTemplateModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por toner, responsable, operador o impresora..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="text-gray-400" size={20} />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAddChangeModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Agregar
            </button>

            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download size={20} />
              Exportar
            </button>

            {changes.length > 0 && (
              <button
                onClick={() => setShowDeleteAllDialog(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 size={20} />
                Eliminar Todo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div 
          className="overflow-x-auto cursor-grab active:cursor-grabbing"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#CBD5E0 #F7FAFC'
          }}
          onMouseDown={(e) => {
            const container = e.currentTarget;
            const startX = e.pageX - container.offsetLeft;
            const scrollLeft = container.scrollLeft;
            let isDown = true;

            const handleMouseMove = (e: MouseEvent) => {
              if (!isDown) return;
              e.preventDefault();
              const x = e.pageX - container.offsetLeft;
              const walk = (x - startX) * 2;
              container.scrollLeft = scrollLeft - walk;
            };

            const handleMouseUp = () => {
              isDown = false;
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
              container.style.cursor = 'grab';
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            container.style.cursor = 'grabbing';
          }}
        >
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de Cambio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Impresora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modelo de Toner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ciclo de Motor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Responsable
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operador
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredChanges
                .sort((a, b) => new Date(b.changeDate).getTime() - new Date(a.changeDate).getTime())
                .map((change, index) => {
                const printer = printers.find(p => p.id === change.printerId);
                const isFuser = fuserModels.some(model => model.name === change.tonerModel);
                
                return (
                  <motion.tr
                    key={change.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {format(change.changeDate, 'dd/MM/yyyy', { locale: es })}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(change.changeDate, 'HH:mm', { locale: es })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {printer?.model || 'Impresora eliminada'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {printer?.location || 'N/A'} - {printer?.ip || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-400">
                          Serie: {printer?.serial || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {change.tonerModel}
                      {isFuser && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Fusor
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {change.motorCycle.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {change.responsible}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {change.operator}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleShowEmailTemplate(change)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Ver plantilla de correo"
                        >
                          <Mail size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteChange(change.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Eliminar registro"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredChanges.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin historial</h3>
              <p className="mt-1 text-sm text-gray-500">
                {changes.length === 0 ? 'No hay cambios registrados' : 'No se encontraron registros con los filtros aplicados'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Single Record Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteChange}
        title="Eliminar Registro"
        message="¿Estás seguro de que deseas eliminar este registro del historial? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        type="danger"
      />

      {/* Delete All Records Dialog */}
      <ConfirmDialog
        isOpen={showDeleteAllDialog}
        onClose={() => setShowDeleteAllDialog(false)}
        onConfirm={confirmDeleteAll}
        title="Eliminar Todo el Historial"
        message={
          <div>
            <div className="flex items-center mb-3">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
              <span className="font-medium text-red-800">¡Advertencia!</span>
            </div>
            <p className="mb-2">
              Estás a punto de eliminar <strong>{changes.length} registros</strong> del historial.
            </p>
            <p className="text-sm text-gray-600">
              Esta acción no se puede deshacer y eliminará permanentemente todo el historial de cambios de toner.
            </p>
          </div>
        }
        confirmText="Eliminar Todo"
        type="danger"
      />

      <AddChangeModal
        isOpen={showAddChangeModal}
        onClose={() => setShowAddChangeModal(false)}
      />

      {selectedChange && (
        <HistoryEmailTemplateModal
          change={selectedChange}
          isOpen={showEmailTemplateModal}
          onClose={() => {
            setShowEmailTemplateModal(false);
            setSelectedChange(null);
          }}
        />
      )}
    </div>
  );
}