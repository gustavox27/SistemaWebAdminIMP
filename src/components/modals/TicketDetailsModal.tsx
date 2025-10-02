import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Eye, 
  User, 
  MapPin, 
  Printer, 
  Calendar, 
  Clock, 
  FileText,
  AlertTriangle,
  CheckCircle,
  Hash,
  Network,
  Copy
} from 'lucide-react';
import { Ticket } from '../../types';
import { useStore } from '../../store/useStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import toast from 'react-hot-toast';

interface TicketDetailsModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
}

export default function TicketDetailsModal({ ticket, isOpen, onClose }: TicketDetailsModalProps) {
  const { printers } = useStore();
  
  const printer = printers.find(p => p.id === ticket.printerId);

  const handleCopyTicket = async () => {
    const type = ticket.isServiceRequest ? 'Solicitud de Servicio' : 'Incidente';
    
    const ticketText = `TICKET - ${type}
Fecha: ${format(ticket.createdAt, 'dd/MM/yyyy HH:mm', { locale: es })}
Usuario: ${ticket.userName}
Área: ${ticket.area}
Impresora: ${printer?.model || 'No encontrada'} - ${printer?.location || 'N/A'}
IP: ${printer?.ip || 'N/A'}
Serie: ${printer?.serial || 'N/A'}
Título: ${ticket.assistanceTitle}
Detalle: ${ticket.assistanceDetail}`;

    try {
      await navigator.clipboard.writeText(ticketText);
      toast.success('Ticket copiado al portapapeles');
    } catch (error) {
      toast.error('Error al copiar el ticket');
    }
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
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
            className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 p-3 rounded-lg mr-4">
                    <Eye size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Detalles del Ticket</h2>
                    <p className="text-blue-100 mt-1">Información completa del ticket de soporte</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyTicket}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                    title="Copiar ticket al portapapeles"
                  >
                    <Copy size={20} />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[75vh] overflow-y-auto">
              <div className="space-y-6">
                {/* Información Principal */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                      <FileText size={20} className="mr-2 text-blue-600" />
                      {ticket.assistanceTitle}
                    </h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      ticket.isServiceRequest 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {ticket.isServiceRequest ? (
                        <>
                          <CheckCircle size={14} className="mr-1" />
                          Solicitud de Servicio
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={14} className="mr-1" />
                          Incidente
                        </>
                      )}
                    </span>
                  </div>
                  
                  <div className="bg-white border border-blue-100 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Descripción del Problema</h4>
                    <p className="text-gray-700 leading-relaxed">
                      {ticket.assistanceDetail}
                    </p>
                  </div>
                </div>

                {/* Información del Usuario y Fechas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Usuario */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <User size={18} className="mr-2 text-green-600" />
                      Información del Usuario
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="bg-white border border-green-100 rounded-lg p-3">
                        <span className="text-gray-600 text-xs uppercase tracking-wide">Nombre Completo</span>
                        <p className="font-semibold text-gray-900 text-lg">{ticket.userName}</p>
                      </div>
                      <div className="bg-white border border-green-100 rounded-lg p-3">
                        <span className="text-gray-600 text-xs uppercase tracking-wide">Área de Trabajo</span>
                        <p className="font-semibold text-gray-900 flex items-center">
                          <MapPin size={16} className="mr-2 text-green-600" />
                          {ticket.area}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fechas */}
                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <Calendar size={18} className="mr-2 text-purple-600" />
                      Información de Fechas
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="bg-white border border-purple-100 rounded-lg p-3">
                        <span className="text-gray-600 text-xs uppercase tracking-wide">Fecha de Creación</span>
                        <p className="font-semibold text-gray-900">
                          {format(ticket.createdAt, 'dd/MM/yyyy', { locale: es })}
                        </p>
                        <p className="text-sm text-purple-600 flex items-center mt-1">
                          <Clock size={14} className="mr-1" />
                          {format(ticket.createdAt, 'HH:mm', { locale: es })}
                        </p>
                      </div>
                      <div className="bg-white border border-purple-100 rounded-lg p-3">
                        <span className="text-gray-600 text-xs uppercase tracking-wide">Última Actualización</span>
                        <p className="font-semibold text-gray-900">
                          {format(ticket.updatedAt, 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Información de la Impresora */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Printer size={18} className="mr-2 text-orange-600" />
                    Información de la Impresora Afectada
                  </h3>
                  
                  {printer ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="bg-white border border-orange-100 rounded-lg p-3">
                          <span className="text-gray-600 text-xs uppercase tracking-wide">Modelo</span>
                          <p className="font-semibold text-gray-900">{printer.model}</p>
                          <p className="text-sm text-orange-600">{printer.brand}</p>
                        </div>
                        <div className="bg-white border border-orange-100 rounded-lg p-3">
                          <span className="text-gray-600 text-xs uppercase tracking-wide">Ubicación</span>
                          <p className="font-semibold text-gray-900 flex items-center">
                            <MapPin size={16} className="mr-2 text-orange-600" />
                            {printer.location}
                          </p>
                        </div>
                        <div className="bg-white border border-orange-100 rounded-lg p-3">
                          <span className="text-gray-600 text-xs uppercase tracking-wide">Sede</span>
                          <p className="font-semibold text-gray-900">{printer.sede || 'No definida'}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-white border border-orange-100 rounded-lg p-3">
                          <span className="text-gray-600 text-xs uppercase tracking-wide">Dirección IP</span>
                          <p className="font-semibold text-blue-600 flex items-center">
                            <Network size={16} className="mr-2" />
                            {printer.ip}
                          </p>
                        </div>
                        <div className="bg-white border border-orange-100 rounded-lg p-3">
                          <span className="text-gray-600 text-xs uppercase tracking-wide">Número de Serie</span>
                          <p className="font-semibold text-gray-900 font-mono flex items-center">
                            <Hash size={16} className="mr-2 text-orange-600" />
                            {printer.serial}
                          </p>
                        </div>
                        <div className="bg-white border border-orange-100 rounded-lg p-3">
                          <span className="text-gray-600 text-xs uppercase tracking-wide">Estado</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            printer.status === 'operativa' ? 'bg-green-100 text-green-800' :
                            printer.status === 'disponible' ? 'bg-blue-100 text-blue-800' :
                            printer.status === 'backup' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {printer.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                        <span className="font-medium text-red-800">Impresora no encontrada</span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">
                        La impresora asociada a este ticket ya no existe en el sistema.
                      </p>
                    </div>
                  )}
                </div>

                {/* Información Adicional */}
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Información Adicional</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-100 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Estado del Ticket</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">ID del Ticket:</span>
                          <span className="font-mono text-gray-900">{ticket.id.slice(0, 8)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Prioridad:</span>
                          <span className={`font-medium ${
                            ticket.isIncident ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {ticket.isIncident ? 'Alta (Incidente)' : 'Normal (Servicio)'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-slate-100 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Registro del Sistema</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Registrado:</span>
                          <span className="font-medium text-gray-900">
                            {format(ticket.createdAt, 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Modificado:</span>
                          <span className="font-medium text-gray-900">
                            {format(ticket.updatedAt, 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}