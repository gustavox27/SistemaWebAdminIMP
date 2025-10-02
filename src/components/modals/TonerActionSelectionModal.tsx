import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCcw, Package } from 'lucide-react';

interface TonerActionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChangeToner: () => void;
  onBackupToner: () => void;
  printerModel: string;
  printerLocation: string;
}

export default function TonerActionSelectionModal({ 
  isOpen, 
  onClose, 
  onChangeToner, 
  onBackupToner,
  printerModel,
  printerLocation 
}: TonerActionSelectionModalProps) {
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
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <RefreshCcw size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Seleccionar Acción</h2>
                    <p className="text-blue-100">{printerModel} - {printerLocation}</p>
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
            <div className="p-6">
              <p className="text-gray-600 mb-6">
                ¿Qué acción deseas realizar con el toner?
              </p>

              <div className="space-y-4">
                <button
                  onClick={onChangeToner}
                  className="w-full p-4 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <RefreshCcw className="h-6 w-6 text-green-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-green-800">Cambiar Toner</h3>
                      <p className="text-sm text-green-600">
                        Realizar cambio completo de toner con ciclo de motor
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={onBackupToner}
                  className="w-full p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <Package className="h-6 w-6 text-yellow-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-yellow-800">Dejar Toner Backup</h3>
                      <p className="text-sm text-yellow-600">
                        Dejar toner en área de backup (ciclo de motor opcional)
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}