/**
 * Toolbar Component
 * 
 * Górny pasek narzędzi z:
 * - Responsive device switcher
 * - Undo/redo
 * - Preview toggle
 * - Save button
 */

import React, { memo } from 'react';
import {
  FiMonitor,
  FiTablet,
  FiSmartphone,
  FiRotateCcw,
  FiRotateCw,
  FiEye,
  FiEdit3,
  FiGrid,
  FiSave,
  FiCheck,
  FiLoader,
  FiAlertCircle,
} from 'react-icons/fi';
import {
  usePageBuilderStore,
  useCurrentBreakpoint,
  useEditorMode,
  useHistoryInfo,
  useSaveStatus,
  useIsDirty,
} from '@/stores/page-builder-store';
import type { Breakpoint } from '@/lib/page-builder/types';
import styles from './Toolbar.module.css';

// =============================================================================
// DEVICE SWITCHER
// =============================================================================

const DeviceSwitcher: React.FC = memo(() => {
  const currentBreakpoint = useCurrentBreakpoint();
  const setBreakpoint = usePageBuilderStore((state) => state.setBreakpoint);
  
  const devices: { breakpoint: Breakpoint; icon: React.ReactNode; label: string }[] = [
    { breakpoint: 'desktop', icon: <FiMonitor />, label: 'Desktop' },
    { breakpoint: 'tablet', icon: <FiTablet />, label: 'Tablet' },
    { breakpoint: 'mobile', icon: <FiSmartphone />, label: 'Mobile' },
  ];
  
  return (
    <div className={styles.deviceSwitcher}>
      {devices.map(({ breakpoint, icon, label }) => (
        <button
          key={breakpoint}
          className={`${styles.deviceBtn} ${currentBreakpoint === breakpoint ? styles.active : ''}`}
          onClick={() => setBreakpoint(breakpoint)}
          title={label}
          type="button"
        >
          {icon}
        </button>
      ))}
    </div>
  );
});

DeviceSwitcher.displayName = 'DeviceSwitcher';

// =============================================================================
// HISTORY CONTROLS
// =============================================================================

const HistoryControls: React.FC = memo(() => {
  const { canUndo, canRedo } = useHistoryInfo();
  const undo = usePageBuilderStore((state) => state.undo);
  const redo = usePageBuilderStore((state) => state.redo);
  
  return (
    <div className={styles.historyControls}>
      <button
        className={styles.toolBtn}
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        type="button"
      >
        <FiRotateCcw />
      </button>
      <button
        className={styles.toolBtn}
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        type="button"
      >
        <FiRotateCw />
      </button>
    </div>
  );
});

HistoryControls.displayName = 'HistoryControls';

// =============================================================================
// MODE TOGGLE
// =============================================================================

const ModeToggle: React.FC = memo(() => {
  const mode = useEditorMode();
  const setMode = usePageBuilderStore((state) => state.setMode);
  
  return (
    <div className={styles.modeToggle}>
      <button
        className={`${styles.modeBtn} ${mode === 'edit' ? styles.active : ''}`}
        onClick={() => setMode('edit')}
        title="Edit mode"
        type="button"
      >
        <FiEdit3 />
        <span>Edit</span>
      </button>
      <button
        className={`${styles.modeBtn} ${mode === 'preview' ? styles.active : ''}`}
        onClick={() => setMode('preview')}
        title="Preview mode"
        type="button"
      >
        <FiEye />
        <span>Preview</span>
      </button>
      <button
        className={`${styles.modeBtn} ${mode === 'structure' ? styles.active : ''}`}
        onClick={() => setMode('structure')}
        title="Structure mode"
        type="button"
      >
        <FiGrid />
        <span>Structure</span>
      </button>
    </div>
  );
});

ModeToggle.displayName = 'ModeToggle';

// =============================================================================
// SAVE BUTTON
// =============================================================================

type SaveButtonProps = {
  onSave?: () => void;
};

const SaveButton: React.FC<SaveButtonProps> = memo(({ onSave }) => {
  const { status, lastSaved } = useSaveStatus();
  const isDirty = useIsDirty();
  
  const handleSave = () => {
    onSave?.();
  };
  
  const getStatusIcon = () => {
    switch (status) {
      case 'saving':
        return <FiLoader className={styles.spinning} />;
      case 'saved':
        return isDirty ? <FiSave /> : <FiCheck />;
      case 'error':
        return <FiAlertCircle />;
      default:
        return <FiSave />;
    }
  };
  
  const getStatusText = () => {
    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        if (isDirty) return 'Save';
        if (lastSaved) {
          return `Saved ${formatTime(lastSaved)}`;
        }
        return 'Saved';
      case 'error':
        return 'Error - Retry';
      default:
        return 'Save';
    }
  };
  
  return (
    <button
      className={`${styles.saveBtn} ${status === 'error' ? styles.error : ''} ${!isDirty && status === 'saved' ? styles.saved : ''}`}
      onClick={handleSave}
      disabled={status === 'saving'}
      title={isDirty ? 'Save changes (Ctrl+S)' : 'All changes saved'}
      type="button"
    >
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </button>
  );
});

SaveButton.displayName = 'SaveButton';

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// =============================================================================
// TOOLBAR
// =============================================================================

type ToolbarProps = {
  onSave?: () => void;
  title?: string;
};

export const Toolbar: React.FC<ToolbarProps> = ({ onSave, title = 'Page Builder' }) => {
  return (
    <div className={styles.toolbar}>
      {/* Left section */}
      <div className={styles.section}>
        <h1 className={styles.title}>{title}</h1>
      </div>
      
      {/* Center section */}
      <div className={styles.section}>
        <DeviceSwitcher />
        <div className={styles.divider} />
        <HistoryControls />
        <div className={styles.divider} />
        <ModeToggle />
      </div>
      
      {/* Right section */}
      <div className={styles.section}>
        <SaveButton onSave={onSave} />
      </div>
    </div>
  );
};

export default Toolbar;
