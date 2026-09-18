import { useEffect, useState } from 'react';
import { packsApi, type ApiPack } from '@/shared/api';

/**
 * Looks up the pack currently bound to a class, by id.
 *
 * Shared between the Class Content screen and the teacher dashboard — both
 * need the same "resolve `packId` to its pack" effect, and duplicating it
 * verbatim would just be two copies to keep in sync.
 *
 * The no-`packId` case is derived at return time rather than stored in state:
 * setting it inside the effect would fire synchronously on every render with
 * no `packId`, which is exactly the cascading-render pattern
 * react-hooks/set-state-in-effect exists to catch. Don't push it back into
 * the effect.
 */
export function useAssignedPack(packId: string | null | undefined): ApiPack | null {
  const [assignedPack, setAssignedPack] = useState<ApiPack | null>(null);

  useEffect(() => {
    if (!packId) return;
    let cancelled = false;
    packsApi.get(packId).then((pack) => {
      if (!cancelled) setAssignedPack(pack);
    }).catch(() => {
      if (!cancelled) setAssignedPack(null);
    });
    return () => { cancelled = true; };
  }, [packId]);

  return packId ? assignedPack : null;
}
