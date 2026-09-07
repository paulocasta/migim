export function fmtShort(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}

// Agrupa por el `orden` real de cada día (semana = orden // 7), no por posición
// en el array — así borrar un día no corre los siguientes a la semana anterior.
export function chunkDays(days) {
  const weeks = new Map();
  days.forEach((d) => {
    const weekIdx = Math.floor((d.orden ?? 0) / 7);
    if (!weeks.has(weekIdx)) weeks.set(weekIdx, []);
    weeks.get(weekIdx).push(d);
  });
  return [...weeks.keys()].sort((a, b) => a - b).map((k) => weeks.get(k));
}

export function weekRange(week) {
  const fechas = week.map((d) => d.fecha).filter(Boolean);
  if (!fechas.length) return '';
  const min = fechas.reduce((a, b) => (a < b ? a : b));
  const max = fechas.reduce((a, b) => (a > b ? a : b));
  return ` (${fmtShort(min)}–${fmtShort(max)})`;
}
