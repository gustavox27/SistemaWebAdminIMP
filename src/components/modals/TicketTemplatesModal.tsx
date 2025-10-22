import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { X, FileText, Search, Plus, CreditCard as Edit, Trash2, TrendingUp, Save, AlertTriangle } from 'lucide-react';
import { TicketTemplate } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';
import ConfirmDialog from './ConfirmDialog';

interface TicketTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: TicketTemplate) => void;
}

export default function TicketTemplatesModal({ isOpen, onClose, onSelect }: TicketTemplatesModalProps) {
  const { ticketTemplates, addTicketTemplate, updateTicketTemplate, deleteTicketTemplate } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TicketTemplate | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<TicketTemplate | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    detail: ''
  });

  // Filtrar y ordenar plantillas por uso
  const filteredTemplates = useMemo(() => {
    const filtered = ticketTemplates.filter(template =>
      template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.detail.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Ordenar por uso (más usadas primero)
    return filtered.sort((a, b) => b.usageCount - a.usageCount);
  }, [ticketTemplates, searchTerm]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTemplate) {
        // Editar plantilla existente
        const updatedTemplate: TicketTemplate = {
          ...editingTemplate,
          title: formData.title,
          detail: formData.detail,
          updatedAt: new Date()
        };
        
        updateTicketTemplate(editingTemplate.id, updatedTemplate);
        await supabaseService.update('ticketTemplates', updatedTemplate);
        toast.success('Plantilla actualizada exitosamente');
      } else {
        // Agregar nueva plantilla
        const newTemplate: TicketTemplate = {
          id: crypto.randomUUID(),
          title: formData.title,
          detail: formData.detail,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        addTicketTemplate(newTemplate);
        await supabaseService.add('ticketTemplates', newTemplate);
        toast.success('Plantilla agregada exitosamente');
      }
      
      resetForm();
    } catch (error) {
      toast.error('Error al guardar la plantilla');
      console.error('Error:', error);
    }
  };

  const handleEdit = (template: TicketTemplate) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      detail: template.detail
    });
    setShowAddForm(true);
  };

  const handleDelete = (template: TicketTemplate) => {
    setTemplateToDelete(template);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      deleteTicketTemplate(templateToDelete.id);
      await supabaseService.delete('ticketTemplates', templateToDelete.id);
      toast.success('Plantilla eliminada exitosamente');
    } catch (error) {
      toast.error('Error al eliminar la plantilla');
    }
  };

  const handleTemplateSelect = (template: TicketTemplate) => {
    onSelect(template);
    onClose();
  };

  const resetForm = () => {
    setFormData({ title: '', detail: '' });
    setShowAddForm(false);
    setEditingTemplate(null);
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
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-green-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Plantillas de Detalles</h2>
                    <p className="text-green-100">Selecciona o gestiona plantillas de asistencia</p>
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

            {/* Controls */}
            <div className="bg-gray-50 border-b border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Buscar plantillas por título o detalle..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Nueva Plantilla
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Add/Edit Form */}
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                    </h3>
                    <button
                      onClick={resetForm}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Título de la Plantilla *
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: Problema de Impresión, Atasco de Papel..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Detalle de la Plantilla *
                      </label>
                      <textarea
                        name="detail"
                        value={formData.detail}
                        onChange={handleChange}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Descripción detallada del problema o solicitud..."
                        required
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
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Save size={16} />
                        {editingTemplate ? 'Actualizar' : 'Guardar'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Templates List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <TrendingUp size={20} className="mr-2 text-green-600" />
                    Plantillas Disponibles
                    <span className="ml-2 text-sm text-gray-500">
                      (Ordenadas por uso)
                    </span>
                  </h3>
                  <p className="text-sm text-gray-600">
                    Doble clic para seleccionar
                  </p>
                </div>

                {filteredTemplates.length > 0 ? (
                  <div className="space-y-3">
                    {filteredTemplates.map((template, index) => (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
                        onDoubleClick={() => handleTemplateSelect(template)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-gray-900 text-lg">
                                {template.title}
                              </h4>
                              <div className="flex items-center space-x-2">
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium flex items-center">
                                  <TrendingUp size={12} className="mr-1" />
                                  {template.usageCount} usos
                                </span>
                                {index < 3 && (
                                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                                    Más usada
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-gray-700 leading-relaxed mb-3">
                              {template.detail}
                            </p>
                            <div className="text-xs text-gray-500">
                              Creada: {format(template.createdAt, 'dd/MM/yyyy', { locale: es })} • 
                              Actualizada: {format(template.updatedAt, 'dd/MM/yyyy', { locale: es })}
                            </div>
                          </div>

                          <div className="flex flex-col space-y-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(template);
                              }}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar plantilla"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(template);
                              }}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar plantilla"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                      <FileText className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {searchTerm ? 'No se encontraron plantillas' : 'Sin plantillas registradas'}
                    </h3>
                    <p className="text-gray-500 mt-2">
                      {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza creando tu primera plantilla'}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                      >
                        <Plus size={20} />
                        Crear Primera Plantilla
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Delete Confirmation */}
            <ConfirmDialog
              isOpen={showDeleteDialog}
              onClose={() => setShowDeleteDialog(false)}
              onConfirm={confirmDelete}
              title="Eliminar Plantilla"
              message={
                templateToDelete ? (
                  <div>
                    <p className="mb-2">
                      ¿Estás seguro de que deseas eliminar la plantilla <strong>"{templateToDelete.title}"</strong>?
                    </p>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>• Título: {templateToDelete.title}</p>
                        <p>• Usos: {templateToDelete.usageCount}</p>
                        <p>• Creada: {format(templateToDelete.createdAt, 'dd/MM/yyyy', { locale: es })}</p>
                      </div>
                    </div>
                    <p className="text-sm text-red-600 mt-2">
                      Esta acción no se puede deshacer.
                    </p>
                  </div>
                ) : ''
              }
              confirmText="Eliminar Plantilla"
              type="danger"
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}