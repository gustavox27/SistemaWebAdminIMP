import { Printer, ColorToner, ColorTonerPrediction, PredictionData } from '../types';
import { addDays, differenceInDays, differenceInHours } from 'date-fns';

export const COLOR_OPTIONS = [
  { id: 'cian', name: 'Cian (C)', code: '#00FFFF' },
  { id: 'magenta', name: 'Magenta (M)', code: '#FF00FF' },
  { id: 'amarillo', name: 'Amarillo (Y)', code: '#FFFF00' },
  { id: 'negro', name: 'Negro (K)', code: '#000000' },
  { id: 'negro_fotografico', name: 'Negro Fotográfico (PK)', code: '#1a1a1a' },
  { id: 'negro_mate', name: 'Negro Mate (MK)', code: '#333333' },
  { id: 'gris', name: 'Gris (G)', code: '#808080' },
  { id: 'cian_claro', name: 'Cian Claro', code: '#87CEEB' },
  { id: 'magenta_claro', name: 'Magenta Claro', code: '#FFB6C1' }
];

export function calculateColorTonerPrediction(
  printer: Printer, 
  colorToner: ColorToner
): ColorTonerPrediction {
  const { dailyUsage, updatedAt } = printer;
  
  // Calcular el tiempo transcurrido desde la última actualización
  const now = new Date();
  const lastUpdate = new Date(updatedAt);
  const daysElapsed = differenceInDays(now, lastUpdate);
  const hoursElapsed = differenceInHours(now, lastUpdate);
  
  // Calcular el consumo estimado basado en el tiempo transcurrido
  const estimatedDailyConsumption = dailyUsage / colorToner.capacity * 100; // Porcentaje por día
  const estimatedHourlyConsumption = estimatedDailyConsumption / 24; // Porcentaje por hora
  
  // Calcular el nivel de toner actualizado automáticamente
  let adjustedTonerLevel = colorToner.currentLevel;
  
  // Si han pasado más de 1 hora, actualizar el nivel basado en el consumo
  if (hoursElapsed >= 1) {
    const consumedPercentage = hoursElapsed * estimatedHourlyConsumption;
    adjustedTonerLevel = Math.max(0, colorToner.currentLevel - consumedPercentage);
  }
  
  // Calcular páginas restantes basado en el nivel ajustado
  const pagesRemaining = Math.floor((adjustedTonerLevel / 100) * colorToner.capacity);
  
  // Calcular días hasta el cambio
  const daysUntilChange = Math.floor(pagesRemaining / dailyUsage);
  
  // Fecha estimada de cambio
  const estimatedChangeDate = addDays(now, daysUntilChange);
  
  // Determinar estado crítico
  let status: 'critical' | 'warning' | 'normal' = 'normal';
  if (daysUntilChange <= 3 || adjustedTonerLevel <= 10) {
    status = 'critical';
  } else if (daysUntilChange <= 7 || adjustedTonerLevel <= 25) {
    status = 'warning';
  }
  
  const colorOption = COLOR_OPTIONS.find(c => c.id === colorToner.color);
  
  return {
    color: colorOption?.name || colorToner.color,
    colorCode: colorOption?.code || '#000000',
    currentLevel: colorToner.currentLevel,
    adjustedLevel: Math.round(adjustedTonerLevel * 100) / 100,
    daysUntilChange: Math.max(0, daysUntilChange),
    pagesRemaining: Math.max(0, pagesRemaining),
    estimatedChangeDate,
    status
  };
}

export function getColorPrinterPrediction(printer: Printer): PredictionData & { 
  colorPredictions: ColorTonerPrediction[];
  criticalColor?: ColorTonerPrediction;
  averageLevel: number;
} {
  if (!printer.colorToners || printer.colorToners.length === 0) {
    // Fallback para impresoras sin toners de color configurados
    return {
      daysUntilChange: 0,
      pagesRemaining: 0,
      estimatedChangeDate: new Date(),
      status: 'critical',
      colorPredictions: [],
      averageLevel: 0
    };
  }

  const colorPredictions = printer.colorToners.map(toner => 
    calculateColorTonerPrediction(printer, toner)
  );

  // Encontrar el color más crítico (menor días hasta cambio)
  const criticalColor = colorPredictions.reduce((prev, current) => 
    current.daysUntilChange < prev.daysUntilChange ? current : prev
  );

  // Calcular nivel promedio
  const averageLevel = colorPredictions.reduce((sum, pred) => sum + pred.adjustedLevel, 0) / colorPredictions.length;

  return {
    daysUntilChange: criticalColor.daysUntilChange,
    pagesRemaining: criticalColor.pagesRemaining,
    estimatedChangeDate: criticalColor.estimatedChangeDate,
    status: criticalColor.status,
    colorPredictions,
    criticalColor,
    averageLevel: Math.round(averageLevel)
  };
}

export function updateColorPrinterTonerLevels(printer: Printer): Printer {
  if (!printer.colorToners || printer.type !== 'color') {
    return printer;
  }

  const now = new Date();
  const lastUpdate = new Date(printer.updatedAt);
  const hoursElapsed = differenceInHours(now, lastUpdate);

  // Solo actualizar si ha pasado tiempo significativo (más de 1 hora)
  if (hoursElapsed < 1) {
    return printer;
  }

  const updatedColorToners = printer.colorToners.map(toner => {
    const prediction = calculateColorTonerPrediction(printer, toner);
    return {
      ...toner,
      currentLevel: prediction.adjustedLevel
    };
  });

  return {
    ...printer,
    colorToners: updatedColorToners,
    updatedAt: now
  };
}

export function generateAutoTrackingNumber(): string {
  const timestamp = Date.now().toString();
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${timestamp.slice(-6)}${randomSuffix}`;
}

export function getColorDisplayName(colorId: string): string {
  const colorOption = COLOR_OPTIONS.find(c => c.id === colorId);
  return colorOption?.name || colorId;
}

export function getColorCode(colorId: string): string {
  const colorOption = COLOR_OPTIONS.find(c => c.id === colorId);
  return colorOption?.code || '#000000';
}