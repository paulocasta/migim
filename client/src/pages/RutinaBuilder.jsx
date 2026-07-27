import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import { routinesApi, blockTypesApi } from '../api/routines';
import { exercisesApi } from '../api/exercises';
import styles from './RutinaBuilder.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function useRoutineTree(id) {
  return useQuery({
    queryKey: ['routine', id],
    queryFn: () => routinesApi.getTree(id),
    enabled: !!id,
  });
}

function useInvalidate(id) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['routine', id] });
}

// ── Set Row ───────────────────────────────────────────────────────────────────

function SetRow({ set, routineId }) {
  const invalidate = useInvalidate(routineId);
  const [editing, setEditing] = useState(false);
  const [sc, setSc] = useState(String(set.sets_count));
  const [rp, setRp] = useState(String(set.reps));

  const removeMut = useMutation({ mutationFn: () => routinesApi.removeSet(set.id), onSuccess: invalidate });
  const updateMut = useMutation({
    mutationFn: () => routinesApi.updateSet(set.id, { sets_count: Number(sc), reps: Number(rp) }),
    onSuccess: () => { invalidate(); setEditing(false); },
  });

  if (editing) {
    return (
      <div className={styles.setRow}>
        <input className={styles.setInput} type="number" min="1" value={sc} onChange={(e) => setSc(e.target.value)} style={{ width: 48 }} />
        <span className={styles.setX}>×</span>
        <input className={styles.setInput} type="number" min="1" value={rp} onChange={(e) => setRp(e.target.value)} style={{ width: 48 }} />
        <button className={styles.btnIcon} onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>✓</button>
        <button className={styles.btnIconGhost} onClick={() => setEditing(false)}>✕</button>
      </div>
    );
  }

  return (
    <div className={styles.setRow}>
      <span className={styles.setLabel}>{set.sets_count}×{set.reps}</span>
      <button className={styles.btnIconGhost} onClick={() => setEditing(true)} title="Editar">✎</button>
      <button className={styles.btnIconDanger} onClick={() => removeMut.mutate()} disabled={removeMut.isPending} title="Eliminar">×</button>
    </div>
  );
}

// ── Add Set Form ──────────────────────────────────────────────────────────────

function AddSetForm({ reId, routineId }) {
  const invalidate = useInvalidate(routineId);
  const [sc, setSc] = useState('');
  const [rp, setRp] = useState('');
  const [open, setOpen] = useState(false);

  const addMut = useMutation({
    mutationFn: () => routinesApi.addSet(reId, { sets_count: Number(sc), reps: Number(rp) }),
    onSuccess: () => { invalidate(); setSc(''); setRp(''); setOpen(false); },
  });

  if (!open) {
    return <button className={styles.btnAddSmall} onClick={() => setOpen(true)}>+ Serie</button>;
  }

  return (
    <div className={styles.setRow}>
      <input className={styles.setInput} type="number" min="1" placeholder="Series" value={sc} onChange={(e) => setSc(e.target.value)} style={{ width: 64 }} />
      <span className={styles.setX}>×</span>
      <input className={styles.setInput} type="number" min="1" placeholder="Reps" value={rp} onChange={(e) => setRp(e.target.value)} style={{ width: 64 }} />
      <button className={styles.btnIcon} onClick={() => addMut.mutate()} disabled={addMut.isPending || !sc || !rp}>
        {addMut.isPending ? '…' : '✓'}
      </button>
      <button className={styles.btnIconGhost} onClick={() => setOpen(false)}>✕</button>
    </div>
  );
}

// ── Exercise Item ─────────────────────────────────────────────────────────────

function ExerciseItem({ ex, routineId }) {
  const invalidate = useInvalidate(routineId);
  const [open, setOpen] = useState(false);

  const removeMut = useMutation({
    mutationFn: () => routinesApi.removeExercise(ex.id),
    onSuccess: invalidate,
  });

  return (
    <div className={styles.exItem}>
      <div className={styles.exItemHeader}>
        <button className={styles.exToggle} onClick={() => setOpen((v) => !v)}>
          <span className={styles.exToggleIcon}>{open ? '▾' : '▸'}</span>
          <span className={styles.exName}>{ex.exercise_nombre}</span>
          <span className={styles.catTag}>{ex.category_nombre}</span>
        </button>
        <button
          className={styles.btnIconDanger}
          onClick={() => removeMut.mutate()}
          disabled={removeMut.isPending}
          title="Quitar ejercicio"
        >×</button>
      </div>

      {open && (
        <div className={styles.setsPanel}>
          {ex.sets.length === 0 && (
            <p className={styles.setsEmpty}>Sin series. Agrega con "+ Serie".</p>
          )}
          {ex.sets.map((s) => (
            <SetRow key={s.id} set={s} routineId={routineId} />
          ))}
          <AddSetForm reId={ex.id} routineId={routineId} />
          {ex.notas && <p className={styles.exNotas}>📝 {ex.notas}</p>}
        </div>
      )}
    </div>
  );
}

