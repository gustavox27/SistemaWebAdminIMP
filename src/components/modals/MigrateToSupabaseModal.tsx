import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { localToSupabaseMigration, MigrationProgress } from '../../services/localToSupabaseMigration';
import toast from 'react-hot-toast';

interface MigrateToSupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function MigrateToSupabaseModal({
  isOpen,
  onClose,
  onComplete
}: MigrateToSupabaseModalProps) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [completed, setCompleted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleMigrate = async () => {
    setIsMigrating(true);
    setProgress(null);
    setErrors([]);
    setCompleted(false);

    try {
      const result = await localToSupabaseMigration.migrateAllData((prog) => {
        setProgress(prog);
      });

      if (result.success) {
        setCompleted(true);
        toast.success(result.message);
        setTimeout(() => {
          onComplete();
          window.location.reload();
        }, 2000);
      } else {
        toast.error(result.message);
        setErrors(result.errors);
      }
    } catch (error) {
      toast.error('Error durante la migración');
      console.error(error);
    } finally {
      setIsMigrating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between rounded-t-lg z-10">
          <div className="flex items-center">
            <Upload className="mr-3" size={24} />
            <h2 className="text-xl font-bold">Migrar Datos a Supabase</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isMigrating}
            className="text-white hover:bg-blue-800 rounded-lg p-2 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!isMigrating && !completed && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  ¿Qué es esta migración?
                </h3>
                <p className="text-sm text-blue-800">
                  Esta herramienta migrará todos tus datos locales (almacenados en IndexedDB) a la base de datos en la nube de Supabase.
                  Una vez completada la migración, tus datos estarán disponibles desde cualquier dispositivo y serán más seguros.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="text-yellow-600 mr-3 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">Importante</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• Los datos existentes en Supabase serán actualizados o creados</li>
                      <li>• El proceso puede tardar unos minutos dependiendo de la cantidad de datos</li>
                      <li>• Se recomienda hacer una copia de seguridad antes de migrar</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleMigrate}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Iniciar Migración
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}

          {isMigrating && progress && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Loader className="animate-spin text-blue-600" size={48} />
              </div>

              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  Migrando datos...
                </p>
                <p className="text-sm text-gray-600">{progress.message}</p>
              </div>

              <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`
                  }}
                />
              </div>

              <p className="text-center text-sm text-gray-600">
                {progress.current} de {progress.total} registros
              </p>
            </div>
          )}

          {completed && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-green-100 rounded-full p-4">
                  <CheckCircle className="text-green-600" size={48} />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  ¡Migración Completada!
                </h3>
                <p className="text-gray-600">
                  Todos tus datos han sido migrados exitosamente a Supabase.
                  La aplicación se recargará automáticamente...
                </p>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">
                Errores durante la migración:
              </h4>
              <ul className="text-sm text-red-800 space-y-1">
                {errors.slice(0, 10).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
                {errors.length > 10 && (
                  <li className="font-medium">
                    ... y {errors.length - 10} errores más
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
