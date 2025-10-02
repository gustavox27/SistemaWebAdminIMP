import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard as Edit, Save, Settings, Palette, Plus } from 'lucide-react';
import { Printer } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';
import { processNewPrinter } from '../../utils/predictions';
import { COLOR_OPTIONS } from '../../utils/colorPrinterUtils';
import TonerModelManagementModal from './TonerModelManagementModal';
import ColorSelectionModal from './ColorSelectionModal';

interface EditPrinterModalProps {
  printer: Printer;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditPrinterModal({ printer, isOpen, onClose }: EditPrinterModalProps) {
  const { updatePrinter, tonerModels } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTonerModelManagement, setShowTonerModelManagement] = useState(false);
  const [showColorSelection, setShowColorSelection] = useState(false);
  const [localColorToners, setLocalColorToners] = useState(printer.colorToners || []);
  const [formData, setFormData] = useState({
    brand: printer.brand,
    model: printer.model,
    location: printer.location,
    sede: printer.sede || 'Por definir',
    hostnameServer: printer.hostnameServer || 'Por definir',
    ipServer: printer.ipServer || 'Por definir',
    ip: printer.ip,
    hostname: printer.hostname,
    serial: printer.serial,
    status: printer.status,
    tonerCapacity: printer.tonerCapacity.toString(),
    currentTonerLevel: printer.currentTonerLevel.toString(),
    dailyUsage: printer.dailyUsage.toString(),
    motorCycle: printer.motorCycle.toString(),
    tonerModel: printer.tonerModel,
    comment: printer.comment || ''
  });

