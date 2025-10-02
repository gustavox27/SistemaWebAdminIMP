# Guía del Sistema de Migración y Configuración

## ¿Por qué quedan 4 datos por defecto?

**ES COMPLETAMENTE NORMAL** que después de eliminar todos los datos queden exactamente 4 registros:

### Datos que SIEMPRE permanecen:
1. **Usuario por defecto**: "Freddy Moscoso" (Responsable)
2. **Operador por defecto**: "Gustavo" 
3. **Modelo de toner**: "W9004mc"
4. **Modelo de toner**: "W9008mc"

### ¿Por qué sucede esto?

Estos datos se mantienen porque son **valores esenciales** para el funcionamiento del sistema:

- **Usuarios y Operadores**: El sistema necesita al menos un usuario responsable y un operador para registrar cambios de toner
- **Modelos de Toner**: Se mantienen los modelos más comunes para facilitar la configuración inicial

## ¿Qué hacer cuando agregues nuevos componentes?

### 1. **Nuevas Colecciones de Datos**

Si agregas una nueva tabla/colección (ej: `maintenanceRecords`):

#### A. Actualizar `indexedDB.ts`:
```typescript
// Agregar en onupgradeneeded
if (!db.objectStoreNames.contains('maintenanceRecords')) {
  db.createObjectStore('maintenanceRecords', { keyPath: 'id' });
}
```

#### B. Actualizar `useStore.ts`:
```typescript
interface AppState {
  // ... otros campos
  maintenanceRecords: MaintenanceRecord[];
  
  // Actions
  setMaintenanceRecords: (records: MaintenanceRecord[]) => void;
  addMaintenanceRecord: (record: MaintenanceRecord) => void;
  // ... otras acciones
}
```

#### C. Actualizar `dataExportService.ts`:
```typescript
const [
  printers,
  inventory,
  // ... otros
  maintenanceRecords  // ← AGREGAR AQUÍ
] = await Promise.all([
  dbService.getAll('printers'),
  dbService.getAll('inventory'),
  // ... otros
  dbService.getAll('maintenanceRecords')  // ← Y AQUÍ
]);

const data = {
  printers,
  inventory,
  // ... otros
  maintenanceRecords  // ← Y AQUÍ
};
```

#### D. Actualizar `dataMigrationService.ts`:
```typescript
const collections = [
  'printers', 'inventory', 'orders', 'changes', 
  'loans', 'emptyToners', 'users', 'operators', 'tonerModels',
  'fuserModels', 'printerFusers', 'maintenanceRecords'  // ← AGREGAR AQUÍ
];
```

#### E. Actualizar `Layout.tsx` para cargar los datos:
```typescript
const [printersData, inventoryData, /* ... otros */, maintenanceData] = await Promise.all([
  dbService.getAll('printers'),
  // ... otros
  dbService.getAll('maintenanceRecords')  // ← AGREGAR AQUÍ
]);

if (maintenanceData.length > 0) setMaintenanceRecords(maintenanceData);  // ← Y AQUÍ
```

### 2. **Nuevos Campos en Tablas Existentes**

Si agregas campos a una tabla existente, **NO necesitas modificar nada** en el sistema de migración. El sistema maneja automáticamente:
- Campos nuevos con valores por defecto
- Campos faltantes en datos importados
- Compatibilidad hacia atrás

### 3. **Nuevos Modales o Componentes**

Los modales y componentes **NO requieren cambios** en el sistema de migración, solo asegúrate de:
- Usar `dbService` para persistir datos
- Actualizar el store de Zustand
- Seguir el patrón existente de manejo de errores

## Verificación del Sistema

### ✅ Exportación Completa
El sistema exporta automáticamente:
- Todos los datos de todas las colecciones
- Metadatos de versión y fecha
- Checksum para validación de integridad

### ✅ Importación Robusta
- Migración automática entre versiones
- Validación de integridad
- Modo merge o reemplazo
- Manejo de errores y advertencias

### ✅ Eliminación Controlada
- Eliminación por categorías
- Preservación de datos esenciales
- Confirmación requerida
- Limpieza completa de IndexedDB

## Recomendaciones

### 1. **Al agregar nuevas colecciones**:
Sigue el patrón de los 5 archivos mencionados arriba.

### 2. **Al agregar campos**:
No necesitas modificar el sistema de migración.

### 3. **Al agregar datos por defecto**:
Si quieres que ciertos datos permanezcan después de "Eliminar Todo", agrégalos en `MassDeleteModal.tsx` en la sección `configuration`.

### 4. **Testing**:
Siempre prueba:
- Exportar datos completos
- Importar en sistema limpio
- Importar con datos existentes (modo merge)
- Eliminar todo y verificar datos por defecto

## Conclusión

El sistema está **bien diseñado** y es **robusto**. Los 4 datos que permanecen son **intencionales** y **necesarios** para el funcionamiento básico del sistema. 

**No necesitas modificar nada** a menos que agregues nuevas colecciones de datos completamente nuevas.