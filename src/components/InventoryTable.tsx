import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { Package, Search, Plus, CreditCard as Edit, Trash2, Download, Upload, AlertCircle, Eye, ChevronDown, BarChart3, TrendingUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { TonerInventory, TonerLoan } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import AddInventoryModal from './modals/AddInventoryModal';
import EditInventoryModal from './modals/EditInventoryModal';
import ConfirmDialog from './modals/ConfirmDialog';
import DeleteInventoryModal from './modals/DeleteInventoryModal';
import { exportToExcel, generateInventoryExportData } from '../utils/exportUtils';
import { supabaseService } from '../services/supabaseService';
import toast from 'react-hot-toast';
import PrinterDetailsModal from './modals/PrinterDetailsModal';
import InventoryDetailsModal from './modals/InventoryDetailsModal';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function InventoryTable() {
  const { inventory, printers, loans, deleteInventory, clearAllInventory } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<TonerInventory | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showInventoryDetails, setShowInventoryDetails] = useState(false);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const printer = printers.find(p => p.id === item.printerId);
      const printerInfo = printer ? `${printer.model} ${printer.location}` : '';
      
      return (
        item.tonerModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        printerInfo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [inventory, printers, searchTerm]);

  const handleEdit = (item: TonerInventory) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDelete = (item: TonerInventory) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleViewDetails = (item: TonerInventory) => {
    setSelectedItem(item);
    setShowInventoryDetails(true);
  };

  // Datos para el dashboard
  const totalSupplies = inventory.reduce((sum, item) => sum + item.quantity, 0);
  
  // Agrupar por modelo de toner - suma correcta de cantidades
  const suppliesByModel = useMemo(() => {
    return inventory.reduce((acc, item) => {
      const model = item.tonerModel.trim();
      if (!model) return acc;

      if (acc[model]) {
        acc[model] += item.quantity;
      } else {
        acc[model] = item.quantity;
      }
      return acc;
    }, {} as Record<string, number>);
  }, [inventory]);

  // Calcular métricas del dashboard
  const uniqueModels = Object.keys(suppliesByModel).length;
  const lowStockItems = inventory.filter(item => item.quantity <= 2).length;
  
  // Top 5 modelos con más stock
  const topModels = Object.entries(suppliesByModel)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  const maxQuantity = Math.max(...Object.values(suppliesByModel));
  const handleExportData = () => {
    const data = generateInventoryExportData(filteredInventory, printers);
    exportToExcel(data, 'inventario');
    toast.success('Inventario exportado exitosamente');
  };

  const handleDeleteAll = async () => {
    try {
      for (const item of inventory) {
        await supabaseService.delete('inventory', item.id);
      }
      clearAllInventory();
      toast.success(`${inventory.length} items eliminados del inventario`);
    } catch (error) {
      toast.error('Error al eliminar el inventario');
    }
  };
  return (
    <div className="space-y-6">
      {/* Dashboard Horizontal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumen General */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 size={20} className="mr-2" />
            Resumen de Inventario
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg text-center">
              <Package size={16} className="mx-auto mb-1" />
              <div className="text-2xl font-bold">{totalSupplies}</div>
              <div className="text-xs opacity-90">Total Suministros</div>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg text-center">
              <TrendingUp size={16} className="mx-auto mb-1" />
              <div className="text-2xl font-bold">{uniqueModels}</div>
              <div className="text-xs opacity-90">Modelos Diferentes</div>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg text-center">
              <AlertCircle size={16} className="mx-auto mb-1" />
              <div className="text-2xl font-bold">{lowStockItems}</div>
              <div className="text-xs opacity-90">Stock Bajo</div>
            </div>
          </div>
        </div>

        {/* Inventario por Modelo - Diseño Compacto con Iconos Flotantes */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg shadow-sm border border-green-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-200 opacity-20 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-200 opacity-20 rounded-full -ml-12 -mb-12"></div>

          <div className="relative z-10">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="bg-green-600 p-2 rounded-lg mr-2 shadow-md">
                <Package size={18} className="text-white" />
              </div>
              Inventario por Modelo
            </h3>

            {topModels.length > 0 ? (
              <div className="grid grid-cols-5 gap-2">
                {topModels.map(([model, quantity], index) => {
                  const colorClasses =
                    quantity <= 2 ? 'from-red-500 to-red-600' :
                    quantity <= 5 ? 'from-yellow-500 to-orange-500' :
                    'from-green-500 to-emerald-600';

                  const textColorClasses =
                    quantity <= 2 ? 'text-red-600' :
                    quantity <= 5 ? 'text-yellow-600' :
                    'text-green-600';

                  const bgColorClasses =
                    quantity <= 2 ? 'bg-red-50 hover:bg-red-100 border-red-200' :
                    quantity <= 5 ? 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200' :
                    'bg-green-50 hover:bg-green-100 border-green-200';

                  return (
                    <div
                      key={model}
                      className={`${bgColorClasses} border-2 rounded-xl p-3 transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer group relative`}
                      title={model}
                    >
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className={`bg-gradient-to-br ${colorClasses} p-3 rounded-full shadow-md group-hover:shadow-xl transition-shadow`}>
                          <Package size={20} className="text-white" />
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${textColorClasses}`}>
                            {quantity}
                          </div>
                          <div className="text-xs text-gray-600 font-medium truncate max-w-full">
                            {model.length > 12 ? `${model.substring(0, 12)}...` : model}
                          </div>
                        </div>
                      </div>

                      <div className="absolute -top-1 -right-1 bg-gray-900 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                        {index + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-white bg-opacity-60 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 font-medium">Sin modelos en inventario</p>
              </div>
            )}

            {topModels.length > 0 && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <div className="flex items-center justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full"></div>
                    <span className="text-gray-600">Stock Normal</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full"></div>
                    <span className="text-gray-600">Stock Bajo</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gradient-to-br from-red-500 to-red-600 rounded-full"></div>
                    <span className="text-gray-600">Crítico</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Header con controles */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por modelo de toner, descripción o impresora..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus size={20} />
              Agregar
            </button>

            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Download size={20} />
              Exportar
            </button>

            {inventory.length > 0 && (
              <button
                onClick={() => setShowDeleteAllDialog(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Trash2 size={20} />
                Eliminar Todo
              </button>
            )}
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
                  Impresora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modelo de Toner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Préstamo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Actualización
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map((item, index) => {
                const printer = printers.find(p => p.id === item.printerId);
                
                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.tonerModel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const itemLoans = loans.filter(loan => loan.inventoryId === item.id);
                        const activeLoans = itemLoans.filter(loan => !loan.isReturned);
                        const totalLoans = itemLoans.length;
                        
                        if (totalLoans === 0) {
                          return <span className="text-sm text-gray-500">No</span>;
                        }
                        
                        return (
                          <div>
                            <div className="text-sm font-medium text-blue-600">
                              {totalLoans} préstamo{totalLoans > 1 ? 's' : ''}
                            </div>
                            {activeLoans.length > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mt-1">
                                {activeLoans.length} activo{activeLoans.length > 1 ? 's' : ''}
                              </span>
                            )}
                            {activeLoans.length === 0 && totalLoans > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                                ✓ Todos devueltos
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="flex items-center">
                          <span className={`text-lg font-semibold ${
                            item.quantity === 0 ? 'text-red-600' :
                            item.quantity <= 2 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {item.quantity}
                          </span>
                          <span className="text-sm text-gray-500 ml-1">unidades</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.quantity === 0 ? 'bg-red-100 text-red-800' :
                          item.quantity <= 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {item.quantity === 0 ? 'Sin stock' :
                           item.quantity <= 2 ? 'Stock bajo' : 'Disponible'}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(item.updatedAt, 'dd/MM/yyyy HH:mm', { locale: es })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(item)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Ver detalles"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
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
          
          {filteredInventory.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin inventario</h3>
              <p className="mt-1 text-sm text-gray-500">
                {inventory.length === 0 ? 'Comienza agregando tu primer item al inventario' : 'No se encontraron items con los filtros aplicados'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddInventoryModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showEditModal && selectedItem && (
        <EditInventoryModal
          item={selectedItem}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showDeleteModal && selectedItem && (
        <DeleteInventoryModal
          item={selectedItem}
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
        />
      )}

        {/* Gráfico de Barras */}

    {/* Delete All Confirmation */}
    <ConfirmDialog
      isOpen={showDeleteAllDialog}
      onClose={() => setShowDeleteAllDialog(false)}
      onConfirm={handleDeleteAll}
      title="Eliminar Todo el Inventario"
      message={
        <div>
          <p className="mb-2">
            Estás a punto de eliminar <strong>{inventory.length} items</strong> del inventario.
          </p>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
            <p className="text-sm font-medium text-gray-700 mb-2">Items a eliminar:</p>
            {inventory.slice(0, 10).map((item, index) => {
              const printer = printers.find(p => p.id === item.printerId);
              return (
                <p key={item.id} className="text-xs text-gray-600">
                  {index + 1}. {item.tonerModel} - {printer?.location || 'N/A'} ({item.quantity} unidades)
                </p>
              );
            })}
            {inventory.length > 10 && (
              <p className="text-xs text-gray-500 mt-1">
                ... y {inventory.length - 10} más
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
      {showInventoryDetails && selectedItem && (
        <InventoryDetailsModal
          item={selectedItem}
          isOpen={showInventoryDetails}
          onClose={() => setShowInventoryDetails(false)}
        />
      )}
    </div>
  );
}