import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Copy, FileText } from 'lucide-react';
import { TonerChange } from '../../types';
import { useStore } from '../../store/useStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import toast from 'react-hot-toast';

interface HistoryEmailTemplateModalProps {
  change: TonerChange;
  isOpen: boolean;
  onClose: () => void;
}

export default function HistoryEmailTemplateModal({ change, isOpen, onClose }: HistoryEmailTemplateModalProps) {
  const { printers } = useStore();
  const printer = printers.find(p => p.id === change.printerId);

  const emailTableTemplate = `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
  <thead>
    <tr style="background-color: #2563eb; color: white;">
      <th style="text-align: left; padding: 12px; border: 1px solid #1e40af;">FECHA DE CAMBIO</th>
      <th style="text-align: left; padding: 12px; border: 1px solid #1e40af;">SERIE</th>
      <th style="text-align: left; padding: 12px; border: 1px solid #1e40af;">MODELO DE TONER</th>
      <th style="text-align: left; padding: 12px; border: 1px solid #1e40af;">Modelo de impresora</th>
      <th style="text-align: left; padding: 12px; border: 1px solid #1e40af;">CICLO DE MOTOR</th>
      <th style="text-align: left; padding: 12px; border: 1px solid #1e40af;">RESPONSABLE</th>
      <th style="text-align: left; padding: 12px; border: 1px solid #1e40af;">OPERADOR</th>
      <th style="text-align: left; padding: 12px; border: 1px solid #1e40af;">SEDE</th>
      <th style="text-align: left; padding: 12px; border: 1px solid #1e40af;">EMPRESA</th>
      <th style="text-align: left; padding: 12px; border: 1px solid #1e40af;">UBICACION</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${format(change.changeDate, 'dd/MM/yyyy', { locale: es })}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${printer?.serial || 'N/A'}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${change.tonerModel}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${printer?.model || 'N/A'}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${change.motorCyclePending ? 'Pendiente' : change.motorCycle.toLocaleString()}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${change.responsible}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${change.operator}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${printer?.sede || 'ALIMENTOS'}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6;">Gloria</td>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${printer?.location || 'N/A'}</td>
    </tr>
  </tbody>
</table>`;

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(emailTableTemplate);
      toast.success('Tabla copiada al portapapeles');
    } catch (error) {
      toast.error('Error al copiar la tabla');
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
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
          >
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Mail size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Plantilla de Correo - Historial</h2>
                    <p className="text-blue-100 text-sm">Cambio de toner registrado</p>
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

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-4">
               
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Vista Previa de la Tabla:
                  </label>

                  <div className="border border-gray-300 rounded-lg bg-gray-50 p-4 overflow-x-auto">
                    
                    <table className="w-full border-collapse border border-gray-400 text-sm">
                      <thead>
                        <tr className="bg-gray-200 text-left">
                          <th className="border border-gray-400 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">FECHA DE CAMBIO</th>
                          <th className="border border-gray-400 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">SERIE</th>
                          <th className="border border-gray-400 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">MODELO DE TONER</th>
                          <th className="border border-gray-400 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">Modelo de impresora</th>
                          <th className="border border-gray-400 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">CICLO DE MOTOR</th>
                          <th className="border border-gray-400 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">RESPONSABLE</th>
                          <th className="border border-gray-400 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">OPERADOR</th>
                          <th className="border border-gray-400 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">SEDE</th>
                          <th className="border border-gray-400 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">EMPRESA</th>
                          <th className="border border-gray-400 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">UBICACION</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-400 px-3 py-2 whitespace-nowrap">{format(change.changeDate, 'dd/MM/yyyy', { locale: es })}</td>
                          <td className="border border-gray-400 px-3 py-2 whitespace-nowrap">{printer?.serial || 'N/A'}</td>
                          <td className="border border-gray-400 px-3 py-2 whitespace-nowrap">{change.tonerModel}</td>
                          <td className="border border-gray-400 px-3 py-2 whitespace-nowrap">{printer?.model || 'N/A'}</td>
                          <td className="border border-gray-400 px-3 py-2 whitespace-nowrap">
                            {change.motorCyclePending ? 'Pendiente' : change.motorCycle.toLocaleString()}
                          </td>
                          <td className="border border-gray-400 px-3 py-2 whitespace-nowrap">{change.responsible}</td>
                          <td className="border border-gray-400 px-3 py-2 whitespace-nowrap">{change.operator}</td>
                          <td className="border border-gray-400 px-3 py-2 whitespace-nowrap">{printer?.sede || 'ALIMENTOS'}</td>
                          <td className="border border-gray-400 px-3 py-2 whitespace-nowrap">Gloria</td>
                          <td className="border border-gray-400 px-3 py-2 whitespace-nowrap">{printer?.location || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Instrucciones:</strong> Haz clic en "Copiar Tabla" para copiar la tabla al portapapeles.
                    La tabla se puede pegar directamente en correos que soporten HTML (Outlook, Gmail, etc.).
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={handleCopyToClipboard}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Copy size={16} />
                    Copiar Tabla
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
