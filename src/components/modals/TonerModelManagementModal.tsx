import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, CreditCard as Edit, Trash2, Package, Save, Search } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { TonerModel } from '../../types';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';

interface TonerModelManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (model: TonerModel) => void;
}

export default function TonerModelManagementModal({ isOpen, onClose, onSelect }: TonerModelManagementModalProps) {
  const { tonerModels, addTonerModel, updateTonerModel, deleteTonerModel } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingModel, setEditingModel] = useState<TonerModel | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    description: ''
  });

  const filteredModels = tonerModels.filter(model =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (model.description && model.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingModel) {
        // Editar modelo existente
        const updatedModel: TonerModel = {
          ...editingModel,
          name: formData.name,
          capacity: parseInt(formData.capacity),
          description: formData.description
        };
        updateTonerModel(editingModel.id, updatedModel);
        await supabaseService.update('tonerModels', updatedModel);
        toast.success('Modelo de toner actualizado exitosamente');
      } else {
        // Agregar nuevo modelo
        const newModel: TonerModel = {
          id: crypto.randomUUID(),
          name: formData.name,
          capacity: parseInt(formData.capacity),
          description: formData.description
        };
        addTonerModel(newModel);
        await supabaseService.add('tonerModels', newModel);
        toast.success('Modelo de toner agregado exitosamente');
      }
      
      // Reset form
      setFormData({ name: '', capacity: '', description: '' });
      setShowAddForm(false);
      setEditingModel(null);
    } catch (error) {
      toast.error('Error al guardar el modelo de toner');
    }
  };

  const handleEdit = (model: TonerModel) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      capacity: model.capacity?.toString() || '',
      description: model.description || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (modelId: string) => {
    try {
      deleteTonerModel(modelId);
      await supabaseService.delete('tonerModels', modelId);
      toast.success('Modelo de toner eliminado exitosamente');
    } catch (error) {
      toast.error('Error al eliminar el modelo de toner');
    }
  };

  const handleModelSelect = (model: TonerModel) => {
    if (onSelect) {
      onSelect(model);
      onClose();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', capacity: '', description: '' });
    setShowAddForm(false);
    setEditingModel(null);
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
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Package size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Gestión de Modelos de Toner</h2>
                    <p className="text-blue-100">Administrar modelos de toner disponibles</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Search and Add Button */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Buscar modelos de toner..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Agregar Modelo
                  </button>
                )}
              </div>

              {/* Add/Edit Form */}
              {showAddForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingModel ? 'Editar Modelo de Toner' : 'Nuevo Modelo de Toner'}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Modelo de Toner *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: W9004mc, CF259A"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Capacidad (páginas) *
                      </label>
                      <input
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: 3000"
                        required
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Descripción opcional del modelo de toner"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Save size={16} />
                        {editingModel ? 'Actualizar' : 'Guardar'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Models List */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Modelos Registrados</h3>
                {onSelect && (
                  <p className="text-sm text-gray-600 mb-4">
                    Haz doble clic en un modelo para seleccionarlo
                  </p>
                )}
                {filteredModels.map((model) => (
                  <div 
                    key={model.id} 
                    className={`bg-white border border-gray-200 rounded-lg p-4 ${
                      onSelect ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
                    }`}
                    onDoubleClick={() => handleModelSelect(model)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{model.name}</h4>
                        {model.capacity && (
                         <p className="text-sm text-blue-600 font-medium">Capacidad: {model.capacity.toLocaleString()} páginas</p>
                        )}
                        {model.description && (
                          <p className="text-sm text-gray-500">{model.description}</p>
                        )}
                       {!model.capacity && (
                         <p className="text-sm text-gray-400 italic">Capacidad no especificada</p>
                       )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(model)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(model.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredModels.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      {searchTerm ? 'No se encontraron modelos' : 'Sin modelos registrados'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando tu primer modelo de toner'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}