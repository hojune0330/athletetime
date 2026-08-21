import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import {
  parseStoredContentStudioDraft,
  type ContentStudioDraft,
} from './contentStudioWorkflow';

const STORAGE_KEY = 'athletetime.contentStudio.draft.v1';

function readDraft(): ContentStudioDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseStoredContentStudioDraft(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function useContentStudioDraft() {
  const [draft, setStoredDraft] = useState<ContentStudioDraft | null>(readDraft);
  const [restored, setRestored] = useState(() => draft !== null);

  useEffect(() => {
    try {
      if (draft) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      return;
    }
  }, [draft]);

  const setDraft = useCallback((next: SetStateAction<ContentStudioDraft | null>) => {
    setRestored(false);
    setStoredDraft(next);
  }, []);
  const clearDraft = useCallback(() => setDraft(null), [setDraft]);
  return { draft, setDraft, clearDraft, restored };
}
