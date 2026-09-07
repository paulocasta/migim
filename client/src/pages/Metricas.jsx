import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useAuth } from '../auth/AuthContext';
import AppLayout from '../components/AppLayout';
import { metricsApi } from '../api/metrics';
import { usersApi } from '../api/users';
import styles from './Metricas.module.css';

// ── Chart theme ────────────────────────────────────────────────────────────────

const CHART = {
  grid: 'rgba(42,74,127,0.35)',
  axis: '#8892a4',
  accent: '#e94560',
  blue: '#5599ff',
  bg: 'transparent',
};

const tooltipStyle = {
  contentStyle: { background: '#16213e', border: '1px solid #2a4a7f', borderRadius: 8, color: '#eaeaea' },
  labelStyle: { color: '#8892a4', fontSize: 12 },
};

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function fmtDateFull(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Period filter (Todo / Semana / Mes) ─────────────────────────────────────────

function addDaysISO(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d - offset).toISOString().slice(0, 10);
}

function isoWeekValue(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay();
  const monday = addDaysISO(dateStr, day === 0 ? -6 : 1 - day);
  const jan4 = new Date(Date.UTC(new Date(`${monday}T00:00:00Z`).getUTCFullYear(), 0, 4));
  const jan4Monday = addDaysISO(jan4.toISOString().slice(0, 10), jan4.getUTCDay() === 0 ? -6 : 1 - jan4.getUTCDay());
  const weekNum = Math.round((new Date(`${monday}T00:00:00Z`) - new Date(`${jan4Monday}T00:00:00Z`)) / (7 * 86400000)) + 1;
  return `${monday.slice(0, 4)}-W${String(weekNum).padStart(2, '0')}`;
}

