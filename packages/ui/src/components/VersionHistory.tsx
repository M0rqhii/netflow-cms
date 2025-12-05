import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Modal } from '../index';
import { DiffViewer } from './DiffViewer';

export interface Version {
  id: string;
  version: number;
  data: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  updatedById?: string;
  publishedAt?: string;
}

export interface VersionHistoryProps {
  versions: Version[];
  currentVersion: Version;
  onRestore?: (version: Version) => void | Promise<void>;
  className?: string;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  versions,
  currentVersion,
  onRestore,
  className,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareVersion, setCompareVersion] = useState<Version | null>(null);
  const [isDiffOpen, setIsDiffOpen] = useState(false);

  const sortedVersions = [...versions].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const handleViewDiff = (version: Version) => {
    setSelectedVersion(version);
    setCompareVersion(currentVersion);
    setIsDiffOpen(true);
  };

  const handleCompare = (version1: Version, version2: Version) => {
    setSelectedVersion(version1);
    setCompareVersion(version2);
    setIsDiffOpen(true);
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedVersions.length === 0 ? (
              <p className="text-muted text-center py-4">No version history available</p>
            ) : (
              sortedVersions.map((version, index) => {
                const isCurrent = version.id === currentVersion.id;
                const isPublished = version.status === 'published' || version.publishedAt;
                
                return (
                  <div
                    key={version.id}
                    className={`p-3 border rounded-lg ${
                      isCurrent ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">Version {version.version}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded">
                              Current
                            </span>
                          )}
                          {isPublished && (
                            <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded">
                              Published
                            </span>
                          )}
                          <span className="px-2 py-0.5 text-xs bg-gray-200 rounded">
                            {version.status}
                          </span>
                        </div>
                        <div className="text-sm text-muted space-y-1">
                          <div>Updated: {formatDate(version.updatedAt)}</div>
                          {version.publishedAt && (
                            <div>Published: {formatDate(version.publishedAt)}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {index < sortedVersions.length - 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCompare(version, sortedVersions[index + 1])}
                          >
                            Compare
                          </Button>
                        )}
                        {!isCurrent && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDiff(version)}
                            >
                              View Diff
                            </Button>
                            {onRestore && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onRestore(version)}
                              >
                                Restore
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Diff Modal */}
      <Modal
        isOpen={isDiffOpen}
        onClose={() => setIsDiffOpen(false)}
        title="Version Comparison"
        size="xl"
      >
        {selectedVersion && compareVersion && (
          <DiffViewer
            oldVersion={selectedVersion}
            newVersion={compareVersion}
          />
        )}
      </Modal>
    </div>
  );
};

