import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Plus, Check } from 'lucide-react';
import { ColorToner } from '../../types';
import { useStore } from '../../store/useStore';
import { COLOR_OPTIONS } from '../../utils/colorPrinterUtils';
import TonerModelManagementModal from './TonerModelManagementModal';

interface ColorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedToners: ColorToner[]) => void;
  initialToners?: ColorToner[];
}

export default function ColorSelectionModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  initialToners = [] 
}: ColorSelectionModalProps) {
  const { tonerModels } = useStore();
  const [selectedColors, setSelectedColors] = useState<string[]>(
    initialToners.map(t => t.color)
  );
  const [colorToners, setColorToners] = useState<Record<string, Partial<ColorToner>>>(
    initialToners.reduce((acc, toner) => ({
      ...acc,
      [toner.color]: {
        color: toner.color as any,
        colorCode: toner.colorCode,
        model: toner.model,
        capacity: toner.capacity,
        currentLevel: toner.currentLevel
      }
    }), {})
  );
  const [showTonerModelManagement, setShowTonerModelManagement] = useState(false);

  const handleColorSelect = (colorId: string) => {
    const colorOption = COLOR_OPTIONS.find(c => c.id === colorId);
    if (!colorOption) return;

    if (selectedColors.includes(colorId)) {
      // Deseleccionar color
      setSelectedColors(prev => prev.filter(c => c !== colorId));
      setColorToners(prev => {
        const newToners = { ...prev };
        delete newToners[colorId];
        return newToners;
      });
    } else {
      // Seleccionar color
      setSelectedColors(prev => [...prev, colorId]);
      setColorToners(prev => ({
        ...prev,
        [colorId]: {
          color: colorId as any,
          colorCode: colorOption.code,
          model: '',
          capacity: 0,
          currentLevel: 100
        }
      }));
    }
  };

  const handleTonerDataChange = (colorId: string, field: string, value: any) => {
    setColorToners(prev => ({
      ...prev,
      [colorId]: {
        ...prev[colorId],
        [field]: value
      }
    }));

    // Auto-completar capacidad si se selecciona un modelo
    if (field === 'model') {
      const selectedModel = tonerModels.find(m => m.name === value);
      if (selectedModel && selectedModel.capacity) {
        setColorToners(prev => ({
          ...prev,
          [colorId]: {
            ...prev[colorId],
            capacity: selectedModel.capacity
          }
        }));
      }
    }
  };

  const handleConfirm = () => {
    const completeToners: ColorToner[] = selectedColors.map(colorId => {
      const tonerData = colorToners[colorId];
      return {
        id: crypto.randomUUID(),
        color: colorId as any,
        colorCode: tonerData?.colorCode || '#000000',
        model: tonerData?.model || '',
        capacity: tonerData?.capacity || 0,
        currentLevel: tonerData?.currentLevel || 100
      };
    }).filter(toner => toner.model && toner.capacity > 0);

    onConfirm(completeToners);
  };

  const isFormValid = selectedColors.every(colorId => {
    const toner = colorToners[colorId];
    return toner?.model && toner?.capacity && toner.capacity > 0;
  });

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
            className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Settings size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Selección de Colores</h2>
                    <p className="text-cyan-100">Configura los toners de color para la impresora</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[75vh] overflow-y-auto">
              {/* Color Selection Grid */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Selecciona los Colores de Toner
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => handleColorSelect(color.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedColors.includes(color.id)
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-gray-300 shadow-sm"
                          style={{ backgroundColor: color.code }}
                        />
                        <div className="text-left">
                          <div className="font-medium text-gray-900 text-sm">
                            {color.name}
                          </div>
                        </div>
                        {selectedColors.includes(color.id) && (
                          <Check className="h-5 w-5 text-blue-600 ml-auto" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Colors Configuration */}
              {selectedColors.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Configuración de Toners Seleccionados
                  </h3>
                  
                  {selectedColors.map((colorId) => {
                    const colorOption = COLOR_OPTIONS.find(c => c.id === colorId);
                    const tonerData = colorToners[colorId];
                    
                    return (
                      <div key={colorId} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center mb-4">
                          <div
                            className="w-6 h-6 rounded-full border-2 border-gray-300 mr-3"
                            style={{ backgroundColor: colorOption?.code }}
                          />
                          <h4 className="font-medium text-gray-900">{colorOption?.name}</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Modelo */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Modelo *
                            </label>
                            <div className="flex gap-2">
                              <select
                                value={tonerData?.model || ''}
                                onChange={(e) => handleTonerDataChange(colorId, 'model', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                required
                              >
                                <option value="">Seleccionar modelo</option>
                                {tonerModels.map((model) => (
                                  <option key={model.id} value={model.name}>
                                    {model.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => setShowTonerModelManagement(true)}
                                className="px-2 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                title="Gestionar modelos"
                              >
                                <Settings size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Capacidad */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Capacidad (páginas) *
                            </label>
                            <input
                              type="number"
                              value={tonerData?.capacity || ''}
                              onChange={(e) => handleTonerDataChange(colorId, 'capacity', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="Ej: 3000"
                              min="1"
                              required
                            />
                          </div>

                          {/* Nivel Actual */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              % Nivel Actual *
                            </label>
                            <input
                              type="number"
                              value={tonerData?.currentLevel || 100}
                              onChange={(e) => handleTonerDataChange(colorId, 'currentLevel', parseInt(e.target.value) || 100)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              min="0"
                              max="100"
                              required
                            />
                          </div>
                        </div>

                        {/* Información del modelo seleccionado */}
                        {tonerData?.model && (
                          <div className="mt-3 bg-blue-50 p-3 rounded-lg">
                            {(() => {
                              const selectedModel = tonerModels.find(m => m.name === tonerData.model);
                              return selectedModel ? (
                                <div className="text-sm text-blue-800">
                                  <strong>Capacidad del modelo:</strong> {selectedModel.capacity?.toLocaleString() || 'No especificada'} páginas
                                  {selectedModel.description && (
                                    <div className="mt-1">
                                      <strong>Descripción:</strong> {selectedModel.description}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-blue-800">Modelo personalizado</p>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={selectedColors.length === 0 || !isFormValid}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Agregar Colores ({selectedColors.length})
                </button>
              </div>
            </div>
          </motion.div>

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