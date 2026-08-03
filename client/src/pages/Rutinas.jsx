import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import AppLayout from '../components/AppLayout';
import ConfirmModal from '../components/ConfirmModal';
import { routinesApi } from '../api/routines';
import { usersApi } from '../api/users';
import styles from './Rutinas.module.css';

const EMPTY = { alumno_id: '', nombre: '', period_type: 'semanal', start_date: '' };

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function mondayOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0=domingo..6=sábado
  const offset = day === 0 ? 6 : day - 1;
  return addDays(dateStr, -offset);
}

function fmtShort(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

function WeekPreview({ startDate, periodType }) {
  if (!startDate) return null;
  const monday = mondayOf(startDate);
  const numWeeks = periodType === 'mensual' ? 4 : 1;
  const lastSunday = addDays(monday, numWeeks * 7 - 1);
  return (
    <p className={styles.weekPreview}>
      {numWeeks === 1
        ? `Semana: ${fmtShort(monday)} – ${fmtShort(lastSunday)}`
        : `Semana 1: ${fmtShort(monday)} – ${fmtShort(addDays(monday, 6))} (4 semanas, hasta ${fmtShort(lastSunday)})`}
    </p>
  );
}

function PeriodBadge({ type }) {
  return (
    <span className={`${styles.badge} ${type === 'mensual' ? styles.badgeMensual : styles.badgeSemanal}`}>
      {type}
    </span>
  );
}

export default function Rutinas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [filterAlumnoId, setFilterAlumnoId] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [copyModal, setCopyModal] = useState(null);
  const [copyForm, setCopyForm] = useState({ nombre: '', start_date: '' });
  const [copyError, setCopyError] = useState('');

  const { data: routines = [], isLoading } = useQuery({
    queryKey: ['routines', filterAlumnoId],
    queryFn: () => routinesApi.list(filterAlumnoId || undefined),
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['users', 'alumno'],
    queryFn: () => usersApi.list('alumno'),
  });

  const createMut = useMutation({
    mutationFn: routinesApi.create,
    onSuccess: (routine) => {
      qc.invalidateQueries({ queryKey: ['routines'] });
      setModal(false);
      navigate(`/rutinas/${routine.id}`);
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Error al crear'),
  });

  const removeMut = useMutation({
    mutationFn: routinesApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routines'] });
      setConfirmDelete(null);
    },
  });

  const copyMut = useMutation({
    mutationFn: ({ id, data }) => routinesApi.copy(id, data),
    onSuccess: (routine) => {
      qc.invalidateQueries({ queryKey: ['routines'] });
      setCopyModal(null);
      navigate(`/rutinas/${routine.id}`);
    },
    onError: (err) => setCopyError(err.response?.data?.error?.message || 'Error al copiar'),
  });

  function openCopyModal(r) {
    setCopyForm({ nombre: `${r.nombre} (copia)`, start_date: '' });
    setCopyError('');
    setCopyModal(r);
  }

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    createMut.mutate({ ...form, alumno_id: Number(form.alumno_id) });
  }

  return (
    <AppLayout>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Rutinas</h1>
        <button className={styles.btnPrimary} onClick={() => { setForm(EMPTY); setFormError(''); setModal(true); }}>
          + Nueva rutina
        </button>
      </div>

      <div className={styles.filterRow}>
        <select
          className={styles.filterSelect}
          value={filterAlumnoId}
          onChange={(e) => setFilterAlumnoId(e.target.value)}
        >
          <option value="">Todos los alumnos</option>
          {alumnos.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className={styles.msg}>Cargando...</p>}
      {!isLoading && routines.length === 0 && (
        <p className={styles.msg}>No hay rutinas. Creá la primera con "+ Nueva rutina".</p>
      )}

      <div className={styles.list}>
        {routines.map((r) => (
          <button
            key={r.id}
            className={styles.routineCard}
            onClick={() => navigate(`/rutinas/${r.id}`)}
          >
            <div className={styles.cardTop}>
              <div className={styles.cardInfo}>
                <p className={styles.routineName}>{r.nombre}</p>
                <p className={styles.alumnoName}>{r.alumno_nombre}</p>
              </div>
              <div className={styles.cardMeta}>
                <PeriodBadge type={r.period_type} />
                <span className={`${styles.badge} ${r.activo ? styles.badgeActivo : styles.badgeInactivo}`}>
                  {r.activo ? 'Activa' : 'Inactiva'}
                </span>
                <span
                  className={styles.copyBtn}
                  role="button"
                  tabIndex={0}
                  title="Copiar rutina"
                  onClick={(e) => { e.stopPropagation(); openCopyModal(r); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); openCopyModal(r); } }}
                >
                  ⧉
                </span>
                <span
                  className={styles.deleteBtn}
                  role="button"
                  tabIndex={0}
                  title="Eliminar rutina"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(r); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setConfirmDelete(r); } }}
                >
                  ×
                </span>
              </div>
            </div>
            <p className={styles.cardDate}>
              Inicio: {new Date(r.start_date).toLocaleDateString('es-AR')}
              {' · '}Creada por {r.created_by_nombre}
            </p>
          </button>
        ))}
      </div>

      {confirmDelete && (
        <ConfirmModal
          message={`¿Eliminar la rutina "${confirmDelete.nombre}" de ${confirmDelete.alumno_nombre}? Se borrarán todos sus días, bloques, ejercicios y pesos cargados.`}
          onConfirm={() => removeMut.mutate(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
          isPending={removeMut.isPending}
        />
      )}

      {modal && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h2>Nueva rutina</h2>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.label}>
                Alumno
                <select className={styles.input} name="alumno_id" value={form.alumno_id} onChange={handleChange} required>
                  <option value="">— Elegir alumno —</option>
                  {alumnos.filter((a) => a.activo).map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre} ({a.email})</option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                Nombre de la rutina
                <input className={styles.input} name="nombre" value={form.nombre} onChange={handleChange} required minLength={2} placeholder="Ej: Bloque Julio - Hipertrofia" />
              </label>
              <label className={styles.label}>
                Tipo de periodo
                <select className={styles.input} name="period_type" value={form.period_type} onChange={handleChange}>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </label>
              <label className={styles.label}>
                Fecha de inicio
                <input className={styles.input} type="date" name="start_date" value={form.start_date} onChange={handleChange} required />
              </label>
              <WeekPreview startDate={form.start_date} periodType={form.period_type} />
              {formError && <p className={styles.formError}>{formError}</p>}
              <div className={styles.formActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={createMut.isPending}>
                  {createMut.isPending ? 'Creando...' : 'Crear y editar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {copyModal && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setCopyModal(null)}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h2>Copiar rutina</h2>
              <button className={styles.closeBtn} onClick={() => setCopyModal(null)}>✕</button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); setCopyError(''); copyMut.mutate({ id: copyModal.id, data: copyForm }); }}
              className={styles.form}
            >
              <p className={styles.alumnoName}>Para {copyModal.alumno_nombre}</p>
              <label className={styles.label}>
                Nombre de la copia
                <input
                  className={styles.input}
                  value={copyForm.nombre}
                  onChange={(e) => setCopyForm((f) => ({ ...f, nombre: e.target.value }))}
                  required
                  minLength={2}
                />
              </label>
              <label className={styles.label}>
                Nueva fecha de inicio
                <input
                  className={styles.input}
                  type="date"
                  value={copyForm.start_date}
                  onChange={(e) => setCopyForm((f) => ({ ...f, start_date: e.target.value }))}
                  required
                />
              </label>
              <WeekPreview startDate={copyForm.start_date} periodType={copyModal.period_type} />
              {copyError && <p className={styles.formError}>{copyError}</p>}
              <div className={styles.formActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setCopyModal(null)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary} disabled={copyMut.isPending}>
                  {copyMut.isPending ? 'Copiando...' : 'Copiar y editar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
