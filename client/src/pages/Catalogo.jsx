import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import ConfirmModal from '../components/ConfirmModal';
import { categoriesApi } from '../api/categories';
import { exercisesApi } from '../api/exercises';
import { getEmbedUrl, hasVideo } from '../utils/video';
import styles from './Catalogo.module.css';

const EMPTY_EX = { category_id: '', nombre: '', descripcion: '', video_url: '' };
const EMPTY_CAT = { nombre: '', orden: '' };

// ── Video Player ──────────────────────────────────────────────────────────────
function VideoPlayer({ exercise }) {
  if (exercise.video_file_path) {
    return (
      <video
        className={styles.videoEl}
        src={`/uploads/${exercise.video_file_path}`}
        controls
        preload="metadata"
      />
    );
  }
  if (exercise.video_url) {
    const embed = getEmbedUrl(exercise.video_url);
    return (
      <iframe
        className={styles.videoEl}
        src={embed}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Video del ejercicio"
      />
    );
  }
  return <p className={styles.noVideo}>Sin video cargado.</p>;
}

// ── Exercise Modal ────────────────────────────────────────────────────────────
function ExerciseModal({ mode, exercise, categories, onClose, onSaved }) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [form, setForm] = useState(
    mode === 'edit'
      ? {
          category_id: String(exercise.category_id),
          nombre: exercise.nombre,
          descripcion: exercise.descripcion || '',
          video_url: exercise.video_url || '',
        }
      : { ...EMPTY_EX }
  );
  const [tab, setTab] = useState('info');
  const [formError, setFormError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [ex, setEx] = useState(exercise || null);
  const [confirmClearVideo, setConfirmClearVideo] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['exercises'] });

  const saveMut = useMutation({
    mutationFn: (data) =>
      mode === 'edit'
        ? exercisesApi.update(ex.id, data)
        : exercisesApi.create(data),
    onSuccess: (saved) => {
      setEx(saved);
      invalidate();
      if (mode === 'create') onSaved(saved);
      else onClose();
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Error al guardar'),
  });

  const clearVideoMut = useMutation({
    mutationFn: () => exercisesApi.clearVideo(ex.id),
    onSuccess: (saved) => { setEx(saved); invalidate(); },
    onError: () => setUploadError('Error al eliminar video'),
  });

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    saveMut.mutate({ ...form, category_id: Number(form.category_id) });
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file || !ex) return;
    setUploading(true);
    setUploadError('');
    try {
      const saved = await exercisesApi.uploadVideo(ex.id, file);
      setEx(saved);
      invalidate();
    } catch (err) {
      setUploadError(err.response?.data?.error?.message || 'Error al subir video');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <h2>{mode === 'create' ? 'Nuevo ejercicio' : ex?.nombre}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'info' ? styles.tabActive : ''}`}
            onClick={() => setTab('info')}
          >
            Información
          </button>
          <button
            className={`${styles.tab} ${tab === 'video' ? styles.tabActive : ''}`}
            onClick={() => setTab('video')}
            disabled={mode === 'create' && !ex}
          >
            Video
          </button>
        </div>

        {tab === 'info' && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              Categoría
              <select
                className={styles.input}
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                required
              >
                <option value="">— Elegir —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              Nombre
              <input
                className={styles.input}
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                required
                minLength={2}
              />
            </label>
            <label className={styles.label}>
              Descripción (opcional)
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                rows={3}
              />
            </label>
            <label className={styles.label}>
              URL de video (YouTube/Vimeo — opcional)
              <input
                className={styles.input}
                name="video_url"
                value={form.video_url}
                onChange={handleChange}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </label>
            {formError && <p className={styles.formError}>{formError}</p>}
            <div className={styles.formActions}>
              <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancelar</button>
              <button type="submit" className={styles.btnPrimary} disabled={saveMut.isPending}>
                {saveMut.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        )}

        {tab === 'video' && ex && (
          <div className={styles.videoPanel}>
            <VideoPlayer exercise={ex} />
            <div className={styles.videoActions}>
              <label className={styles.uploadLabel}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <span className={`${styles.btnSecondary} ${uploading ? styles.disabled : ''}`}>
                  {uploading ? 'Subiendo...' : '↑ Subir archivo de video'}
                </span>
              </label>
              {ex.video_file_path && (
                <button
                  className={`${styles.btnSecondary} ${styles.btnDanger}`}
                  onClick={() => setConfirmClearVideo(true)}
                  disabled={clearVideoMut.isPending}
                >
                  Eliminar archivo
                </button>
              )}
            </div>
            {uploadError && <p className={styles.formError}>{uploadError}</p>}
            <p className={styles.videoHint}>
              El archivo reemplaza el video guardado en servidor. La URL de YouTube/Vimeo se edita en la pestaña Información.
            </p>
          </div>
        )}
      </div>
      {confirmClearVideo && (
        <ConfirmModal
          message="¿Eliminar el archivo de video del servidor? Esta acción no se puede deshacer."
          onConfirm={() => { clearVideoMut.mutate(); setConfirmClearVideo(false); }}
          onCancel={() => setConfirmClearVideo(false)}
          isPending={clearVideoMut.isPending}
        />
      )}
    </div>
  );
}

// ── Category Modal ────────────────────────────────────────────────────────────
function CategoryModal({ mode, category, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(
    mode === 'edit'
      ? { nombre: category.nombre, orden: String(category.orden) }
      : EMPTY_CAT
  );
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] });

  const saveMut = useMutation({
    mutationFn: (data) =>
      mode === 'edit'
        ? categoriesApi.update(category.id, data)
        : categoriesApi.create(data),
    onSuccess: () => { invalidate(); onClose(); },
    onError: (err) => setError(err.response?.data?.error?.message || 'Error al guardar'),
  });

  const removeMut = useMutation({
    mutationFn: () => categoriesApi.remove(category.id),
    onSuccess: () => { invalidate(); onClose(); },
    onError: (err) => setError(err.response?.data?.error?.message || 'Error al eliminar'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    saveMut.mutate({ nombre: form.nombre, orden: form.orden ? Number(form.orden) : 0 });
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modalCard} ${styles.modalSm}`}>
        <div className={styles.modalHeader}>
          <h2>{mode === 'create' ? 'Nueva categoría' : 'Editar categoría'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Nombre
            <input
              className={styles.input}
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              required
              minLength={2}
            />
          </label>
          <label className={styles.label}>
            Orden (número)
            <input
              className={styles.input}
              type="number"
              value={form.orden}
              onChange={(e) => setForm((f) => ({ ...f, orden: e.target.value }))}
            />
          </label>
          {error && <p className={styles.formError}>{error}</p>}
          <div className={styles.formActions}>
            {mode === 'edit' && (
              <button
                type="button"
                className={`${styles.btnSecondary} ${styles.btnDanger}`}
                onClick={() => setConfirmDelete(true)}
                disabled={removeMut.isPending}
              >
                Eliminar
              </button>
            )}
            <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary} disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
      {confirmDelete && (
        <ConfirmModal
          message={`¿Eliminar la categoría "${category.nombre}"? Solo es posible si no tiene ejercicios.`}
          onConfirm={() => removeMut.mutate()}
          onCancel={() => setConfirmDelete(false)}
          isPending={removeMut.isPending}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Catalogo() {
  const [selectedCat, setSelectedCat] = useState(null);
  const [exModal, setExModal] = useState(null);
  const [catModal, setCatModal] = useState(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises', selectedCat],
    queryFn: () => exercisesApi.list(selectedCat),
  });

  function openCreateExercise() {
    setExModal({ mode: 'create' });
  }

  function openViewExercise(ex) {
    setExModal({ mode: 'edit', exercise: ex });
  }

  return (
    <AppLayout>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Catálogo de ejercicios</h1>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={() => setCatModal({ mode: 'create' })}>
            + Categoría
          </button>
          <button className={styles.btnPrimary} onClick={openCreateExercise}>
            + Ejercicio
          </button>
        </div>
      </div>

      {/* Category chips */}
      <div className={styles.catBar}>
        <button
          className={`${styles.catChip} ${selectedCat === null ? styles.catChipActive : ''}`}
          onClick={() => setSelectedCat(null)}
        >
          Todas
        </button>
        {categories.map((c) => (
          <div key={c.id} className={styles.catChipWrap}>
            <button
              className={`${styles.catChip} ${selectedCat === c.id ? styles.catChipActive : ''}`}
              onClick={() => setSelectedCat(c.id)}
            >
              {c.nombre}
            </button>
            <button
              className={styles.catEditBtn}
              onClick={() => setCatModal({ mode: 'edit', category: c })}
              title="Editar categoría"
            >
              ✎
            </button>
          </div>
        ))}
      </div>

      {/* Exercises grid */}
      {isLoading && <p className={styles.msg}>Cargando ejercicios...</p>}
      {!isLoading && exercises.length === 0 && (
        <p className={styles.msg}>
          No hay ejercicios{selectedCat ? ' en esta categoría' : ''}. Creá el primero con "+ Ejercicio".
        </p>
      )}

      <div className={styles.grid}>
        {exercises.map((ex) => (
          <button key={ex.id} className={styles.exCard} onClick={() => openViewExercise(ex)}>
            <div className={styles.exCardTop}>
              <span className={styles.catTag}>{ex.category_nombre}</span>
              {hasVideo(ex) && (
                <span className={styles.videoTag} title="Tiene video">▶</span>
              )}
            </div>
            <p className={styles.exName}>{ex.nombre}</p>
            {ex.descripcion && <p className={styles.exDesc}>{ex.descripcion}</p>}
          </button>
        ))}
      </div>

      {exModal && (
        <ExerciseModal
          mode={exModal.mode}
          exercise={exModal.exercise}
          categories={categories}
          onClose={() => setExModal(null)}
          onSaved={(saved) => {
            setExModal({ mode: 'edit', exercise: saved });
          }}
        />
      )}

      {catModal && (
        <CategoryModal
          mode={catModal.mode}
          category={catModal.category}
          onClose={() => setCatModal(null)}
        />
      )}
    </AppLayout>
  );
}
