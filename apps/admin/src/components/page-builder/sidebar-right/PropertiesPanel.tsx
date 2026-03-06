"use client";

import React, { useMemo, useState, useCallback } from 'react';
import {
  usePageBuilderStore,
  useBlockNode,
  useSelectedBlockId,
  useCurrentBreakpoint,
} from '@/stores/page-builder-store';
import { blockRegistry } from '@/lib/page-builder/block-registry';
import { FieldRenderer } from '../sidebar/editors/FieldRenderer';
import { FiX, FiSettings, FiType, FiLayout, FiTrash2, FiCopy, FiLock, FiUnlock } from 'react-icons/fi';
import type { BlockDefinition, PropFieldSchema, BlockNode, Breakpoint } from '@/lib/page-builder/types';
import { useTranslations } from '@/hooks/useTranslations';

type TabId = 'content' | 'style' | 'advanced';

interface PropertiesPanelProps {
  selectedBlockId?: string;
}

export function PropertiesPanel({ selectedBlockId: overrideSelectedId }: PropertiesPanelProps) {
  const t = useTranslations();
  const storeSelectedId = useSelectedBlockId();
  const selectedId = overrideSelectedId ?? storeSelectedId;

  const node = useBlockNode(selectedId || '');
  const breakpoint = useCurrentBreakpoint();
  const updateBlockProps = usePageBuilderStore((s) => s.updateBlockProps);
  const updateBlockMeta = usePageBuilderStore((s) => s.updateBlockMeta);
  const deleteBlock = usePageBuilderStore((s) => s.deleteBlock);
  const copyBlock = usePageBuilderStore((s) => s.copyBlock);
  const commit = usePageBuilderStore((s) => s.commit);
  const selectBlock = usePageBuilderStore((s) => s.selectBlock);

  const [activeTab, setActiveTab] = useState<TabId>('content');

  const definition = useMemo(() => {
    if (!node) return null;
    return blockRegistry.getBlock(node.type);
  }, [node]);

  const handleContentChange = useCallback((key: string, value: unknown) => {
    if (!selectedId) return;
    updateBlockProps(selectedId, {
      content: {
        ...usePageBuilderStore.getState().content.nodes[selectedId]?.props.content,
        [key]: value,
      },
    });
  }, [selectedId, updateBlockProps]);

  const handleStyleChange = useCallback((key: string, value: unknown) => {
    if (!selectedId) return;

    const currentProps = usePageBuilderStore.getState().content.nodes[selectedId]?.props;
    if (breakpoint === 'desktop') {
      updateBlockProps(selectedId, {
        style: {
          ...currentProps?.style,
          base: {
            ...currentProps?.style?.base,
            [key]: value,
          },
        },
      });
      return;
    }

    updateBlockProps(selectedId, {
      style: {
        ...currentProps?.style,
        responsive: {
          ...currentProps?.style?.responsive,
          [breakpoint]: {
            ...currentProps?.style?.responsive?.[breakpoint],
            [key]: value,
          },
        },
      },
    });
  }, [selectedId, breakpoint, updateBlockProps]);

  const handleAdvancedChange = useCallback((key: string, value: unknown) => {
    if (!selectedId) return;
    updateBlockProps(selectedId, {
      advanced: {
        ...usePageBuilderStore.getState().content.nodes[selectedId]?.props.advanced,
        [key]: value,
      },
    });
  }, [selectedId, updateBlockProps]);

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    const confirmed = window.confirm(t('sitePanelShell.pageBuilderUi.propertiesPanel.confirmDelete'));
    if (!confirmed) return;
    deleteBlock(selectedId);
    commit('apply');
  }, [selectedId, deleteBlock, commit, t]);

  const handleCopy = useCallback(() => {
    if (!selectedId) return;
    copyBlock(selectedId);
  }, [selectedId, copyBlock]);

  const handleToggleLock = useCallback(() => {
    if (!selectedId || !node) return;
    updateBlockMeta(selectedId, { locked: !node.meta?.locked });
  }, [selectedId, node, updateBlockMeta]);

  const handleClose = useCallback(() => {
    selectBlock(null);
  }, [selectBlock]);

  if (!selectedId || !node) {
    return (
      <div className="card builder-props-empty">
        <FiSettings className="builder-props-empty-icon" />
        <div className="builder-props-empty-title">{t('sitePanelShell.pageBuilderUi.propertiesPanel.noBlockTitle')}</div>
        <div className="builder-props-empty-sub">{t('sitePanelShell.pageBuilderUi.propertiesPanel.noBlockDescription')}</div>
      </div>
    );
  }

  const isLocked = node.meta?.locked;

  return (
    <div className="builder-props-body">
      <div className="card builder-props-selected">
        <div className="row-between">
          <div>
            <div className="builder-props-title">{node.meta?.label || definition?.title || node.type}</div>
            <div className="detail-label" style={{ marginTop: 4 }}>{definition?.title || node.type}</div>
          </div>
          <button className="btn" type="button" onClick={handleClose} aria-label={t('sitePanelShell.pageBuilderUi.propertiesPanel.closeSelection')}>
            <FiX />
          </button>
        </div>
      </div>

      <div className="builder-props-actions">
        <button className="btn" onClick={handleCopy}><FiCopy className="inline mr-1" />{t('sitePanelShell.pageBuilderUi.propertiesPanel.copy')}</button>
        <button className="btn" onClick={handleToggleLock}>
          {isLocked ? <FiLock className="inline mr-1" /> : <FiUnlock className="inline mr-1" />}
          {isLocked ? t('sitePanelShell.pageBuilderUi.propertiesPanel.locked') : t('sitePanelShell.pageBuilderUi.propertiesPanel.lock')}
        </button>
        <button className="btn" onClick={handleDelete} disabled={isLocked}><FiTrash2 className="inline mr-1" />{t('sitePanelShell.pageBuilderUi.propertiesPanel.delete')}</button>
      </div>

      <div className="builder-props-tabs">
        {(['content', 'style', 'advanced'] as TabId[]).map((tab) => (
          <button
            key={tab}
            className="btn"
            style={activeTab === tab ? { background: 'rgba(0,163,255,.14)', borderColor: 'rgba(0,163,255,.30)' } : undefined}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'content' && <><FiType className="inline mr-1" />{t('sitePanelShell.pageBuilderUi.propertiesPanel.tabs.content')}</>}
            {tab === 'style' && <><FiLayout className="inline mr-1" />{t('sitePanelShell.pageBuilderUi.propertiesPanel.tabs.style')}</>}
            {tab === 'advanced' && <><FiSettings className="inline mr-1" />{t('sitePanelShell.pageBuilderUi.propertiesPanel.tabs.advanced')}</>}
          </button>
        ))}
      </div>

      {activeTab === 'content' && (
        <ContentTab node={node} definition={definition || null} onChange={handleContentChange} onBlur={() => commit('blur')} />
      )}
      {activeTab === 'style' && (
        <StyleTab node={node} definition={definition || null} breakpoint={breakpoint} onChange={handleStyleChange} onBlur={() => commit('blur')} />
      )}
      {activeTab === 'advanced' && (
        <AdvancedTab node={node} definition={definition || null} onChange={handleAdvancedChange} onBlur={() => commit('blur')} />
      )}
    </div>
  );
}

