import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Check } from 'lucide-react';
import { Printer } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';

interface MotorCycleCaptureModalProps {
  printer: Printer;
  isOpen: boolean;
  onClose: () => void;
}

export default function MotorCycleCaptureModal({ printer, isOpen, onClose }: MotorCycleCaptureModalProps) {
  const { updatePrinter, changes, updateChange, emptyToners, updateEmptyToner } = useStore();
  const [motorCycle, setMotorCycle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!motorCycle.trim()) {
      toast.error('El ciclo de motor es obligatorio');
      return;
    }

    const motorCycleValue = parseInt(motorCycle);
    if (isNaN(motorCycleValue) || motorCycleValue < 0) {
      toast.error('El ciclo de motor debe ser un número válido');
      return;
    }

    setIsSubmitting(true);

    try {
      const pendingChange = changes.find(change =>
        change.printerId === printer.id &&
        change.motorCyclePending === true
      );

      if (pendingChange) {
        const updatedChange = {
          ...pendingChange,
          motorCycle: motorCycleValue,
          motorCyclePending: false,
          updatedAt: new Date()
        };

        await supabaseService.update('changes', updatedChange);
        updateChange(pendingChange.id, updatedChange);
      }

      const updatedPrinter: Printer = {
        ...printer,
        motorCycle: motorCycleValue,
        currentTonerLevel: 100,
        hasBackupToner: false,
        motorCyclePending: false,
        updatedAt: new Date()
      };

      await supabaseService.update('printers', updatedPrinter);
      updatePrinter(printer.id, updatedPrinter);

      const relatedEmptyToner = emptyToners.find(empty =>
        empty.printerLocation === printer.location &&
        empty.status === 'pending_cycle' &&
        empty.isBackup === true
      );

      if (relatedEmptyToner) {
        const updatedEmptyToner = {
          ...relatedEmptyToner,
          category: 'area' as const,
          status: 'ready_pickup' as const,
          motorCycleCaptured: true,
          updatedAt: new Date()
        };

        await supabaseService.update('emptyToners', updatedEmptyToner);
        updateEmptyToner(relatedEmptyToner.id, updatedEmptyToner);
      }

      toast.success('Ciclo de motor capturado exitosamente');
      setMotorCycle('');
      onClose();
    } catch (error) {
      console.error('Error al capturar el ciclo de motor:', error);
      toast.error(`Error al capturar el ciclo de motor: ${error instanceof Error ? error.message : 'Error desconocido'}`);
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
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            {/* Header */}
            <div className="bg-orange-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Settings size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Capturar Ciclo de Motor</h2>
                    <p className="text-orange-100">{printer.model} - {printer.location}</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-orange-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Información:</strong> Esta impresora tiene un toner backup pendiente de 
                    registrar el ciclo de motor. Por favor, ingresa el ciclo actual.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Ciclo de Motor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ciclo de Motor *
                  </label>
                  <input
                    type="number"
                    value={motorCycle}
                    onChange={(e) => setMotorCycle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Ingrese el ciclo de motor actual"
                    required
                    min="0"
                  />
                </div>

                {/* Información adicional */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Información de la Impresora</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Modelo:</strong> {printer.model}</p>
                    <p><strong>Ubicación:</strong> {printer.location}</p>
                    <p><strong>IP:</strong> {printer.ip}</p>
                    <p><strong>Serie:</strong> {printer.serial}</p>
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
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Capturar Ciclo
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