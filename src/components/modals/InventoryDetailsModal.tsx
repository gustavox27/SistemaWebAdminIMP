import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Package,
  Calendar,
  ArrowRightLeft,
  CheckCircle,
  Clock,
  MapPin,
  RefreshCcw
} from 'lucide-react';
import { TonerInventory, TonerLoan, TonerChange } from '../../types';
import { useStore } from '../../store/useStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

interface InventoryDetailsModalProps {
  item: TonerInventory;
  isOpen: boolean;
  onClose: () => void;
}

export default function InventoryDetailsModal({ item, isOpen, onClose }: InventoryDetailsModalProps) {
  const { loans, printers, changes } = useStore();
  const [activeTab, setActiveTab] = useState('details');

  const printer = printers.find(p => p.id === item.printerId);
  const itemLoans = loans.filter(loan => loan.inventoryId === item.id);
  const activeLoans = itemLoans.filter(loan => !loan.isReturned);
  const returnedLoans = itemLoans.filter(loan => loan.isReturned);
  
  // Filtrar cambios relacionados con esta impresora y modelo de toner
  const relatedChanges = changes.filter(change => 
    change.printerId === item.printerId && 
    change.tonerModel === item.tonerModel
  );

  const tabs = [
    { id: 'details', label: 'Detalles', icon: Package },
    { id: 'loans', label: 'Historial de Préstamos', icon: ArrowRightLeft, count: itemLoans.length },
    { id: 'changes', label: 'Historial de Cambios', icon: RefreshCcw, count: relatedChanges.length }
  ];

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
            className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Package size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">{item.tonerModel}</h2>
                    <p className="text-blue-100">{printer?.model} - {printer?.location}</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Status */}
              <div className="mt-4 flex items-center space-x-4">
                <div className={`px-3 py-1 rounded-full text-sm ${
                  item.quantity === 0 ? 'bg-red-100 text-red-800' :
                  item.quantity <= 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }`}>
                  {item.quantity} unidades disponibles
                </div>
                {activeLoans.length > 0 && (
                  <div className="px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                    {activeLoans.length} préstamo{activeLoans.length > 1 ? 's' : ''} activo{activeLoans.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon size={16} />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {activeTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Package size={20} className="mr-2" />
                      Información del Toner
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Modelo:</span>
                        <span className="font-medium">{item.tonerModel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Descripción:</span>
                        <span className="font-medium">{item.description || 'Sin descripción'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cantidad disponible:</span>
                        <span className={`font-medium ${
                          item.quantity === 0 ? 'text-red-600' :
                          item.quantity <= 2 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {item.quantity} unidades
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Creado:</span>
                        <span className="font-medium">
                          {format(item.createdAt, 'dd/MM/yyyy HH:mm', { locale: es })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Última actualización:</span>
                        <span className="font-medium">
                          {format(item.updatedAt, 'dd/MM/yyyy HH:mm', { locale: es })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <MapPin size={20} className="mr-2" />
                      Información de la Impresora
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Modelo:</span>
                        <span className="font-medium">{printer?.model || 'No encontrada'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ubicación:</span>
                        <span className="font-medium">{printer?.location || 'No encontrada'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">IP:</span>
                        <span className="font-medium">{printer?.ip || 'No disponible'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Serie:</span>
                        <span className="font-medium">{printer?.serial || 'No disponible'}</span>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mt-6">Resumen de Préstamos</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total préstamos:</span>
                        <span className="font-medium">{itemLoans.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Préstamos activos:</span>
                        <span className="font-medium text-orange-600">{activeLoans.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Préstamos devueltos:</span>
                        <span className="font-medium text-green-600">{returnedLoans.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'loans' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial Completo de Préstamos</h3>
                  
                  {itemLoans.length > 0 ? (
                    <div className="space-y-4">
                      {/* Préstamos Activos */}
                      {activeLoans.length > 0 && (
                        <div>
                          <h4 className="text-md font-medium text-orange-600 mb-3 flex items-center">
                            <Clock size={16} className="mr-2" />
                            Préstamos Activos ({activeLoans.length})
                          </h4>
                          <div className="space-y-3">
                            {activeLoans
                              .sort((a, b) => new Date(b.loanDate).getTime() - new Date(a.loanDate).getTime())
                              .map((loan) => {
                                const borrowerPrinter = printers.find(p => p.id === loan.borrowerPrinterId);
                                return (
                                  <div key={loan.id} className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h5 className="font-medium text-gray-900">
                                          Prestado a: {loan.borrowerLocation}
                                        </h5>
                                        <p className="text-sm text-gray-600">
                                          {borrowerPrinter?.model} - Serie: {borrowerPrinter?.serial}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          IP: {borrowerPrinter?.ip}
                                        </p>
                                        <p className="text-xs text-orange-600 mt-1">
                                          {loan.loanMessage}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          Fecha préstamo: {format(loan.loanDate, 'dd/MM/yyyy HH:mm', { locale: es })}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-lg font-semibold text-orange-600">
                                          {loan.quantity}
                                        </span>
                                        <p className="text-sm text-gray-500">unidad{loan.quantity > 1 ? 'es' : ''}</p>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mt-1">
                                          Activo
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Préstamos Devueltos */}
                      {returnedLoans.length > 0 && (
                        <div>
                          <h4 className="text-md font-medium text-green-600 mb-3 flex items-center">
                            <CheckCircle size={16} className="mr-2" />
                            Préstamos Devueltos ({returnedLoans.length})
                          </h4>
                          <div className="space-y-3">
                            {returnedLoans
                              .sort((a, b) => new Date(b.returnDate || 0).getTime() - new Date(a.returnDate || 0).getTime())
                              .map((loan) => {
                                const borrowerPrinter = printers.find(p => p.id === loan.borrowerPrinterId);
                                return (
                                  <div key={loan.id} className="bg-green-50 border border-green-200 p-4 rounded-lg">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h5 className="font-medium text-gray-900">
                                          Prestado a: {loan.borrowerLocation}
                                        </h5>
                                        <p className="text-sm text-gray-600">
                                          {borrowerPrinter?.model} - Serie: {borrowerPrinter?.serial}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          IP: {borrowerPrinter?.ip}
                                        </p>
                                        <p className="text-xs text-green-600 mt-1">
                                          {loan.loanMessage}
                                        </p>
                                        <div className="text-xs text-gray-500 mt-1 space-y-1">
                                          <p>Préstamo: {format(loan.loanDate, 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                                          {loan.returnDate && (
                                            <p>Devolución: {format(loan.returnDate, 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                                          )}
                                          {loan.returnedBy && (
                                            <p>Devuelto por: {loan.returnedBy}</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-lg font-semibold text-green-600">
                                          {loan.quantity}
                                        </span>
                                        <p className="text-sm text-gray-500">unidad{loan.quantity > 1 ? 'es' : ''}</p>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                                          ✓ Devuelto
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ArrowRightLeft className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Sin historial de préstamos</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Este toner no ha sido prestado a otras impresoras
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'changes' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de Cambios de Toner</h3>
                  
                  {relatedChanges.length > 0 ? (
                    <div className="space-y-3">
                      {relatedChanges
                        .sort((a, b) => new Date(b.changeDate).getTime() - new Date(a.changeDate).getTime())
                        .map((change) => (
                          <div key={change.id} className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-medium text-gray-900">
                                  Cambio de Toner: {change.tonerModel}
                                </h5>
                                <p className="text-sm text-gray-600">
                                  Responsable: {change.responsible}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Operador: {change.operator}
                                </p>
                                <p className="text-sm text-blue-600">
                                  Ciclo de motor: {change.motorCycle.toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  IP: {change.printerIp} - Serie: {change.printerSerial}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-blue-600">
                                  {format(change.changeDate, 'dd/MM/yyyy', { locale: es })}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {format(change.changeDate, 'HH:mm', { locale: es })}
                                </p>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                  Completado
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <RefreshCcw className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Sin historial de cambios</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        No hay cambios de toner registrados para este modelo en esta impresora
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}