// ── Add Exercise (picker) ─────────────────────────────────────────────────────

function AddExercisePicker({ blockId, routineId, onClose }) {
  const invalidate = useInvalidate(routineId);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises', null],
    queryFn: () => exercisesApi.list(),
  });

  const addMut = useMutation({
    mutationFn: () => routinesApi.addExercise(blockId, { exercise_id: Number(selected) }),
    onSuccess: () => { invalidate(); onClose(); },
  });

  const filtered = search
    ? exercises.filter((e) =>
        e.nombre.toLowerCase().includes(search.toLowerCase()) ||
        e.category_nombre.toLowerCase().includes(search.toLowerCase())
      )
    : exercises;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.pickerCard}>
        <div className={styles.modalHeader}>
          <h2>Agregar ejercicio</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.pickerBody}>
          <input
            className={styles.searchInput}
            placeholder="Buscar por nombre o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className={styles.exList}>
            {filtered.map((e) => (
              <button
                key={e.id}
                className={`${styles.exPickerRow} ${selected === String(e.id) ? styles.exPickerSelected : ''}`}
                onClick={() => setSelected(String(e.id))}
              >
                <span className={styles.exName}>{e.nombre}</span>
                <span className={styles.catTag}>{e.category_nombre}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className={styles.msg}>Sin resultados.</p>}
          </div>
          <div className={styles.pickerActions}>
            <button className={styles.btnSecondary} onClick={onClose}>Cancelar</button>
            <button
              className={styles.btnPrimary}
              disabled={!selected || addMut.isPending}
              onClick={() => addMut.mutate()}
            >
              {addMut.isPending ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Block Card ────────────────────────────────────────────────────────────────

function BlockCard({ block, routineId }) {
  const invalidate = useInvalidate(routineId);
  const [picker, setPicker] = useState(false);

  const removeMut = useMutation({
    mutationFn: () => routinesApi.removeBlock(block.id),
    onSuccess: invalidate,
  });

  return (
    <div className={styles.blockCard}>
      <div className={styles.blockHeader}>
        <span className={styles.blockType}>{block.block_type_nombre}</span>
        <button
          className={styles.btnIconDanger}
          onClick={() => removeMut.mutate()}
          disabled={removeMut.isPending}
          title="Eliminar bloque"
        >×</button>
      </div>

      <div className={styles.exList2}>
        {block.exercises.length === 0 && (
          <p className={styles.setsEmpty}>Bloque vacío. Agrega ejercicios abajo.</p>
        )}
        {block.exercises.map((ex) => (
          <ExerciseItem key={ex.id} ex={ex} routineId={routineId} />
        ))}
      </div>

      <button className={styles.btnAddBlock} onClick={() => setPicker(true)}>
        + Ejercicio
      </button>

      {picker && (
        <AddExercisePicker
          blockId={block.id}
          routineId={routineId}
          onClose={() => setPicker(false)}
        />
      )}
    </div>
  );
}

// ── Add Block ─────────────────────────────────────────────────────────────────

function AddBlock({ dayId, routineId }) {
  const invalidate = useInvalidate(routineId);
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState('');

  const { data: blockTypes = [] } = useQuery({
    queryKey: ['block-types'],
    queryFn: blockTypesApi.list,
  });

  const addMut = useMutation({
    mutationFn: () => routinesApi.createBlock(dayId, { block_type_id: Number(typeId) }),
    onSuccess: () => { invalidate(); setOpen(false); setTypeId(''); },
  });

  if (!open) {
    return (
      <button className={styles.btnAddDay} onClick={() => setOpen(true)}>
        + Bloque
      </button>
    );
  }

  return (
    <div className={styles.addBlockRow}>
      <select className={styles.inlineSelect} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
        <option value="">— Tipo de bloque —</option>
        {blockTypes.map((bt) => (
          <option key={bt.id} value={bt.id}>{bt.nombre}</option>
        ))}
      </select>
      <button className={styles.btnIcon} onClick={() => addMut.mutate()} disabled={!typeId || addMut.isPending}>✓</button>
      <button className={styles.btnIconGhost} onClick={() => setOpen(false)}>✕</button>
    </div>
  );
}

// ── Day Content ───────────────────────────────────────────────────────────────

function DayContent({ day, routineId }) {
  if (!day) return <p className={styles.msg}>Seleccioná un día.</p>;

  return (
    <div className={styles.dayContent}>
      {day.blocks.length === 0 && (
        <p className={styles.msg}>No hay bloques. Agrega el primero con "+ Bloque".</p>
      )}
      {day.blocks.map((b) => (
        <BlockCard key={b.id} block={b} routineId={routineId} />
      ))}
      <AddBlock dayId={day.id} routineId={routineId} />
    </div>
  );
}

// ── Main Builder ──────────────────────────────────────────────────────────────

export default function RutinaBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const invalidate = useInvalidate(id);

  const { data: routine, isLoading, error } = useRoutineTree(id);
  const [selectedDayId, setSelectedDayId] = useState(null);
  const [newDayLabel, setNewDayLabel] = useState('');
  const [addingDay, setAddingDay] = useState(false);

  const addDayMut = useMutation({
    mutationFn: () => routinesApi.createDay(id, { etiqueta: newDayLabel, orden: (routine?.days?.length ?? 0) }),
    onSuccess: (day) => {
      invalidate();
      setSelectedDayId(day.id);
      setNewDayLabel('');
      setAddingDay(false);
    },
  });

  const removeDayMut = useMutation({
    mutationFn: (dayId) => routinesApi.removeDay(dayId),
    onSuccess: (_, dayId) => {
      invalidate();
      if (selectedDayId === dayId) setSelectedDayId(null);
    },
  });

  const toggleActivoMut = useMutation({
    mutationFn: () => routinesApi.update(id, { ...routine, activo: !routine.activo }),
    onSuccess: invalidate,
  });

  if (isLoading) return <AppLayout><p className={styles.msg}>Cargando rutina...</p></AppLayout>;
  if (error) return <AppLayout><p className={styles.msgError}>Error al cargar la rutina.</p></AppLayout>;

  const selectedDay = routine.days.find((d) => d.id === selectedDayId) ?? routine.days[0] ?? null;
  const effectiveSelectedId = selectedDay?.id ?? null;

  return (
    <AppLayout>
      {/* Header */}
      <div className={styles.builderHeader}>
        <button className={styles.backBtn} onClick={() => navigate('/rutinas')}>← Rutinas</button>
        <div className={styles.headerInfo}>
          <h1 className={styles.routineTitle}>{routine.nombre}</h1>
          <div className={styles.headerMeta}>
            <span className={styles.metaItem}>👤 {routine.alumno_nombre}</span>
            <span className={styles.metaItem}>📅 {routine.period_type} · {new Date(routine.start_date).toLocaleDateString('es-AR')}</span>
          </div>
        </div>
        <button
          className={`${styles.activoBtn} ${routine.activo ? styles.activoBtnOn : styles.activoBtnOff}`}
          onClick={() => toggleActivoMut.mutate()}
          disabled={toggleActivoMut.isPending}
        >
          {routine.activo ? '● Activa' : '○ Inactiva'}
        </button>
      </div>

      {/* Day tabs */}
      <div className={styles.dayTabs}>
        {routine.days.map((d) => (
          <div key={d.id} className={styles.dayTabWrap}>
            <button
              className={`${styles.dayTab} ${d.id === effectiveSelectedId ? styles.dayTabActive : ''}`}
              onClick={() => setSelectedDayId(d.id)}
            >
              {d.etiqueta}
            </button>
            <button
              className={styles.removeDayBtn}
              onClick={() => removeDayMut.mutate(d.id)}
              disabled={removeDayMut.isPending}
              title="Eliminar día"
            >×</button>
          </div>
        ))}

        {addingDay ? (
          <div className={styles.addDayPanel}>
            <div className={styles.daySuggestions}>
              {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map((d) => (
                <button
                  key={d}
                  className={`${styles.daySugBtn} ${newDayLabel === d ? styles.daySugBtnActive : ''}`}
                  onClick={() => setNewDayLabel(d)}
                  type="button"
                >
                  {d}
                </button>
              ))}
            </div>
            <div className={styles.addDayRow}>
              <input
                className={styles.dayInput}
                value={newDayLabel}
                onChange={(e) => setNewDayLabel(e.target.value)}
                placeholder="O escribí un nombre custom…"
                autoFocus
              />
              <button className={styles.btnIcon} onClick={() => addDayMut.mutate()} disabled={!newDayLabel || addDayMut.isPending}>✓</button>
              <button className={styles.btnIconGhost} onClick={() => { setAddingDay(false); setNewDayLabel(''); }}>✕</button>
            </div>
          </div>
        ) : (
          <button className={styles.addDayBtn} onClick={() => setAddingDay(true)}>+ Día</button>
        )}
      </div>

      {/* Day content */}
      {routine.days.length === 0 ? (
        <p className={styles.msg}>Sin días todavía. Agrega el primero con "+ Día".</p>
      ) : (
        <DayContent day={selectedDay} routineId={id} />
      )}
    </AppLayout>
  );
}
