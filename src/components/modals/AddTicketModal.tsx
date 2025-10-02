import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Save, User, Printer, Search, FileText, AlertTriangle } from 'lucide-react';
import { Ticket, TicketTemplate } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';
import UserManagementModal from './UserManagementModal';
import PrinterSelectionModal from './PrinterSelectionModal';
import TicketTemplatesModal from './TicketTemplatesModal';

interface AddTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddTicketModal({ isOpen, onClose }: AddTicketModalProps) {
  const { printers, addTicket, updateTicketTemplate } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [formData, setFormData] = useState({
    userName: '',
    printerId: '',
    area: '',
    assistanceTitle: '',
    assistanceDetail: '',
    isServiceRequest: false,
    isIncident: false
  });

  const selectedPrinter = printers.find(p => p.id === formData.printerId);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      // Manejar checkboxes mutuamente excluyentes
      if (name === 'isServiceRequest' && checked) {
        setFormData(prev => ({
          ...prev,
          isServiceRequest: true,
          isIncident: false
        }));
      } else if (name === 'isIncident' && checked) {
        setFormData(prev => ({
          ...prev,
          isServiceRequest: false,
          isIncident: true
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: checked
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleUserSelect = (user: any) => {
    setFormData(prev => ({
      ...prev,
      userName: user.name
    }));
    setShowUserModal(false);
  };

  const handlePrinterSelect = (printer: any) => {
    setFormData(prev => ({
      ...prev,
      printerId: printer.id,
      area: printer.location // Auto-llenar área con ubicación de la impresora
    }));
    setShowPrinterModal(false);
  };

  const handleTemplateSelect = async (template: TicketTemplate) => {
    setFormData(prev => ({
      ...prev,
      assistanceTitle: template.title,
      assistanceDetail: template.detail
    }));
    
    // Incrementar contador de uso de la plantilla
    const updatedTemplate = {
      ...template,
      usageCount: template.usageCount + 1,
      updatedAt: new Date()
    };
    
    updateTicketTemplate(template.id, updatedTemplate);
    await supabaseService.update('ticketTemplates', updatedTemplate);
    
    setShowTemplatesModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.isServiceRequest && !formData.isIncident) {
      toast.error('Debe seleccionar al menos un tipo de asistencia');
      return;
    }

    setIsSubmitting(true);

    try {
      const newTicket: Ticket = {
        id: crypto.randomUUID(),
        userName: formData.userName,
        printerId: formData.printerId,
        area: formData.area,
        assistanceTitle: formData.assistanceTitle,
        assistanceDetail: formData.assistanceDetail,
        isServiceRequest: formData.isServiceRequest,
        isIncident: formData.isIncident,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      addTicket(newTicket);
      await supabaseService.add('tickets', newTicket);
      
      toast.success('Ticket registrado exitosamente');
      onClose();
      
      // Reset form
      setFormData({
        userName: '',
        printerId: '',
        area: '',
        assistanceTitle: '',
        assistanceDetail: '',
        isServiceRequest: false,
        isIncident: false
      });
    } catch (error) {
      toast.error('Error al registrar el ticket');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <div className="bg-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Plus size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Nuevo Ticket de Soporte</h2>
                    <p className="text-purple-100">Registrar solicitud de servicio o incidente</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nombre del Usuario */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Usuario *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="userName"
                      value={formData.userName}
                      onChange={handleChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Escribir nombre del usuario..."
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserModal(true)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      title="Seleccionar de la lista"
                    >
                      <User size={16} />
                    </button>
                  </div>
                </div>

                {/* Impresora Relacionada */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Impresora Relacionada *
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      {selectedPrinter ? (
                        <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                          <div className="text-sm font-medium">{selectedPrinter.model}</div>
                          <div className="text-xs text-gray-500">
                            {selectedPrinter.location} - {selectedPrinter.ip}
                          </div>
                        </div>
                      ) : (
                        <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                          Seleccionar impresora
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPrinterModal(true)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      title="Seleccionar impresora"
                    >
                      <Search size={16} />
                    </button>
                  </div>
                </div>

                {/* Área */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Área *
                  </label>
                  <input
                    type="text"
                    name="area"
                    value={formData.area}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Se llena automáticamente al seleccionar impresora o escribir manualmente..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se completa automáticamente con la ubicación de la impresora seleccionada
                  </p>
                </div>

                {/* Título de la Asistencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título de la Asistencia *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="assistanceTitle"
                      value={formData.assistanceTitle}
                      onChange={handleChange}
                      onClick={() => setShowTemplatesModal(true)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer"
                      placeholder="Haz clic para seleccionar de plantillas..."
                      required
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={() => setShowTemplatesModal(true)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      title="Seleccionar plantilla"
                    >
                      <FileText size={16} />
                    </button>
                  </div>
                </div>

                {/* Detalle de la Asistencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detalle de la Asistencia *
                  </label>
                  <textarea
                    name="assistanceDetail"
                    value={formData.assistanceDetail}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Se llena automáticamente al seleccionar plantilla o escribir manualmente..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se completa automáticamente al seleccionar una plantilla
                  </p>
                </div>

                {/* Tipo de Asistencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo de Asistencia *
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        name="isServiceRequest"
                        checked={formData.isServiceRequest}
                        onChange={handleChange}
                        className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <div className="flex items-center">
                        <div className="bg-green-100 p-2 rounded-lg mr-3">
                          <User size={16} className="text-green-600" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">Solicitud de Servicio</span>
                          <p className="text-sm text-gray-600">Mantenimiento, configuración o soporte técnico</p>
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        name="isIncident"
                        checked={formData.isIncident}
                        onChange={handleChange}
                        className="mr-3 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <div className="flex items-center">
                        <div className="bg-red-100 p-2 rounded-lg mr-3">
                          <AlertTriangle size={16} className="text-red-600" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">Incidente</span>
                          <p className="text-sm text-gray-600">Problema, falla o error que requiere atención inmediata</p>
                        </div>
                      </div>
                    </label>
                  </div>
                  
                  {!formData.isServiceRequest && !formData.isIncident && (
                    <p className="text-sm text-red-600 mt-2">
                      Debe seleccionar al menos un tipo de asistencia
                    </p>
                  )}
                </div>

                {/* Información de validación */}
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">Información del Ticket</h4>
                  <div className="text-sm text-purple-700 space-y-1">
                    <p>• Se registrará en el historial de asistencias</p>
                    <p>• Se guardará con fecha y hora actual</p>
                    <p>• Estará disponible para copiar al portapapeles</p>
                    <p>• Se puede filtrar por fecha y tipo</p>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (!formData.isServiceRequest && !formData.isIncident)}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save size={16} />
                    {isSubmitting ? 'Registrando...' : 'Registrar Ticket'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* User Management Modal */}
          {showUserModal && (
            <UserManagementModal
              isOpen={showUserModal}
              onClose={() => setShowUserModal(false)}
              onSelect={handleUserSelect}
            />
          )}

          {/* Printer Selection Modal */}
          {showPrinterModal && (
            <PrinterSelectionModal
              isOpen={showPrinterModal}
              onClose={() => setShowPrinterModal(false)}
              onSelect={handlePrinterSelect}
            />
          )}

          {/* Templates Modal */}
          {showTemplatesModal && (
            <TicketTemplatesModal
              isOpen={showTemplatesModal}
              onClose={() => setShowTemplatesModal(false)}
              onSelect={handleTemplateSelect}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}