interface TabProps {
  node: BlockNode;
  definition: BlockDefinition | null;
  onChange: (key: string, value: unknown) => void;
  onBlur: () => void;
  breakpoint?: Breakpoint;
}

function ContentTab({ node, definition, onChange, onBlur: _onBlur }: TabProps) {
  const t = useTranslations();
  const schema = definition?.propsSchema?.content;

  if (!schema || Object.keys(schema).length === 0) {
    return <div className="card builder-props-empty-inline">{t('sitePanelShell.pageBuilderUi.propertiesPanel.emptyContent')}</div>;
  }

  return (
    <div className="builder-props-fields">
      {Object.entries(schema).map(([key, fieldDef]) => {
        const field = fieldDef as PropFieldSchema;
        return (
          <div key={key}>
            <label className="block text-xs font-medium text-text mb-1">{field.label || key}</label>
            <FieldRenderer
              type={field.type}
              value={node.props.content[key]}
              onChange={(value) => onChange(key, value)}
              options={field.options}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
            />
          </div>
        );
      })}
    </div>
  );
}

function StyleTab({ node, definition, breakpoint = 'desktop', onChange, onBlur: _onBlur }: TabProps) {
  const t = useTranslations();
  const schema = definition?.propsSchema?.style;

  const getStyleValue = (key: string) => {
    const base = node.props.style?.base?.[key];
    if (breakpoint === 'desktop') return base;
    const responsiveBreakpoint = breakpoint as 'tablet' | 'mobile';
    const responsive = node.props.style?.responsive?.[responsiveBreakpoint]?.[key];
    return responsive !== undefined ? responsive : base;
  };

  if (!schema || Object.keys(schema).length === 0) {
    return <div className="card builder-props-empty-inline">{t('sitePanelShell.pageBuilderUi.propertiesPanel.emptyStyles')}</div>;
  }

  return (
    <div className="builder-props-fields">
      {breakpoint !== 'desktop' && (
        <div className="card" style={{ padding: 10, borderRadius: 14, background: 'rgba(0,163,255,0.08)', border: '1px solid rgba(0,163,255,0.25)' }}>
          {t('sitePanelShell.pageBuilderUi.propertiesPanel.editingStylesFor')}: <strong>{breakpoint}</strong>
        </div>
      )}

      {Object.entries(schema).map(([key, fieldDef]) => {
        const field = fieldDef as PropFieldSchema;
        return (
          <div key={key}>
            <label className="block text-xs font-medium text-text mb-1">{field.label || key}</label>
            <FieldRenderer
              type={field.type}
              value={getStyleValue(key)}
              onChange={(value) => onChange(key, value)}
              options={field.options}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
            />
          </div>
        );
      })}
    </div>
  );
}

