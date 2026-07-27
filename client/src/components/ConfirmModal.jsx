import styles from './ConfirmModal.module.css';

export default function ConfirmModal({ message, onConfirm, onCancel, isPending }) {
  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.card}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={onCancel} disabled={isPending}>
            Cancelar
          </button>
          <button className={styles.btnConfirm} onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
