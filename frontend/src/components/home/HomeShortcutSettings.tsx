import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';

export type HomeShortcut = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly to: string;
};

type HomeShortcutSettingsProps = {
  readonly selectedIds: readonly string[];
  readonly shortcuts: readonly HomeShortcut[];
  readonly onToggle: (shortcutId: string) => void;
};

export function HomeShortcutSettings({
  selectedIds,
  shortcuts,
  onToggle,
}: HomeShortcutSettingsProps) {
  const pinnedShortcuts = shortcuts.filter((shortcut) => selectedIds.includes(shortcut.id));

  return (
    <details className="border border-line bg-surface">
      <summary className="cursor-pointer list-none px-5 py-4 font-medium text-ink marker:hidden">
        내 바로가기 설정
        <span className="ml-2 text-body-sm font-normal text-ink-3">이 기기에만 저장돼요</span>
      </summary>
      <div className="border-t border-hair px-5 py-5">
        {pinnedShortcuts.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {pinnedShortcuts.map((shortcut) => (
              <Link
                key={shortcut.id}
                to={shortcut.to}
                className="border border-line px-4 py-3 text-body-sm transition-colors hover:border-line-2 hover:bg-surface-2"
              >
                <span className="block font-medium text-ink">{shortcut.label}</span>
                <span className="mt-1 block text-ink-3">{shortcut.description}</span>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {shortcuts.map((shortcut) => {
            const selected = selectedIds.includes(shortcut.id);
            return (
              <Button
                key={shortcut.id}
                type="button"
                variant={selected ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToggle(shortcut.id)}
              >
                {selected ? <XMarkIcon className="h-3.5 w-3.5" /> : <PlusIcon className="h-3.5 w-3.5" />}
                {shortcut.label}
              </Button>
            );
          })}
        </div>
      </div>
    </details>
  );
}
