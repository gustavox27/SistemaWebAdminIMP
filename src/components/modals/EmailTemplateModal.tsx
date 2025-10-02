import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Copy, Check, AlertTriangle, Table } from 'lucide-react';
import { TonerOrder } from '../../types';
import { useStore } from '../../store/useStore';
import { supabaseService } from '../../services/supabaseService';
import toast from 'react-hot-toast';

interface EmailTemplateModalProps {
  order: TonerOrder;
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailTemplateModal({ order, isOpen, onClose }: EmailTemplateModalProps) {
  const { printers, updateOrder } = useStore();

  const printer = printers.find(p => p.id === order.printerId);
  const [copyFormat, setCopyFormat] = useState<'text' | 'table'>('table');

  const emailTextTemplate = `Sebastian;

Tu apoyo con la Solicitud y envío de toner para las siguientes Impresoras:
Ubicación: ${printer?.location || 'No disponible'}
IP: ${printer?.ip || 'No disponible'}
Hostname: ${printer?.hostname || 'No disponible'}
Modelo de impresora: ${printer?.model || 'No disponible'}
Serie: ${printer?.serial || 'No disponible'}
Modelo de Toner: ${order.tonerModel}
Cantidad: ${order.quantity}
Número de seguimiento: ${order.trackingNumber}`;

  const emailTableTemplate = `Sebastian;

Tu apoyo con la Solicitud y envío de toner para las siguientes Impresoras:

<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
  <thead>
    <tr style="background-color: #f8f9fa; color: red;">
      <th style="text-align: left; padding: 12px; border: 1px solid #dee2e6;">Ubicaciónn</th>
      <th style="text-align: left; padding: 12px; border: 1px solid #dee2e6;">IP</th>
      <th style="text-align: left; padding: 12px; border: 1px solid #dee2e6;">Hostname</th>
      <th style="text-align: left; padding: 12px; border: 1px solid #dee2e6;">Modelo de Impresora</th>
      <th style="text-align: left; padding: 12px; border: 1px solid #dee2e6;">Serie</th>
      <th style="text-align: left; padding: 12px; border: 1px solid #dee2e6;">Modelo de Toner</th>
      <th style="text-align: left; padding: 12px; border: 1px solid #dee2e6;">Cantidad</th>
      <th style="text-align: left; padding: 12px; border: 1px solid #dee2e6;">Num. Seg</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${printer?.location || 'No disponible'}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${printer?.ip || 'No disponible'}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${printer?.hostname || 'No disponible'}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${printer?.model || 'No disponible'}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${printer?.serial || 'No disponible'}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${order.tonerModel}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${order.quantity}</td>
      <td style="padding: 10px; border: 1px solid #dee2e6;">${order.trackingNumber}</td>
    </tr>
  </tbody>
</table>`;
  const handleCopyToClipboard = async () => {
    try {
      const templateToUse = copyFormat === 'table' ? emailTableTemplate : emailTextTemplate;
      await navigator.clipboard.writeText(templateToUse);
      // Marcar el pedido como enviado por correo
      const updatedOrder = {
        ...order,
        emailSent: true
      };
      
      updateOrder(order.id, updatedOrder);
      await supabaseService.update('orders', updatedOrder);
      
      toast.success(`${copyFormat === 'table' ? 'Tabla' : 'Texto'} copiado al portapapeles`);
    } catch (error) {
      toast.error('Error al copiar el texto');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Mail size={24} className="mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold">Plantilla de Correo</h2>
                    <p className="text-blue-100">Pedido #{order.trackingNumber}</p>
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

            {/* Status */}
            <div className={`p-4 ${order.emailSent ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border-b`}>
              <div className="flex items-center">
                {order.emailSent ? (
                  <>
                    <Check className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-800">Correo Enviado</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="font-medium text-yellow-800">Falta el envío por correo</span>
                  </>
                )}
              </div>
            </div>

            {/* Content - Todo el contenido scrolleable */}
            <div className="p-6 max-h-[65vh] overflow-y-auto">
              <div className="space-y-4">
                {/* Format Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Formato de Copia:
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="copyFormat"
                        value="table"
                        checked={copyFormat === 'table'}
                        onChange={(e) => setCopyFormat(e.target.value as 'text' | 'table')}
                        className="mr-2"
                      />
                      <div className="flex items-center">
                        <Table size={16} className="mr-2 text-blue-600" />
                        <span className="font-medium">Formato Tabla (HTML)</span>
                      </div>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="copyFormat"
                        value="text"
                        checked={copyFormat === 'text'}
                        onChange={(e) => setCopyFormat(e.target.value as 'text' | 'table')}
                        className="mr-2"
                      />
                      <span className="font-medium">Formato Texto</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Vista Previa del Correo:
                  </label>
                  
                  {copyFormat === 'table' ? (
                    <div className="border border-gray-300 rounded-lg bg-gray-50 p-4">
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-900">Sebastian;</p>
                        <p className="text-sm text-gray-700 mt-2">
                          Tu apoyo con la Solicitud y envío de toner para las siguientes Impresoras:
                        </p>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300 font-sans text-sm">
  <thead>
    <tr className="bg-gray-200 text-left">
      <th className="border border-gray-300 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">Ubicación</th>
      <th className="border border-gray-300 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">IP</th>
      <th className="border border-gray-300 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">Hostname</th>
      <th className="border border-gray-300 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">Modelo de Impresora</th>
      <th className="border border-gray-300 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">Serie</th>
      <th className="border border-gray-300 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">Modelo de Toner</th>
      <th className="border border-gray-300 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">Cantidad</th>
      <th className="border border-gray-300 px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">Num. Seg</th>
    </tr>
  </thead>
  <tbody>
    <tr className="odd:bg-white even:bg-gray-100">
      <td className="border border-gray-300 px-3 py-2 whitespace-nowrap">{printer?.location || 'No disponible'}</td>
      <td className="border border-gray-300 px-3 py-2 whitespace-nowrap">{printer?.ip || 'No disponible'}</td>
      <td className="border border-gray-300 px-3 py-2 whitespace-nowrap">{printer?.hostname || 'No disponible'}</td>
      <td className="border border-gray-300 px-3 py-2 whitespace-nowrap">{printer?.model || 'No disponible'}</td>
      <td className="border border-gray-300 px-3 py-2 whitespace-nowrap">{printer?.serial || 'No disponible'}</td>
      <td className="border border-gray-300 px-3 py-2 whitespace-nowrap">{order.tonerModel}</td>
      <td className="border border-gray-300 px-3 py-2 whitespace-nowrap">{order.quantity}</td>
      <td className="border border-gray-300 px-3 py-2 whitespace-nowrap">{order.trackingNumber}</td>
    </tr>
  </tbody>
</table>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      value={emailTextTemplate}
                      readOnly
                      rows={12}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Instrucciones:</strong> Selecciona el formato deseado y haz clic en "Copiar" para copiar la plantilla al portapapeles. 
                    {copyFormat === 'table' 
                      ? 'El formato tabla se puede pegar directamente en correos que soporten HTML (Outlook, Gmail, etc.).'
                      : 'El formato texto es compatible con cualquier cliente de correo.'
                    }
                  </p>
                </div>

                {/* Botones dentro del área scrolleable */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
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
                    Copiar {copyFormat === 'table' ? 'Tabla' : 'Texto'}
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