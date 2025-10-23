import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard as Edit, Save } from 'lucide-react';
import { TonerInventory } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';

interface EditInventoryModalProps {
  item: TonerInventory;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditInventoryModal({ item, isOpen, onClose }: EditInventoryModalProps) {
  const { printers, updateInventory } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    printerId: item.printerId,
    tonerModel: item.tonerModel,
    description: item.description,
    quantity: item.quantity.toString()
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updatedItem: TonerInventory = {
        ...item,
        printerId: formData.printerId,
        tonerModel: formData.tonerModel,
        description: formData.description,
        quantity: parseInt(formData.quantity),
        updatedAt: new Date()
      };

      await supabaseService.update('inventory', updatedItem);
      updateInventory(item.id, updatedItem);

      toast.success('Item actualizado exitosamente');
      onClose();
    } catch (error) {
      toast.error('Error al actualizar el item');
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
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Edit size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Editar Inventario</h2>
                    <p className="text-blue-100">{item.tonerModel}</p>
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
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Impresora */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Impresora *
                  </label>
                  <select
                    name="printerId"
                    value={formData.printerId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seleccionar impresora</option>
                    {printers.map((printer) => (
                      <option key={printer.id} value={printer.id}>
                        {printer.model} - {printer.location}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Modelo de Toner */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modelo de Toner *
                  </label>
                  <input
                    type="text"
                    name="tonerModel"
                    value={formData.tonerModel}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Cantidad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    required
                  />
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
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save size={16} />
                    {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
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