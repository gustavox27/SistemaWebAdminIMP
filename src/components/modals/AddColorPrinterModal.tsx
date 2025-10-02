import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Save, Settings, Palette } from 'lucide-react';
import { Printer, ColorToner } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import { COLOR_OPTIONS } from '../../utils/colorPrinterUtils';
import toast from 'react-hot-toast';
import ColorSelectionModal from './ColorSelectionModal';

interface AddColorPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddColorPrinterModal({ isOpen, onClose }: AddColorPrinterModalProps) {
  const { addPrinter } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showColorSelection, setShowColorSelection] = useState(false);
  const [selectedColorToners, setSelectedColorToners] = useState<ColorToner[]>([]);
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    location: '',
    sede: '',
    hostnameServer: '',
    ipServer: '',
    ip: '',
    hostname: '',
    serial: '',
    status: 'operativa' as Printer['status'],
    dailyUsage: '50',
    motorCycle: '0',
    comment: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleColorSelection = (colorToners: ColorToner[]) => {
    setSelectedColorToners(colorToners);
    setShowColorSelection(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.status === 'operativa' && selectedColorToners.length === 0) {
      toast.error('Debe configurar al menos un color de toner para impresoras operativas');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calcular valores promedio para compatibilidad con el sistema existente
      const averageCapacity = selectedColorToners.length > 0 
        ? Math.round(selectedColorToners.reduce((sum, t) => sum + t.capacity, 0) / selectedColorToners.length)
        : 3000;
      
      const averageLevel = selectedColorToners.length > 0
        ? Math.round(selectedColorToners.reduce((sum, t) => sum + t.currentLevel, 0) / selectedColorToners.length)
        : 100;

      const newPrinter: Printer = {
        id: crypto.randomUUID(),
        type: 'color',
        brand: formData.brand,
        model: formData.model,
        location: formData.location,
        sede: formData.sede,
        hostnameServer: formData.hostnameServer,
        ipServer: formData.ipServer,
        ip: formData.ip,
        hostname: formData.hostname,
        serial: formData.serial,
        status: formData.status,
        tonerCapacity: averageCapacity,
        currentTonerLevel: averageLevel,
        dailyUsage: parseInt(formData.dailyUsage),
        motorCycle: parseInt(formData.motorCycle),
        tonerModel: 'MULTI-COLOR',
        colorToners: selectedColorToners,
        comment: formData.comment,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      addPrinter(newPrinter);
      await supabaseService.add('printers', newPrinter);
      
      toast.success('Impresora a color agregada exitosamente');
      onClose();
      
      // Reset form
      setFormData({
        brand: '',
        model: '',
        location: '',
        sede: '',
        hostnameServer: '',
        ipServer: '',
        ip: '',
        hostname: '',
        serial: '',
        status: 'operativa',
        dailyUsage: '50',
        motorCycle: '0',
        comment: ''
      });
      setSelectedColorToners([]);
    } catch (error) {
      toast.error('Error al agregar la impresora a color');
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
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Palette size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Agregar Impresora a Color</h2>
                    <p className="text-cyan-100">Complete la información de la impresora</p>
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
                      placeholder="Ej: HP, Canon, Epson"
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
                      placeholder="Ej: Color LaserJet Pro M454dn"
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
                      placeholder="Ej: Oficina Principal, Piso 2"
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
                      placeholder="Ej: SEDE CENTRAL, SUCURSAL NORTE"
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
                      placeholder="Ej: server-central-01"
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
                      placeholder="Ej: 192.168.1.10"
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
                      placeholder="Ej: 192.168.1.100"
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
                      placeholder="Ej: printer-office-01"
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
                      placeholder="Ej: ABC123456789"
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
                      {/* Configuración de Colores */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Configuración de Toners de Color *
                        </label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            {selectedColorToners.length > 0 ? (
                              <div className="bg-gradient-to-r from-cyan-50 to-purple-50 border border-purple-200 p-4 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-3">
                                  Toners Configurados ({selectedColorToners.length})
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {selectedColorToners.map((toner) => {
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
                          >
                            <Settings size={16} />
                            Configurar
                          </button>
                        </div>
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
                    className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-lg hover:from-cyan-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save size={16} />
                    {isSubmitting ? 'Guardando...' : 'Agregar Impresora'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Color Selection Modal */}
          {showColorSelection && (
            <ColorSelectionModal
              isOpen={showColorSelection}
              onClose={() => setShowColorSelection(false)}
              onConfirm={handleColorSelection}
              initialToners={selectedColorToners}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}