import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Plus, AlertTriangle, ShoppingCart, User } from 'lucide-react';
import { Printer, TonerInventory, PrinterFuser } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';
import UserManagementModal from './UserManagementModal';
import OperatorManagementModal from './OperatorManagementModal';

interface RegisterFuserModalProps {
  printer: Printer;
  isOpen: boolean;
  onClose: () => void;
}

export default function RegisterFuserModal({ printer, isOpen, onClose }: RegisterFuserModalProps) {
  const { 
    inventory, 
    fuserModels, 
    users,
    operators,
    defaultUser,
    defaultOperator,
    addPrinterFuser, 
    updateInventory,
    addChange,
    addEmptyToner
  } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNoStockModal, setShowNoStockModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<TonerInventory | null>(null);
  const [motorCycle, setMotorCycle] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');

  // Initialize default values when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedUser(defaultUser || '');
      setSelectedOperator(defaultOperator || '');
    }
  }, [isOpen, defaultUser, defaultOperator]);

  // Buscar fusores disponibles en el inventario para esta impresora
  const availableFusers = useMemo(() => {
    return inventory.filter(item => 
      item.printerId === printer.id && 
      item.quantity > 0 &&
      fuserModels.some(model => model.name === item.tonerModel) // Es un fusor si coincide con modelos de fusor
    );
  }, [inventory, printer.id, fuserModels]);

  const handleInventorySelect = (inventoryItem: TonerInventory) => {
    setSelectedInventoryItem(inventoryItem);
  };

  const handleConfirmFuserRegistration = async () => {
    if (!selectedInventoryItem) return;
    
    if (!motorCycle.trim()) {
      toast.error('El ciclo de motor es obligatorio');
      return;
    }

    setIsSubmitting(true);

    try {
      const fuserModel = fuserModels.find(model => model.name === selectedInventoryItem.tonerModel);
      if (!fuserModel) {
        toast.error('El item seleccionado no corresponde a un modelo de fusor registrado');
        return;
      }

      // Crear registro de fusor para la impresora
      const newPrinterFuser: PrinterFuser = {
        id: crypto.randomUUID(),
        printerId: printer.id,
        fuserModel: fuserModel.name,
        lifespan: fuserModel.lifespan,
        pagesUsed: 0,
        installationDate: new Date(),
        lastUpdate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Crear registro de cambio para el historial
      const changeRecord = {
        id: crypto.randomUUID(),
        changeDate: new Date(),
        printerId: printer.id,
        printerSerial: printer.serial,
        tonerModel: selectedInventoryItem.tonerModel, // Usar el modelo del fusor
        motorCycle: parseInt(motorCycle),
        printerIp: printer.ip,
        responsible: selectedUser,
        operator: selectedOperator,
        isBackup: false,
        motorCyclePending: false,
        createdAt: new Date()
      };

      // Crear registro de fusor vacío para devolución (si había un fusor anterior)
      const emptyFuserRecord = {
        id: crypto.randomUUID(),
        tonerModel: selectedInventoryItem.tonerModel,
        printerModel: printer.model,
        printerLocation: printer.location,
        changeDate: new Date(),
        category: 'warehouse' as const, // Por defecto en almacén
        status: 'ready_shipping' as const,
        isBackup: false,
        createdAt: new Date()
      };

      // Reducir inventario
      const updatedInventory = {
        ...selectedInventoryItem,
        quantity: selectedInventoryItem.quantity - 1,
        updatedAt: new Date()
      };

      // Guardar todos los cambios
      addPrinterFuser(newPrinterFuser);
      await supabaseService.add('printerFusers', newPrinterFuser);
      
      addChange(changeRecord);
      await supabaseService.add('changes', changeRecord);
      
      addEmptyToner(emptyFuserRecord);
      await supabaseService.add('emptyToners', emptyFuserRecord);
      
      updateInventory(selectedInventoryItem.id, updatedInventory);
      await supabaseService.update('inventory', updatedInventory);

      toast.success('Fusor registrado exitosamente');
      onClose();
    } catch (error) {
      toast.error('Error al registrar el fusor');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNoStock = () => {
    setShowNoStockModal(true);
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
            <div className="bg-green-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Settings size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Registrar Fusor Nuevo</h2>
                    <p className="text-green-100">{printer.model} - {printer.location}</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {availableFusers.length > 0 ? (
                <div>
                  {!selectedInventoryItem ? (
                    <>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Inventario Disponible para esta Impresora
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Selecciona un item del inventario que corresponda a un fusor:
                      </p>
                      
                      <div className="space-y-3">
                        {availableFusers.map((item) => {
                          const fuserModel = fuserModels.find(model => model.name === item.tonerModel);
                          const isFuser = !!fuserModel;
                          
                          return (
                            <div 
                              key={item.id} 
                              className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                                isFuser 
                                  ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                              onClick={() => handleInventorySelect(item)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium text-gray-900">{item.tonerModel}</h4>
                                  <p className="text-sm text-gray-600">{item.description}</p>
                                  {isFuser ? (
                                    <p className="text-sm text-blue-600">
                                      ✓ Fusor - Vida útil: {fuserModel.lifespan.toLocaleString()} páginas
                                    </p>
                                  ) : (
                                    <p className="text-sm text-gray-500">
                                      ⚠️ No es un modelo de fusor registrado
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className={`text-lg font-semibold ${
                                    isFuser ? 'text-green-600' : 'text-gray-600'
                                  }`}>
                                    {item.quantity}
                                  </span>
                                  <p className="text-sm text-gray-500">disponibles</p>
                                  <p className="text-xs text-blue-500 mt-1">Clic para seleccionar</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6">
                      {/* Fusor seleccionado */}
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">Fusor Seleccionado</h4>
                        <div className="text-sm text-blue-700">
                          <p><strong>Modelo:</strong> {selectedInventoryItem.tonerModel}</p>
                          <p><strong>Descripción:</strong> {selectedInventoryItem.description}</p>
                          <p><strong>Cantidad:</strong> {selectedInventoryItem.quantity} unidades</p>
                          {(() => {
                            const fuserModel = fuserModels.find(model => model.name === selectedInventoryItem.tonerModel);
                            return fuserModel && (
                              <p><strong>Vida útil:</strong> {fuserModel.lifespan.toLocaleString()} páginas</p>
                            );
                          })()}
                        </div>
                        <button
                          onClick={() => setSelectedInventoryItem(null)}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                          Cambiar selección
                        </button>
                      </div>

                      {/* Formulario de registro */}
                      <form onSubmit={(e) => { e.preventDefault(); handleConfirmFuserRegistration(); }} className="space-y-6">
                        {/* Ciclo de Motor */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ciclo de Motor *
                          </label>
                          <input
                            type="number"
                            value={motorCycle}
                            onChange={(e) => setMotorCycle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Ingrese el ciclo de motor actual"
                            required
                            min="0"
                          />
                        </div>

                        {/* Usuario Responsable */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Usuario Responsable *
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={selectedUser}
                              onChange={(e) => setSelectedUser(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              required
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
                            Operador *
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={selectedOperator}
                              onChange={(e) => setSelectedOperator(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              required
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

                        {/* Información adicional */}
                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                          <h4 className="font-medium text-green-800 mb-2">Información del Registro</h4>
                          <div className="text-sm text-green-700 space-y-1">
                            <p>• Se registrará el fusor nuevo en la impresora</p>
                            <p>• Se creará un registro en el historial de cambios</p>
                            <p>• Se agregará el fusor anterior a devolución (si aplica)</p>
                            <p>• Se actualizará el inventario disponible</p>
                          </div>
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end space-x-3 pt-4 border-t">
                          <button
                            type="button"
                            onClick={() => setSelectedInventoryItem(null)}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Volver
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                          >
                            {isSubmitting ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Registrando...
                              </>
                            ) : (
                              <>
                                <Settings size={16} />
                                Registrar Fusor
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">Sin inventario disponible</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No hay items disponibles en el inventario para esta impresora.
                  </p>
                  <button
                    onClick={handleNoStock}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <ShoppingCart size={16} />
                    Agregar al Inventario
                  </button>
                </div>
              )}

              {!selectedInventoryItem && availableFusers.length > 0 && (
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
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

          {/* No Stock Modal */}
          {showNoStockModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center">
              <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setShowNoStockModal(false)} />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <div className="text-center">
                  <AlertTriangle className="mx-auto h-12 w-12 text-yellow-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">Sin Inventario Disponible</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No hay items disponibles en el inventario para esta impresora. Agrega items al inventario primero.
                  </p>
                  <button
                    onClick={() => setShowNoStockModal(false)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}