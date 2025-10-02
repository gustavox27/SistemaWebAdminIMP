import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Package, CheckCircle, Calendar } from 'lucide-react';
import { EmptyToner } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

interface TransferToWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  emptyToners: EmptyToner[];
}

export default function TransferToWarehouseModal({ 
  isOpen, 
  onClose, 
  selectedIds, 
  emptyToners 
}: TransferToWarehouseModalProps) {
  const { updateEmptyToner } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferDate, setTransferDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const tonersToTransfer = emptyToners.filter(t => selectedIds.includes(t.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Crear fecha con hora actual para mejor rastreo
      const [year, month, day] = transferDate.split('-').map(Number);
      const now = new Date();
      const selectedDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());

      for (const toner of tonersToTransfer) {
        const updatedToner = {
          ...toner,
          category: 'warehouse' as const,
          status: 'ready_shipping' as const,
          changeDate: selectedDate, // Actualizar fecha y hora de cambio al momento del traslado
          updatedAt: selectedDate
        };

        updateEmptyToner(toner.id, updatedToner);
        await supabaseService.update('emptyToners', updatedToner);
      }

      toast.success(`${tonersToTransfer.length} toner(s) trasladado(s) al almacén exitosamente`);
      onClose();
    } catch (error) {
      toast.error('Error al trasladar los toners al almacén');
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
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ArrowRight size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Trasladar a Almacén</h2>
                    <p className="text-blue-100">Mover toners del área de trabajo al almacén</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                  <div className="flex items-center mb-2">
                    <Package className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-800">Información del Traslado</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Se trasladarán <strong>{tonersToTransfer.length}</strong> toner(s) vacío(s) 
                    del área de trabajo al almacén para su posterior envío.
                  </p>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Toners a Trasladar
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Fecha de Traslado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Calendar size={16} className="mr-2" />
                    Fecha de Traslado *
                  </label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    max={(() => {
                      const today = new Date();
                      const year = today.getFullYear();
                      const month = String(today.getMonth() + 1).padStart(2, '0');
                      const day = String(today.getDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    })()}
                  />
                </div>

                {/* Lista de Toners */}
                <div className="space-y-3">
                  {tonersToTransfer.map((toner) => (
                    <div key={toner.id} className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {toner.tonerModel}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {toner.printerModel} - {toner.printerLocation}
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Cambio: {format(toner.changeDate, 'dd/MM/yyyy HH:mm', { locale: es })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <CheckCircle size={12} className="mr-1" />
                            Listo para Recoger
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Resultado del Traslado</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>• Los toners cambiarán de estado a "Listo para Envío"</p>
                    <p>• Se moverán de la pestaña "En Área" a "En Almacén"</p>
                    <p>• Estarán listos para el proceso de devolución</p>
                    <p>• Se actualizará la fecha de traslado</p>
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
                    disabled={isSubmitting || tonersToTransfer.length === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Trasladando...
                      </>
                    ) : (
                      <>
                        <ArrowRight size={16} />
                        Trasladar al Almacén
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}