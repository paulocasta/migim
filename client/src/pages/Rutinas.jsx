import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import AppLayout from '../components/AppLayout';
import { routinesApi } from '../api/routines';
import { usersApi } from '../api/users';
import styles from './Rutinas.module.css';

const EMPTY = { alumno_id: '', nombre: '', period_type: 'semanal', start_date: '' };

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
              </div>
            </div>
            <p className={styles.cardDate}>
              Inicio: {new Date(r.start_date).toLocaleDateString('es-AR')}
              {' · '}Creada por {r.created_by_nombre}
            </p>
          </button>
        ))}
      </div>

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
    </AppLayout>
  );
}
