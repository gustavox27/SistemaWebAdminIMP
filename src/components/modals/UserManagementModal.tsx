import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, CreditCard as Edit, Trash2, User, Save, Search, Upload, Download, Building, Monitor, AlertTriangle, CheckCircle, FileText, ChevronDown, Star } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { User as UserType } from '../../types';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import ConfirmDialog from './ConfirmDialog';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (user: UserType) => void;
}

interface ExcelUser {
  nombre: string;
  empresa: string;
  usuario_windows: string;
}

// Hook personalizado para debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Componente simple sin virtualización para evitar errores de DOM
const UserList = React.memo(({
  users,
  onEdit,
  onDelete,
  onSetDefault,
  onSelect,
  defaultUser
}: {
  users: UserType[];
  onEdit: (user: UserType) => void;
  onDelete: (user: UserType) => void;
  onSetDefault: (userName: string) => void;
  onSelect?: (user: UserType) => void;
  defaultUser: string;
}) => {
  return (
    <div className="h-96 overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {users.map((user) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow ${
              onSelect ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-300' : ''
            }`}
            onDoubleClick={() => onSelect ? onSelect(user) : undefined}
              >
                <div className="flex justify-between items-start h-full">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-lg flex-shrink-0">
                        <User size={16} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-gray-900 text-lg truncate">{user.name}</h4>
                        <p className="text-sm text-blue-600 font-medium truncate">{user.position}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(user as any).empresa && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Building size={14} className="mr-2 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{(user as any).empresa}</span>
                        </div>
                      )}
                      {(user as any).usuarioWindows && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Monitor size={14} className="mr-2 text-gray-400 flex-shrink-0" />
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs truncate">
                            {(user as any).usuarioWindows}
                          </span>
                        </div>
                      )}
                      {user.contact && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="w-3.5 h-3.5 mr-2 bg-green-500 rounded-full flex-shrink-0"></span>
                          <span className="truncate">{user.contact}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(user);
                      }}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar usuario"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetDefault(user.name);
                      }}
                      className={`p-2 transition-colors rounded-lg ${
                        defaultUser === user.name
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
                        onDelete(user);
                      }}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar usuario"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

export default function UserManagementModal({ isOpen, onClose, onSelect }: UserManagementModalProps) {
  const { users, addUser, updateUser, deleteUser, defaultUser, setDefaultUser } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
  const [excelData, setExcelData] = useState<ExcelUser[]>([]);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    empresa: '',
    usuarioWindows: '',
    contact: '',
    position: ''
  });

  // Debounce del término de búsqueda para evitar filtrado excesivo
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Memoizar usuarios filtrados con debounce
  const filteredUsers = useMemo(() => {
    if (!debouncedSearchTerm) return users;
    
    const searchLower = debouncedSearchTerm.toLowerCase();
    return users.filter(user =>
      user.name.toLowerCase().includes(searchLower) ||
      (user.contact && user.contact.toLowerCase().includes(searchLower)) ||
      user.position.toLowerCase().includes(searchLower) ||
      ((user as any).empresa && (user as any).empresa.toLowerCase().includes(searchLower)) ||
      ((user as any).usuarioWindows && (user as any).usuarioWindows.toLowerCase().includes(searchLower))
    );
  }, [users, debouncedSearchTerm]);

  // Memoizar estadísticas para evitar recálculos innecesarios
  const stats = useMemo(() => ({
    total: users.length,
    filtered: filteredUsers.length,
    withCompany: users.filter(u => (u as any).empresa).length
  }), [users.length, filteredUsers.length, users]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Verificar unicidad por usuario Windows
      const existingUser = users.find(u => 
        u.id !== editingUser?.id && 
        (u as any).usuarioWindows === formData.usuarioWindows
      );
      
      if (existingUser) {
        toast.error('Ya existe un usuario con ese Usuario Windows');
        return;
      }

      if (editingUser) {
        // Editar usuario existente
        const updatedUser: UserType = {
          ...editingUser,
          name: formData.name,
          contact: formData.contact,
          position: formData.position,
          empresa: formData.empresa,
          usuarioWindows: formData.usuarioWindows
        } as UserType;
        
        updateUser(editingUser.id, updatedUser);
        await supabaseService.update('users', updatedUser);
        toast.success('Usuario actualizado exitosamente');
      } else {
        // Agregar nuevo usuario
        const newUser: UserType = {
          id: crypto.randomUUID(),
          name: formData.name,
          contact: formData.contact,
          position: formData.position,
          empresa: formData.empresa,
          usuarioWindows: formData.usuarioWindows
        } as UserType;
        
        addUser(newUser);
        await supabaseService.add('users', newUser);
        toast.success('Usuario agregado exitosamente');
      }
      
      resetForm();
    } catch (error) {
      toast.error('Error al guardar el usuario');
    }
  }, [formData, editingUser, users, updateUser, addUser]);

  const handleEdit = useCallback((user: UserType) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      contact: user.contact,
      position: user.position,
      empresa: (user as any).empresa || '',
      usuarioWindows: (user as any).usuarioWindows || ''
    });
    setShowAddForm(true);
  }, []);

  const handleDelete = useCallback((user: UserType) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!userToDelete) return;

    try {
      deleteUser(userToDelete.id);
      await supabaseService.delete('users', userToDelete.id);
      toast.success('Usuario eliminado exitosamente');
    } catch (error) {
      toast.error('Error al eliminar el usuario');
    }
  }, [userToDelete, deleteUser]);

  const handleDeleteAll = useCallback(async () => {
    const toastId = toast.loading('Eliminando usuarios...');
    try {
      const usersToDelete = users.filter(u => u.name !== 'Freddy Moscoso');
      const idsToDelete = usersToDelete.map(u => u.id);

      if (idsToDelete.length === 0) {
        toast.error('No hay usuarios para eliminar', { id: toastId });
        return;
      }

      await supabaseService.deleteBatch('users', idsToDelete);

      usersToDelete.forEach(user => deleteUser(user.id));

      toast.success(`${usersToDelete.length} usuario(s) eliminado(s) exitosamente`, { id: toastId });
      setShowDeleteAllDialog(false);
      setConfirmationText('');
    } catch (error) {
      console.error('Error al eliminar usuarios:', error);
      toast.error('Error al eliminar los usuarios', { id: toastId });
    }
  }, [users, deleteUser]);

  const handleSetDefault = useCallback(async (userName: string) => {
    try {
      setDefaultUser(userName);
      await supabaseService.setAppSetting('defaultUser', userName);
      toast.success(`Usuario predeterminado establecido: ${userName}`);
    } catch (error) {
      toast.error('Error al establecer usuario predeterminado');
    }
  }, [setDefaultUser]);

  const handleUserSelect = useCallback((user: UserType) => {
    if (onSelect) {
      onSelect(user);
      onClose();
    }
  }, [onSelect, onClose]);

  const resetForm = useCallback(() => {
    setFormData({ 
      name: '', 
      empresa: '', 
      usuarioWindows: '', 
      contact: '', 
      position: '' 
    });
    setShowAddForm(false);
    setEditingUser(null);
  }, []);

  const downloadTemplate = useCallback(() => {
    const templateData = [
      {
        'Nombre': 'Moscoso Sebastian, Freddy',
        'Empresa': 'Gloria S.A.',
        'Usuario Windows': 'fmoscoso',
        'Contacto': '999123456',
        'Cargo': 'Responsable'
      },
      {
        'Nombre': 'García López, María',
        'Empresa': 'Gloria S.A.',
        'Usuario Windows': 'mgarcia',
        'Contacto': '999654321',
        'Cargo': 'Supervisor'
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
    XLSX.writeFile(wb, 'plantilla_usuarios.xlsx');
    toast.success('Plantilla descargada exitosamente');
  }, []);

  const handleExcelUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingExcel(true);
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const processedUsers: ExcelUser[] = jsonData.map((row: any) => ({
        nombre: row['Nombre'] || '',
        empresa: row['Empresa'] || '',
        usuario_windows: row['Usuario Windows'] || ''
      })).filter(user => user.nombre && user.empresa && user.usuario_windows);

      setExcelData(processedUsers);
      setShowExcelImport(true);
    } catch (error) {
      toast.error('Error al procesar el archivo Excel');
    } finally {
      setIsProcessingExcel(false);
      event.target.value = '';
    }
  }, []);

  const processExcelImport = useCallback(async () => {
    setIsProcessingExcel(true);
    const toastId = toast.loading('Importando usuarios...');

    try {
      const newUsers: UserType[] = [];
      let skippedCount = 0;

      for (const excelUser of excelData) {
        const existingUser = users.find(u =>
          (u as any).usuarioWindows === excelUser.usuario_windows
        );

        if (existingUser) {
          skippedCount++;
          continue;
        }

        const newUser: UserType = {
          id: crypto.randomUUID(),
          name: excelUser.nombre,
          contact: '',
          position: 'Usuario',
          empresa: excelUser.empresa,
          usuarioWindows: excelUser.usuario_windows
        } as UserType;

        newUsers.push(newUser);
      }

      if (newUsers.length === 0) {
        toast.error('No hay usuarios nuevos para importar', { id: toastId });
        setIsProcessingExcel(false);
        return;
      }

      const BATCH_SIZE = 500;
      let processedCount = 0;

      for (let i = 0; i < newUsers.length; i += BATCH_SIZE) {
        const batch = newUsers.slice(i, i + BATCH_SIZE);

        await supabaseService.addBatch('users', batch);

        batch.forEach(user => addUser(user));

        processedCount += batch.length;
        toast.loading(`Importando usuarios: ${processedCount}/${newUsers.length}`, { id: toastId });
      }

      toast.success(
        `✓ ${newUsers.length} usuarios importados exitosamente. ${skippedCount} omitidos (duplicados)`,
        { id: toastId, duration: 5000 }
      );

      setShowExcelImport(false);
      setExcelData([]);
    } catch (error) {
      console.error('Error al importar usuarios:', error);
      toast.error('Error al importar usuarios desde Excel', { id: toastId });
    } finally {
      setIsProcessingExcel(false);
    }
  }, [excelData, users, addUser]);


















































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
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 p-3 rounded-lg mr-4">
                    <User size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
                    <p className="text-blue-100 mt-1">Administrar usuarios responsables del sistema</p>
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
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-sm opacity-90">Total Usuarios</div>
                </div>
                <div className="bg-white bg-opacity-10 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{stats.filtered}</div>
                  <div className="text-sm opacity-90">Filtrados</div>
                </div>
                <div className="bg-white bg-opacity-10 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold">{stats.withCompany}</div>
                  <div className="text-sm opacity-90">Con Empresa</div>
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
                      placeholder="Buscar por nombre, empresa, usuario Windows, contacto o cargo..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
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
                    Agregar Usuario
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
            <div className="flex-1 overflow-hidden min-h-0">
              <div className="p-6 h-full flex flex-col">
                {/* Add/Edit Form */}
                {showAddForm && (
                  <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center">
                        <div className="bg-blue-600 p-2 rounded-lg mr-3">
                          <User size={20} className="text-white" />
                        </div>
                        {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                      </h3>
                      <button
                        onClick={resetForm}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nombre */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre Completo *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Moscoso Sebastian, Freddy"
                            required
                          />
                        </div>

                        {/* Empresa */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Empresa *
                          </label>
                          <input
                            type="text"
                            value={formData.empresa}
                            onChange={(e) => setFormData(prev => ({ ...prev, empresa: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Gloria S.A."
                            required
                          />
                        </div>

                        {/* Usuario Windows */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Usuario Windows *
                          </label>
                          <input
                            type="text"
                            value={formData.usuarioWindows}
                            onChange={(e) => setFormData(prev => ({ ...prev, usuarioWindows: e.target.value.toLowerCase() }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="fmoscoso"
                            required
                          />
                        </div>

                        {/* Contacto */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contacto
                          </label>
                          <input
                            type="text"
                            value={formData.contact}
                            onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="999123456"
                          />
                        </div>

                        {/* Cargo */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cargo *
                          </label>
                          <select
                            value={formData.position}
                            onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Seleccionar cargo</option>
                            <option value="Responsable">Responsable</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Administrador">Administrador</option>
                            <option value="Técnico">Técnico</option>
                            <option value="Usuario">Usuario</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-4 border-t border-blue-200">
                        <button
                          type="button"
                          onClick={resetForm}
                          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Save size={16} />
                          {editingUser ? 'Actualizar Usuario' : 'Guardar Usuario'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Users List */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h3 className="text-xl font-bold text-gray-900">
                      Usuarios Registrados ({stats.filtered})
                    </h3>
                    <div className="flex items-center space-x-2">
                      {defaultUser && (
                        <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                          <Star size={14} className="mr-1" />
                          Predeterminado: {defaultUser}
                        </div>
                      )}
                    </div>
                  </div>

                  {onSelect && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex-shrink-0">
                      <p className="text-sm text-blue-800 font-medium flex items-center">
                        <User size={16} className="mr-2" />
                        Haz doble clic en cualquier usuario para seleccionarlo
                      </p>
                    </div>
                  )}

                  {/* Users List */}
                  {filteredUsers.length > 0 ? (
                    <div className="flex-1 min-h-0">
                      <UserList
                        users={filteredUsers}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onSetDefault={handleSetDefault}
                        onSelect={onSelect ? handleUserSelect : undefined}
                        defaultUser={defaultUser}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 flex-1 flex flex-col justify-center">
                      <div className="bg-gray-100 p-4 rounded-full w-20 h-20 mx-auto mb-4">
                        <User className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {searchTerm ? 'No se encontraron usuarios' : 'Sin usuarios registrados'}
                      </h3>
                      <p className="text-gray-500 mt-2">
                        {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando tu primer usuario'}
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
                          <h3 className="text-xl font-bold">Importar Usuarios desde Excel</h3>
                          <p className="text-green-100">Revisar y confirmar usuarios a importar</p>
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
                            <span className="text-green-600">Nuevos usuarios:</span>
                            <p className="font-bold text-green-800">
                              {excelData.filter(eu => !users.some(u => (u as any).usuarioWindows === eu.usuario_windows)).length}
                            </p>
                          </div>
                          <div>
                            <span className="text-yellow-600">Duplicados:</span>
                            <p className="font-bold text-yellow-800">
                              {excelData.filter(eu => users.some(u => (u as any).usuarioWindows === eu.usuario_windows)).length}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {excelData.slice(0, 50).map((excelUser, index) => {
                        const isDuplicate = users.some(u => (u as any).usuarioWindows === excelUser.usuario_windows);
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
                                  <h5 className="font-medium text-gray-900">{excelUser.nombre}</h5>
                                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                                    <span className="flex items-center">
                                      <Building size={12} className="mr-1" />
                                      {excelUser.empresa}
                                    </span>
                                    <span className="flex items-center">
                                      <Monitor size={12} className="mr-1" />
                                      {excelUser.usuario_windows}
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
                      {excelData.length > 50 && (
                        <div className="text-center py-4 text-gray-500">
                          ... y {excelData.length - 50} usuarios más
                        </div>
                      )}
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
                        disabled={isProcessingExcel || excelData.filter(eu => !users.some(u => (u as any).usuarioWindows === eu.usuario_windows)).length === 0}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        {isProcessingExcel ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Importando...
                          </>
                        ) : (
                          <>
                            <Upload size={16} />
                            Importar Usuarios
                          </>
                        )}
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
              title="Eliminar Todos los Usuarios"
              message={
                <div>
                  <div className="flex items-center mb-3">
                    <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
                    <span className="font-medium text-red-800">¡Advertencia!</span>
                  </div>
                  <p className="mb-2">
                    Estás a punto de eliminar <strong>{users.filter(u => u.name !== 'Freddy Moscoso').length} usuario(s)</strong>.
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
                    <p className="text-sm font-medium text-gray-700 mb-2">Usuarios a eliminar:</p>
                    {users.filter(u => u.name !== 'Freddy Moscoso').slice(0, 10).map((user, index) => (
                      <p key={user.id} className="text-xs text-gray-600">
                        {index + 1}. {user.name} - {user.position}
                      </p>
                    ))}
                    {users.filter(u => u.name !== 'Freddy Moscoso').length > 10 && (
                      <p className="text-xs text-gray-500 mt-1">
                        ... y {users.filter(u => u.name !== 'Freddy Moscoso').length - 10} más
                      </p>
                    )}
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-3">
                    <p className="text-sm text-blue-800">
                      <strong>Nota:</strong> Se mantendrá el usuario "Freddy Moscoso" como usuario base del sistema.
                    </p>
                  </div>
                  <p className="text-sm text-red-600 mt-2">
                    Esta acción no se puede deshacer.
                  </p>
                </div>
              }
              confirmText="Eliminar Usuarios"
              type="danger"
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
              isOpen={showDeleteDialog}
              onClose={() => setShowDeleteDialog(false)}
              onConfirm={confirmDelete}
              title="Eliminar Usuario"
              message={
                userToDelete ? (
                  <div>
                    <p className="mb-2">
                      ¿Estás seguro de que deseas eliminar al usuario <strong>{userToDelete.name}</strong>?
                    </p>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>• Nombre: {userToDelete.name}</p>
                        <p>• Cargo: {userToDelete.position}</p>
                        {(userToDelete as any).empresa && <p>• Empresa: {(userToDelete as any).empresa}</p>}
                        {(userToDelete as any).usuarioWindows && <p>• Usuario Windows: {(userToDelete as any).usuarioWindows}</p>}
                      </div>
                    </div>
                    <p className="text-sm text-red-600 mt-2">
                      Esta acción no se puede deshacer.
                    </p>
                  </div>
                ) : ''
              }
              confirmText="Eliminar Usuario"
              type="danger"
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}