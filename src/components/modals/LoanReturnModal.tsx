import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCcw, Check, Calendar, ArrowLeftRight } from 'lucide-react';
import { TonerInventory, Printer, TonerLoan } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

interface LoanReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  pendingLoans: TonerLoan[];
  receivingPrinter?: Printer;
  arrivedQuantity: number;
}

export default function LoanReturnModal({ 
  isOpen, 
  onClose, 
  onComplete, 
  pendingLoans, 
  receivingPrinter,
  arrivedQuantity 
}: LoanReturnModalProps) {
  const { updateInventory, updateLoan, printers } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnDate, setReturnDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedLoans, setSelectedLoans] = useState<string[]>(
    pendingLoans.map(loan => loan.id)
  );

  const handleLoanSelection = (loanId: string, checked: boolean) => {
    if (checked) {
      setSelectedLoans(prev => [...prev, loanId]);
    } else {
      setSelectedLoans(prev => prev.filter(id => id !== loanId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const selectedDate = new Date(returnDate);
      
      for (const loanId of selectedLoans) {
        const loan = pendingLoans.find(l => l.id === loanId);
        if (!loan) continue;

        // Encontrar el inventario de la impresora que devuelve (borrower)
        const borrowerInventory = await supabaseService.getAll('inventory');
        const borrowerInventoryItem = borrowerInventory.find(inv => 
          inv.printerId === loan.borrowerPrinterId && 
          inv.tonerModel === loan.tonerModel
        );

        // Reducir el stock de la impresora que devuelve
        if (borrowerInventoryItem && borrowerInventoryItem.quantity >= loan.quantity) {
          const updatedBorrowerInventory = {
            ...borrowerInventoryItem,
            quantity: borrowerInventoryItem.quantity - loan.quantity,
            updatedAt: new Date()
          };
          updateInventory(borrowerInventoryItem.id, updatedBorrowerInventory);
          await supabaseService.update('inventory', updatedBorrowerInventory);
        }

        // Marcar el préstamo como devuelto
        const updatedLoan: TonerLoan = {
          ...loan,
          isReturned: true,
          returnDate: selectedDate,
          returnedBy: receivingPrinter?.location || 'Desconocido',
          updatedAt: new Date()
        };

        // Devolver la cantidad al inventario original (lender)
        const originalInventory = await supabaseService.get('inventory', loan.inventoryId);
        if (originalInventory) {
          const updatedInventory = {
            ...originalInventory,
            quantity: originalInventory.quantity + loan.quantity,
            updatedAt: new Date()
          };
          updateInventory(loan.inventoryId, updatedInventory);
          await supabaseService.update('inventory', updatedInventory);
        }

        updateLoan(loan.id, updatedLoan);
        await supabaseService.update('loans', updatedLoan);
      }

      toast.success(`${selectedLoans.length} préstamo(s) devuelto(s) exitosamente`);
      onComplete();
    } catch (error) {
      toast.error('Error al procesar las devoluciones');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
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
                    <h2 className="text-xl font-semibold">Devolución de Préstamos</h2>
                    <p className="text-green-100">
                      {receivingPrinter?.model} - {receivingPrinter?.location}
                    </p>
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
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                  <div className="flex items-center mb-2">
                    <ArrowLeftRight className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-800">Información del Pedido</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Han llegado <strong>{arrivedQuantity}</strong> toner(s) para {receivingPrinter?.location}.
                    Se detectaron préstamos pendientes que pueden ser devueltos.
                  </p>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Préstamos Pendientes de Devolución
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Fecha de Devolución */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Calendar size={16} className="mr-2" />
                    Fecha de Devolución *
                  </label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Lista de Préstamos */}
                <div className="space-y-3">
                  {pendingLoans.map((loan) => {
                    const lenderPrinter = printers.find(p => p.id === loan.lenderPrinterId);
                    return (
                      <div key={loan.id} className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start">
                            <input
                              type="checkbox"
                              checked={selectedLoans.includes(loan.id)}
                              onChange={(e) => handleLoanSelection(loan.id, e.target.checked)}
                              className="mt-1 mr-3"
                            />
                            <div>
                              <h4 className="font-medium text-gray-900">
                                Prestado por: {loan.lenderLocation}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {lenderPrinter?.model} - Serie: {lenderPrinter?.serial}
                              </p>
                              <p className="text-sm text-gray-600">
                                Toner: {loan.tonerModel}
                              </p>
                              <p className="text-xs text-yellow-600 mt-1">
                                {loan.loanMessage}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Fecha préstamo: {format(loan.loanDate, 'dd/MM/yyyy', { locale: es })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-semibold text-yellow-600">
                              {loan.quantity}
                            </span>
                            <p className="text-sm text-gray-500">prestado(s)</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Nota:</strong> Al confirmar las devoluciones, se actualizará el estado de los préstamos 
                    y se registrará la fecha de devolución en el inventario.
                  </p>
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
                    disabled={isSubmitting || selectedLoans.length === 0}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Check size={16} />
                    {isSubmitting ? 'Procesando...' : `Devolver ${selectedLoans.length} Préstamo(s)`}
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