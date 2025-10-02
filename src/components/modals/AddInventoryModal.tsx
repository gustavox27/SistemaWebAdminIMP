import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Save, Settings, Search } from 'lucide-react';
import { TonerInventory } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';
import TonerModelManagementModal from './TonerModelManagementModal';
import FuserModelManagementModal from './FuserModelManagementModal';
import PrinterSelectionModal from './PrinterSelectionModal';

interface AddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddInventoryModal({ isOpen, onClose }: AddInventoryModalProps) {
  const { printers, tonerModels, fuserModels, inventory, addInventory, updateInventory } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTonerModelManagement, setShowTonerModelManagement] = useState(false);
  const [showFuserModelManagement, setShowFuserModelManagement] = useState(false);
  const [showPrinterSelection, setShowPrinterSelection] = useState(false);
  const [itemType, setItemType] = useState<'toner' | 'fuser'>('toner');
  const [formData, setFormData] = useState({
    printerId: '',
    tonerModel: '',
    description: '',
    quantity: '1'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePrinterSelect = (printer: any) => {
    setFormData(prev => ({
      ...prev,
      printerId: printer.id
    }));
    setShowPrinterSelection(false);
  };

  const selectedPrinter = printers.find(p => p.id === formData.printerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Buscar si ya existe inventario para esta impresora y modelo de toner/fusor
      const existingInventory = inventory.find(
        item => item.printerId === formData.printerId && item.tonerModel === formData.tonerModel
      );

      if (existingInventory) {
        // Actualizar inventario existente sumando la cantidad
        const updatedInventory: TonerInventory = {
          ...existingInventory,
          quantity: existingInventory.quantity + parseInt(formData.quantity),
          description: formData.description || existingInventory.description, // Mantener descripción existente si no se proporciona nueva
          updatedAt: new Date()
        };
        
        updateInventory(existingInventory.id, updatedInventory);
        await supabaseService.update('inventory', updatedInventory);
        
        toast.success(`Cantidad actualizada: +${formData.quantity} unidades (Total: ${updatedInventory.quantity})`);
      } else {
        // Crear nuevo item de inventario
        const newInventoryItem: TonerInventory = {
          id: crypto.randomUUID(),
          printerId: formData.printerId,
          tonerModel: formData.tonerModel,
          description: formData.description,
          quantity: parseInt(formData.quantity),
          onLoan: false,
          loanMessage: '',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        addInventory(newInventoryItem);
        await supabaseService.add('inventory', newInventoryItem);
        
        toast.success('Item agregado al inventario exitosamente');
      }
      
      onClose();
      
      // Reset form
      setFormData({
        printerId: '',
        tonerModel: '',
        description: '',
        quantity: '1'
      });
    } catch (error) {
      toast.error('Error al agregar el item al inventario');
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
                  <Plus size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Agregar al Inventario</h2>
                    <p className="text-blue-100">Nuevo item de toner</p>
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
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Impresora */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Impresora *
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      {selectedPrinter ? (
                        <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                          <div className="text-sm font-medium">{selectedPrinter.model}</div>
                          <div className="text-xs text-gray-500">
                            {selectedPrinter.location} - Serie: {selectedPrinter.serial}
                          </div>
                        </div>
                      ) : (
                        <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                          Seleccionar impresora
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPrinterSelection(true)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Search size={16} />
                    </button>
                  </div>
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
                        name="itemType"
                        value="toner"
                        checked={itemType === 'toner'}
                        onChange={(e) => setItemType(e.target.value as 'toner' | 'fuser')}
                        className="mr-2"
                      />
                      <span>Toner</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="itemType"
                        value="fuser"
                        checked={itemType === 'fuser'}
                        onChange={(e) => setItemType(e.target.value as 'toner' | 'fuser')}
                        className="mr-2"
                      />
                      <span>Fusor</span>
                    </label>
                  </div>
                  
                  <div className="flex gap-2">
                    <select
                      name="tonerModel"
                      value={formData.tonerModel}
                      onChange={handleChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Seleccionar modelo de {itemType === 'toner' ? 'toner' : 'fusor'}</option>
                      {(itemType === 'toner' ? tonerModels : fuserModels).map((model) => (
                        <option key={model.id} value={model.name}>
                          {model.name} {
                            itemType === 'toner' 
                              ? (model.capacity && `(${model.capacity.toLocaleString()} pág.)`)
                              : `(${(model as any).lifespan?.toLocaleString()} pág.)`
                          }
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => itemType === 'toner' ? setShowTonerModelManagement(true) : setShowFuserModelManagement(true)}
                      className={`px-3 py-2 text-white rounded-lg transition-colors ${
                        itemType === 'toner' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
                      }`}
                      title={`Gestionar modelos de ${itemType === 'toner' ? 'toner' : 'fusor'}`}
                    >
                      <Settings size={16} />
                    </button>
                  </div>
                </div>

                {/* Campo de entrada manual como fallback */}
                {!formData.tonerModel && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      O ingrese modelo manualmente
                    </label>
                    <input
                      type="text"
                      name="tonerModel"
                      value={formData.tonerModel}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={itemType === 'toner' ? "Ej: W9004mc, CF259A" : "Ej: RM2-5425, RM2-6308"}
                    />
                  </div>
                )}

                {/* Mostrar capacidad si se selecciona un modelo */}
                {formData.tonerModel && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    {(() => {
                      const selectedModel = itemType === 'toner' 
                        ? tonerModels.find(m => m.name === formData.tonerModel)
                        : fuserModels.find(m => m.name === formData.tonerModel);
                      return selectedModel ? (
                        <div>
                          <p className="text-sm text-blue-800">
                            <strong>{itemType === 'toner' ? 'Capacidad' : 'Vida útil'}:</strong> {
                              itemType === 'toner' 
                                ? (selectedModel.capacity?.toLocaleString() || 'No especificada')
                                : ((selectedModel as any).lifespan?.toLocaleString() || 'No especificada')
                            } páginas
                          </p>
                          {selectedModel.description && (
                            <p className="text-sm text-blue-600 mt-1">
                              <strong>Descripción:</strong> {selectedModel.description}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-blue-800">Modelo personalizado</p>
                      );
                    })()}
                  </div>
                )}

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
                    placeholder="Descripción del toner..."
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
                    min="1"
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
                    {isSubmitting ? 'Guardando...' : 'Agregar'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Toner Model Management Modal */}
          {showTonerModelManagement && (
            <TonerModelManagementModal
              isOpen={showTonerModelManagement}
              onClose={() => setShowTonerModelManagement(false)}
            />
          )}

          {/* Fuser Model Management Modal */}
          {showFuserModelManagement && (
            <FuserModelManagementModal
              isOpen={showFuserModelManagement}
              onClose={() => setShowFuserModelManagement(false)}
            />
          )}
          {/* Printer Selection Modal */}
          {showPrinterSelection && (
            <PrinterSelectionModal
              isOpen={showPrinterSelection}
              onClose={() => setShowPrinterSelection(false)}
              onSelect={handlePrinterSelect}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}