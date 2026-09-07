import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import { routinesApi } from '../api/routines';
import { weightEntriesApi } from '../api/weightEntries';
import { getEmbedUrl } from '../utils/video';
import { fmtShort, chunkDays, weekRange } from '../utils/routineWeeks';
import styles from './RutinaAlumno.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d - offset).toISOString().slice(0, 10);
}

function dateStrUTC(value) {
  const d = new Date(value);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// ── Video Player ──────────────────────────────────────────────────────────────

function VideoToggle({ exercise }) {
  const [open, setOpen] = useState(false);
  const hasVideo = exercise.video_url || exercise.video_file_path;
  if (!hasVideo) return null;

  return (
    <div className={styles.videoSection}>
      <button className={styles.videoToggleBtn} onClick={() => setOpen((v) => !v)}>
        {open ? '▾ Ocultar video' : '▸ Ver video'}
      </button>
      {open && (
        exercise.video_file_path ? (
          <video className={styles.videoEl} src={`/uploads/${exercise.video_file_path}`} controls preload="metadata" />
        ) : (
          <iframe
            className={styles.videoEl}
            src={getEmbedUrl(exercise.video_url)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video"
          />
        )
      )}
    </div>
  );
}

// ── Weight Input per Set ──────────────────────────────────────────────────────

function WeightInput({ set, existingEntry, fecha, routineId, onSaved, requierePeso = true }) {
  const qc = useQueryClient();
  const [peso, setPeso] = useState(existingEntry?.peso != null ? String(existingEntry.peso) : '');
  const [saved, setSaved] = useState(!!existingEntry);
  const [error, setError] = useState('');

  const upsertMut = useMutation({
    mutationFn: () =>
      weightEntriesApi.upsert({
        prescribed_set_id: set.id,
        fecha,
        peso: peso === '' ? undefined : Number(peso),
      }),
    onSuccess: () => {
      setSaved(true);
      setError('');
      qc.invalidateQueries({ queryKey: ['weight-entries', routineId] });
      onSaved?.();
    },
    onError: (err) => setError(err.response?.data?.error?.message || 'Error al guardar'),
  });

  function handleSave() {
    if (peso !== '' && (isNaN(Number(peso)) || Number(peso) <= 0)) {
      setError('Ingresá un peso válido');
      return;
    }
    if (requierePeso && peso === '') {
      setError('Ingresá un peso válido');
      return;
    }
    setSaved(false);
    upsertMut.mutate();
  }

  function handleChange(e) {
    setPeso(e.target.value);
    setSaved(false);
    setError('');
  }

  return (
    <div className={styles.weightRow}>
      <span className={styles.setLabel}>{set.sets_count}×{set.reps}</span>
      <div className={styles.weightInputWrap}>
        <input
          className={`${styles.weightInput} ${error ? styles.inputError : ''}`}
          type="number"
          min="0"
          step="0.5"
          placeholder={requierePeso ? '0' : 'opcional'}
          value={peso}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <span className={styles.kgLabel}>kg</span>
      </div>
      <button
        className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`}
        onClick={handleSave}
        disabled={upsertMut.isPending}
      >
        {upsertMut.isPending ? '…' : saved ? '✓' : requierePeso ? 'Guardar' : 'Marcar hecho'}
      </button>
      {error && <span className={styles.inputErrMsg}>{error}</span>}
    </div>
  );
}

// ── Exercise Card ─────────────────────────────────────────────────────────────

function ExerciseCard({ exercise, entriesMap, fecha, routineId }) {
  const allSaved = exercise.sets.length > 0 &&
    exercise.sets.every((s) => entriesMap[s.id]);

  return (
    <div className={`${styles.exCard} ${allSaved ? styles.exCardDone : ''}`}>
      <div className={styles.exHeader}>
        <div>
          <span className={styles.exName}>{exercise.exercise_nombre}</span>
          <span className={styles.catTag}>{exercise.category_nombre}</span>
        </div>
        {allSaved && <span className={styles.doneBadge}>✓ Completo</span>}
      </div>

      <VideoToggle exercise={exercise} />

      {exercise.notas && (
        <p className={styles.notas}>📝 {exercise.notas}</p>
      )}

      {exercise.sets.length === 0 ? (
        <p className={styles.noSets}>Sin series definidas por el profe.</p>
      ) : (
        <div className={styles.setsList}>
          {exercise.sets.map((s) => (
            <WeightInput
              key={`${s.id}-${fecha}`}
              set={s}
              existingEntry={entriesMap[s.id]}
              fecha={fecha}
              routineId={routineId}
              requierePeso={exercise.requiere_peso !== false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Block Section ─────────────────────────────────────────────────────────────

function BlockSection({ block, entriesMap, fecha, routineId }) {
  return (
    <div className={styles.block}>
      <div className={styles.blockHeader}>{block.block_type_nombre}</div>
      {block.exercises.length === 0 ? (
        <p className={styles.emptyMsg}>Sin ejercicios en este bloque.</p>
      ) : (
        <div className={styles.exList}>
          {block.exercises.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} entriesMap={entriesMap} fecha={fecha} routineId={routineId} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RutinaAlumno() {
  const [selectedRoutineId, setSelectedRoutineId] = useState(null);
  const [selectedDayId, setSelectedDayId] = useState(null);

  const { data: routines = [], isLoading: loadingRoutines } = useQuery({
    queryKey: ['routines-mine'],
    queryFn: routinesApi.mine,
  });

  const activeRoutineId = selectedRoutineId ?? routines[0]?.id ?? null;

  const { data: routine, isLoading: loadingTree } = useQuery({
    queryKey: ['routine', activeRoutineId],
    queryFn: () => routinesApi.getTree(activeRoutineId),
    enabled: !!activeRoutineId,
  });

  const selectedDay =
    routine?.days.find((d) => d.id === selectedDayId) ??
    routine?.days[0] ??
    null;

  const effectiveDayId = selectedDay?.id ?? null;

  // Fecha real del día de rutina (si la tiene) en vez de "hoy", para que el peso
  // cargado quede fechado el día de entrenamiento y no el día en que se lo carga.
  const fecha = selectedDay?.fecha ? dateStrUTC(selectedDay.fecha) : today();

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['weight-entries', activeRoutineId],
    queryFn: () => weightEntriesApi.list(),
    enabled: !!activeRoutineId,
  });

  // agrupa una sola vez por fecha para que cambiar de día no dispare fetch
  const entriesByFecha = entries.reduce((acc, e) => {
    const key = dateStrUTC(e.fecha);
    (acc[key] ??= {})[e.prescribed_set_id] = e;
    return acc;
  }, {});
  const entriesMap = entriesByFecha[fecha] || {};

  function renderDayTab(d) {
    return (
      <button
        key={d.id}
        className={`${styles.dayTab} ${d.id === effectiveDayId ? styles.dayTabActive : ''}`}
        onClick={() => setSelectedDayId(d.id)}
      >
        {d.etiqueta}
        {d.fecha && <span className={styles.dayTabFecha}> {fmtShort(d.fecha)}</span>}
      </button>
    );
  }

  if (loadingRoutines) {
    return <AppLayout><p className={styles.msg}>Cargando rutinas...</p></AppLayout>;
  }

  if (routines.length === 0) {
    return (
      <AppLayout>
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Sin rutina activa</p>
          <p className={styles.emptyDesc}>Tu profe todavía no te asignó una rutina. ¡Pronto!</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Selector de rutina */}
      {routines.length > 1 && (
        <div className={styles.topBar}>
          <div className={styles.routineSelect}>
            <label className={styles.dateLabel}>Rutina</label>
            <select
              className={styles.dateInput}
              value={activeRoutineId ?? ''}
              onChange={(e) => { setSelectedRoutineId(Number(e.target.value)); setSelectedDayId(null); }}
            >
              {routines.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {routine && (
        <p className={styles.routineInfo}>
          {routine.nombre}
          <span className={styles.routineMeta}>
            {' · '}{routine.period_type}
            {' · '}inicio {new Date(routine.start_date).toLocaleDateString('es-AR')}
          </span>
        </p>
      )}

      {/* Tabs de días */}
      {loadingTree && <p className={styles.msg}>Cargando rutina...</p>}
      {!loadingTree && loadingEntries && <p className={styles.msg}>Cargando pesos...</p>}

      {routine && (
        <>
          {routine.period_type === 'personalizada' ? (
            <div className={styles.dayTabs}>
              {routine.days.map((d) => renderDayTab(d))}
            </div>
          ) : (
            chunkDays(routine.days).map((week, wi) => (
              <div key={wi} className={styles.dayTabs}>
                {chunkDays(routine.days).length > 1 && (
                  <span className={styles.weekLabel}>Semana {wi + 1}{weekRange(week)}</span>
                )}
                {week.map((d) => renderDayTab(d))}
              </div>
            ))
          )}

          {!selectedDay && routine.days.length === 0 && (
            <p className={styles.msg}>La rutina no tiene días configurados todavía.</p>
          )}

          {selectedDay && !loadingEntries && (
            <div className={styles.dayContent}>
              {selectedDay.blocks.length === 0 ? (
                <p className={styles.msg}>Este día no tiene ejercicios todavía.</p>
              ) : (
                selectedDay.blocks.map((b) => (
                  <BlockSection key={b.id} block={b} entriesMap={entriesMap} fecha={fecha} routineId={activeRoutineId} />
                ))
              )}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
