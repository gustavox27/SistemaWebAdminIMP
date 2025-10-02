import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, Save, Calendar, Printer, PackagePlus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { TonerChange } from '../../types';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface AddChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddChangeModal({ isOpen, onClose }: AddChangeModalProps) {
  const { printers, users, operators, tonerModels, fuserModels, addChange, defaultUser, defaultOperator } = useStore();

  const [formData, setFormData] = useState({
    printerId: '',
    tonerModel: '',
    motorCycle: '',
    responsible: defaultUser || '',
    operator: defaultOperator || '',
    changeDate: format(new Date(), 'yyyy-MM-dd'),
    changeTime: format(new Date(), 'HH:mm'),
    isBackup: false,
    motorCyclePending: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        printerId: '',
        tonerModel: '',
        motorCycle: '',
        responsible: defaultUser || '',
        operator: defaultOperator || '',
        changeDate: format(new Date(), 'yyyy-MM-dd'),
        changeTime: format(new Date(), 'HH:mm'),
        isBackup: false,
        motorCyclePending: false
      });
      setErrors({});
    }
  }, [isOpen, defaultUser, defaultOperator]);

  const selectedPrinter = printers.find(p => p.id === formData.printerId);
  const allTonerModels = [...tonerModels, ...fuserModels];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.printerId) {
      newErrors.printerId = 'Selecciona una impresora';
    }

    if (!formData.tonerModel) {
      newErrors.tonerModel = 'Selecciona un modelo de toner o fusor';
    }

    if (!formData.motorCycle && !formData.motorCyclePending) {
      newErrors.motorCycle = 'Ingresa el ciclo de motor o marca como pendiente';
    }

    if (formData.motorCycle && isNaN(Number(formData.motorCycle))) {
      newErrors.motorCycle = 'El ciclo de motor debe ser un número';
    }

    if (!formData.responsible) {
      newErrors.responsible = 'Selecciona un responsable';
    }

    if (!formData.operator) {
      newErrors.operator = 'Selecciona un operador';
    }

    if (!formData.changeDate) {
      newErrors.changeDate = 'Selecciona una fecha';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    const printer = printers.find(p => p.id === formData.printerId);
    if (!printer) {
      toast.error('Impresora no encontrada');
      return;
    }

    const changeDateTime = new Date(`${formData.changeDate}T${formData.changeTime}`);

    const newChange: TonerChange = {
      id: crypto.randomUUID(),
      changeDate: changeDateTime,
      printerId: formData.printerId,
      printerSerial: printer.serial,
      tonerModel: formData.tonerModel,
      motorCycle: formData.motorCyclePending ? 0 : Number(formData.motorCycle),
      printerIp: printer.ip,
      responsible: formData.responsible,
      operator: formData.operator,
      isBackup: formData.isBackup,
      motorCyclePending: formData.motorCyclePending,
      createdAt: new Date()
    };

    try {
      addChange(newChange);
      await supabaseService.add('changes', newChange);

      toast.success('Cambio registrado exitosamente');
      onClose();
    } catch (error) {
      console.error('Error saving change:', error);
      toast.error('Error al guardar el cambio');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          >
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <History size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Agregar Cambio de Toner/Fusor</h2>
                    <p className="text-blue-100 text-sm">Registra un nuevo cambio en el historial</p>
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

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Printer size={16} className="inline mr-1" />
                      Impresora *
                    </label>
                    <select
                      value={formData.printerId}
                      onChange={(e) => handleInputChange('printerId', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.printerId ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Selecciona una impresora</option>
                      {printers
                        .sort((a, b) => a.location.localeCompare(b.location))
                        .map(printer => (
                          <option key={printer.id} value={printer.id}>
                            {printer.location} - {printer.model} ({printer.serial})
                          </option>
                        ))}
                    </select>
                    {errors.printerId && (
                      <p className="text-red-500 text-xs mt-1">{errors.printerId}</p>
                    )}
                    {selectedPrinter && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                        <p className="text-gray-700"><strong>IP:</strong> {selectedPrinter.ip}</p>
                        <p className="text-gray-700"><strong>Ubicación:</strong> {selectedPrinter.location}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <PackagePlus size={16} className="inline mr-1" />
                      Modelo de Toner/Fusor *
                    </label>
                    <select
                      value={formData.tonerModel}
                      onChange={(e) => handleInputChange('tonerModel', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.tonerModel ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Selecciona un modelo</option>
                      <optgroup label="Modelos de Toner">
                        {tonerModels.map(model => (
                          <option key={model.id} value={model.name}>
                            {model.name} {model.description && `- ${model.description}`}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Modelos de Fusor">
                        {fuserModels.map(model => (
                          <option key={model.id} value={model.name}>
                            {model.name} (Fusor) {model.description && `- ${model.description}`}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    {errors.tonerModel && (
                      <p className="text-red-500 text-xs mt-1">{errors.tonerModel}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ciclo de Motor *
                    </label>
                    <input
                      type="number"
                      value={formData.motorCycle}
                      onChange={(e) => handleInputChange('motorCycle', e.target.value)}
                      disabled={formData.motorCyclePending}
                      placeholder="Ej: 50000"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.motorCycle ? 'border-red-500' : 'border-gray-300'
                      } ${formData.motorCyclePending ? 'bg-gray-100' : ''}`}
                    />
                    {errors.motorCycle && (
                      <p className="text-red-500 text-xs mt-1">{errors.motorCycle}</p>
                    )}
                    <label className="flex items-center mt-2">
                      <input
                        type="checkbox"
                        checked={formData.motorCyclePending}
                        onChange={(e) => {
                          handleInputChange('motorCyclePending', e.target.checked);
                          if (e.target.checked) {
                            handleInputChange('motorCycle', '');
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600">Ciclo de Motor Pendiente</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar size={16} className="inline mr-1" />
                      Fecha de Cambio *
                    </label>
                    <input
                      type="date"
                      value={formData.changeDate}
                      onChange={(e) => handleInputChange('changeDate', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.changeDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.changeDate && (
                      <p className="text-red-500 text-xs mt-1">{errors.changeDate}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hora de Cambio
                    </label>
                    <input
                      type="time"
                      value={formData.changeTime}
                      onChange={(e) => handleInputChange('changeTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Cambio
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isBackup}
                        onChange={(e) => handleInputChange('isBackup', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Toner de Respaldo</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Responsable *
                    </label>
                    <select
                      value={formData.responsible}
                      onChange={(e) => handleInputChange('responsible', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.responsible ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Selecciona un responsable</option>
                      {users.map(user => (
                        <option key={user.id} value={user.name}>
                          {user.name} {user.position && `- ${user.position}`}
                        </option>
                      ))}
                    </select>
                    {errors.responsible && (
                      <p className="text-red-500 text-xs mt-1">{errors.responsible}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Operador *
                    </label>
                    <select
                      value={formData.operator}
                      onChange={(e) => handleInputChange('operator', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.operator ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Selecciona un operador</option>
                      {operators.map(operator => (
                        <option key={operator.id} value={operator.name}>
                          {operator.name} {operator.location && `- ${operator.location}`}
                        </option>
                      ))}
                    </select>
                    {errors.operator && (
                      <p className="text-red-500 text-xs mt-1">{errors.operator}</p>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Nota:</strong> Este registro se agregará al historial de cambios. Asegúrate de que todos los datos sean correctos antes de guardar.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save size={16} />
                  Guardar Cambio
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
