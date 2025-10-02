import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Plus, AlertTriangle, ShoppingCart, User, Clock } from 'lucide-react';
import { Printer, TonerInventory, PrinterFuser } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import { calculateFuserPrediction } from '../../utils/fuserPredictions';
import toast from 'react-hot-toast';
import UserManagementModal from './UserManagementModal';
import OperatorManagementModal from './OperatorManagementModal';
import AddOrderModal from './AddOrderModal';

interface ChangeFuserModalProps {
  printer: Printer;
  currentFuser: PrinterFuser;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangeFuserModal({ printer, currentFuser, isOpen, onClose }: ChangeFuserModalProps) {
  const {
    inventory,
    fuserModels,
    users,
    operators,
    defaultUser,
    defaultOperator,
    addChange,
    addEmptyToner,
    updateInventory,
    updatePrinterFuser,
    deletePrinterFuser,
    addPrinterFuser
  } = useStore();

  const [motorCycle, setMotorCycle] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<TonerInventory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingForOrder, setWaitingForOrder] = useState(false);

  // Initialize default values when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedUser(defaultUser || '');
      setSelectedOperator(defaultOperator || '');
      setWaitingForOrder(false);
      setSelectedInventoryItem(null);
    }
  }, [isOpen, defaultUser, defaultOperator]);

  // Obtener fusores disponibles en el inventario para esta impresora
  const availableFusers = inventory.filter(item =>
    item.printerId === printer.id &&
    item.quantity > 0 &&
    fuserModels.some(model => model.name === item.tonerModel) // Es un fusor si coincide con modelos de fusor
  );

  // Calcular predicción del fusor actual
  const currentFuserPrediction = calculateFuserPrediction(printer, currentFuser);

  const handleInventorySelect = (inventoryItem: TonerInventory) => {
    setSelectedInventoryItem(inventoryItem);
  };

  const handleOrderSubmit = () => {
    setShowOrderModal(false);
    setWaitingForOrder(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedInventoryItem) {
      toast.error('Debe seleccionar un fusor del inventario');
      return;
    }
    
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

      // Crear registro de cambio para el historial
      const changeRecord = {
        id: crypto.randomUUID(),
        changeDate: new Date(),
        printerId: printer.id,
        printerSerial: printer.serial,
        tonerModel: selectedInventoryItem.tonerModel, // Usar el modelo del fusor nuevo
        motorCycle: parseInt(motorCycle),
        printerIp: printer.ip,
        responsible: selectedUser,
        operator: selectedOperator,
        isBackup: false,
        motorCyclePending: false,
        createdAt: new Date()
      };

      // Crear registro de fusor vacío para devolución (fusor anterior)
      const emptyFuserRecord = {
        id: crypto.randomUUID(),
        tonerModel: currentFuser.fuserModel, // Usar el modelo del fusor anterior
        printerModel: printer.model,
        printerLocation: printer.location,
        changeDate: new Date(),
        category: 'warehouse' as const,
        status: 'ready_shipping' as const,
        isBackup: false,
        createdAt: new Date()
      };

      // Eliminar el fusor anterior
      deletePrinterFuser(currentFuser.id);
      await supabaseService.delete('printerFusers', currentFuser.id);

      // Crear nuevo registro de fusor para la impresora
      const newPrinterFuser = {
        id: crypto.randomUUID(),
        printerId: printer.id,
        fuserModel: fuserModel.name,
        lifespan: fuserModel.lifespan,
        pagesUsed: 0, // Fusor nuevo empieza en 0
        installationDate: new Date(),
        lastUpdate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
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

      toast.success('Fusor cambiado exitosamente');
      onClose();
    } catch (error) {
      toast.error('Error al cambiar el fusor');
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
            <div className="bg-orange-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Settings size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Cambiar Fusor</h2>
                    <p className="text-orange-100">{printer.model} - {printer.location}</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-orange-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Advertencia con estado actual del fusor */}
              <div className="mb-6">
                <div className={`border p-5 rounded-lg ${
                  currentFuserPrediction.status === 'critical'
                    ? 'bg-red-50 border-red-300'
                    : currentFuserPrediction.status === 'warning'
                    ? 'bg-yellow-50 border-yellow-300'
                    : 'bg-blue-50 border-blue-300'
                }`}>
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className={`flex-shrink-0 ${
                      currentFuserPrediction.status === 'critical'
                        ? 'text-red-600'
                        : currentFuserPrediction.status === 'warning'
                        ? 'text-yellow-600'
                        : 'text-blue-600'
                    }`} size={24} />
                    <div className="flex-1">
                      <h4 className={`font-semibold mb-2 ${
                        currentFuserPrediction.status === 'critical'
                          ? 'text-red-800'
                          : currentFuserPrediction.status === 'warning'
                          ? 'text-yellow-800'
                          : 'text-blue-800'
                      }`}>
                        {currentFuserPrediction.status === 'critical'
                          ? '¡Cambio de Fusor Necesario!'
                          : currentFuserPrediction.status === 'warning'
                          ? 'Fusor en Advertencia'
                          : 'Fusor en Buen Estado'}
                      </h4>
                      <p className={`text-sm mb-3 ${
                        currentFuserPrediction.status === 'critical'
                          ? 'text-red-700'
                          : currentFuserPrediction.status === 'warning'
                          ? 'text-yellow-700'
                          : 'text-blue-700'
                      }`}>
                        {currentFuserPrediction.status === 'critical'
                          ? 'El fusor ha alcanzado un nivel crítico y debe ser reemplazado urgentemente para evitar fallas en la impresión.'
                          : currentFuserPrediction.status === 'warning'
                          ? 'El fusor está acercándose al final de su vida útil. Se recomienda planificar su reemplazo pronto.'
                          : 'El fusor actual aún tiene vida útil considerable. Confirme si desea realizar el cambio ahora.'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white bg-opacity-60 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Modelo del Fusor:</span>
                      <span className="text-sm font-bold text-gray-900">{currentFuser.fuserModel}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Nivel Actual:</span>
                      <span className={`text-lg font-bold ${
                        currentFuserPrediction.status === 'critical' ? 'text-red-600' :
                        currentFuserPrediction.status === 'warning' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {Math.round(currentFuserPrediction.currentLevel)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          currentFuserPrediction.status === 'critical' ? 'bg-red-500' :
                          currentFuserPrediction.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${currentFuserPrediction.currentLevel}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <span className="text-xs text-gray-600">Páginas Usadas:</span>
                        <p className="text-sm font-semibold text-gray-900">{currentFuserPrediction.pagesUsed.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600">Páginas Restantes:</span>
                        <p className="text-sm font-semibold text-gray-900">{currentFuserPrediction.pagesRemaining.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {waitingForOrder ? (
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg text-center">
                  <Clock className="mx-auto h-16 w-16 text-blue-500 mb-4 animate-pulse" />
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">A la espera de la llegada del consumible...</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Se ha registrado el pedido del fusor. Una vez que llegue el consumible, podrás continuar con el proceso de cambio.
                  </p>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              ) : availableFusers.length > 0 ? (
                <div>
                  {!selectedInventoryItem ? (
                    <>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Fusores Disponibles en Inventario
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Selecciona un fusor del inventario para reemplazar el actual:
                      </p>
                      
                      <div className="space-y-3">
                        {availableFusers.map((item) => {
                          const fuserModel = fuserModels.find(model => model.name === item.tonerModel);
                          
                          return (
                            <div 
                              key={item.id} 
                              className="bg-green-50 border-green-200 hover:bg-green-100 border rounded-lg p-4 transition-colors cursor-pointer"
                              onClick={() => handleInventorySelect(item)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium text-gray-900">{item.tonerModel}</h4>
                                  <p className="text-sm text-gray-600">{item.description}</p>
                                  {fuserModel && (
                                    <p className="text-sm text-blue-600">
                                      ✓ Vida útil: {fuserModel.lifespan.toLocaleString()} páginas
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="text-lg font-semibold text-green-600">
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
                        <h4 className="font-medium text-blue-800 mb-2">Fusor Nuevo Seleccionado</h4>
                        <div className="text-sm text-blue-700">
                          <p><strong>Modelo:</strong> {selectedInventoryItem.tonerModel}</p>
                          <p><strong>Descripción:</strong> {selectedInventoryItem.description}</p>
                          <p><strong>Cantidad disponible:</strong> {selectedInventoryItem.quantity} unidades</p>
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

                      {/* Formulario de cambio */}
                      <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Ciclo de Motor */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Ciclo de Motor *
                          </label>
                          <input
                            type="number"
                            value={motorCycle}
                            onChange={(e) => setMotorCycle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                          <h4 className="font-medium text-orange-800 mb-2">Información del Cambio</h4>
                          <div className="text-sm text-orange-700 space-y-1">
                            <p>• Se reemplazará el fusor actual por el seleccionado</p>
                            <p>• Se creará un registro en el historial de cambios</p>
                            <p>• El fusor anterior se agregará a devolución</p>
                            <p>• Se actualizará el inventario disponible</p>
                            <p>• El nuevo fusor empezará con 0 páginas usadas</p>
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
                            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                          >
                            {isSubmitting ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Cambiando...
                              </>
                            ) : (
                              <>
                                <Settings size={16} />
                                Cambiar Fusor
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-200 p-6 rounded-lg text-center">
                  <AlertTriangle className="mx-auto h-16 w-16 text-orange-500 mb-4" />
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">No hay fusores disponibles en inventario</h3>
                  <p className="text-sm text-orange-700 mb-4">
                    No se encontraron fusores disponibles para esta impresora. Por favor, registra un pedido para poder continuar con el cambio.
                  </p>
                  <button
                    onClick={() => setShowOrderModal(true)}
                    className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 mx-auto font-medium shadow-md"
                  >
                    <ShoppingCart size={20} />
                    Pedir Fusor
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

          {/* Add Order Modal */}
          {showOrderModal && (
            <AddOrderModal
              isOpen={showOrderModal}
              onClose={() => setShowOrderModal(false)}
              preselectedPrinterId={printer.id}
              onOrderCreated={handleOrderSubmit}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}