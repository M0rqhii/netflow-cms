"use client";

/**
 * Properties Panel - Right Sidebar
 * 
 * Wyświetla i pozwala edytować właściwości wybranego bloku.
 * Używa store do pobierania/aktualizacji danych.
 */

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
import type { BlockDefinition, PropFieldSchema, BlockProps } from '@/lib/page-builder/types';

// =============================================================================
// TYPES
// =============================================================================

type TabId = 'content' | 'style' | 'advanced';

interface PropertiesPanelProps {
  /** Override selected block ID (optional) */
  selectedBlockId?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PropertiesPanel({ selectedBlockId: overrideSelectedId }: PropertiesPanelProps) {
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
  
  // Get block definition
  const definition = useMemo(() => {
    if (!node) return null;
    return blockRegistry.getBlock(node.type);
  }, [node]);
  
  // Handle property change
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
      // Update base styles
      updateBlockProps(selectedId, {
        style: {
          ...currentProps?.style,
          base: {
            ...currentProps?.style?.base,
            [key]: value,
          },
        },
      });
    } else {
      // Update responsive overrides
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
    }
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
  
  // Handle delete
  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    
    const confirmed = window.confirm('Czy na pewno chcesz usunąć ten blok?');
    if (confirmed) {
      deleteBlock(selectedId);
      commit('apply');
    }
  }, [selectedId, deleteBlock, commit]);
  
  // Handle copy
  const handleCopy = useCallback(() => {
    if (!selectedId) return;
    copyBlock(selectedId);
  }, [selectedId, copyBlock]);
  
  // Handle lock toggle
  const handleToggleLock = useCallback(() => {
    if (!selectedId || !node) return;
    
    updateBlockMeta(selectedId, {
      locked: !node.meta?.locked,
    });
  }, [selectedId, node, updateBlockMeta]);
  
  // Handle close
  const handleClose = useCallback(() => {
    selectBlock(null);
  }, [selectBlock]);
  
  // Render empty state
  if (!selectedId || !node) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Właściwości</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-gray-500">
            <FiSettings className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Wybierz blok</p>
            <p className="text-xs mt-1 opacity-70">
              Kliknij na blok na canvas, aby edytować jego właściwości
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  const isLocked = node.meta?.locked;
  
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {definition?.icon && (
              <span className="text-gray-500">{definition.icon}</span>
            )}
            <h2 className="text-sm font-semibold text-gray-900">
              {node.meta?.label || definition?.title || node.type}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded"
            title="Zamknij"
          >
            <FiX className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
            title="Kopiuj"
          >
            <FiCopy className="w-3 h-3" />
            <span>Kopiuj</span>
          </button>
          <button
            onClick={handleToggleLock}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
              isLocked ? 'text-amber-600 bg-amber-50' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title={isLocked ? 'Odblokuj' : 'Zablokuj'}
          >
            {isLocked ? <FiLock className="w-3 h-3" /> : <FiUnlock className="w-3 h-3" />}
            <span>{isLocked ? 'Zablokowany' : 'Zablokuj'}</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={isLocked}
            className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Usuń"
          >
            <FiTrash2 className="w-3 h-3" />
            <span>Usuń</span>
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['content', 'style', 'advanced'] as TabId[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'content' && <><FiType className="inline mr-1" />Treść</>}
            {tab === 'style' && <><FiLayout className="inline mr-1" />Styl</>}
            {tab === 'advanced' && <><FiSettings className="inline mr-1" />Zaawansowane</>}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'content' && (
          <ContentTab
            node={node}
            definition={definition || null}
            onChange={handleContentChange}
            onBlur={() => commit('blur')}
          />
        )}
        {activeTab === 'style' && (
          <StyleTab
            node={node}
            definition={definition || null}
            breakpoint={breakpoint}
            onChange={handleStyleChange}
            onBlur={() => commit('blur')}
          />
        )}
        {activeTab === 'advanced' && (
          <AdvancedTab
            node={node}
            definition={definition || null}
            onChange={handleAdvancedChange}
            onBlur={() => commit('blur')}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// TAB COMPONENTS
// =============================================================================

interface TabProps {
  node: any;
  definition: BlockDefinition | null;
  onChange: (key: string, value: unknown) => void;
  onBlur: () => void;
  breakpoint?: string;
}

function ContentTab({ node, definition, onChange, onBlur }: TabProps) {
  const schema = definition?.propsSchema?.content;
  
  if (!schema || Object.keys(schema).length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        Ten blok nie ma edytowalnych treści
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {Object.entries(schema).map(([key, fieldDef]) => {
        const field = fieldDef as PropFieldSchema;
        return (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {field.label || key}
            </label>
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

function StyleTab({ node, definition, breakpoint = 'desktop', onChange, onBlur }: TabProps) {
  const schema = definition?.propsSchema?.style;
  
  // Get current values (base + responsive merged)
  const getStyleValue = (key: string) => {
    const base = node.props.style?.base?.[key];
    if (breakpoint === 'desktop') {
      return base;
    }
    const responsiveBreakpoint = breakpoint as 'tablet' | 'mobile';
    const responsive = node.props.style?.responsive?.[responsiveBreakpoint]?.[key];
    return responsive !== undefined ? responsive : base;
  };
  
  if (!schema || Object.keys(schema).length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        Ten blok nie ma edytowalnych stylów
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Breakpoint indicator */}
      {breakpoint !== 'desktop' && (
        <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          Edytujesz styl dla: <strong>{breakpoint}</strong>
        </div>
      )}
      
      {Object.entries(schema).map(([key, fieldDef]) => {
        const field = fieldDef as PropFieldSchema;
        return (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {field.label || key}
            </label>
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
  const schema = definition?.propsSchema?.advanced;
  
  return (
    <div className="space-y-4">
      {/* Label */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Własna etykieta
        </label>
        <input
          type="text"
          value={node.meta?.label || ''}
          onChange={(e) => {
            const meta = { ...node.meta, label: e.target.value || undefined };
            usePageBuilderStore.getState().updateBlockMeta(node.id, meta);
          }}
          onBlur={onBlur}
          placeholder={definition?.title || node.type}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md"
        />
      </div>
      
      {/* CSS Class */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Dodatkowe klasy CSS
        </label>
        <input
          type="text"
          value={node.props.advanced?.className || ''}
          onChange={(e) => onChange('className', e.target.value)}
          onBlur={onBlur}
          placeholder="np. my-custom-class"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md"
        />
      </div>
      
      {/* Custom schema fields */}
      {schema && Object.entries(schema).map(([key, fieldDef]) => {
        if (key === 'className') return null; // Already rendered above
        const field = fieldDef as PropFieldSchema;
        return (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {field.label || key}
            </label>
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
      
      {/* Block ID (read-only) */}
      <div className="pt-4 border-t border-gray-100">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          ID bloku
        </label>
        <code className="block text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 break-all">
          {node.id}
        </code>
      </div>
    </div>
  );
}

export default PropertiesPanel;
