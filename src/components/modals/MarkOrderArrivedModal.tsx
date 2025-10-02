import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Calendar, AlertCircle } from 'lucide-react';
import { TonerOrder, TonerInventory, TonerLoan } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import LoanReturnModal from './LoanReturnModal';

interface MarkOrderArrivedModalProps {
  order: TonerOrder;
  isOpen: boolean;
  onClose: () => void;
}

export default function MarkOrderArrivedModal({ order, isOpen, onClose }: MarkOrderArrivedModalProps) {
  const { updateOrder, addInventory, inventory, updateInventory, printers, loans } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [arrivalDate, setArrivalDate] = useState(() => {
    // Obtener la fecha actual en la zona horaria local
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [showLoanReturnModal, setShowLoanReturnModal] = useState(false);
  const [pendingLoanReturns, setPendingLoanReturns] = useState<TonerLoan[]>([]);

  // Buscar préstamos pendientes para esta impresora
  const findPendingLoans = () => {
    const printer = printers.find(p => p.id === order.printerId);
    if (!printer) return [];

    return loans.filter(loan => 
      loan.borrowerPrinterId === printer.id &&
      loan.tonerModel === order.tonerModel &&
      !loan.isReturned
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Si ya se confirmó, mostrar mensaje y abrir modal de devolución
    if (isConfirmed) {
      toast.success('Ya se confirmó la llegada del pedido exitosamente');
      const loansToReturn = findPendingLoans();
      if (loansToReturn.length > 0) {
        setPendingLoanReturns(loansToReturn);
        setShowLoanReturnModal(true);
      }
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Crear la fecha correctamente para evitar problemas de zona horaria
      const [year, month, day] = arrivalDate.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day, 12, 0, 0); // Usar mediodía para evitar problemas de zona horaria
      
      // Actualizar el pedido como llegado
      const updatedOrder: TonerOrder = {
        ...order,
        status: 'llegado',
        arrivalDate: selectedDate,
        updatedAt: new Date()
      };

      // Buscar si ya existe inventario para esta impresora y modelo de toner
      const existingInventory = inventory.find(
        item => item.printerId === order.printerId && item.tonerModel === order.tonerModel
      );

      if (existingInventory) {
        // Actualizar inventario existente
        const updatedInventory: TonerInventory = {
          ...existingInventory,
          quantity: existingInventory.quantity + order.quantity,
          updatedAt: new Date()
        };
        
        updateInventory(existingInventory.id, updatedInventory);
        await supabaseService.update('inventory', updatedInventory);
      } else {
        // Crear nuevo item de inventario
        const newInventoryItem: TonerInventory = {
          id: crypto.randomUUID(),
          printerId: order.printerId,
          tonerModel: order.tonerModel,
          description: order.description,
          quantity: order.quantity,
          onLoan: false,
          loanMessage: '',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        addInventory(newInventoryItem);
        await supabaseService.add('inventory', newInventoryItem);
      }

      updateOrder(order.id, updatedOrder);
      await supabaseService.update('orders', updatedOrder);
      
      // Marcar como confirmado
      setIsConfirmed(true);
      
      // Verificar si hay préstamos pendientes para devolver
      const loansToReturn = findPendingLoans();
      
      if (loansToReturn.length > 0) {
        setPendingLoanReturns(loansToReturn);
        setShowLoanReturnModal(true);
        toast.success('Pedido llegado. Se detectaron préstamos pendientes de devolución.');
      } else {
        toast.success('Pedido marcado como llegado y agregado al inventario');
        onClose();
      }
    } catch (error) {
      toast.error('Error al procesar la llegada del pedido');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoanReturnComplete = () => {
    setShowLoanReturnModal(false);
    toast.success('Pedido procesado y préstamos devueltos exitosamente');
    onClose();
  };
  
  // Reset del estado cuando se cierra el modal
  const handleClose = () => {
    setIsConfirmed(false);
    onClose();
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
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            {/* Header */}
            <div className={`${isConfirmed ? 'bg-blue-600' : 'bg-green-600'} text-white p-6`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Check size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">
                      {isConfirmed ? 'Pedido Confirmado' : 'Marcar como Llegado'}
                    </h2>
                    <p className={`${isConfirmed ? 'text-blue-100' : 'text-green-100'}`}>
                      #{order.trackingNumber}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleClose}
                  className={`p-2 ${isConfirmed ? 'hover:bg-blue-700' : 'hover:bg-green-700'} rounded-lg transition-colors`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {isConfirmed && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-800">
                      Pedido confirmado exitosamente
                    </span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    El pedido ha sido marcado como llegado y agregado al inventario.
                  </p>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Detalles del Pedido</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Modelo de Toner:</span>
                    <span className="font-medium">{order.tonerModel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cantidad:</span>
                    <span className="font-medium">{order.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Descripción:</span>
                    <span className="font-medium">{order.description}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Fecha de Llegada */}
                <div className={isConfirmed ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Calendar size={16} className="mr-2" />
                    Fecha de Llegada *
                  </label>
                  <input
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setArrivalDate(newDate);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={isConfirmed}
                    max={(() => {
                      // Establecer fecha máxima como hoy
                      const today = new Date();
                      const year = today.getFullYear();
                      const month = String(today.getMonth() + 1).padStart(2, '0');
                      const day = String(today.getDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    })()}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Fecha actual: {format(new Date(), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>

                {!isConfirmed && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Nota:</strong> Al marcar este pedido como llegado, se agregará automáticamente 
                      al inventario de la impresora correspondiente.
                    </p>
                  </div>
                )}
                
                {!isConfirmed && findPendingLoans().length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                      <span className="font-medium text-yellow-800">Préstamos Pendientes</span>
                    </div>
                    <p className="text-sm text-yellow-700">
                      Se detectaron {findPendingLoans().length} préstamo(s) pendiente(s) de devolución para esta impresora.
                      Después de confirmar la llegada, podrás procesar las devoluciones.
                    </p>
                  </div>
                )}
                
                {isConfirmed && findPendingLoans().length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-medium text-blue-800">Préstamos Pendientes</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Hay {findPendingLoans().length} préstamo(s) pendiente(s) de devolución. 
                      Haz clic en "Confirmar Llegada" para procesar las devoluciones.
                    </p>
                  </div>
                )}
                
                {isConfirmed && findPendingLoans().length === 0 && (
                  <p className="text-sm text-blue-800">
                    No hay préstamos pendientes de devolución para esta impresora.
                  </p>
                )}

                {/* Botones */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {isConfirmed ? 'Cerrar' : 'Cancelar'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting && !isConfirmed}
                    className={`px-6 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                      isConfirmed 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    <Check size={16} />
                    {isConfirmed 
                      ? 'Confirmar Llegada' 
                      : (isSubmitting ? 'Procesando...' : 'Confirmar Llegada')
                    }
                  </button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Loan Return Modal */}
          {showLoanReturnModal && (
            <LoanReturnModal
              isOpen={showLoanReturnModal}
              onClose={() => setShowLoanReturnModal(false)}
              onComplete={handleLoanReturnComplete}
              pendingLoans={pendingLoanReturns}
              receivingPrinter={printers.find(p => p.id === order.printerId)}
              arrivedQuantity={order.quantity}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}