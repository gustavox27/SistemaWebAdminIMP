import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Search, Plus, CreditCard as Edit, Trash2, Download, Check, Clock, AlertCircle, ChevronDown, Mail } from 'lucide-react';
import { useStore } from '../store/useStore';
import { TonerOrder } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import AddOrderModal from './modals/AddOrderModal';
import EditOrderModal from './modals/EditOrderModal';
import MarkOrderArrivedModal from './modals/MarkOrderArrivedModal';
import EmailTemplateModal from './modals/EmailTemplateModal';
import ConfirmDialog from './modals/ConfirmDialog';
import { exportToExcel, generateOrdersExportData } from '../utils/exportUtils';
import { supabaseService } from '../services/supabaseService';
import toast from 'react-hot-toast';

export default function OrdersTable() {
  const { orders, printers, deleteOrder, clearAllOrders } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<TonerOrder | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArrivedModal, setShowArrivedModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const filteredOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      const printer = printers.find(p => p.id === order.printerId);
      const printerInfo = printer ? `${printer.model} ${printer.location}` : '';
      
      const matchesSearch = 
        order.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        printerInfo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
    
    // Ordenar por estado: pendientes primero
    return filtered.sort((a, b) => {
      if (a.status === 'pendiente' && b.status !== 'pendiente') return -1;
      if (a.status !== 'pendiente' && b.status === 'pendiente') return 1;
      // Si ambos tienen el mismo estado, ordenar por fecha de pedido (más reciente primero)
      return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
    });
  }, [orders, printers, searchTerm, filterStatus]);

  const handleEdit = (order: TonerOrder) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const handleMarkArrived = (order: TonerOrder) => {
    setSelectedOrder(order);
    setShowArrivedModal(true);
  };

  const handleShowEmail = (order: TonerOrder) => {
    setSelectedOrder(order);
    setShowEmailModal(true);
  };

  const handleDelete = (order: TonerOrder) => {
    setSelectedOrder(order);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedOrder) return;

    try {
      deleteOrder(selectedOrder.id);
      await supabaseService.delete('orders', selectedOrder.id);
      toast.success('Pedido eliminado exitosamente');
    } catch (error) {
      toast.error('Error al eliminar el pedido');
    }
  };

  const handleExportData = () => {
    const data = generateOrdersExportData(filteredOrders, printers);
    exportToExcel(data, 'pedidos');
    toast.success('Pedidos exportados exitosamente');
  };

  const handleDeleteAll = async () => {
    try {
      for (const order of orders) {
        await supabaseService.delete('orders', order.id);
      }
      clearAllOrders();
      toast.success(`${orders.length} pedidos eliminados exitosamente`);
    } catch (error) {
      toast.error('Error al eliminar los pedidos');
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por número de envío, descripción o impresora..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="llegado">Llegado</option>

            <button
              onClick={() => setShowDeleteAllDialog(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 size={20} />
              Eliminar Todo
            </button>
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Agregar
              </button>

              <button
                onClick={handleExportData}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download size={20} />
                Exportar
              </button>

              <button
                onClick={() => setShowDeleteAllDialog(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 size={20} />
                Eliminar Todo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div 
          className="overflow-x-auto cursor-grab active:cursor-grabbing"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#CBD5E0 #F7FAFC'
          }}
          onMouseDown={(e) => {
            const container = e.currentTarget;
            const startX = e.pageX - container.offsetLeft;
            const scrollLeft = container.scrollLeft;
            let isDown = true;

            const handleMouseMove = (e: MouseEvent) => {
              if (!isDown) return;
              e.preventDefault();
              const x = e.pageX - container.offsetLeft;
              const walk = (x - startX) * 2;
              container.scrollLeft = scrollLeft - walk;
            };

            const handleMouseUp = () => {
              isDown = false;
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
              container.style.cursor = 'grab';
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            container.style.cursor = 'grabbing';
          }}
        >
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número de Envío
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Impresora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de Pedido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order, index) => {
                const printer = printers.find(p => p.id === order.printerId);
                
                return (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{order.trackingNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {printer?.model || 'Impresora eliminada'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {printer?.location || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(order.orderDate, 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'llegado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status === 'llegado' ? (
                          <>
                            <Check size={12} className="mr-1" />
                            Llegado
                          </>
                        ) : (
                          <>
                            <Clock size={12} className="mr-1" />
                            Pendiente
                          </>
                        )}
                      </span>
                      {order.status === 'llegado' && order.arrivalDate && (
                        <div className="text-xs text-gray-500 mt-1">
                          Llegó: {format(order.arrivalDate, 'dd/MM/yyyy', { locale: es })}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {order.status === 'pendiente' && (
                          <button
                            onClick={() => handleMarkArrived(order)}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Marcar como llegado"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleShowEmail(order)}
                          className={`transition-colors ${
                            order.emailSent 
                              ? 'text-green-600 hover:text-green-800' 
                              : 'text-blue-600 hover:text-blue-800'
                          }`}
                          title="Ver plantilla de correo"
                        >
                          <Mail size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(order)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(order)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin pedidos</h3>
              <p className="mt-1 text-sm text-gray-500">
                {orders.length === 0 ? 'Comienza agregando tu primer pedido' : 'No se encontraron pedidos con los filtros aplicados'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddOrderModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showEditModal && selectedOrder && (
        <EditOrderModal
          order={selectedOrder}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showArrivedModal && selectedOrder && (
        <MarkOrderArrivedModal
          order={selectedOrder}
          isOpen={showArrivedModal}
          onClose={() => setShowArrivedModal(false)}
        />
      )}

      {showEmailModal && selectedOrder && (
        <EmailTemplateModal
          order={selectedOrder}
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Eliminar Pedido"
        message="¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        type="danger"
      />

      {/* Delete All Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteAllDialog}
        onClose={() => setShowDeleteAllDialog(false)}
        onConfirm={handleDeleteAll}
        title="Eliminar Todos los Pedidos"
        message={
          <div>
            <p className="mb-2">
              Estás a punto de eliminar <strong>{orders.length} pedidos</strong>.
            </p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
              <p className="text-sm font-medium text-gray-700 mb-2">Pedidos a eliminar:</p>
              {orders.slice(0, 10).map((order, index) => {
                const printer = printers.find(p => p.id === order.printerId);
                return (
                  <p key={order.id} className="text-xs text-gray-600">
                    {index + 1}. #{order.trackingNumber} - {printer?.location || 'N/A'} ({order.quantity} unidades)
                  </p>
                );
              })}
              {orders.length > 10 && (
                <p className="text-xs text-gray-500 mt-1">
                  ... y {orders.length - 10} más
                </p>
              )}
            </div>
            <p className="text-sm text-red-600 mt-2">
              Esta acción no se puede deshacer.
            </p>
          </div>
        }
        confirmText="Eliminar Todo"
        type="danger"
      />

      {/* Delete All Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteAllDialog}
        onClose={() => setShowDeleteAllDialog(false)}
        onConfirm={handleDeleteAll}
        title="Eliminar Todos los Pedidos"
        message={
          <div>
            <p className="mb-2">
              Estás a punto de eliminar <strong>{orders.length} pedidos</strong>.
            </p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
              <p className="text-sm font-medium text-gray-700 mb-2">Pedidos a eliminar:</p>
              {orders.slice(0, 10).map((order, index) => {
                const printer = printers.find(p => p.id === order.printerId);
                return (
                  <p key={order.id} className="text-xs text-gray-600">
                    {index + 1}. #{order.trackingNumber} - {printer?.location || 'N/A'} ({order.quantity} unidades)
                  </p>
                );
              })}
              {orders.length > 10 && (
                <p className="text-xs text-gray-500 mt-1">
                  ... y {orders.length - 10} más
                </p>
              )}
            </div>
            <p className="text-sm text-red-600 mt-2">
              Esta acción no se puede deshacer.
            </p>
          </div>
        }
        confirmText="Eliminar Todo"
        type="danger"
      />
    </div>
  );
}