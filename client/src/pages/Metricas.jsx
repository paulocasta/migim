import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
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

// ── Tabs ───────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'progress', label: 'Progreso' },
  { id: 'volume', label: 'Volumen' },
  { id: 'prs', label: 'Records' },
  { id: 'attendance', label: 'Asistencia' },
];

// ── Progress tab ───────────────────────────────────────────────────────────────

function ProgressTab({ alumnoId }) {
  const [selectedExId, setSelectedExId] = useState('');

  const { data: exercises = [] } = useQuery({
    queryKey: ['metrics-exercises', alumnoId],
    queryFn: () => metricsApi.loggedExercises(alumnoId),
    enabled: !!alumnoId || alumnoId === undefined,
  });

  const { data: chartData = [], isLoading } = useQuery({
    queryKey: ['metrics-progress', alumnoId, selectedExId],
    queryFn: () => metricsApi.progress(selectedExId, alumnoId),
    enabled: !!selectedExId,
  });

  const formatted = chartData.map((d) => ({
    ...d,
    fecha: fmtDate(d.fecha),
    peso_max: Number(d.peso_max),
    peso_avg: Number(d.peso_avg),
  }));

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

      {selectedExId && !isLoading && formatted.length === 0 && (
        <p className={styles.hint}>Sin datos para este ejercicio todavía.</p>
      )}

      {formatted.length > 0 && (
        <>
          <div className={styles.statRow}>
            <StatCard label="Peso máximo" value={`${Math.max(...formatted.map(d => d.peso_max))} kg`} />
            <StatCard label="Sesiones" value={formatted.length} />
          </div>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={formatted} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="fecha" stroke={CHART.axis} tick={{ fontSize: 11 }} />
                <YAxis stroke={CHART.axis} tick={{ fontSize: 11 }} unit=" kg" />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v} kg`]} />
                <Legend wrapperStyle={{ fontSize: 12, color: CHART.axis }} />
                <Line type="monotone" dataKey="peso_max" name="Peso máx" stroke={CHART.accent} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="peso_avg" name="Peso prom" stroke={CHART.blue} strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

// ── Volume tab ─────────────────────────────────────────────────────────────────

function VolumeTab({ alumnoId }) {
  const [groupBy, setGroupBy] = useState('session');

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['metrics-volume', alumnoId, groupBy],
    queryFn: () => metricsApi.volume(groupBy, alumnoId),
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

function PRsTab({ alumnoId }) {
  const { data: prs = [], isLoading } = useQuery({
    queryKey: ['metrics-prs', alumnoId],
    queryFn: () => metricsApi.prs(alumnoId),
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

function AttendanceTab({ alumnoId }) {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 89);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

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
      <div className={styles.controls}>
        <div className={styles.dateRange}>
          <label className={styles.ctrlLabel}>Desde</label>
          <input className={styles.dateInput} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className={styles.dateRange}>
          <label className={styles.ctrlLabel}>Hasta</label>
          <input className={styles.dateInput} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {isLoading && <p className={styles.hint}>Cargando...</p>}

      {!isLoading && data && (
        <>
          <div className={styles.statRow}>
            <StatCard label="Días entrenados" value={data.totalDays} accent />
            <StatCard label="Racha actual" value={`${data.streak} días`} accent={data.streak > 0} />
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

          {tab === 'progress'    && <ProgressTab alumnoId={targetAlumnoId} />}
          {tab === 'volume'      && <VolumeTab alumnoId={targetAlumnoId} />}
          {tab === 'prs'         && <PRsTab alumnoId={targetAlumnoId} />}
          {tab === 'attendance'  && <AttendanceTab alumnoId={targetAlumnoId} />}
        </>
      )}
    </AppLayout>
  );
}
