import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Check, Plus } from 'lucide-react';

interface ExistingOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCreateNew: () => void;
  printerLocation: string;
}

export default function ExistingOrderModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onCreateNew,
  printerLocation 
}: ExistingOrderModalProps) {
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
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            {/* Header */}
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Pedido Existente</h2>
                    <p className="text-blue-100">{printerLocation}</p>
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
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-800">Información</span>
                </div>
                <p className="text-gray-700">
                  La impresora <strong>{printerLocation}</strong> ya tiene un pedido registrado.
                </p>
                <p className="text-gray-600 mt-2">
                  ¿Deseas continuar con el préstamo de toner o registrar un nuevo pedido?
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onCreateNew}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Nuevo Pedido
                </button>
                <button
                  onClick={onConfirm}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Check size={16} />
                  Continuar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}