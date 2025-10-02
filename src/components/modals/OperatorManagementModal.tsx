import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, CreditCard as Edit, Trash2, Settings, Save, Search, Upload, Download, Phone, MapPin, AlertTriangle, CheckCircle, FileText, ChevronDown, Star } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Operator } from '../../types';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import ConfirmDialog from './ConfirmDialog';

interface OperatorManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (operator: Operator) => void;
}

interface ExcelOperator {
  nombre: string;
  contacto: string;
  sede: string;
}

export default function OperatorManagementModal({ isOpen, onClose, onSelect }: OperatorManagementModalProps) {
  const { operators, addOperator, updateOperator, deleteOperator, defaultOperator, setDefaultOperator } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [operatorToDelete, setOperatorToDelete] = useState<Operator | null>(null);
  const [excelData, setExcelData] = useState<ExcelOperator[]>([]);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    location: ''
  });

  const filteredOperators = useMemo(() => {
    return operators.filter(operator =>
      operator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operator.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operator.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [operators, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Verificar unicidad por nombre y sede
      const existingOperator = operators.find(op => 
        op.id !== editingOperator?.id && 
        op.name.toLowerCase() === formData.name.toLowerCase() &&
        op.location.toLowerCase() === formData.location.toLowerCase()
      );
      
      if (existingOperator) {
        toast.error('Ya existe un operador con ese nombre en la misma sede');
        return;
      }

      if (editingOperator) {
        // Editar operador existente
        const updatedOperator: Operator = {
          ...editingOperator,
          name: formData.name,
          contact: formData.contact,
          location: formData.location
        };
        
        updateOperator(editingOperator.id, updatedOperator);
        await supabaseService.update('operators', updatedOperator);
        toast.success('Operador actualizado exitosamente');
      } else {
        // Agregar nuevo operador
        const newOperator: Operator = {
          id: crypto.randomUUID(),
          name: formData.name,
          contact: formData.contact,
          location: formData.location
        };
        
        addOperator(newOperator);
        await supabaseService.add('operators', newOperator);
        toast.success('Operador agregado exitosamente');
      }
      
      resetForm();
    } catch (error) {
      toast.error('Error al guardar el operador');
    }
  };

  const handleEdit = (operator: Operator) => {
    setEditingOperator(operator);
    setFormData({
      name: operator.name,
      contact: operator.contact,
      location: operator.location
    });
    setShowAddForm(true);
  };

  const handleDelete = (operator: Operator) => {
    setOperatorToDelete(operator);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!operatorToDelete) return;

    try {
      deleteOperator(operatorToDelete.id);
      await supabaseService.delete('operators', operatorToDelete.id);
      toast.success('Operador eliminado exitosamente');
    } catch (error) {
      toast.error('Error al eliminar el operador');
    }
  };

  const handleDeleteAll = async () => {
    try {
      // Eliminar todos los operadores excepto el predeterminado
      const operatorsToDelete = operators.filter(op => op.name !== 'Gustavo');
      
      for (const operator of operatorsToDelete) {
        await supabaseService.delete('operators', operator.id);
        deleteOperator(operator.id);
      }
      
      toast.success(`${operatorsToDelete.length} operador(es) eliminado(s). Se mantuvo el operador predeterminado.`);
      setShowDeleteAllDialog(false);
      setConfirmationText('');
    } catch (error) {
      toast.error('Error al eliminar los operadores');
    }
  };

  const handleSetDefault = async (operatorName: string) => {
    try {
      setDefaultOperator(operatorName);
      await supabaseService.setAppSetting('defaultOperator', operatorName);
      toast.success(`Operador predeterminado establecido: ${operatorName}`);
    } catch (error) {
      toast.error('Error al establecer operador predeterminado');
    }
  };

  const handleOperatorSelect = (operator: Operator) => {
    if (onSelect) {
      onSelect(operator);
      onClose();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', contact: '', location: '' });
    setShowAddForm(false);
    setEditingOperator(null);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Nombre': 'Gustavo Corrales',
        'Contacto': '960950894',
        'Sede': 'Planta Gloria - Huachipa'
      },
      {
        'Nombre': 'Carlos Mendoza',
        'Contacto': '987654321',
        'Sede': 'Planta Gloria - Arequipa'
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Operadores');
    XLSX.writeFile(wb, 'plantilla_operadores.xlsx');
    toast.success('Plantilla descargada exitosamente');
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingExcel(true);
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const processedOperators: ExcelOperator[] = jsonData.map((row: any) => ({
        nombre: row['Nombre'] || '',
        contacto: row['Contacto'] || '',
        sede: row['Sede'] || ''
      })).filter(operator => operator.nombre && operator.sede);

      setExcelData(processedOperators);
      setShowExcelImport(true);
    } catch (error) {
      toast.error('Error al procesar el archivo Excel');
    } finally {
      setIsProcessingExcel(false);
      event.target.value = '';
    }
  };

  const processExcelImport = async () => {
    try {
      let addedCount = 0;
      let skippedCount = 0;

      for (const excelOperator of excelData) {
        // Verificar si ya existe
        const existingOperator = operators.find(op => 
          op.name.toLowerCase() === excelOperator.nombre.toLowerCase() &&
          op.location.toLowerCase() === excelOperator.sede.toLowerCase()
        );

        if (existingOperator) {
          skippedCount++;
          continue;
        }

        const newOperator: Operator = {
          id: crypto.randomUUID(),
          name: excelOperator.nombre,
          contact: excelOperator.contacto,
          location: excelOperator.sede
        };

        addOperator(newOperator);
        await supabaseService.add('operators', newOperator);
        addedCount++;
      }

      toast.success(`${addedCount} operadores importados. ${skippedCount} omitidos (duplicados)`);
      setShowExcelImport(false);
      setExcelData([]);
    } catch (error) {
      toast.error('Error al importar operadores desde Excel');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 p-3 rounded-lg mr-4">
                    <Settings size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Gestión de Operadores</h2>
                    <p className="text-orange-100 mt-1">Administrar operadores técnicos del sistema</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="bg-white bg-opacity-10 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{operators.length}</div>
                  <div className="text-sm opacity-90">Total Operadores</div>
                </div>
                <div className="bg-white bg-opacity-10 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{filteredOperators.length}</div>
                  <div className="text-sm opacity-90">Filtrados</div>
                </div>
                <div className="bg-white bg-opacity-10 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">
                    {[...new Set(operators.map(op => op.location))].length}
                  </div>
                  <div className="text-sm opacity-90">Sedes Únicas</div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-gray-50 border-b border-gray-200 p-4 flex-shrink-0">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, contacto o sede..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Plus size={18} />
                    Agregar Operador
                  </button>

                  {/* Actions Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                      className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                    >
                      Acciones
                      <ChevronDown size={16} />
                    </button>
                    
                    {showActionsDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <div className="relative">
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => {
                              handleExcelUpload(e);
                              setShowActionsDropdown(false);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={isProcessingExcel}
                          />
                          <button
                            disabled={isProcessingExcel}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                          >
                            {isProcessingExcel ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                Procesando...
                              </>
                            ) : (
                              <>
                                <Upload size={16} />
                                Importar Excel
                              </>
                            )}
                          </button>
                        </div>
                        
                        <button
                          onClick={() => {
                            downloadTemplate();
                            setShowActionsDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                        >
                          <Download size={16} />
                          Descargar Plantilla
                        </button>
                        
                        <hr className="my-1" />
                        
                        <button
                          onClick={() => {
                            setShowDeleteAllDialog(true);
                            setShowActionsDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
                        >
                          <Trash2 size={16} />
                          Eliminar Todos
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-6">
                {/* Add/Edit Form */}
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center">
                        <div className="bg-orange-600 p-2 rounded-lg mr-3">
                          <Settings size={20} className="text-white" />
                        </div>
                        {editingOperator ? 'Editar Operador' : 'Nuevo Operador'}
                      </h3>
                      <button
                        onClick={resetForm}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Nombre */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre Completo *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="Gustavo Corrales"
                            required
                          />
                        </div>

                        {/* Contacto */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contacto *
                          </label>
                          <input
                            type="text"
                            value={formData.contact}
                            onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="960950894"
                            required
                          />
                        </div>

                        {/* Sede */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sede *
                          </label>
                          <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="Planta Gloria - Huachipa"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-4 border-t border-orange-200">
                        <button
                          type="button"
                          onClick={resetForm}
                          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                        >
                          <Save size={16} />
                          {editingOperator ? 'Actualizar Operador' : 'Guardar Operador'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* Operators List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">
                      Operadores Registrados ({filteredOperators.length})
                    </h3>
                    <div className="flex items-center space-x-2">
                      {defaultOperator && (
                        <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                          <Star size={14} className="mr-1" />
                          Predeterminado: {defaultOperator}
                        </div>
                      )}
                    </div>
                  </div>

                  {onSelect && (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800 font-medium flex items-center">
                        <Settings size={16} className="mr-2" />
                        Haz doble clic en cualquier operador para seleccionarlo
                      </p>
                    </div>
                  )}

                  {filteredOperators.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {filteredOperators.map((operator) => (
                        <motion.div
                          key={operator.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all ${
                            onSelect ? 'cursor-pointer hover:bg-orange-50 hover:border-orange-300' : ''
                          }`}
                          onDoubleClick={() => onSelect ? handleOperatorSelect(operator) : undefined}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-3">
                                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-2 rounded-lg">
                                  <Settings size={16} className="text-white" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-900 text-lg">{operator.name}</h4>
                                  <p className="text-sm text-orange-600 font-medium">Operador Técnico</p>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Phone size={14} className="mr-2 text-gray-400" />
                                  <span>{operator.contact}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                  <MapPin size={14} className="mr-2 text-gray-400" />
                                  <span>{operator.location}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col space-y-2 ml-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(operator);
                                }}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar operador"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetDefault(operator.name);
                                }}
                                className={`p-2 transition-colors rounded-lg ${
                                  defaultOperator === operator.name
                                    ? 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50'
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                                }`}
                                title="Establecer como predeterminado"
                              >
                                <Star size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(operator);
                                }}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar operador"
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
                        <Settings className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {searchTerm ? 'No se encontraron operadores' : 'Sin operadores registrados'}
                      </h3>
                      <p className="text-gray-500 mt-2">
                        {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando tu primer operador'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Excel Import Modal */}
            {showExcelImport && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
                <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                  <div className="bg-green-600 text-white p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText size={24} className="mr-3" />
                        <div>
                          <h3 className="text-xl font-bold">Importar Operadores desde Excel</h3>
                          <p className="text-green-100">Revisar y confirmar operadores a importar</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowExcelImport(false)}
                        className="p-2 hover:bg-green-700 rounded-lg transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <div className="mb-4">
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">
                          Resumen de Importación
                        </h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-blue-600">Total encontrados:</span>
                            <p className="font-bold text-blue-800">{excelData.length}</p>
                          </div>
                          <div>
                            <span className="text-green-600">Nuevos operadores:</span>
                            <p className="font-bold text-green-800">
                              {excelData.filter(eo => !operators.some(o => 
                                o.name.toLowerCase() === eo.nombre.toLowerCase() &&
                                o.location.toLowerCase() === eo.sede.toLowerCase()
                              )).length}
                            </p>
                          </div>
                          <div>
                            <span className="text-yellow-600">Duplicados:</span>
                            <p className="font-bold text-yellow-800">
                              {excelData.filter(eo => operators.some(o => 
                                o.name.toLowerCase() === eo.nombre.toLowerCase() &&
                                o.location.toLowerCase() === eo.sede.toLowerCase()
                              )).length}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {excelData.map((excelOperator, index) => {
                        const isDuplicate = operators.some(o => 
                          o.name.toLowerCase() === excelOperator.nombre.toLowerCase() &&
                          o.location.toLowerCase() === excelOperator.sede.toLowerCase()
                        );
                        return (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border ${
                              isDuplicate 
                                ? 'bg-yellow-50 border-yellow-200' 
                                : 'bg-green-50 border-green-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${
                                  isDuplicate ? 'bg-yellow-600' : 'bg-green-600'
                                }`}>
                                  {isDuplicate ? (
                                    <AlertTriangle size={16} className="text-white" />
                                  ) : (
                                    <CheckCircle size={16} className="text-white" />
                                  )}
                                </div>
                                <div>
                                  <h5 className="font-medium text-gray-900">{excelOperator.nombre}</h5>
                                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                                    <span className="flex items-center">
                                      <Phone size={12} className="mr-1" />
                                      {excelOperator.contacto}
                                    </span>
                                    <span className="flex items-center">
                                      <MapPin size={12} className="mr-1" />
                                      {excelOperator.sede}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                isDuplicate 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {isDuplicate ? 'Duplicado' : 'Nuevo'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                      <button
                        onClick={() => setShowExcelImport(false)}
                        className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={processExcelImport}
                        disabled={excelData.filter(eo => !operators.some(o => 
                          o.name.toLowerCase() === eo.nombre.toLowerCase() &&
                          o.location.toLowerCase() === eo.sede.toLowerCase()
                        )).length === 0}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        <Upload size={16} />
                        Importar Operadores
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Delete All Confirmation */}
            <ConfirmDialog
              isOpen={showDeleteAllDialog}
              onClose={() => {
                setShowDeleteAllDialog(false);
                setConfirmationText('');
              }}
              onConfirm={handleDeleteAll}
              title="Eliminar Todos los Operadores"
              message={
                <div>
                  <div className="flex items-center mb-3">
                    <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
                    <span className="font-medium text-red-800">¡Advertencia!</span>
                  </div>
                  <p className="mb-2">
                    Estás a punto de eliminar <strong>{operators.filter(op => op.name !== 'Gustavo').length} operador(es)</strong>.
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
                    <p className="text-sm font-medium text-gray-700 mb-2">Operadores a eliminar:</p>
                    {operators.filter(op => op.name !== 'Gustavo').slice(0, 10).map((operator, index) => (
                      <p key={operator.id} className="text-xs text-gray-600">
                        {index + 1}. {operator.name} - {operator.location}
                      </p>
                    ))}
                    {operators.filter(op => op.name !== 'Gustavo').length > 10 && (
                      <p className="text-xs text-gray-500 mt-1">
                        ... y {operators.filter(op => op.name !== 'Gustavo').length - 10} más
                      </p>
                    )}
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-3">
                    <p className="text-sm text-blue-800">
                      <strong>Nota:</strong> Se mantendrá el operador "Gustavo" como operador base del sistema.
                    </p>
                  </div>
                  <p className="text-sm text-red-600 mt-2">
                    Esta acción no se puede deshacer.
                  </p>
                </div>
              }
              confirmText="Eliminar Operadores"
              type="danger"
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
              isOpen={showDeleteDialog}
              onClose={() => setShowDeleteDialog(false)}
              onConfirm={confirmDelete}
              title="Eliminar Operador"
              message={
                operatorToDelete ? (
                  <div>
                    <p className="mb-2">
                      ¿Estás seguro de que deseas eliminar al operador <strong>{operatorToDelete.name}</strong>?
                    </p>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>• Nombre: {operatorToDelete.name}</p>
                        <p>• Contacto: {operatorToDelete.contact}</p>
                        <p>• Sede: {operatorToDelete.location}</p>
                      </div>
                    </div>
                    <p className="text-sm text-red-600 mt-2">
                      Esta acción no se puede deshacer.
                    </p>
                  </div>
                ) : ''
              }
              confirmText="Eliminar Operador"
              type="danger"
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}