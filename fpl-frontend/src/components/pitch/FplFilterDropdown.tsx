import clsx from 'clsx';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { IconChevronDown } from '@/components/common/FplButtons';

interface FplFilterDropdownProps {
  /** Accessible name for the trigger */
  label: string;
  /** Visible trigger text */
  triggerLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  menuClassName?: string;
  /** Max height for scrollable menu body (px) */
  maxHeight?: number;
  /** Wider menus (scope panel) */
  align?: 'start' | 'stretch';
}

interface MenuCoords {
  left: number;
  width: number;
  maxHeight: number;
  /** Distance from viewport bottom when opening upward */
  bottom?: number;
  /** Distance from viewport top when opening downward */
  top?: number;
}

function computeMenuCoords(
  trigger: DOMRect,
  align: 'start' | 'stretch',
  preferredMaxHeight: number,
): MenuCoords {
  const gap = 6;
  const viewportPad = 8;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  const stretchMin = Math.min(viewportW - viewportPad * 2, 28 * 16);
  const width =
    align === 'stretch'
      ? Math.min(Math.max(trigger.width, stretchMin), viewportW - viewportPad * 2)
      : Math.min(Math.max(trigger.width, 10 * 16), viewportW - viewportPad * 2);

  let left = trigger.left;
  if (align === 'stretch') {
    left = Math.min(trigger.left, viewportW - width - viewportPad);
  }
  left = Math.max(viewportPad, Math.min(left, viewportW - width - viewportPad));

  const spaceAbove = trigger.top - gap - viewportPad;
  const spaceBelow = viewportH - trigger.bottom - gap - viewportPad;
  const openUp = spaceAbove >= Math.min(preferredMaxHeight, 160) || spaceAbove >= spaceBelow;
  const available = openUp ? spaceAbove : spaceBelow;
  const menuMaxHeight = Math.max(120, Math.min(preferredMaxHeight, available));

  if (openUp) {
    return {
      left,
      width,
      maxHeight: menuMaxHeight,
      bottom: viewportH - trigger.top + gap,
    };
  }

  return {
    left,
    width,
    maxHeight: menuMaxHeight,
    top: trigger.bottom + gap,
  };
}

export function FplFilterDropdown({
  label,
  triggerLabel,
  open,
  onOpenChange,
  children,
  className,
  menuClassName,
  maxHeight = 280,
  align = 'start',
}: FplFilterDropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [coords, setCoords] = useState<MenuCoords | null>(null);

  const updateCoords = useCallback(() => {
    const triggerEl = rootRef.current?.querySelector('button');
    if (!triggerEl) {
      return;
    }
    setCoords(computeMenuCoords(triggerEl.getBoundingClientRect(), align, maxHeight));
  }, [align, maxHeight]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updateCoords();
  }, [open, updateCoords, triggerLabel]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    const onReposition = () => updateCoords();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, onOpenChange, updateCoords]);

  const menuStyle: CSSProperties | undefined = coords
    ? {
        left: coords.left,
        width: coords.width,
        ...(coords.bottom !== undefined ? { bottom: coords.bottom } : { top: coords.top }),
      }
    : undefined;

  return (
    <div ref={rootRef} className={clsx('relative min-w-0', className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => onOpenChange(!open)}
        className={clsx(
          'inline-flex h-10 w-full min-w-[7.5rem] max-w-full items-center justify-between gap-1.5 rounded-lg border bg-transparent px-3 text-left text-base font-bold text-white transition',
          open
            ? 'border-fpl-cyan focus:outline-none focus:ring-1 focus:ring-fpl-cyan'
            : 'border-white/40 hover:border-white/60 focus:outline-none focus:ring-1 focus:ring-fpl-cyan',
        )}
      >
        <span className="min-w-0 truncate">{triggerLabel}</span>
        <IconChevronDown
          className={clsx(
            'h-4 w-4 shrink-0 text-white/70 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && coords
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="dialog"
              aria-label={label}
              style={menuStyle}
              className={clsx(
                'fixed z-[80] overflow-hidden rounded-xl border border-white/15 bg-[#37003c] shadow-lg shadow-black/40',
                menuClassName,
              )}
            >
              <div
                data-lenis-prevent
                className="fpl-filter-menu-scroll overflow-y-auto overscroll-contain"
                style={{ maxHeight: coords.maxHeight }}
              >
                {children}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

interface FplFilterMenuItemProps {
  selected?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  children: ReactNode;
}

export function FplFilterMenuItem({
  selected,
  disabled,
  onSelect,
  children,
}: FplFilterMenuItemProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onSelect();
        }
      }}
      className={clsx(
        'block w-full px-3.5 py-2.5 text-left text-sm text-white transition',
        disabled && 'cursor-not-allowed opacity-40',
        !disabled && selected && 'bg-[#5b2b8a]',
        !disabled && !selected && 'hover:bg-[#4a0a5c]',
      )}
    >
      {children}
    </button>
  );
}
