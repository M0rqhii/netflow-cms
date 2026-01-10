/**
 * RootBlock
 * 
 * Niewidoczny kontener dla całej strony.
 * - type: 'root'
 * - allowedChildren: ['section']
 * - Renderuje tylko children, bez własnego UI
 */

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';

export const RootBlock: React.FC<BlockComponentProps> = ({ children }) => {
  return (
    <div data-block-type="root">
      {children}
    </div>
  );
};

export default RootBlock;
