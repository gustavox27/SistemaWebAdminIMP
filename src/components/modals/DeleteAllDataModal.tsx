import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertTriangle, Type } from 'lucide-react';
import { dataMigrationService } from '../../services/dataMigrationService';
import toast from 'react-hot-toast';

interface DeleteAllDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataStats: {
    printers: number;
    inventory: number;
    orders: number;
    changes: number;
    loans: number;
    emptyToners: number;
    users: number;
    operators: number;
    tonerModels: number;
    total: number;
  };
}

export default function DeleteAllDataModal({ isOpen, onClose, dataStats }: DeleteAllDataModalProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const CONFIRMATION_PHRASE = 'ELIMINAR TODO';
  const isConfirmationValid = confirmationText === CONFIRMATION_PHRASE;

  const handleConfirm = async () => {
    if (!isConfirmationValid) return;

    setIsDeleting(true);
    try {
      await dataMigrationService.deleteAllData();
      toast.success('Todos los datos han sido eliminados exitosamente');
      
      // Recargar la página después de un breve delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      toast.error('Error al eliminar los datos');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmationText('');
      onClose();
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
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-red-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Trash2 size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Eliminar Todos los Datos</h2>
                    <p className="text-red-100">Esta acción es irreversible</p>
                  </div>
                </div>
                
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-red-700 rounded-lg transition-colors"
                  disabled={isDeleting}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col max-h-[75vh]">
              <div className="p-6 overflow-y-auto flex-1">
              {/* Advertencia principal */}
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
                <div className="flex items-center mb-3">
                  <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
                  <span className="font-bold text-red-800 text-lg">¡ADVERTENCIA CRÍTICA!</span>
                </div>
                <div className="text-red-700 space-y-2">
                  <p className="font-medium">Esta acción eliminará PERMANENTEMENTE todos los datos del sistema:</p>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                    <li>Todas las impresoras y su configuración</li>
                    <li>Todo el inventario de toners</li>
                    <li>Todos los pedidos y órdenes</li>
                    <li>Todo el historial de cambios</li>
                    <li>Todos los préstamos y devoluciones</li>
                    <li>Todos los usuarios y operadores</li>
                    <li>Toda la configuración del sistema</li>
                  </ul>
                  <p className="font-bold mt-3">NO HAY FORMA DE RECUPERAR ESTOS DATOS UNA VEZ ELIMINADOS</p>
                </div>
              </div>

              {/* Estadísticas de datos a eliminar */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos que se Eliminarán</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600">{dataStats.printers}</div>
                    <div className="text-sm text-red-800">Impresoras</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600">{dataStats.inventory}</div>
                    <div className="text-sm text-red-800">Items de Inventario</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600">{dataStats.orders}</div>
                    <div className="text-sm text-red-800">Pedidos</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600">{dataStats.changes}</div>
                    <div className="text-sm text-red-800">Cambios de Toner</div>
                  </div>
                </div>

                <div className="bg-gray-900 text-white p-4 rounded-lg text-center">
                  <div className="text-4xl font-bold">{dataStats.total}</div>
                  <div className="text-sm">TOTAL DE REGISTROS A ELIMINAR</div>
                </div>
              </div>

              {/* Recomendaciones */}
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                <h4 className="font-bold text-yellow-800 mb-2">Recomendaciones Antes de Continuar:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>✓ Asegúrate de tener un respaldo actualizado de todos los datos</li>
                  <li>✓ Confirma que realmente necesitas eliminar toda la información</li>
                  <li>✓ Considera si puedes eliminar solo datos específicos en lugar de todo</li>
                  <li>✓ Informa a otros usuarios del sistema sobre esta acción</li>
                </ul>
              </div>

              {/* Confirmación por texto */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Confirmación Requerida</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Para confirmar que entiendes las consecuencias, escribe exactamente la siguiente frase:
                </p>
                
                <div className="bg-gray-100 p-3 rounded-lg mb-3 text-center">
                  <code className="font-bold text-lg text-red-600">{CONFIRMATION_PHRASE}</code>
                </div>
                
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="Escribe la frase de confirmación aquí"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent ${
                      confirmationText && !isConfirmationValid 
                        ? 'border-red-300 focus:ring-red-500 bg-red-50' 
                        : confirmationText && isConfirmationValid
                        ? 'border-green-300 focus:ring-green-500 bg-green-50'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    disabled={isDeleting}
                  />
                </div>
                
                {confirmationText && !isConfirmationValid && (
                  <p className="text-sm text-red-600 mt-2">
                    La frase no coincide. Debe ser exactamente: "{CONFIRMATION_PHRASE}"
                  </p>
                )}
                
                {isConfirmationValid && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ Confirmación válida
                  </p>
                )}
              </div>
            </div>

              {/* Footer with buttons */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleClose}
                    disabled={isDeleting}
                    className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!isConfirmationValid || isDeleting || dataStats.total === 0}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        ELIMINAR TODO
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