  // Actualizar localColorToners cuando cambie la impresora
  React.useEffect(() => {
    setLocalColorToners(printer.colorToners || []);
  }, [printer.colorToners]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-completar capacidad si se selecciona un modelo de toner
    if (name === 'tonerModel' && printer.type !== 'color') {
      const selectedModel = tonerModels.find(m => m.name === value);
      if (selectedModel && selectedModel.capacity) {
        setFormData(prev => ({
          ...prev,
          tonerCapacity: selectedModel.capacity.toString()
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const basePrinter: Printer = {
        ...printer,
        type: printer.type || 'monocromatica',
        brand: formData.brand,
        model: formData.model,
        location: formData.location,
        sede: formData.sede,
        hostnameServer: formData.hostnameServer,
        ipServer: formData.ipServer,
        ip: formData.ip,
        hostname: formData.hostname,
        serial: formData.serial,
        status: formData.status as Printer['status'],
        tonerCapacity: parseInt(formData.tonerCapacity),
        currentTonerLevel: parseInt(formData.currentTonerLevel),
        dailyUsage: parseInt(formData.dailyUsage),
        motorCycle: parseInt(formData.motorCycle),
        tonerModel: formData.tonerModel,
        colorToners: printer.type === 'color' ? localColorToners : undefined,
        comment: formData.comment,
        updatedAt: new Date()
      };

      // Aplicar cálculos automáticos
      const updatedPrinter = processNewPrinter(basePrinter);
      
      updatePrinter(printer.id, updatedPrinter);
      await supabaseService.update('printers', updatedPrinter);
      
      // Verificar si se aplicó actualización automática
      const wasUpdated = basePrinter.status === 'operativa' && Math.abs(basePrinter.currentTonerLevel - updatedPrinter.currentTonerLevel) > 0.1;
      
      if (wasUpdated) {
        toast.success(`Impresora actualizada. Nivel de toner recalculado automáticamente a ${Math.round(updatedPrinter.currentTonerLevel)}%`);
      } else {
        toast.success('Impresora actualizada exitosamente');
      }
      
      onClose();
    } catch (error) {
      toast.error('Error al actualizar la impresora');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTonerModelSelect = (model: any) => {
    setFormData(prev => ({
      ...prev,
      tonerModel: model.name,
      tonerCapacity: model.capacity?.toString() || prev.tonerCapacity
    }));
    setShowTonerModelManagement(false);
  };

  const handleColorTonerUpdate = (colorToners: any[]) => {
    // Actualizar el estado local sin guardar en la base de datos aún
    setLocalColorToners(colorToners);
    
    // Calcular nuevo nivel promedio y actualizar el formulario
    if (colorToners.length > 0) {
      const averageLevel = Math.round(
        colorToners.reduce((sum, t) => sum + t.currentLevel, 0) / colorToners.length
      );
      setFormData(prev => ({
        ...prev,
        currentTonerLevel: averageLevel.toString()
      }));
    }
    
    setShowColorSelection(false);
    toast.success('Configuración de toners de color actualizada en el formulario');
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
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Edit size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Editar Impresora</h2>
                    <p className="text-blue-100">{printer.model}</p>
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
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Marca */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Marca *
                    </label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Modelo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modelo *
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Ubicación */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ubicación *
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Sede */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sede *
                    </label>
                    <input
                      type="text"
                      name="sede"
                      value={formData.sede}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* HostName Server */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      HostName - Server *
                    </label>
                    <input
                      type="text"
                      name="hostnameServer"
                      value={formData.hostnameServer}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* IP Server */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IP Server *
                    </label>
                    <input
                      type="text"
                      name="ipServer"
                      value={formData.ipServer}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>


                  {/* IP */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dirección IP *
                    </label>
                    <input
                      type="text"
                      name="ip"
                      value={formData.ip}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Hostname */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hostname
                    </label>
                    <input
                      type="text"
                      name="hostname"
                      value={formData.hostname}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Serie */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Serie *
                    </label>
                    <input
                      type="text"
                      name="serial"
                      value={formData.serial}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado *
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="operativa">Operativa</option>
                      <option value="disponible">Disponible</option>
                      <option value="backup">Backup</option>
                      <option value="retirada">Retirada</option>
                    </select>
                  </div>

                  {/* Campos que solo se muestran si el estado es "operativa" */}
                  {formData.status === 'operativa' && (
                    <>
                      {/* Configuración de Toner */}
                      {printer.type === 'color' ? (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Configuración de Toners de Color *
                          </label>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              {localColorToners && localColorToners.length > 0 ? (
                                <div className="bg-gradient-to-r from-cyan-50 to-purple-50 border border-purple-200 p-4 rounded-lg">
                                  <h4 className="font-medium text-gray-900 mb-3">
                                    Toners Configurados ({localColorToners.length})
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {localColorToners.map((toner) => {
                                      const colorOption = COLOR_OPTIONS.find(c => c.id === toner.color);
                                      return (
                                        <div key={toner.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                          <div className="flex items-center space-x-2 mb-2">
                                            <div
                                              className="w-4 h-4 rounded-full border border-gray-300"
                                              style={{ backgroundColor: toner.colorCode }}
                                            />
                                            <span className="text-sm font-medium text-gray-900">
                                              {colorOption?.name}
                                            </span>
                                          </div>
                                          <div className="text-xs text-gray-600 space-y-1">
                                            <p>Modelo: {toner.model}</p>
                                            <p>Capacidad: {toner.capacity.toLocaleString()}</p>
                                            <p>Nivel: {toner.currentLevel}%</p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-gray-50 border border-gray-300 p-4 rounded-lg text-center">
                                  <Palette className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                  <p className="text-sm text-gray-600">
                                    No se han configurado toners de color
                                  </p>
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowColorSelection(true)}
                              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-lg hover:from-cyan-700 hover:to-purple-700 transition-all flex items-center gap-2"
                              title="Configurar toners de color"
                            >
                              <Palette size={16} />
                              Configurar
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Modelo de Toner para impresoras monocromáticas */
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Modelo de Toner *
                          </label>
                          <div className="flex gap-2">
                            <select
                              name="tonerModel"
                              value={formData.tonerModel}
                              onChange={handleChange}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            >
                              <option value="">Seleccionar modelo de toner</option>
                              {tonerModels.map((model) => (
                                <option key={model.id} value={model.name}>
                                  {model.name} {model.capacity && `(${model.capacity.toLocaleString()} pág.)`}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setShowTonerModelManagement(true)}
                              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                              title="Gestionar modelos de toner"
                            >
                              <Settings size={16} />
                            </button>
                          </div>
                          
                          {/* Campo de entrada manual como fallback */}
                          {!formData.tonerModel && (
                            <div className="mt-3">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                O ingrese modelo manualmente
                              </label>
                              <input
                                type="text"
                                name="tonerModel"
                                value={formData.tonerModel}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Ej: W9004mc, CF259A"
                              />
                            </div>
                          )}

                          {/* Mostrar información del modelo seleccionado */}
                          {formData.tonerModel && (
                            <div className="mt-3 bg-blue-50 p-3 rounded-lg">
                              {(() => {
                                const selectedModel = tonerModels.find(m => m.name === formData.tonerModel);
                                return selectedModel ? (
                                  <div>
                                    <p className="text-sm text-blue-800">
                                      <strong>Capacidad:</strong> {selectedModel.capacity?.toLocaleString() || 'No especificada'} páginas
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
                        </div>
                      )}

                      {/* Capacidad del Toner */}
                      <div className={printer.type === 'color' ? 'hidden' : ''}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Capacidad del Toner (páginas) * 
                          {(() => {
                            const selectedModel = tonerModels.find(m => m.name === formData.tonerModel);
                            return selectedModel ? (
                              <span className="text-sm text-blue-600 font-normal">
                                (Auto-completado desde modelo seleccionado)
                              </span>
                            ) : null;
                          })()}
                        </label>
                        <input
                          type="number"
                          name="tonerCapacity"
                          value={formData.tonerCapacity}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          min="1"
                        />
                      </div>

                      {/* Nivel Actual de Toner */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nivel Actual de Toner (%) *
                        </label>
                        <input
                          type="number"
                          name="currentTonerLevel"
                          value={formData.currentTonerLevel}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          min="0"
                          max="100"
                        />
                      </div>

                      {/* Uso Diario */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Uso Diario (páginas) *
                        </label>
                        <input
                          type="number"
                          name="dailyUsage"
                          value={formData.dailyUsage}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          min="1"
                        />
                      </div>

                      {/* Ciclo de Motor */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ciclo de Motor *
                        </label>
                        <input
                          type="number"
                          name="motorCycle"
                          value={formData.motorCycle}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          min="0"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Comentario */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentario
                  </label>
                  <textarea
                    name="comment"
                    value={formData.comment}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Notas o comentarios adicionales sobre la impresora..."
                  />
                </div>

                {/* Mensaje informativo para estados no operativos */}
                {formData.status !== 'operativa' && (
                  <div>
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                      <div className="flex items-center text-gray-600">
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3">
                          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Impresora en estado "{formData.status}"</p>
                          <p className="text-xs text-gray-500">
                            La configuración de toner no es necesaria para este estado
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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

          {/* Toner Model Management Modal */}
          {showTonerModelManagement && (
            <TonerModelManagementModal
              isOpen={showTonerModelManagement}
              onClose={() => setShowTonerModelManagement(false)}
              onSelect={handleTonerModelSelect}
            />
          )}

          {/* Color Selection Modal */}
          {showColorSelection && (
            <ColorSelectionModal
              isOpen={showColorSelection}
              onClose={() => setShowColorSelection(false)}
              onConfirm={handleColorTonerUpdate}
              initialToners={localColorToners}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}