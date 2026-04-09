import { useOfflineSync } from '../hooks/useOfflineSync';

export function OfflineBadge() {
  const { isOnline } = useOfflineSync();

  if (isOnline) return null;

  return (
    <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-900/60 border-b border-amber-800">
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      <span className="text-amber-300 text-xs font-medium">Modalità offline – i dati sono salvati localmente</span>
    </div>
  );
}
