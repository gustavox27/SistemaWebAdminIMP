import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard as Edit, Save, Package, Palette, Settings } from 'lucide-react';
import { Printer, ColorToner } from '../../types';
import { COLOR_OPTIONS } from '../../utils/colorPrinterUtils';

interface EditTonerLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newLevel: number, colorTonerId?: string) => void;
  printer: Printer;
  selectedColorToner?: ColorToner;
  isFuser?: boolean;
}

export default function EditTonerLevelModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  printer, 
  selectedColorToner,
  isFuser = false
}: EditTonerLevelModalProps) {
  const [newLevel, setNewLevel] = useState(() => {
    if (isFuser && selectedColorToner) {
      return selectedColorToner.currentLevel.toString();
    }
    if (selectedColorToner) {
      return selectedColorToner.currentLevel.toString();
    }
    return printer.currentTonerLevel.toString();
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const level = parseInt(newLevel);
    if (level < 0 || level > 100) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isFuser) {
        await onConfirm(level);
      } else {
        await onConfirm(level, selectedColorToner?.id);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const colorOption = selectedColorToner && !isFuser ? COLOR_OPTIONS.find(c => c.id === selectedColorToner.color) : null;

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
            <div className={`${
              isFuser ? 'bg-orange-600' :
              selectedColorToner ? 'bg-gradient-to-r from-cyan-600 to-purple-600' : 'bg-blue-600'
            } text-white p-6`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {isFuser ? (
                    <Settings size={24} className="mr-3" />
                  ) : selectedColorToner ? (
                    <Palette size={24} className="mr-3" />
                  ) : (
                    <Package size={24} className="mr-3" />
                  )}
                  <div>
                    <h2 className="text-xl font-semibold">
                      {isFuser ? 'Editar Nivel de Fusor' : 'Editar Nivel de Toner'}
                    </h2>
                    <p className={`${
                      isFuser ? 'text-orange-100' :
                      selectedColorToner ? 'text-cyan-100' : 'text-blue-100'
                    }`}>
                      {isFuser ? 'Fusor' : selectedColorToner ? colorOption?.name : 'Toner Monocromático'}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className={`p-2 ${
                    isFuser ? 'hover:bg-orange-700' :
                    selectedColorToner ? 'hover:bg-white hover:bg-opacity-20' : 'hover:bg-blue-700'
                  } rounded-lg transition-colors`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Información del toner */}
              <div className="mb-6">
                <div className={`${
                  isFuser ? 'bg-orange-50 border-orange-200' :
                  selectedColorToner ? 'bg-gradient-to-r from-cyan-50 to-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'
                } border p-4 rounded-lg`}>
                  <div className="flex items-center space-x-3 mb-3">
                    {selectedColorToner && !isFuser && (
                      <div
                        className="w-6 h-6 rounded-full border-2 border-gray-300 shadow-sm"
                        style={{ backgroundColor: selectedColorToner.colorCode }}
                      />
                    )}
                    {isFuser && (
                      <div className="bg-orange-600 p-2 rounded-lg">
                        <Settings size={16} className="text-white" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {printer.model} - {printer.location}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {isFuser ? `Fusor - ${selectedColorToner?.model}` :
                         selectedColorToner ? `${colorOption?.name} - ${selectedColorToner.model}` : printer.tonerModel}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Nivel actual:</span>
                      <p className="font-bold text-gray-900">
                        {isFuser || selectedColorToner ? selectedColorToner?.currentLevel : printer.currentTonerLevel}%
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">{isFuser ? 'Vida útil:' : 'Capacidad:'}</span>
                      <p className="font-bold text-gray-900">
                        {isFuser ? selectedColorToner?.capacity?.toLocaleString() :
                         selectedColorToner ? selectedColorToner.capacity.toLocaleString() : printer.tonerCapacity.toLocaleString()} pág.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nuevo Nivel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isFuser ? 'Nuevo Nivel de Fusor (%) *' : 'Nuevo Nivel de Toner (%) *'}
                  </label>
                  <input
                    type="number"
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${
                      isFuser ? 'focus:ring-orange-500' : 'focus:ring-blue-500'
                    } focus:border-transparent text-lg font-medium text-center`}
                    min="0"
                    max="100"
                    required
                  />
                  
                  {/* Vista previa del nivel */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                          isFuser ? (
                            parseInt(newLevel) <= 10 ? 'bg-red-500' :
                            parseInt(newLevel) <= 15 ? 'bg-yellow-500' : 'bg-green-500'
                          ) : (
                            parseInt(newLevel) < 20 ? 'bg-red-500' :
                            parseInt(newLevel) < 50 ? 'bg-yellow-500' : 'bg-green-500'
                          )
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, parseInt(newLevel) || 0))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0%</span>
                      <span className="font-medium">
                        {parseInt(newLevel) || 0}%
                      </span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                {/* Información adicional */}
                <div className={`${
                  isFuser ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
                } border p-4 rounded-lg`}>
                  <h4 className="font-medium text-gray-900 mb-2">Información</h4>
                  <div className={`text-sm ${isFuser ? 'text-orange-700' : 'text-gray-700'} space-y-1`}>
                    <p>• Se actualizará el nivel de {isFuser ? 'fusor' : 'toner'} en el sistema</p>
                    <p>• Se recalcularán las predicciones automáticamente</p>
                    <p>• Se actualizará la fecha de última modificación</p>
                    {selectedColorToner && !isFuser && (
                      <p>• Se recalculará el nivel promedio de la impresora a color</p>
                    )}
                    {isFuser && (
                      <p>• Se recalcularán las páginas usadas del fusor automáticamente</p>
                    )}
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
                    disabled={isSubmitting || !newLevel || parseInt(newLevel) < 0 || parseInt(newLevel) > 100}
                    className={`px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                      isFuser ? 'bg-orange-600 hover:bg-orange-700' :
                      selectedColorToner 
                        ? 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Save size={16} />
                    {isSubmitting ? 'Guardando...' : `Actualizar Nivel ${isFuser ? 'de Fusor' : ''}`}
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