import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard as Edit, Save, Plus } from 'lucide-react';
import { TonerOrder } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';
import FuserModelManagementModal from './FuserModelManagementModal';
import TonerModelManagementModal from './TonerModelManagementModal';

interface EditOrderModalProps {
  order: TonerOrder;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditOrderModal({ order, isOpen, onClose }: EditOrderModalProps) {
  const { printers, tonerModels, fuserModels, updateOrder } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFuserModelManagement, setShowFuserModelManagement] = useState(false);
  const [showTonerModelManagement, setShowTonerModelManagement] = useState(false);
  const [supplyType, setSupplyType] = useState<'toner' | 'fuser'>(() => {
    // Determinar el tipo basado en el modelo actual del pedido
    const isFuser = fuserModels.some(model => model.name === order.tonerModel);
    return isFuser ? 'fuser' : 'toner';
  });
  const [formData, setFormData] = useState({
    trackingNumber: order.trackingNumber,
    printerId: order.printerId,
    description: order.description,
    quantity: order.quantity.toString(),
    tonerModel: order.tonerModel
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Auto-seleccionar modelo de toner cuando se cambia la impresora
    if (name === 'printerId') {
      const selectedPrinter = printers.find(p => p.id === value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        tonerModel: selectedPrinter?.tonerModel || prev.tonerModel
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updatedOrder: TonerOrder = {
        ...order,
        trackingNumber: formData.trackingNumber,
        printerId: formData.printerId,
        description: formData.description,
        quantity: parseInt(formData.quantity),
        tonerModel: formData.tonerModel,
        updatedAt: new Date()
      };

      updateOrder(order.id, updatedOrder);
      await supabaseService.update('orders', updatedOrder);
      
      toast.success('Pedido actualizado exitosamente');
      onClose();
    } catch (error) {
      toast.error('Error al actualizar el pedido');
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
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="bg-blue-600 text-white p-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Edit size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Editar Pedido</h2>
                    <p className="text-blue-100">#{order.trackingNumber}</p>
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
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Número de Envío */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Envío *
                  </label>
                  <input
                    type="text"
                    name="trackingNumber"
                    value={formData.trackingNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

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
                    Tipo de Suministro *
                  </label>
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="supplyType"
                        value="toner"
                        checked={supplyType === 'toner'}
                        onChange={(e) => setSupplyType(e.target.value as 'toner' | 'fuser')}
                        className="mr-2"
                      />
                      <span>Toner</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="supplyType"
                        value="fuser"
                        checked={supplyType === 'fuser'}
                        onChange={(e) => setSupplyType(e.target.value as 'toner' | 'fuser')}
                        className="mr-2"
                      />
                      <span>Fusor</span>
                    </label>
                  </div>
                  
                  <select
                    name="tonerModel"
                    value={formData.tonerModel}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seleccionar modelo de {supplyType === 'toner' ? 'toner' : 'fusor'}</option>
                    {/* Mostrar el toner de la impresora seleccionada primero */}
                    {supplyType === 'toner' && (() => {
                      const selectedPrinter = printers.find(p => p.id === formData.printerId);
                      return selectedPrinter && selectedPrinter.tonerModel && (
                        <option key={`printer-${selectedPrinter.id}`} value={selectedPrinter.tonerModel}>
                          {selectedPrinter.tonerModel} (Toner de esta impresora)
                        </option>
                      );
                    })()}
                    {/* Mostrar otros modelos disponibles */}
                    {(supplyType === 'toner' ? tonerModels : fuserModels).map((model) => {
                      const selectedPrinter = printers.find(p => p.id === formData.printerId);
                      return (supplyType === 'toner' ? selectedPrinter?.tonerModel !== model.name : true) && (
                        <option key={model.id} value={model.name}>
                          {model.name} {
                            supplyType === 'toner' 
                              ? (model.capacity && `(${model.capacity.toLocaleString()} pág.)`)
                              : `(${(model as any).lifespan?.toLocaleString()} pág.)`
                          }
                        </option>
                      );
                    })}
                  </select>
                  
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowTonerModelManagement(true)}
                      className={`px-3 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                        supplyType === 'toner' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
                      }`}
                      title="Gestionar modelos de toner"
                      disabled={supplyType !== 'toner'}
                    >
                      <Plus size={16} />
                      Gestionar Toners
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFuserModelManagement(true)}
                      className={`px-3 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                        supplyType === 'fuser' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-400 cursor-not-allowed'
                      }`}
                      title="Gestionar modelos de fusor"
                      disabled={supplyType !== 'fuser'}
                    >
                      <Plus size={16} />
                      Gestionar Fusores
                    </button>
                  </div>
                </div>

                {/* Campo de entrada manual como fallback */}
                {!formData.tonerModel && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      O ingrese modelo de {supplyType === 'toner' ? 'toner' : 'fusor'} manualmente
                    </label>
                    <input
                      type="text"
                      name="tonerModel"
                      value={formData.tonerModel}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={supplyType === 'toner' ? "Ej: W9004mc, CF259A" : "Ej: RM2-5425, RM2-6308"}
                    />
                  </div>
                )}

                {/* Información del modelo seleccionado */}
                {formData.tonerModel && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    {(() => {
                      const selectedModel = supplyType === 'toner' 
                        ? tonerModels.find(m => m.name === formData.tonerModel)
                        : fuserModels.find(m => m.name === formData.tonerModel);
                      return selectedModel ? (
                        <div>
                          <p className="text-sm text-blue-800">
                            <strong>{supplyType === 'toner' ? 'Capacidad' : 'Vida útil'}:</strong> {
                              supplyType === 'toner' 
                                ? (selectedModel.capacity?.toLocaleString() || 'No especificada')
                                : ((selectedModel as any).lifespan?.toLocaleString() || 'No especificada')
                            } páginas
                          </p>
                          {selectedModel.description && (
                            <p className="text-sm text-blue-600 mt-1">
                              {selectedModel.description}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-blue-800">Modelo personalizado de {supplyType === 'toner' ? 'toner' : 'fusor'}</p>
                      );
                    })()}
                  </div>
                )}

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
                    min="1"
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
                    placeholder={`Descripción del pedido de ${supplyType === 'toner' ? 'toner' : 'fusor'}...`}
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
            </div>
          </motion.div>

          {/* Fuser Model Management Modal */}
          {showFuserModelManagement && (
            <FuserModelManagementModal
              isOpen={showFuserModelManagement}
              onClose={() => setShowFuserModelManagement(false)}
            />
          )}

          {/* Toner Model Management Modal */}
          {showTonerModelManagement && (
            <TonerModelManagementModal
              isOpen={showTonerModelManagement}
              onClose={() => setShowTonerModelManagement(false)}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}