import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  Printer,
  Package,
  ShoppingCart,
  History,
  ArrowRightLeft,
  User,
  Settings,
  Type
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';

interface MassDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MassDeleteModal({ isOpen, onClose }: MassDeleteModalProps) {
  const { 
    printers, 
    inventory, 
    orders, 
    changes, 
    loans, 
    emptyToners,
    users,
    operators,
    tonerModels,
    fuserModels,
    printerFusers,
    tickets,
    ticketTemplates,
    // Delete functions
    setPrinters,
    setInventory,
    setOrders,
    setChanges,
    setLoans,
    setEmptyToners,
    setUsers,
    setOperators,
    setTonerModels,
    setFuserModels,
    setPrinterFusers,
    setTickets,
    setTicketTemplates
  } = useStore();

  const [activeTab, setActiveTab] = useState('printers');
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState<string[]>(['printers']);

  const CONFIRMATION_PHRASE = 'ELIMINAR TODO';

  const tabs = [
    {
      id: 'printers',
      label: 'Impresoras',
      icon: Printer,
      count: printers.length,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Todas las impresoras registradas y su configuración'
    },
    {
      id: 'inventory',
      label: 'Inventario',
      icon: Package,
      count: inventory.length,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'Todo el inventario de toners y fusores'
    },
    {
      id: 'orders',
      label: 'Pedidos',
      icon: ShoppingCart,
      count: orders.length,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      description: 'Todos los pedidos pendientes y completados'
    },
    {
      id: 'history',
      label: 'Historial',
      icon: History,
      count: changes.length,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      description: 'Todo el historial de cambios de toner y fusores'
    },
    {
      id: 'loans',
      label: 'Préstamos',
      icon: ArrowRightLeft,
      count: loans.length,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      description: 'Todos los préstamos activos y devueltos'
    },
    {
      id: 'empty-toners',
      label: 'Toners Vacíos',
      icon: Trash2,
      count: emptyToners.length,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'Todos los toners vacíos en área, almacén y enviados'
    },
    {
      id: 'tickets',
      label: 'Tickets',
      icon: Ticket,
      count: tickets.length + ticketTemplates.length,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      description: 'Todos los tickets de soporte y plantillas de asistencia'
    },
    {
      id: 'configuration',
      label: 'Configuración',
      icon: Settings,
      count: users.length + operators.length + tonerModels.length + fuserModels.length + printerFusers.length,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      description: 'Usuarios, operadores, modelos de toner/fusor y configuración de fusores'
    }
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);
  const totalSelectedItems = selectedTabs.reduce((sum, tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    return sum + (tab?.count || 0);
  }, 0);

  const isConfirmationValid = confirmationText === CONFIRMATION_PHRASE;

  const handleTabSelection = (tabId: string, checked: boolean) => {
    if (checked) {
      setSelectedTabs(prev => [...prev, tabId]);
    } else {
      setSelectedTabs(prev => prev.filter(id => id !== tabId));
    }
  };

  const getTabDetails = (tabId: string) => {
    switch (tabId) {
      case 'printers':
        return {
          items: printers.map((p, i) => `${i + 1}. ${p.model} - ${p.location} (${p.serial})`),
          summary: `${printers.length} impresoras con toda su configuración, niveles de toner y datos técnicos`
        };
      case 'inventory':
        return {
          items: inventory.map((item, i) => {
            const printer = printers.find(p => p.id === item.printerId);
            return `${i + 1}. ${item.tonerModel} - ${printer?.location || 'N/A'} (${item.quantity} unidades)`;
          }),
          summary: `${inventory.length} items de inventario con un total de ${inventory.reduce((sum, item) => sum + item.quantity, 0)} unidades`
        };
      case 'orders':
        return {
          items: orders.map((order, i) => {
            const printer = printers.find(p => p.id === order.printerId);
            return `${i + 1}. #${order.trackingNumber} - ${printer?.location || 'N/A'} (${order.quantity} unidades)`;
          }),
          summary: `${orders.length} pedidos (${orders.filter(o => o.status === 'pendiente').length} pendientes, ${orders.filter(o => o.status === 'llegado').length} completados)`
        };
      case 'history':
        return {
          items: changes.map((change, i) => {
            const printer = printers.find(p => p.id === change.printerId);
            return `${i + 1}. ${change.tonerModel} - ${printer?.location || 'N/A'} (${new Date(change.changeDate).toLocaleDateString('es-ES')})`;
          }),
          summary: `${changes.length} registros de cambios de toner y fusores`
        };
      case 'loans':
        return {
          items: loans.map((loan, i) => {
            return `${i + 1}. ${loan.tonerModel} - ${loan.borrowerLocation} (${loan.isReturned ? 'Devuelto' : 'Activo'})`;
          }),
          summary: `${loans.length} préstamos (${loans.filter(l => !l.isReturned).length} activos, ${loans.filter(l => l.isReturned).length} devueltos)`
        };
      case 'empty-toners':
        return {
          items: emptyToners.map((empty, i) => {
            return `${i + 1}. ${empty.tonerModel} - ${empty.printerLocation} (${empty.category || 'warehouse'})`;
          }),
          summary: `${emptyToners.length} toners vacíos en diferentes estados de procesamiento`
        };
      case 'tickets':
        return {
          items: [
            ...tickets.map((ticket, i) => `Ticket ${i + 1}: ${ticket.assistanceTitle} - ${ticket.userName} (${ticket.area})`),
            ...ticketTemplates.map((template, i) => `Plantilla ${i + 1}: ${template.title} (${template.usageCount} usos)`)
          ],
          summary: `${tickets.length} tickets de soporte y ${ticketTemplates.length} plantillas de asistencia`
        };
      case 'configuration':
        return {
          items: [
            ...users.map((user, i) => `Usuario ${i + 1}: ${user.name} - ${user.position}`),
            ...operators.map((op, i) => `Operador ${i + 1}: ${op.name} - ${op.location}`),
            ...tonerModels.map((model, i) => `Modelo Toner ${i + 1}: ${model.name}`),
            ...fuserModels.map((model, i) => `Modelo Fusor ${i + 1}: ${model.name}`),
            ...printerFusers.map((fuser, i) => {
              const printer = printers.find(p => p.id === fuser.printerId);
              return `Fusor ${i + 1}: ${fuser.fuserModel} - ${printer?.location || 'N/A'}`;
            })
          ],
          summary: `${users.length} usuarios, ${operators.length} operadores, ${tonerModels.length} modelos de toner, ${fuserModels.length} modelos de fusor, ${printerFusers.length} configuraciones de fusor`
        };
      default:
        return { items: [], summary: '' };
    }
  };

