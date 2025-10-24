import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCcw, Package, AlertTriangle, Plus, ShoppingCart } from 'lucide-react';
import { Printer, ColorToner, TonerInventory } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import { COLOR_OPTIONS, calculateColorTonerPrediction } from '../../utils/colorPrinterUtils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import toast from 'react-hot-toast';
import UserManagementModal from './UserManagementModal';
import OperatorManagementModal from './OperatorManagementModal';
import AddOrderModal from './AddOrderModal';

interface ChangeColorTonerModalProps {
  printer: Printer;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangeColorTonerModal({ printer, isOpen, onClose }: ChangeColorTonerModalProps) {
  const { 
    inventory,
    users, 
    operators, 
    defaultUser,
    defaultOperator,
    addChange, 
    addEmptyToner,
    updateInventory, 
    updatePrinter
  } = useStore();

  const [selectedColor, setSelectedColor] = useState<ColorToner | null>(null);
  const [motorCycle, setMotorCycle] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize default values when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedUser(defaultUser || '');
      setSelectedOperator(defaultOperator || '');
    }
  }, [isOpen, defaultUser, defaultOperator]);

  if (!printer.colorToners || printer.type !== 'color') {
    return null;
  }

  // Obtener predicciones para cada color
  const colorPredictions = printer.colorToners.map(toner => ({
    toner,
    prediction: calculateColorTonerPrediction(printer, toner)
  }));

  // Buscar inventario disponible para el color seleccionado
  const availableInventory = selectedColor 
    ? inventory.filter(item => 
        item.printerId === printer.id && 
        item.tonerModel === selectedColor.model && 
        item.quantity > 0
      )
    : [];

  const handleColorSelect = (toner: ColorToner) => {
    setSelectedColor(toner);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedColor) {
      toast.error('Debe seleccionar un color de toner');
      return;
    }

    if (!motorCycle.trim()) {
      toast.error('El ciclo de motor es obligatorio');
      return;
    }

    if (availableInventory.length === 0) {
      toast.error('No hay inventario disponible para este color de toner');
      return;
    }

    setIsSubmitting(true);

    try {
      const inventoryToUse = availableInventory[0];

      // Crear registro de cambio
      const changeRecord = {
        id: crypto.randomUUID(),
        changeDate: new Date(),
        printerId: printer.id,
        printerSerial: printer.serial,
        tonerModel: selectedColor.model,
        motorCycle: parseInt(motorCycle),
        printerIp: printer.ip,
        responsible: selectedUser,
        operator: selectedOperator,
        createdAt: new Date()
      };

      // Crear registro de toner vacío
      const emptyTonerRecord = {
        id: crypto.randomUUID(),
        tonerModel: selectedColor.model,
        printerModel: printer.model,
        printerLocation: printer.location,
        changeDate: new Date(),
        category: 'warehouse' as const,
        status: 'ready_shipping' as const,
        isBackup: false,
        createdAt: new Date()
      };

      // Actualizar el color específico en la impresora
      const updatedColorToners = printer.colorToners!.map(toner => 
        toner.id === selectedColor.id 
          ? { ...toner, currentLevel: 100 }
          : toner
      );

      // Calcular nuevo nivel promedio
      const averageLevel = Math.round(
        updatedColorToners.reduce((sum, t) => sum + t.currentLevel, 0) / updatedColorToners.length
      );

      const updatedPrinter: Printer = {
        ...printer,
        colorToners: updatedColorToners,
        currentTonerLevel: averageLevel,
        motorCycle: parseInt(motorCycle),
        updatedAt: new Date()
      };

      // Reducir inventario
      const updatedInventoryItem: TonerInventory = {
        ...inventoryToUse,
        quantity: inventoryToUse.quantity - 1,
        updatedAt: new Date()
      };

      // Guardar cambios
      addChange(changeRecord);
      addEmptyToner(emptyTonerRecord);
      updatePrinter(printer.id, updatedPrinter);
      updateInventory(inventoryToUse.id, updatedInventoryItem);

      await supabaseService.add('changes', changeRecord);
      await supabaseService.add('emptyToners', emptyTonerRecord);
      await supabaseService.update('printers', updatedPrinter);
      await supabaseService.update('inventory', updatedInventoryItem);

      const colorOption = COLOR_OPTIONS.find(c => c.id === selectedColor.color);
      toast.success(`Cambio de toner ${colorOption?.name} registrado exitosamente`);
      
      onClose();
    } catch (error) {
      toast.error('Error al registrar el cambio de toner');
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
            className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <RefreshCcw size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Cambiar Toner de Color</h2>
                    <p className="text-cyan-100">{printer.model} - {printer.location}</p>
                  </div>
                </div>
                
                {selectedColor && (
                  <button
                    onClick={() => setSelectedColor(null)}
                    className="px-3 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors text-sm font-medium mr-3"
                  >
                    Cambiar selección
                  </button>
                )}
                
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
              {!selectedColor ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Selecciona el Color de Toner a Cambiar
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {colorPredictions.map(({ toner, prediction }) => {
                      const colorOption = COLOR_OPTIONS.find(c => c.id === toner.color);
                      
                      return (
                        <div
                          key={toner.id}
                          onClick={() => handleColorSelect(toner)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            prediction.status === 'critical' 
                              ? 'border-red-300 bg-red-50 hover:border-red-400' 
                              : prediction.status === 'warning'
                              ? 'border-yellow-300 bg-yellow-50 hover:border-yellow-400'
                              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div
                                className="w-6 h-6 rounded-full border-2 border-gray-300 shadow-sm"
                                style={{ backgroundColor: toner.colorCode }}
                              />
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {colorOption?.name}
                                </h4>
                                <p className="text-sm text-gray-600">{toner.model}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-lg font-bold ${
                                prediction.status === 'critical' ? 'text-red-600' :
                                prediction.status === 'warning' ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                {prediction.daysUntilChange}d
                              </div>
                              <p className="text-xs text-gray-500">
                                {format(prediction.estimatedChangeDate, 'dd/MM', { locale: es })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Nivel:</span>
                              <span className="font-medium">{Math.round(prediction.adjustedLevel)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  prediction.adjustedLevel < 20 ? 'bg-red-500' :
                                  prediction.adjustedLevel < 50 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${prediction.adjustedLevel}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">
                                ~{prediction.pagesRemaining.toLocaleString()} pág.
                              </span>
                              <span className={`text-xs font-medium ${
                                prediction.status === 'critical' ? 'text-red-600' :
                                prediction.status === 'warning' ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                {prediction.status === 'critical' ? 'Crítico' :
                                 prediction.status === 'warning' ? 'Advertencia' : 'Normal'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  {/* Color seleccionado */}
                  <div className="mb-6">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-gray-300 shadow-sm"
                          style={{ backgroundColor: selectedColor.colorCode }}
                        />
                        <div>
                          <h4 className="font-medium text-blue-900">
                            {COLOR_OPTIONS.find(c => c.id === selectedColor.color)?.name}
                          </h4>
                          <p className="text-sm text-blue-700">Modelo: {selectedColor.model}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {availableInventory.length > 0 ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Inventario Propio */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                          <Package size={20} className="mr-2" />
                          Inventario Propio
                        </h3>
                        <div className="space-y-2">
                          {availableInventory.map((item) => (
                            <div key={item.id} className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium text-gray-900">{item.tonerModel}</h4>
                                  <p className="text-sm text-gray-600">{item.description}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-lg font-semibold text-green-600">
                                    {item.quantity}
                                  </span>
                                  <p className="text-sm text-gray-500">disponibles</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Ciclo de Motor */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ciclo de Motor *
                        </label>
                        <input
                          type="number"
                          value={motorCycle}
                          onChange={(e) => setMotorCycle(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ingrese el ciclo de motor actual"
                          required
                        />
                      </div>

                      {/* Usuario Responsable */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Usuario Responsable
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {users.map((user) => (
                              <option key={user.id} value={user.name}>
                                {user.name} - {user.position}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setShowUserModal(true)}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                            title="Gestionar usuarios"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Operador */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Operador
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={selectedOperator}
                            onChange={(e) => setSelectedOperator(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {operators.map((operator) => (
                              <option key={operator.id} value={operator.name}>
                                {operator.name} - {operator.location}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setShowOperatorModal(true)}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                            title="Gestionar operadores"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Botones */}
                      <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-lg hover:from-cyan-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Procesando...
                            </>
                          ) : (
                            <>
                              <RefreshCcw size={16} />
                              Cambiar Toner
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
                      <h3 className="mt-2 text-lg font-medium text-gray-900">Sin inventario disponible</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        No hay toners disponibles para el color seleccionado.
                      </p>
                      <button
                        onClick={() => setShowOrderModal(true)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                      >
                        <ShoppingCart size={16} />
                        Registrar Pedido
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* User Management Modal */}
          {showUserModal && (
            <UserManagementModal
              isOpen={showUserModal}
              onClose={() => setShowUserModal(false)}
              onSelect={(user) => {
                setSelectedUser(user.name);
                setShowUserModal(false);
              }}
            />
          )}

          {/* Operator Management Modal */}
          {showOperatorModal && (
            <OperatorManagementModal
              isOpen={showOperatorModal}
              onClose={() => setShowOperatorModal(false)}
              onSelect={(operator) => {
                setSelectedOperator(operator.name);
                setShowOperatorModal(false);
              }}
            />
          )}

          {/* Add Order Modal */}
          {showOrderModal && (
            <AddOrderModal
              isOpen={showOrderModal}
              onClose={() => setShowOrderModal(false)}
              preselectedPrinterId={printer.id}
              preselectedColorToner={selectedColor}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}