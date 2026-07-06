// ─── useHabitActions: action menu, status change, delete state ────
import { useState, useCallback } from 'react';
import { useAppStore, useShallowStore } from '../../../store/useAppStore';
import type { Habit, HabitStatus } from '@egoless-do/core';

export function useHabitActions() {
  const { updateHabit, deleteHabit } = useShallowStore(s => ({
    updateHabit: s.updateHabit,
    deleteHabit: s.deleteHabit,
  }));

  const [actionMenuHabit, setActionMenuHabit] = useState<Habit | null>(null);
  const [statusModal, setStatusModal] = useState<{ id: string; ns: HabitStatus } | null>(null);
  const [reason, setReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const changeStatus = useCallback((id: string, ns: HabitStatus) => {
    if (ns === 'paused' || ns === 'abandoned') {
      setStatusModal({ id, ns });
      setReason('');
      return;
    }
    updateHabit(id, { status: ns });
  }, [updateHabit]);

  const confirmStatus = useCallback(() => {
    if (!statusModal) return;
    const patch: Partial<Habit> = { status: statusModal.ns };
    if (statusModal.ns === 'paused') patch.pauseReason = reason;
    if (statusModal.ns === 'abandoned') patch.abandonReason = reason;
    updateHabit(statusModal.id, patch);
    setStatusModal(null);
  }, [statusModal, reason, updateHabit]);

  const closeStatusModal = useCallback(() => setStatusModal(null), []);
  const closeActionMenu = useCallback(() => setActionMenuHabit(null), []);
  const closeDeleteConfirm = useCallback(() => setConfirmDelete(null), []);

  const executeDelete = useCallback(() => {
    if (confirmDelete) deleteHabit(confirmDelete);
    setConfirmDelete(null);
  }, [confirmDelete, deleteHabit]);

  return {
    actionMenuHabit,
    setActionMenuHabit,
    statusModal,
    reason,
    setReason,
    confirmDelete,
    setConfirmDelete,
    changeStatus,
    confirmStatus,
    closeStatusModal,
    closeActionMenu,
    closeDeleteConfirm,
    executeDelete,
  };
}
