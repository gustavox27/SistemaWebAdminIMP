import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Plus, ShoppingCart, AlertTriangle } from 'lucide-react';
import { Printer, TonerInventory, User as UserType, Operator } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';
import UserManagementModal from './UserManagementModal';
import OperatorManagementModal from './OperatorManagementModal';
import AddOrderModal from './AddOrderModal';
import ExistingOrderModal from './ExistingOrderModal';

interface BackupTonerModalProps {
  printer: Printer;
  isOpen: boolean;
  onClose: () => void;
}

export default function BackupTonerModal({ printer, isOpen, onClose }: BackupTonerModalProps) {
  const { 
    inventory,
    printers,
    orders,
    users, 
    operators, 
    fuserModels,
    defaultUser,
    defaultOperator,
    addLoan,
    addChange, 
    addEmptyToner,
    updateInventory, 
    updatePrinter
  } = useStore();

  const [motorCycle, setMotorCycle] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showExistingOrderModal, setShowExistingOrderModal] = useState(false);
  const [selectedLoanPrinter, setSelectedLoanPrinter] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize default values when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedUser(defaultUser || '');
      setSelectedOperator(defaultOperator || '');
    }
  }, [isOpen, defaultUser, defaultOperator]);

  // Obtener inventario para esta impresora
  const printerInventory = inventory.filter(item => 
    item.printerId === printer.id && 
    item.quantity > 0 &&
    !fuserModels.some(model => model.name === item.tonerModel) // Excluir fusores
  );

  // Verificar si ya tiene un pedido registrado
  const hasExistingOrder = orders.some(order => 
    order.printerId === printer.id && order.status === 'pendiente'
  );

  // Obtener impresoras con el mismo modelo de toner que tengan inventario disponible
  const availableLoanPrinters = printers.filter(p => {
    if (p.id === printer.id) return false;
    
    const hasAvailableInventory = inventory.some(inv => 
      inv.printerId === p.id && 
      inv.tonerModel === printer.tonerModel && 
      inv.quantity > 0 &&
      !fuserModels.some(model => model.name === inv.tonerModel) // Excluir fusores
    );
    
    return hasAvailableInventory;
  }).sort((a, b) => {
    const invA = inventory.find(inv => inv.printerId === a.id && inv.tonerModel === printer.tonerModel);
    const invB = inventory.find(inv => inv.printerId === b.id && inv.tonerModel === printer.tonerModel);
    return (invB?.quantity || 0) - (invA?.quantity || 0);
  });

  const handleLoanPrinterSelect = (loanPrinterId: string) => {
    if (hasExistingOrder) {
      setSelectedLoanPrinter(loanPrinterId);
    } else {
      setSelectedLoanPrinter(loanPrinterId);
      setShowExistingOrderModal(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (printerInventory.length === 0 && !selectedLoanPrinter) {
      toast.error('No hay toners disponibles para esta impresora');
      return;
    }

    setIsSubmitting(true);

    try {
      let inventoryToUse;
      const motorCycleValue = motorCycle.trim() || 'Falta capturar ciclo';
      const isMotorCyclePending = !motorCycle.trim();

      if (selectedLoanPrinter) {
        // Usar toner prestado
        inventoryToUse = inventory.find(item => 
          item.printerId === selectedLoanPrinter && 
          item.tonerModel === printer.tonerModel && 
          item.quantity > 0 &&
          !fuserModels.some(model => model.name === item.tonerModel) // Excluir fusores
        );
      } else {
        // Usar toner propio
        inventoryToUse = printerInventory[0];
      }

      // Validación adicional para asegurar que no es un fusor
      if (inventoryToUse && fuserModels.some(model => model.name === inventoryToUse.tonerModel)) {
        toast.error('No se puede usar un fusor como toner backup. Use la función específica para fusores.');
        return;
      }

      if (!inventoryToUse) {
        toast.error('No se encontró inventario disponible');
        return;
      }

      // Crear registro de cambio (backup)
      const changeRecord = {
        id: crypto.randomUUID(),
        changeDate: new Date(),
        printerId: printer.id,
        printerSerial: printer.serial,
        tonerModel: printer.tonerModel,
        motorCycle: isMotorCyclePending ? 0 : parseInt(motorCycleValue),
        printerIp: printer.ip,
        responsible: selectedUser,
        operator: selectedOperator,
        isBackup: true,
        motorCyclePending: isMotorCyclePending,
        createdAt: new Date()
      };

      // Crear registro de toner vacío
      const emptyTonerRecord = {
        id: crypto.randomUUID(),
        tonerModel: printer.tonerModel,
        printerModel: printer.model,
        printerLocation: printer.location,
        changeDate: new Date(),
        category: 'area' as const, // Toner backup va primero al área
        status: isMotorCyclePending ? 'pending_cycle' as const : 'ready_pickup' as const,
        isBackup: true,
        motorCycleCaptured: !isMotorCyclePending,
        createdAt: new Date()
      };

      // Actualizar impresora con estado de backup
      const updatedPrinter: Printer = {
        ...printer,
        currentTonerLevel: printer.currentTonerLevel, // Mantener nivel actual hasta capturar ciclo
        hasBackupToner: true,
        motorCyclePending: isMotorCyclePending,
        updatedAt: new Date()
      };

      // Solo actualizar motorCycle si se proporcionó
      if (!isMotorCyclePending) {
        updatedPrinter.motorCycle = parseInt(motorCycleValue);
        updatedPrinter.currentTonerLevel = 100; // Solo actualizar a 100% si se capturó el ciclo
      }

      // Reducir inventario y manejar préstamo si es necesario
      const updatedInventoryItem: TonerInventory = {
        ...inventoryToUse,
        quantity: inventoryToUse.quantity - 1,
        updatedAt: new Date()
      };

      // Si es un préstamo, crear registro de préstamo
      if (selectedLoanPrinter) {
        const loanRecord = {
          id: crypto.randomUUID(),
          inventoryId: inventoryToUse.id,
          lenderPrinterId: selectedLoanPrinter,
          borrowerPrinterId: printer.id,
          lenderLocation: printers.find(p => p.id === selectedLoanPrinter)?.location || '',
          borrowerLocation: printer.location,
          tonerModel: printer.tonerModel,
          quantity: 1,
          loanDate: new Date(),
          loanMessage: `Prestado para backup a ${printer.location} - Serie: ${printer.serial} - IP: ${printer.ip}`,
          isReturned: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        addLoan(loanRecord);
        await supabaseService.add('loans', loanRecord);
      }

      // Guardar cambios
      addChange(changeRecord);
      addEmptyToner(emptyTonerRecord);
      updatePrinter(printer.id, updatedPrinter);
      updateInventory(inventoryToUse.id, updatedInventoryItem);

      await supabaseService.add('changes', changeRecord);
      await supabaseService.add('emptyToners', emptyTonerRecord);
      await supabaseService.update('printers', updatedPrinter);
      await supabaseService.update('inventory', updatedInventoryItem);

      if (selectedLoanPrinter) {
        const loanPrinter = printers.find(p => p.id === selectedLoanPrinter);
        toast.success(`Toner backup registrado usando toner prestado de ${loanPrinter?.location}`);
      } else {
        toast.success('Toner backup registrado exitosamente');
      }

      if (isMotorCyclePending) {
        toast('Recuerda capturar el ciclo de motor posteriormente');
      }
      
      onClose();
    } catch (error) {
      toast.error('Error al registrar el toner backup');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrderCreated = () => {
    setShowOrderModal(false);
    toast.success('Pedido registrado. Ahora puedes usar un toner prestado.');
  };

  const handleExistingOrderConfirm = () => {
    setShowExistingOrderModal(false);
    // Continuar con el flujo normal
  };

  const handleExistingOrderCreateNew = () => {
    setShowExistingOrderModal(false);
    setShowOrderModal(true);
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
            <div className="bg-yellow-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Package size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Dejar Toner Backup</h2>
                    <p className="text-yellow-100">{printer.model} - {printer.location}</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-yellow-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {printerInventory.length === 0 && availableLoanPrinters.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">Sin inventario disponible</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No hay toners disponibles para esta impresora. Necesitas hacer un pedido primero.
                  </p>
                  <button
                    onClick={() => setShowOrderModal(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mx-auto"
                  >
                    <ShoppingCart size={16} />
                    Registrar Pedido
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Ciclo de Motor (Opcional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ciclo de Motor (Opcional)
                    </label>
                    <input
                      type="number"
                      value={motorCycle}
                      onChange={(e) => setMotorCycle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="Falta capturar ciclo"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Si no se ingresa, se marcará como "Falta capturar ciclo"
                    </p>
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
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

                  {/* Inventario Propio */}
                  {printerInventory.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <Package size={20} className="mr-2" />
                        Inventario Propio
                      </h3>
                      <div className="space-y-2">
                        {printerInventory.map((item) => (
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
                  )}

                  {/* Toners Disponibles para Préstamo */}
                  {printerInventory.length === 0 && availableLoanPrinters.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <Package size={20} className="mr-2" />
                        Toners Disponibles para Préstamo
                      </h3>
                      {hasExistingOrder ? (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Pedido pendiente de entrega...</strong> Puede solicitar un préstamo de toner
                          </p>
                        </div>
                      ) : (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800 mb-3">
                            <strong>Por favor registre un pedido para continuar con el préstamo de toner</strong>
                          </p>
                          <button
                            onClick={() => setShowOrderModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            disabled={isSubmitting}
                          >
                            <ShoppingCart size={16} />
                            Registrar Pedido
                          </button>
                        </div>
                      )}
                      {hasExistingOrder && (
                        <div className="space-y-2">
                        {availableLoanPrinters.map((loanPrinter) => {
                          const loanInventory = inventory.find(inv => 
                            inv.printerId === loanPrinter.id && 
                            inv.tonerModel === printer.tonerModel && 
                            inv.quantity > 0
                          );
                          
                          return (
                            <div key={loanPrinter.id} className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium text-gray-900">{loanPrinter.model}</h4>
                                  <p className="text-sm text-gray-600">{loanPrinter.location} - {loanPrinter.ip}</p>
                                  <p className="text-xs text-gray-500">Serie: {loanPrinter.serial}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-lg font-semibold text-yellow-600">
                                    {loanInventory?.quantity || 0}
                                  </span>
                                  <p className="text-sm text-gray-500">disponibles</p>
                                  <label className="flex items-center mt-2">
                                    <input
                                      type="radio"
                                      name="loanPrinter"
                                      value={loanPrinter.id}
                                      checked={selectedLoanPrinter === loanPrinter.id}
                                      onChange={() => handleLoanPrinterSelect(loanPrinter.id)}
                                      className="mr-2"
                                    />
                                    <span className="text-sm">Usar este toner</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botones */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowOrderModal(true)}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <ShoppingCart size={16} />
                      Registrar Pedido
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || (printerInventory.length === 0 && !selectedLoanPrinter)}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Package size={16} />
                          Dejar Toner Backup
                        </>
                      )}
                    </button>
                  </div>
                </form>
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
              onOrderCreated={handleOrderCreated}
            />
          )}

          {/* Existing Order Modal */}
          {showExistingOrderModal && (
            <ExistingOrderModal
              isOpen={showExistingOrderModal}
              onClose={() => setShowExistingOrderModal(false)}
              onConfirm={handleExistingOrderConfirm}
              onCreateNew={handleExistingOrderCreateNew}
              printerLocation={printer.location}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}