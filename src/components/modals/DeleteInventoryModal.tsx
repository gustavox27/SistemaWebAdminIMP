import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { TonerInventory } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';

interface DeleteInventoryModalProps {
  item: TonerInventory;
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteInventoryModal({ item, isOpen, onClose }: DeleteInventoryModalProps) {
  const { updateInventory, deleteInventory, printers } = useStore();
  const [quantityToDelete, setQuantityToDelete] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const printer = printers.find(p => p.id === item.printerId);

  // Si el item tiene stock 0, solo permitir eliminación completa
  const isZeroStock = item.quantity === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (quantityToDelete >= item.quantity || isZeroStock) {
        // Eliminar todo el item del inventario
        deleteInventory(item.id);
        await supabaseService.delete('inventory', item.id);
        toast.success(isZeroStock ? 'Item con stock 0 eliminado del inventario' : 'Item eliminado completamente del inventario');
      } else {
        // Reducir la cantidad
        const updatedItem: TonerInventory = {
          ...item,
          quantity: item.quantity - quantityToDelete,
          updatedAt: new Date()
        };
        
        updateInventory(item.id, updatedItem);
        await supabaseService.update('inventory', updatedItem);
        toast.success(`${quantityToDelete} unidad(es) eliminada(s) del inventario`);
      }
      
      onClose();
    } catch (error) {
      toast.error('Error al eliminar del inventario');
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
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            {/* Header */}
            <div className="bg-red-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Trash2 size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Eliminar del Inventario</h2>
                    <p className="text-red-100">{item.tonerModel}</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="font-medium text-yellow-800">Información del Item</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Impresora:</span>
                    <span className="font-medium">{printer?.model} - {printer?.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Modelo de Toner:</span>
                    <span className="font-medium">{item.tonerModel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cantidad disponible:</span>
                    <span className="font-medium text-blue-600">{item.quantity} unidades</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Cantidad a eliminar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isZeroStock ? 'Eliminar item completo' : 'Cantidad a eliminar *'}
                  </label>
                  {isZeroStock ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                      Se eliminará completamente (stock actual: 0)
                    </div>
                  ) : (
                    <>
                      <input
                        type="number"
                        value={quantityToDelete}
                        onChange={(e) => setQuantityToDelete(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        min="1"
                        max={item.quantity}
                        required
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Máximo: {item.quantity} unidades
                      </p>
                    </>
                  )}
                </div>

                {/* Información de la acción */}
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    {quantityToDelete >= item.quantity || isZeroStock ? (
                      <>
                        <strong>Se eliminará completamente</strong> este item del inventario.
                        {isZeroStock && (
                          <span className="block mt-1 text-red-600">
                            Este item tiene stock 0 y será eliminado permanentemente.
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        Se eliminarán <strong>{quantityToDelete}</strong> unidad(es). 
                        Quedarán <strong>{item.quantity - quantityToDelete}</strong> unidad(es) disponibles.
                      </>
                    )}
                  </p>
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
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    {isSubmitting ? 'Eliminando...' : 'Eliminar'}
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