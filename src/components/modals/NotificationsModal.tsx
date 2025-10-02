import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, AlertTriangle, Clock, Trash2, Settings } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Printer, PrinterFuser } from '../../types';
import { calculateTonerPrediction } from '../../utils/predictions';
import { calculateFuserPrediction } from '../../utils/fuserPredictions';
import * as ColorUtils from '../../utils/colorPrinterUtils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  criticalPrinters: Printer[];
  criticalFusers: PrinterFuser[];
  emptyTonersCount: number;
  emptyTonersWarning: boolean;
}

export default function NotificationsModal({ 
  isOpen, 
  onClose, 
  criticalPrinters, 
  criticalFusers,
  emptyTonersCount, 
  emptyTonersWarning 
}: NotificationsModalProps) {
  const { printers } = useStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-red-600 text-white p-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bell size={20} className="mr-2" />
                  <h3 className="text-lg font-semibold">Notificaciones</h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-red-700 rounded transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 max-h-96 overflow-y-auto">
              {(criticalPrinters.length > 0 || criticalFusers.length > 0 || emptyTonersWarning) ? (
                <div className="space-y-3">
                  {criticalPrinters.length > 0 && (
                    <>
                      <div className="flex items-center text-red-600 mb-3">
                        <AlertTriangle size={16} className="mr-2" />
                        <span className="text-sm font-medium">
                          {criticalPrinters.length} impresora{criticalPrinters.length > 1 ? 's' : ''} crítica{criticalPrinters.length > 1 ? 's' : ''}
                        </span>
                      </div>
                  
                      {criticalPrinters.slice(0, 6).map((printer) => {
                        const prediction = printer.type === 'color' 
                          ? ColorUtils.getColorPrinterPrediction(printer)
                          : calculateTonerPrediction(printer);
                        return (
                          <div key={printer.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900">{printer.model}</h4>
                                <p className="text-sm text-gray-600">{printer.location}</p>
                                <p className="text-sm text-red-600 font-medium mt-1">
                                  {prediction.daysUntilChange <= 0 ? 'Cambio urgente' : 
                                   printer.type === 'color' && 'criticalColor' in prediction
                                     ? `${prediction.criticalColor?.color}: ${prediction.daysUntilChange} días`
                                     : `${prediction.daysUntilChange} días restantes`}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="w-12 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-red-500 h-2 rounded-full"
                                    style={{ width: `${
                                      printer.type === 'color' && 'averageLevel' in prediction
                                        ? prediction.averageLevel
                                        : printer.currentTonerLevel
                                    }%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500">
                                  {printer.type === 'color' && 'averageLevel' in prediction
                                    ? prediction.averageLevel
                                    : printer.currentTonerLevel}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  
                  {criticalFusers.length > 0 && (
                    <>
                      <div className="flex items-center text-orange-600 mb-3 mt-4">
                        <Settings size={16} className="mr-2" />
                        <span className="text-sm font-medium">
                          {criticalFusers.length} fusor{criticalFusers.length > 1 ? 'es' : ''} requiere{criticalFusers.length > 1 ? 'n' : ''} atención
                        </span>
                      </div>
                  
                      {criticalFusers.slice(0, 6).map((fuser) => {
                        const printer = printers.find(p => p.id === fuser.printerId);
                        if (!printer) return null;
                        
                        const fuserPrediction = calculateFuserPrediction(printer, fuser);
                        return (
                          <div key={fuser.id} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900">{printer.model}</h4>
                                <p className="text-sm text-gray-600">{printer.location}</p>
                                <p className="text-sm text-orange-600 font-medium mt-1">
                                  Fusor: {fuserPrediction.currentLevel <= 10 ? 'Cambio urgente' : 'Cambio próximo'}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="w-12 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      fuserPrediction.currentLevel <= 10 ? 'bg-red-500' : 'bg-yellow-500'
                                    }`}
                                    style={{ width: `${fuserPrediction.currentLevel}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500">{Math.round(fuserPrediction.currentLevel)}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  
                  {emptyTonersWarning && (
                    <>
                      <div className="flex items-center text-yellow-600 mb-3 mt-4">
                        <Trash2 size={16} className="mr-2" />
                        <span className="text-sm font-medium">
                          Advertencia de almacenamiento
                        </span>
                      </div>
                      
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">Toners vacíos</h4>
                            <p className="text-sm text-gray-600">
                              {emptyTonersCount} de 50 toners vacíos almacenados
                            </p>
                            <p className="text-sm text-yellow-600 font-medium mt-1">
                              Considera gestionar el envío
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="w-12 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-yellow-500 h-2 rounded-full"
                                style={{ width: `${(emptyTonersCount / 50) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{emptyTonersCount}/50</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Sin notificaciones</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Todas las impresoras y fusores están en buen estado
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}