function weekRangeFromValue(value) {
  if (!value) return null;
  const [yearStr, weekStr] = value.split('-W');
  const year = Number(yearStr);
  const week = Number(weekStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Monday = addDaysISO(jan4.toISOString().slice(0, 10), jan4.getUTCDay() === 0 ? -6 : 1 - jan4.getUTCDay());
  const from = addDaysISO(jan4Monday, (week - 1) * 7);
  return { from, to: addDaysISO(from, 6) };
}

function monthRangeFromValue(value) {
  if (!value) return null;
  const [year, month] = value.split('-').map(Number);
  const from = `${value}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from, to: `${value}-${String(lastDay).padStart(2, '0')}` };
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function MonthYearPicker({ value, setValue }) {
  const [year, month] = value.split('-').map(Number);
  const currentYear = Number(todayISO().slice(0, 4));
  const years = [];
  for (let y = currentYear + 1; y >= currentYear - 6; y--) years.push(y);

  function update(newYear, newMonth) {
    setValue(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  }

  return (
    <div className={styles.monthYear}>
      <select
        className={styles.monthSelect}
        value={month}
        onChange={(e) => update(year, Number(e.target.value))}
      >
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={i + 1}>{name}</option>
        ))}
      </select>
      <select
        className={styles.yearSelect}
        value={year}
        onChange={(e) => update(Number(e.target.value), month)}
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}

function PeriodFilter({ mode, setMode, value, setValue }) {
  const weekRange = mode === 'week' ? weekRangeFromValue(value) : null;

  return (
    <div className={`${styles.controls} ${styles.periodFilter}`}>
      <span className={styles.ctrlLabel}>Período</span>
      <div className={styles.toggle}>
        {[{ v: 'all', l: 'Todo' }, { v: 'week', l: 'Semana' }, { v: 'month', l: 'Mes' }].map(({ v, l }) => (
          <button
            key={v}
            className={`${styles.toggleBtn} ${mode === v ? styles.toggleBtnActive : ''}`}
            onClick={() => {
              setMode(v);
              if (v === 'week') setValue(isoWeekValue(todayISO()));
              else if (v === 'month') setValue(todayISO().slice(0, 7));
            }}
          >{l}</button>
        ))}
      </div>
      {mode === 'week' && (
        <div className={styles.weekPick}>
          <input className={styles.dateInput} type="week" value={value} onChange={(e) => setValue(e.target.value)} />
          {weekRange && (
            <span className={styles.weekRangeLabel}>{fmtDate(weekRange.from)}–{fmtDate(weekRange.to)}</span>
          )}
        </div>
      )}
      {mode === 'month' && <MonthYearPicker value={value} setValue={setValue} />}
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'progress', label: 'Progreso' },
  { id: 'volume', label: 'Volumen' },
  { id: 'prs', label: 'Records' },
  { id: 'attendance', label: 'Asistencia' },
];

// ── Progress tab ───────────────────────────────────────────────────────────────

const LINE_COLORS = ['#e94560', '#5599ff', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4'];

function buildProgressChart(raw) {
  // Collect unique set labels ordered by reps desc
  const labelsSet = new Map();
  raw.forEach((r) => {
    const key = `${r.sets_count}×${r.reps}`;
    if (!labelsSet.has(key)) labelsSet.set(key, { sets_count: Number(r.sets_count), reps: Number(r.reps) });
  });
  const labels = [...labelsSet.keys()].sort((a, b) => {
    const av = labelsSet.get(a); const bv = labelsSet.get(b);
    return bv.reps - av.reps || bv.sets_count - av.sets_count;
  });

  // Pivot: one row per fecha
  const byDate = new Map();
  raw.forEach((r) => {
    const fecha = fmtDate(r.fecha);
    if (!byDate.has(fecha)) byDate.set(fecha, { fecha });
    byDate.get(fecha)[`${r.sets_count}×${r.reps}`] = Number(r.peso);
  });

  return { labels, rows: [...byDate.values()] };
}

function ProgressTab({ alumnoId, from, to }) {
  const [selectedExId, setSelectedExId] = useState('');

  const { data: exercises = [] } = useQuery({
    queryKey: ['metrics-exercises', alumnoId],
    queryFn: () => metricsApi.loggedExercises(alumnoId),
    enabled: !!alumnoId || alumnoId === undefined,
  });

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['metrics-progress', alumnoId, selectedExId, from, to],
    queryFn: () => metricsApi.progress(selectedExId, alumnoId, from, to),
    enabled: !!selectedExId,
  });

  const { labels, rows } = buildProgressChart(raw);

  const pesoMax = rows.length
    ? Math.max(...rows.flatMap((r) => labels.map((l) => r[l] ?? 0)))
    : 0;
  const sesiones = new Set(raw.map((r) => fmtDate(r.fecha))).size;

  return (
    <div className={styles.tabContent}>
      <div className={styles.controls}>
        <label className={styles.ctrlLabel}>Ejercicio</label>
        <select className={styles.ctrlSelect} value={selectedExId} onChange={(e) => setSelectedExId(e.target.value)}>
          <option value="">— Elegir ejercicio —</option>
          {exercises.map((e) => (
            <option key={e.id} value={e.id}>{e.exercise_nombre || e.nombre} ({e.category_nombre})</option>
          ))}
        </select>
      </div>

      {!selectedExId && (
        <p className={styles.hint}>Elegí un ejercicio para ver su evolución de peso.</p>
      )}

      {selectedExId && isLoading && <p className={styles.hint}>Cargando...</p>}

      {selectedExId && !isLoading && rows.length === 0 && (
        <p className={styles.hint}>Sin datos para este ejercicio todavía.</p>
      )}

      {rows.length > 0 && (
        <>
          <div className={styles.statRow}>
            <StatCard label="Peso máximo" value={`${pesoMax} kg`} />
            <StatCard label="Sesiones" value={sesiones} />
          </div>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={rows} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="fecha" stroke={CHART.axis} tick={{ fontSize: 11 }} />
                <YAxis
                  stroke={CHART.axis}
                  tick={{ fontSize: 11 }}
                  unit=" kg"
                  domain={[
                    (dataMin) => Math.floor(dataMin * 0.92),
                    (dataMax) => Math.ceil(dataMax * 1.05),
                  ]}
                />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v} kg`]} />
                <Legend wrapperStyle={{ fontSize: 12, color: CHART.axis }} />
                {labels.map((label, i) => {
                  const color = LINE_COLORS[i % LINE_COLORS.length];
                  return (
                    <Bar
                      key={label}
                      dataKey={label}
                      name={label}
                      fill={color}
                      radius={[3, 3, 0, 0]}
                    />
                  );
                })}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

// ── Volume tab ─────────────────────────────────────────────────────────────────

