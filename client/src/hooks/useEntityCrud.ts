import { useState, useCallback } from "react";

/**
 * Manages the open/close + edit/create state for CRUD dialogs.
 * Reduces the ~10 lines of repetitive state per page to a single hook call.
 */
export function useEntityDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((id: number) => {
    setEditingId(id);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setEditingId(null);
  }, []);

  return { isOpen, editingId, openCreate, openEdit, close };
}
