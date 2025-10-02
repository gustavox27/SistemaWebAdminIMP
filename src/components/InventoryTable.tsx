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
  
  // Agrupar por modelo de toner
  const suppliesByModel = inventory.reduce((acc, item) => {
    if (acc[item.tonerModel]) {
      acc[item.tonerModel] += item.quantity;
    } else {
      acc[item.tonerModel] = item.quantity;
    }
    return acc;
  }, {} as Record<string, number>);

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

        {/* Cantidad por Modelo */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package size={20} className="mr-2 text-green-600" />
            Cantidad por Modelo
          </h3>
          <div className="space-y-3 max-h-32 overflow-y-auto">
            {topModels.length > 0 ? (
              topModels.map(([model, quantity]) => (
                <div key={model} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">{model}</span>
                      <span className="text-sm font-semibold text-green-600">{quantity}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(quantity / maxQuantity) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <Package className="mx-auto h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-500 mt-2">Sin modelos disponibles</p>
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