function AdvancedTab({ node, definition, onChange, onBlur }: TabProps) {
  const t = useTranslations();
  const schema = definition?.propsSchema?.advanced;

  return (
    <div className="builder-props-fields">
      <div>
        <label className="block text-xs font-medium text-text mb-1">{t('sitePanelShell.pageBuilderUi.propertiesPanel.customLabel')}</label>
        <input
          type="text"
          value={node.meta?.label || ''}
          onChange={(e) => {
            const meta = { ...node.meta, label: e.target.value || undefined };
            usePageBuilderStore.getState().updateBlockMeta(node.id, meta);
          }}
          onBlur={onBlur}
          placeholder={definition?.title || node.type}
          className="input"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-text mb-1">{t('sitePanelShell.pageBuilderUi.propertiesPanel.additionalCssClasses')}</label>
        <input
          type="text"
          value={typeof node.props.advanced?.className === 'string' ? node.props.advanced?.className : ''}
          onChange={(e) => onChange('className', e.target.value)}
          onBlur={onBlur}
          placeholder={t('sitePanelShell.pageBuilderUi.propertiesPanel.cssClassPlaceholder')}
          className="input"
        />
      </div>

      {schema && Object.entries(schema).map(([key, fieldDef]) => {
        if (key === 'className') return null;
        const field = fieldDef as PropFieldSchema;
        return (
          <div key={key}>
            <label className="block text-xs font-medium text-text mb-1">{field.label || key}</label>
            <FieldRenderer
              type={field.type}
              value={node.props.advanced?.[key]}
              onChange={(value) => onChange(key, value)}
              options={field.options}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
            />
          </div>
        );
      })}

      <div className="divider" style={{ margin: '10px 0' }} />
      <div>
        <label className="block text-xs font-medium text-muted mb-1">{t('sitePanelShell.pageBuilderUi.propertiesPanel.blockId')}</label>
        <code className="block text-xs bg-surface-2 px-2 py-1 rounded text-muted break-all">{node.id}</code>
      </div>
    </div>
  );
}

export default PropertiesPanel;
