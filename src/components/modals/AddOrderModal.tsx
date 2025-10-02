import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Save, Search } from 'lucide-react';
import { TonerOrder } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';
import { COLOR_OPTIONS } from '../../utils/colorPrinterUtils';
import PrinterSelectionModal from './PrinterSelectionModal';
import TonerModelManagementModal from './TonerModelManagementModal';
import FuserModelManagementModal from './FuserModelManagementModal';

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPrinterId?: string;
  preselectedColorToner?: any;
  onOrderCreated?: () => void;
}

export default function AddOrderModal({ isOpen, onClose, preselectedPrinterId, preselectedColorToner, onOrderCreated }: AddOrderModalProps) {
  const { printers, tonerModels, fuserModels, addOrder, getNextTrackingNumber } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrinterSelection, setShowPrinterSelection] = useState(false);
  const [showTonerModelManagement, setShowTonerModelManagement] = useState(false);
  const [showFuserModelManagement, setShowFuserModelManagement] = useState(false);
  const [supplyType, setSupplyType] = useState<'toner' | 'fuser'>('toner');
  const [selectedColorToner, setSelectedColorToner] = useState<string>('');
  const [formData, setFormData] = useState({
    trackingNumber: getNextTrackingNumber(),
    printerId: preselectedPrinterId || '',
    description: '',
    quantity: '1',
    tonerModel: preselectedColorToner?.model || ''
  });

  const selectedPrinter = printers.find(p => p.id === formData.printerId);

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
      printerId: printer.id,
     tonerModel: printer.tonerModel || prev.tonerModel
    }));
    setShowPrinterSelection(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newOrder: TonerOrder = {
        id: crypto.randomUUID(),
        trackingNumber: formData.trackingNumber,
        printerId: formData.printerId,
        description: formData.description,
        quantity: parseInt(formData.quantity),
        tonerModel: formData.tonerModel,
        orderDate: new Date(),
        status: 'pendiente',
        reason: `Pedido para ${selectedPrinter?.location} - ${selectedPrinter?.model}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      addOrder(newOrder);
      await supabaseService.add('orders', newOrder);
      
      toast.success('Pedido agregado exitosamente');
      
      if (onOrderCreated) {
        onOrderCreated();
      }
      
      onClose();
      
      // Reset form
      setFormData({
        trackingNumber: '',
        printerId: preselectedPrinterId || '',
        description: '',
        quantity: '1',
        tonerModel: ''
      });
    } catch (error) {
      toast.error('Error al agregar el pedido');
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
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            {/* Header */}
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Plus size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Nuevo Pedido</h2>
                    <p className="text-blue-100">Agregar pedido de toner</p>
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
                    placeholder="Ej: TRK123456789"
                    required
                  />
                </div>

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
                            {selectedPrinter.type === 'color' && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Color
                              </span>
                            )}
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

                {/* Color de Toner (solo para impresoras a color) */}
                {selectedPrinter && selectedPrinter.type === 'color' && selectedPrinter.colorToners && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color de Toner *
                    </label>
                    <select
                      value={selectedColorToner}
                      onChange={(e) => {
                        setSelectedColorToner(e.target.value);
                        const colorToner = selectedPrinter.colorToners?.find(t => t.id === e.target.value);
                        if (colorToner) {
                          setFormData(prev => ({ ...prev, tonerModel: colorToner.model }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Seleccionar color de toner</option>
                      {selectedPrinter.colorToners.map((colorToner) => {
                        const colorOption = COLOR_OPTIONS.find(c => c.id === colorToner.color);
                        return (
                          <option key={colorToner.id} value={colorToner.id}>
                            {colorOption?.name} - {colorToner.model}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Modelo de Toner */}
                <div className={selectedPrinter?.type === 'color' ? 'hidden' : ''}>
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
                  
                  <div className="flex gap-2">
                    <select
                      name="tonerModel"
                      value={formData.tonerModel}
                      onChange={handleChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Seleccionar modelo de {supplyType === 'toner' ? 'toner' : 'fusor'}</option>
                     {/* Mostrar el toner de la impresora seleccionada primero */}
                     {supplyType === 'toner' && selectedPrinter && selectedPrinter.tonerModel && (
                       <option key={`printer-${selectedPrinter.id}`} value={selectedPrinter.tonerModel}>
                         {selectedPrinter.tonerModel} (Toner de esta impresora)
                       </option>
                     )}
                     {/* Mostrar otros modelos disponibles */}
                      {(supplyType === 'toner' ? tonerModels : fuserModels).map((model) => (
                       (supplyType === 'toner' ? selectedPrinter?.tonerModel !== model.name : true) && (
                         <option key={model.id} value={model.name}>
                           {model.name} {
                             supplyType === 'toner' 
                               ? (model.capacity && `(${model.capacity.toLocaleString()} pág.)`)
                               : `(${(model as any).lifespan?.toLocaleString()} pág.)`
                           }
                         </option>
                       )
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => supplyType === 'toner' ? setShowTonerModelManagement(true) : setShowFuserModelManagement(true)}
                      className={`px-3 py-2 text-white rounded-lg transition-colors ${
                        supplyType === 'toner' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
                      }`}
                      title={`Gestionar modelos de ${supplyType === 'toner' ? 'toner' : 'fusor'}`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Campo manual si no hay modelo seleccionado */}
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
                    {isSubmitting ? 'Guardando...' : 'Agregar Pedido'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Printer Selection Modal */}
          {showPrinterSelection && (
            <PrinterSelectionModal
              isOpen={showPrinterSelection}
              onClose={() => setShowPrinterSelection(false)}
              onSelect={handlePrinterSelect}
            />
          )}

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
        </div>
      )}
    </AnimatePresence>
  );
}