import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Palette } from 'lucide-react';

interface PrinterTypeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMonochrome: () => void;
  onSelectColor: () => void;
}

export default function PrinterTypeSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectMonochrome, 
  onSelectColor 
}: PrinterTypeSelectionModalProps) {
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
                  <Printer size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Tipo de Impresora</h2>
                    <p className="text-blue-100">Selecciona el tipo de impresora a agregar</p>
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
              <div className="space-y-4">
                <button
                  onClick={onSelectMonochrome}
                  className="w-full p-6 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all text-left group"
                >
                  <div className="flex items-center">
                    <div className="bg-gray-600 p-3 rounded-lg mr-4 group-hover:bg-gray-700 transition-colors">
                      <Printer className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Impresora Monocromática</h3>
                      <p className="text-sm text-gray-600">
                        Impresora de un solo color (generalmente negro)
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={onSelectColor}
                  className="w-full p-6 bg-gradient-to-r from-cyan-50 to-purple-50 border-2 border-purple-200 rounded-lg hover:from-cyan-100 hover:to-purple-100 hover:border-purple-300 transition-all text-left group"
                >
                  <div className="flex items-center">
                    <div className="bg-gradient-to-r from-cyan-500 to-purple-500 p-3 rounded-lg mr-4 group-hover:from-cyan-600 group-hover:to-purple-600 transition-all">
                      <Palette className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Impresora a Color</h3>
                      <p className="text-sm text-gray-600">
                        Impresora con múltiples colores de toner
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