  const handleConfirm = async () => {
    if (!isConfirmationValid || selectedTabs.length === 0) return;

    setIsDeleting(true);
    try {
      let deletedCount = 0;

      for (const tabId of selectedTabs) {
        switch (tabId) {
          case 'printers':
            for (const printer of printers) {
              await supabaseService.delete('printers', printer.id);
            }
            setPrinters([]);
            deletedCount += printers.length;
            break;

          case 'inventory':
            for (const item of inventory) {
              await supabaseService.delete('inventory', item.id);
            }
            setInventory([]);
            deletedCount += inventory.length;
            break;

          case 'orders':
            for (const order of orders) {
              await supabaseService.delete('orders', order.id);
            }
            setOrders([]);
            deletedCount += orders.length;
            break;

          case 'history':
            for (const change of changes) {
              await supabaseService.delete('changes', change.id);
            }
            setChanges([]);
            deletedCount += changes.length;
            break;

          case 'loans':
            for (const loan of loans) {
              await supabaseService.delete('loans', loan.id);
            }
            setLoans([]);
            deletedCount += loans.length;
            break;

          case 'empty-toners':
            for (const emptyToner of emptyToners) {
              await supabaseService.delete('emptyToners', emptyToner.id);
            }
            setEmptyToners([]);
            deletedCount += emptyToners.length;
            break;

          case 'tickets':
            for (const ticket of tickets) {
              await supabaseService.delete('tickets', ticket.id);
            }
            setTickets([]);
            deletedCount += tickets.length;
            
            for (const template of ticketTemplates) {
              await supabaseService.delete('ticketTemplates', template.id);
            }
            setTicketTemplates([]);
            deletedCount += ticketTemplates.length;
            break;

          case 'configuration':
            // Eliminar usuarios (excepto el predeterminado)
            for (const user of users) {
              if (user.name !== 'Freddy Moscoso') {
                await supabaseService.delete('users', user.id);
              }
            }
            setUsers(users.filter(u => u.name === 'Freddy Moscoso'));

            // Eliminar operadores (excepto el predeterminado)
            for (const operator of operators) {
              if (operator.name !== 'Gustavo') {
                await supabaseService.delete('operators', operator.id);
              }
            }
            setOperators(operators.filter(o => o.name === 'Gustavo'));

            // Eliminar modelos de toner (excepto los predeterminados)
            for (const model of tonerModels) {
              if (!['W9004mc', 'W9008mc'].includes(model.name)) {
                await supabaseService.delete('tonerModels', model.id);
              }
            }
            setTonerModels(tonerModels.filter(m => ['W9004mc', 'W9008mc'].includes(m.name)));

            // Eliminar todos los modelos de fusor
            for (const model of fuserModels) {
              await supabaseService.delete('fuserModels', model.id);
            }
            setFuserModels([]);

            // Eliminar todas las configuraciones de fusor
            for (const fuser of printerFusers) {
              await supabaseService.delete('printerFusers', fuser.id);
            }
            setPrinterFusers([]);

            deletedCount += (users.length - 1) + (operators.length - 1) + (tonerModels.length - 2) + fuserModels.length + printerFusers.length;
            break;
        }
      }

      toast.success(`${deletedCount} registros eliminados exitosamente de ${selectedTabs.length} categoría(s)`);
      onClose();
    } catch (error) {
      toast.error('Error al eliminar los datos');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmationText('');
      setSelectedTabs(['printers']);
      setActiveTab('printers');
      onClose();
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
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[95vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-red-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Trash2 size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Eliminación Masiva por Categorías</h2>
                    <p className="text-red-100">Selecciona las categorías de datos a eliminar</p>
                  </div>
                </div>
                
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-red-700 rounded-lg transition-colors"
                  disabled={isDeleting}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-red-50 border-b border-red-200 p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
                <div>
                  <span className="font-bold text-red-800 text-lg">¡ADVERTENCIA CRÍTICA!</span>
                  <p className="text-red-700 text-sm">
                    Esta acción eliminará PERMANENTEMENTE los datos seleccionados. NO HAY FORMA DE RECUPERARLOS.
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col max-h-[75vh]">
              {/* Tab Selection */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Seleccionar Categorías a Eliminar
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tabs.map((tab) => (
                    <label
                      key={tab.id}
                      className={`relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTabs.includes(tab.id)
                          ? `${tab.bgColor} ${tab.borderColor} shadow-md`
                          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTabs.includes(tab.id)}
                        onChange={(e) => handleTabSelection(tab.id, e.target.checked)}
                        className="sr-only"
                      />
                      <div className="flex items-center space-x-3 w-full">
                        <div className={`p-2 rounded-lg ${selectedTabs.includes(tab.id) ? 'bg-white' : tab.bgColor}`}>
                          <tab.icon size={20} className={tab.color} />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{tab.label}</div>
                          <div className="text-sm text-gray-600">{tab.count} registros</div>
                        </div>
                        {selectedTabs.includes(tab.id) && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                            <X size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {selectedTabs.length > 0 && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Categorías seleccionadas:</strong> {selectedTabs.length} de {tabs.length}
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      <strong>Total de registros a eliminar:</strong> {totalSelectedItems}
                    </p>
                  </div>
                )}
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-1 px-6 overflow-x-auto">
                  {tabs.filter(tab => selectedTabs.includes(tab.id)).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center space-x-2 ${
                        activeTab === tab.id
                          ? 'border-red-500 text-red-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon size={16} />
                      <span>{tab.label}</span>
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedTabs.includes(activeTab) && activeTabData && (
                  <div>
                    <div className="mb-6">
                      <div className={`p-4 rounded-lg ${activeTabData.bgColor} ${activeTabData.borderColor} border`}>
                        <div className="flex items-center mb-3">
                          <activeTabData.icon size={20} className={`${activeTabData.color} mr-2`} />
                          <h4 className="font-bold text-gray-900 text-lg">{activeTabData.label}</h4>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{activeTabData.description}</p>
                        <p className="text-sm font-medium text-gray-900">
                          {getTabDetails(activeTab).summary}
                        </p>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">
                        Elementos a eliminar:
                      </h5>
                      <div className="space-y-1">
                        {getTabDetails(activeTab).items.slice(0, 20).map((item, index) => (
                          <p key={index} className="text-xs text-gray-600">
                            {item}
                          </p>
                        ))}
                        {getTabDetails(activeTab).items.length > 20 && (
                          <p className="text-xs text-gray-500 font-medium">
                            ... y {getTabDetails(activeTab).items.length - 20} elementos más
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!selectedTabs.includes(activeTab) && (
                  <div className="text-center py-12">
                    <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      Categoría no seleccionada
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Selecciona esta categoría para ver los detalles de eliminación
                    </p>
                  </div>
                )}
              </div>

              {/* Confirmation Section */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Confirmación Requerida</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Para confirmar que entiendes las consecuencias, escribe exactamente la siguiente frase:
                  </p>
                  
                  <div className="bg-gray-100 p-3 rounded-lg mb-3 text-center">
                    <code className="font-bold text-lg text-red-600">{CONFIRMATION_PHRASE}</code>
                  </div>
                  
                  <div className="relative">
                    <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      placeholder="Escribe la frase de confirmación aquí"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent ${
                        confirmationText && !isConfirmationValid 
                          ? 'border-red-300 focus:ring-red-500 bg-red-50' 
                          : confirmationText && isConfirmationValid
                          ? 'border-green-300 focus:ring-green-500 bg-green-50'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      disabled={isDeleting}
                    />
                  </div>
                  
                  {confirmationText && !isConfirmationValid && (
                    <p className="text-sm text-red-600 mt-2">
                      La frase no coincide. Debe ser exactamente: "{CONFIRMATION_PHRASE}"
                    </p>
                  )}
                  
                  {isConfirmationValid && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Confirmación válida
                    </p>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-red-100 border border-red-300 p-4 rounded-lg mb-6">
                  <h4 className="font-bold text-red-800 mb-2">Resumen de Eliminación</h4>
                  <div className="text-sm text-red-700 space-y-1">
                    <p><strong>Categorías seleccionadas:</strong> {selectedTabs.length}</p>
                    <p><strong>Total de registros:</strong> {totalSelectedItems}</p>
                    <p><strong>Acción:</strong> Eliminación permanente e irreversible</p>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleClose}
                    disabled={isDeleting}
                    className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!isConfirmationValid || isDeleting || selectedTabs.length === 0}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        ELIMINAR SELECCIONADOS
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}