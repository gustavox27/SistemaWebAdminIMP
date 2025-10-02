import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCcw, User, Settings, Package, AlertTriangle, Plus, ShoppingCart } from 'lucide-react';
import { Printer, TonerInventory, User as UserType, Operator } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import UserManagementModal from './UserManagementModal';
import OperatorManagementModal from './OperatorManagementModal';
import AddOrderModal from './AddOrderModal';

interface ChangeTonerProps {
  printer: Printer;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangeToner({ printer, isOpen, onClose }: ChangeTonerProps) {
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
    updatePrinter,
    addUser,
    addOperator,
    updateUser,
    updateOperator,
    deleteUser,
    deleteOperator
  } = useStore();

  const [motorCycle, setMotorCycle] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedLoanPrinter, setSelectedLoanPrinter] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderRegistered, setOrderRegistered] = useState(false);

  // Initialize default values when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedUser(defaultUser || '');
      setSelectedOperator(defaultOperator || '');
    }
  }, [isOpen, defaultUser, defaultOperator]);

  // Verificar si ya tiene un pedido registrado
  const hasExistingOrder = orders.some(order => 
    order.printerId === printer.id && order.status === 'pendiente'
  );

  // Obtener inventario para esta impresora
  const printerInventory = inventory.filter(item => 
    item.printerId === printer.id && 
    item.quantity > 0 &&
    !fuserModels.some(model => model.name === item.tonerModel) // Excluir fusores
  );

  // Obtener impresoras con el mismo modelo de toner que tengan inventario disponible
  const availableLoanPrinters = printers.filter(p => {
    // Excluir la impresora actual
    if (p.id === printer.id) return false;
    
    // Buscar inventario disponible para esta impresora con el modelo de toner correcto
    const hasAvailableInventory = inventory.some(inv => 
      inv.printerId === p.id && 
      inv.tonerModel === printer.tonerModel && 
      inv.quantity > 0 &&
      !fuserModels.some(model => model.name === inv.tonerModel) // Excluir fusores
    );
    
    return hasAvailableInventory;
  }).sort((a, b) => {
    // Ordenar por cantidad disponible (mayor a menor)
    const invA = inventory.find(inv => inv.printerId === a.id && inv.tonerModel === printer.tonerModel);
    const invB = inventory.find(inv => inv.printerId === b.id && inv.tonerModel === printer.tonerModel);
    return (invB?.quantity || 0) - (invA?.quantity || 0);
  });

  // Debug: Mostrar información para verificar la lógica
  console.log('Printer toner model:', printer.tonerModel);
  console.log('All inventory:', inventory);
  console.log('Available loan printers:', availableLoanPrinters);
  console.log('Printer inventory length:', printerInventory.length);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!motorCycle.trim()) {
      toast.error('El ciclo de motor es obligatorio');
      return;
    }

    if (printerInventory.length === 0 && !selectedLoanPrinter && !orderRegistered && !hasExistingOrder) {
      toast.error('No hay toners disponibles para esta impresora');
      return;
    }

    setIsSubmitting(true);

    try {
      let inventoryToUse;
      let printerToUpdate = printer;

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
        toast.error('No se puede cambiar un fusor usando esta función. Use la función específica para fusores.');
        return;
      }

      if (!inventoryToUse) {
        toast.error('No se encontró inventario disponible');
        return;
      }

      // Crear registro de cambio
      const changeRecord = {
        id: crypto.randomUUID(),
        changeDate: new Date(),
        printerId: printer.id,
        printerSerial: printer.serial,
        tonerModel: printer.tonerModel,
        motorCycle: parseInt(motorCycle),
        printerIp: printer.ip,
        responsible: selectedUser,
        operator: selectedOperator,
        createdAt: new Date()
      };

      // Crear registro de toner vacío
      const emptyTonerRecord = {
        id: crypto.randomUUID(),
        tonerModel: printer.tonerModel,
        printerModel: printer.model,
        printerLocation: printer.location,
        changeDate: new Date(),
        category: 'warehouse' as const, // Cambio normal va directo al almacén
        status: 'ready_shipping' as const,
        isBackup: false,
        createdAt: new Date()
      };

      // Actualizar impresora
      const updatedPrinter: Printer = {
        ...printer,
        currentTonerLevel: 100,
        motorCycle: parseInt(motorCycle),
        updatedAt: new Date()
      };

      // Reducir inventario y manejar préstamo si es necesario
      const updatedInventoryItem: TonerInventory = {
        ...inventoryToUse,
        quantity: inventoryToUse.quantity - 1,
        updatedAt: new Date()
      };

      // Si es un préstamo, crear registro de préstamo
      if (selectedLoanPrinter) {
        const loanRecord: TonerLoan = {
          id: crypto.randomUUID(),
          inventoryId: inventoryToUse.id,
          lenderPrinterId: selectedLoanPrinter,
          borrowerPrinterId: printer.id,
          lenderLocation: printers.find(p => p.id === selectedLoanPrinter)?.location || '',
          borrowerLocation: printer.location,
          tonerModel: printer.tonerModel,
          quantity: 1,
          loanDate: new Date(),
          loanMessage: `Prestado a ${printer.location} - Serie: ${printer.serial} - IP: ${printer.ip}`,
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
        toast.success(`Cambio registrado usando toner prestado de ${loanPrinter?.location}`);
      } else {
        toast.success('Cambio de toner registrado exitosamente');
      }
      
      onClose();
    } catch (error) {
      toast.error('Error al registrar el cambio de toner');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrderCreated = () => {
    setShowOrderModal(false);
    setOrderRegistered(true);
    // Refrescar la vista para mostrar las opciones de préstamo
    toast.success('Pedido registrado. Ahora puedes usar un toner prestado.');
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
                  <RefreshCcw size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Cambiar Toner</h2>
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
              {printerInventory.length === 0 && availableLoanPrinters.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">Sin inventario disponible</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No hay toners disponibles para esta impresora. Necesitas hacer un pedido primero.
                  </p>
                  <button
                    onClick={() => setShowOrderModal(true)}
                    className={`mt-4 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto ${
                      orderRegistered || hasExistingOrder
                        ? 'bg-green-600 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    disabled={isSubmitting || orderRegistered || hasExistingOrder}
                  >
                    <ShoppingCart size={16} />
                    {orderRegistered || hasExistingOrder ? (
                      <>Pedido Registrado ✓</>
                    ) : (
                      'Registrar Pedido'
                    )}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Ciclo de Motor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ciclo de Motor *
                    </label>
                    <input
                      type="number"
                      disabled={isSubmitting || (printerInventory.length === 0 && !selectedLoanPrinter && !orderRegistered)}
                      value={motorCycle}
                      onChange={(e) => setMotorCycle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                                <p className="text-xs text-blue-500">Modelo Toner: {printer.tonerModel}</p>
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
                      {(hasExistingOrder || orderRegistered) && (
                        <div className="space-y-2">
                        {availableLoanPrinters.map((loanPrinter) => {
                          const loanInventory = inventory.find(inv => 
                            inv.printerId === loanPrinter.id && 
                            inv.tonerModel === printer.tonerModel && 
                            inv.quantity > 0
                          );
                          
                          // Debug: mostrar información del inventario encontrado
                          console.log('Loan Printer:', loanPrinter.location, 'Inventory:', loanInventory);
                          
                          return (
                            <div key={loanPrinter.id} className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium text-gray-900">{loanPrinter.model}</h4>
                                  <p className="text-sm text-gray-600">{loanPrinter.location} - {loanPrinter.ip}</p>
                                  <p className="text-xs text-gray-500">Serie: {loanPrinter.serial}</p>
                                  <p className="text-xs text-blue-500">Modelo Toner: {loanPrinter.tonerModel}</p>
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
                                     onChange={(e) => setSelectedLoanPrinter(e.target.value)}
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
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
        </div>
      )}
    </AnimatePresence>
  );
}