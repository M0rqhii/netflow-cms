import React from 'react';

export interface Version {
  id: string;
  version: number;
  data: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiffViewerProps {
  oldVersion: Version;
  newVersion: Version;
  className?: string;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  key: string;
  oldValue: unknown;
  newValue: unknown;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  oldVersion,
  newVersion,
  className,
}) => {
  const computeDiff = (oldData: Record<string, unknown>, newData: Record<string, unknown>): DiffLine[] => {
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    const diff: DiffLine[] = [];

    allKeys.forEach((key) => {
      const oldVal = oldData[key];
      const newVal = newData[key];
      const oldStr = JSON.stringify(oldVal, null, 2);
      const newStr = JSON.stringify(newVal, null, 2);

      if (oldVal === undefined) {
        diff.push({ type: 'added', key, oldValue: undefined, newValue: newVal });
      } else if (newVal === undefined) {
        diff.push({ type: 'removed', key, oldValue: oldVal, newValue: undefined });
      } else if (oldStr !== newStr) {
        diff.push({ type: 'unchanged', key, oldValue: oldVal, newValue: newVal });
      } else {
        diff.push({ type: 'unchanged', key, oldValue: oldVal, newValue: newVal });
      }
    });

    return diff;
  };

  const diff = computeDiff(oldVersion.data, newVersion.data);
  const hasChanges = diff.some(line => 
    line.type === 'added' || line.type === 'removed' || 
    JSON.stringify(line.oldValue) !== JSON.stringify(line.newValue)
  );

  const formatValue = (value: unknown): string => {
    if (value === undefined || value === null) return 'null';
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
  };

  return (
    <div className={className}>
      <div className="mb-4 p-3 bg-surface rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-semibold">Version {oldVersion.version}</div>
            <div className="text-xs text-muted">{new Date(oldVersion.updatedAt).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm font-semibold">Version {newVersion.version}</div>
            <div className="text-xs text-muted">{new Date(newVersion.updatedAt).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {!hasChanges ? (
        <div className="text-center py-8 text-muted">
          No changes between these versions
        </div>
      ) : (
        <div className="space-y-4">
          {diff.map((line) => {
            const isChanged = line.type === 'added' || line.type === 'removed' ||
              JSON.stringify(line.oldValue) !== JSON.stringify(line.newValue);

            if (!isChanged && line.type === 'unchanged') {
              return null;
            }

            return (
              <div key={line.key} className="border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-surface font-semibold text-sm">
                  {line.key}
                </div>
                <div className="grid grid-cols-2">
                  <div className={`p-3 ${line.type === 'removed' || (line.type === 'unchanged' && isChanged) ? 'bg-red-50' : ''}`}>
                    <div className="text-xs text-muted mb-1">Old Value</div>
                    <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                      {formatValue(line.oldValue)}
                    </pre>
                  </div>
                  <div className={`p-3 border-l ${line.type === 'added' || (line.type === 'unchanged' && isChanged) ? 'bg-green-50' : ''}`}>
                    <div className="text-xs text-muted mb-1">New Value</div>
                    <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                      {formatValue(line.newValue)}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};