function VolumeTab({ alumnoId, from, to }) {
  const [groupBy, setGroupBy] = useState('session');

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['metrics-volume', alumnoId, groupBy, from, to],
    queryFn: () => metricsApi.volume(groupBy, alumnoId, from, to),
  });

  const chartData = raw.map((d) => ({
    fecha: fmtDate(d.fecha),
    volumen: Number(d.volumen),
  }));

  const totalVol = chartData.reduce((s, d) => s + d.volumen, 0);

  return (
    <div className={styles.tabContent}>
      <div className={styles.controls}>
        <span className={styles.ctrlLabel}>Agrupar por</span>
        <div className={styles.toggle}>
          {[{ v: 'session', l: 'Sesión' }, { v: 'week', l: 'Semana' }].map(({ v, l }) => (
            <button
              key={v}
              className={`${styles.toggleBtn} ${groupBy === v ? styles.toggleBtnActive : ''}`}
              onClick={() => setGroupBy(v)}
            >{l}</button>
          ))}
        </div>
      </div>

      {isLoading && <p className={styles.hint}>Cargando...</p>}

      {!isLoading && chartData.length === 0 && (
        <p className={styles.hint}>Sin datos de volumen todavía. Cargá pesos desde la rutina.</p>
      )}

      {chartData.length > 0 && (
        <>
          <div className={styles.statRow}>
            <StatCard label="Volumen total acumulado" value={`${totalVol.toLocaleString('es-AR')} kg`} />
            <StatCard label="Sesiones registradas" value={chartData.length} />
            <StatCard label="Promedio por sesión" value={`${Math.round(totalVol / chartData.length).toLocaleString('es-AR')} kg`} />
          </div>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="fecha" stroke={CHART.axis} tick={{ fontSize: 11 }} />
                <YAxis stroke={CHART.axis} tick={{ fontSize: 11 }} unit=" kg" />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v.toLocaleString('es-AR')} kg`, 'Volumen']} />
                <Bar dataKey="volumen" name="Volumen" fill={CHART.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

// ── PRs tab ────────────────────────────────────────────────────────────────────

function PRsTab({ alumnoId, from, to }) {
  const { data: prs = [], isLoading } = useQuery({
    queryKey: ['metrics-prs', alumnoId, from, to],
    queryFn: () => metricsApi.prs(alumnoId, from, to),
  });

  const byCategory = prs.reduce((acc, pr) => {
    (acc[pr.category_nombre] ||= []).push(pr);
    return acc;
  }, {});

  return (
    <div className={styles.tabContent}>
      {isLoading && <p className={styles.hint}>Cargando...</p>}

      {!isLoading && prs.length === 0 && (
        <p className={styles.hint}>Sin records todavía. ¡A entrenar!</p>
      )}

      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat} className={styles.prGroup}>
          <h3 className={styles.prCat}>{cat}</h3>
          <div className={styles.prTable}>
            <div className={styles.prHeader}>
              <span>Ejercicio</span>
              <span>Peso máx</span>
              <span>Fecha</span>
            </div>
            {items.map((pr) => (
              <div key={pr.exercise_id} className={styles.prRow}>
                <span className={styles.prExName}>{pr.exercise_nombre}</span>
                <span className={styles.prPeso}>{pr.peso_max} kg</span>
                <span className={styles.prFecha}>{fmtDateFull(pr.fecha_pr)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Attendance tab ─────────────────────────────────────────────────────────────

function AttendanceTab({ alumnoId, from, to }) {
  const { data, isLoading } = useQuery({
    queryKey: ['metrics-attendance', alumnoId, from, to],
    queryFn: () => metricsApi.attendance(from, to, alumnoId),
  });

  const chartData = (data?.days || []).map((d) => ({
    fecha: fmtDate(d.fecha),
    sesiones: Number(d.entries),
  }));

  return (
    <div className={styles.tabContent}>
      {isLoading && <p className={styles.hint}>Cargando...</p>}

      {!isLoading && data && (
        <>
          <div className={styles.statRow}>
            <StatCard label="Días entrenados" value={data.totalDays} accent />
          </div>

          {chartData.length === 0 ? (
            <p className={styles.hint}>Sin entrenamientos en el período seleccionado.</p>
          ) : (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="fecha" stroke={CHART.axis} tick={{ fontSize: 10 }} />
                  <YAxis stroke={CHART.axis} tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [v, 'Series registradas']} />
                  <Bar dataKey="sesiones" name="Sesiones" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  return (
    <div className={styles.statCard}>
      <span className={`${styles.statValue} ${accent ? styles.statValueAccent : ''}`}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function Metricas() {
  const { user } = useAuth();
  const [tab, setTab] = useState('progress');
  const [alumnoId, setAlumnoId] = useState('');
  const [periodMode, setPeriodMode] = useState('all');
  const [periodValue, setPeriodValue] = useState('');

  const range =
    periodMode === 'week' ? weekRangeFromValue(periodValue) :
    periodMode === 'month' ? monthRangeFromValue(periodValue) :
    null;
  const from = range?.from;
  const to = range?.to;

  const isStaff = user.role !== 'alumno';
  const targetAlumnoId = isStaff ? (alumnoId ? Number(alumnoId) : null) : undefined;

  const { data: alumnos = [] } = useQuery({
    queryKey: ['users', 'alumno'],
    queryFn: () => usersApi.list('alumno'),
    enabled: isStaff,
  });

  return (
    <AppLayout>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Métricas</h1>
      </div>

      {isStaff && (
        <div className={styles.alumnoBar}>
          <label className={styles.ctrlLabel}>Ver métricas de</label>
          <select className={styles.ctrlSelect} value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)}>
            <option value="">— Elegir alumno —</option>
            {alumnos.filter((a) => a.activo).map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
          {isStaff && !alumnoId && (
            <p className={styles.hint}>Elegí un alumno para ver sus métricas.</p>
          )}
        </div>
      )}

      {(!isStaff || alumnoId) && (
        <>
          <PeriodFilter mode={periodMode} setMode={setPeriodMode} value={periodValue} setValue={setPeriodValue} />

          <div className={styles.tabs}>
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'progress'    && <ProgressTab alumnoId={targetAlumnoId} from={from} to={to} />}
          {tab === 'volume'      && <VolumeTab alumnoId={targetAlumnoId} from={from} to={to} />}
          {tab === 'prs'         && <PRsTab alumnoId={targetAlumnoId} from={from} to={to} />}
          {tab === 'attendance'  && <AttendanceTab alumnoId={targetAlumnoId} from={from} to={to} />}
        </>
      )}
    </AppLayout>
  );
}
