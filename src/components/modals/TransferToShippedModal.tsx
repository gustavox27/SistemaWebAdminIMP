import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Package, CheckCircle, Calendar } from 'lucide-react';
import { EmptyToner } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

interface TransferToShippedModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  emptyToners: EmptyToner[];
}

export default function TransferToShippedModal({ 
  isOpen, 
  onClose, 
  selectedIds, 
  emptyToners 
}: TransferToShippedModalProps) {
  const { updateEmptyToner } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shippingDate, setShippingDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const tonersToShip = emptyToners.filter(t => selectedIds.includes(t.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Crear fecha con hora actual para mejor rastreo
      const [year, month, day] = shippingDate.split('-').map(Number);
      const now = new Date();
      const selectedDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());

      for (const toner of tonersToShip) {
        const updatedToner = {
          ...toner,
          category: 'shipped' as const,
          status: 'shipped' as const,
          changeDate: selectedDate, // Actualizar fecha y hora de cambio al momento del envío
          updatedAt: selectedDate
        };

        updateEmptyToner(toner.id, updatedToner);
        await supabaseService.update('emptyToners', updatedToner);
      }

      toast.success(`${tonersToShip.length} toner(s) marcado(s) como enviado(s) exitosamente`);
      onClose();
    } catch (error) {
      toast.error('Error al marcar los toners como enviados');
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
                  <Send size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Marcar como Enviados</h2>
                    <p className="text-purple-100">Mover toners del almacén a enviados</p>
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
              <div className="mb-6">
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg mb-4">
                  <div className="flex items-center mb-2">
                    <Package className="h-5 w-5 text-purple-600 mr-2" />
                    <span className="font-medium text-purple-800">Información del Envío</span>
                  </div>
                  <p className="text-sm text-purple-700">
                    Se marcarán como enviados <strong>{tonersToShip.length}</strong> toner(s) vacío(s) 
                    del almacén. Estos toners aparecerán en la pestaña "Enviados".
                  </p>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Toners a Marcar como Enviados
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Fecha de Envío */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Calendar size={16} className="mr-2" />
                    Fecha de Envío *
                  </label>
                  <input
                    type="date"
                    value={shippingDate}
                    onChange={(e) => setShippingDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  {tonersToShip.map((toner) => (
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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle size={12} className="mr-1" />
                            Listo para Envío
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">Resultado del Envío</h4>
                  <div className="text-sm text-purple-700 space-y-1">
                    <p>• Los toners cambiarán de estado a "Enviado"</p>
                    <p>• Se moverán de la pestaña "En Almacén" a "Enviados"</p>
                    <p>• Se registrará la fecha de envío</p>
                    <p>• Quedarán marcados como procesados completamente</p>
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
                    disabled={isSubmitting || tonersToShip.length === 0}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Marcar como Enviados
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