/**
 * Block Registration
 * 
 * Rejestruje wszystkie bloki w BlockRegistry.
 */

import { blockRegistry } from '@/lib/page-builder/block-registry';
import type { BlockDefinition } from '@/lib/page-builder/types';

// Layout blocks
import { RootBlock } from './layout/RootBlock';
import { SectionBlock } from './layout/SectionBlock';
import { ColumnBlock } from './layout/ColumnBlock';

// Typography blocks
import { HeadingBlock } from './typography/HeadingBlock';
import { TextBlock } from './typography/TextBlock';

// Media blocks
import { ImageBlock, imageBlockDefinition } from './media/ImageBlock';

// Component blocks
import { ButtonBlock } from './components/ButtonBlock';

// Advanced blocks
import { TabsBlock } from './advanced/TabsBlock';
import { TabItemBlock } from './advanced/TabItemBlock';
import { AccordionBlock } from './advanced/AccordionBlock';
import { AccordionItemBlock } from './advanced/AccordionItemBlock';

// Icons
import {
  FiLayout,
  FiColumns,
  FiSquare,
  FiType,
  FiAlignLeft,
  FiImage,
  FiMousePointer,
  FiLayers,
  FiList,
} from 'react-icons/fi';

// =============================================================================
// BLOCK DEFINITIONS
// =============================================================================

const rootBlockDefinition: BlockDefinition = {
  type: 'root',
  title: 'Root',
  icon: <FiLayout />,
  category: 'internal',
  component: RootBlock,
  canHaveChildren: true,
  allowedParents: [], // Root has no parents
  isCanvasOnly: true,
  defaultProps: {
    content: {},
    style: { base: {} },
  },
};

const sectionBlockDefinition: BlockDefinition = {
  type: 'section',
  title: 'Section',
  description: 'Full-width section container',
  icon: <FiSquare />,
  category: 'layout',
  component: SectionBlock,
  canHaveChildren: true,
  allowedChildren: ['column', 'heading', 'text', 'image', 'button'],
  allowedParents: ['root'],
  defaultProps: {
    content: {},
    style: {
      base: {
        padding: '40px 20px',
        backgroundColor: '#ffffff',
      },
    },
  },
  propsSchema: {
    style: {
      padding: { type: 'spacing', label: 'Padding' },
      backgroundColor: { type: 'color', label: 'Background Color' },
      maxWidth: { type: 'text', label: 'Max Width', placeholder: '1200px' },
    },
  },
};

const columnBlockDefinition: BlockDefinition = {
  type: 'column',
  title: 'Column',
  description: 'Column for grid layouts',
  icon: <FiColumns />,
  category: 'layout',
  component: ColumnBlock,
  canHaveChildren: true,
  allowedChildren: ['heading', 'text', 'image', 'button'],
  allowedParents: ['section'],
  defaultProps: {
    content: {
      width: '50%',
    },
    style: {
      base: {
        padding: '20px',
      },
    },
  },
  propsSchema: {
    content: {
      width: {
        type: 'select',
        label: 'Width',
        options: [
          { value: '25%', label: '25%' },
          { value: '33.33%', label: '33%' },
          { value: '50%', label: '50%' },
          { value: '66.66%', label: '66%' },
          { value: '75%', label: '75%' },
          { value: '100%', label: '100%' },
        ],
      },
    },
    style: {
      padding: { type: 'spacing', label: 'Padding' },
      backgroundColor: { type: 'color', label: 'Background Color' },
    },
  },
};

const headingBlockDefinition: BlockDefinition = {
  type: 'heading',
  title: 'Heading',
  description: 'H1-H6 heading',
  icon: <FiType />,
  category: 'typography',
  component: HeadingBlock,
  canHaveChildren: false,
  allowedParents: ['section', 'column'],
  defaultProps: {
    content: {
      text: 'Heading',
      level: 'h2',
    },
    style: {
      base: {
        textAlign: 'left',
        color: '#1a1a1a',
      },
    },
  },
  propsSchema: {
    content: {
      text: { type: 'text', label: 'Text' },
      level: {
        type: 'select',
        label: 'Level',
        options: [
          { value: 'h1', label: 'H1' },
          { value: 'h2', label: 'H2' },
          { value: 'h3', label: 'H3' },
          { value: 'h4', label: 'H4' },
          { value: 'h5', label: 'H5' },
          { value: 'h6', label: 'H6' },
        ],
      },
    },
    style: {
      textAlign: {
        type: 'select',
        label: 'Alignment',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
      },
      color: { type: 'color', label: 'Color' },
      fontSize: { type: 'text', label: 'Font Size' },
    },
  },
};

const textBlockDefinition: BlockDefinition = {
  type: 'text',
  title: 'Text',
  description: 'Rich text paragraph',
  icon: <FiAlignLeft />,
  category: 'typography',
  component: TextBlock,
  canHaveChildren: false,
  allowedParents: ['section', 'column'],
  defaultProps: {
    content: {
      html: '<p>Enter your text here...</p>',
    },
    style: {
      base: {
        textAlign: 'left',
        color: '#333333',
      },
    },
  },
  propsSchema: {
    content: {
      html: { type: 'rich-text', label: 'Content' },
    },
    style: {
      textAlign: {
        type: 'select',
        label: 'Alignment',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
          { value: 'justify', label: 'Justify' },
        ],
      },
      color: { type: 'color', label: 'Color' },
      fontSize: { type: 'text', label: 'Font Size' },
      lineHeight: { type: 'text', label: 'Line Height' },
    },
  },
};

const buttonBlockDefinition: BlockDefinition = {
  type: 'button',
  title: 'Button',
  description: 'Clickable button with link',
  icon: <FiMousePointer />,
  category: 'components',
  component: ButtonBlock,
  canHaveChildren: false,
  allowedParents: ['section', 'column', 'tab-item', 'accordion-item'],
  defaultProps: {
    content: {
      text: 'Click me',
      url: '#',
      target: '_self',
    },
    style: {
      base: {
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '6px',
        textAlign: 'center',
      },
    },
  },
  propsSchema: {
    content: {
      text: { type: 'text', label: 'Button Text' },
      url: { type: 'link', label: 'URL' },
      target: {
        type: 'select',
        label: 'Open in',
        options: [
          { value: '_self', label: 'Same window' },
          { value: '_blank', label: 'New window' },
        ],
      },
    },
    style: {
      backgroundColor: { type: 'color', label: 'Background Color' },
      color: { type: 'color', label: 'Text Color' },
      padding: { type: 'spacing', label: 'Padding' },
      borderRadius: { type: 'text', label: 'Border Radius' },
      fontSize: { type: 'text', label: 'Font Size' },
    },
  },
};

// =============================================================================
// ADVANCED BLOCKS
// =============================================================================

const tabsBlockDefinition: BlockDefinition = {
  type: 'tabs',
  title: 'Tabs',
  description: 'Tabbed content container',
  icon: <FiLayers />,
  category: 'advanced',
  component: TabsBlock,
  canHaveChildren: true,
  allowedChildren: ['tab-item'],
  allowedParents: ['section', 'column'],
  defaultProps: {
    content: {},
    style: {
      base: {
        borderRadius: '8px',
      },
    },
  },
  propsSchema: {
    style: {
      backgroundColor: { type: 'color', label: 'Background Color' },
      borderRadius: { type: 'text', label: 'Border Radius' },
    },
  },
};

const tabItemBlockDefinition: BlockDefinition = {
  type: 'tab-item',
  title: 'Tab Item',
  description: 'Single tab content',
  icon: <FiSquare />,
  category: 'internal',
  component: TabItemBlock,
  canHaveChildren: true,
  allowedChildren: ['heading', 'text', 'image', 'button'],
  allowedParents: ['tabs'],
  isItemNode: true,
  defaultProps: {
    content: {
      title: 'Tab',
    },
    style: { base: {} },
  },
  propsSchema: {
    content: {
      title: { type: 'text', label: 'Tab Title' },
    },
  },
};

const accordionBlockDefinition: BlockDefinition = {
  type: 'accordion',
  title: 'Accordion',
  description: 'Collapsible content sections',
  icon: <FiList />,
  category: 'advanced',
  component: AccordionBlock,
  canHaveChildren: true,
  allowedChildren: ['accordion-item'],
  allowedParents: ['section', 'column'],
  defaultProps: {
    content: {
      allowMultiple: true,
    },
    style: {
      base: {
        borderRadius: '8px',
      },
    },
  },
  propsSchema: {
    content: {
      allowMultiple: { type: 'boolean', label: 'Allow Multiple Open' },
    },
    style: {
      backgroundColor: { type: 'color', label: 'Background Color' },
      borderRadius: { type: 'text', label: 'Border Radius' },
    },
  },
};

const accordionItemBlockDefinition: BlockDefinition = {
  type: 'accordion-item',
  title: 'Accordion Item',
  description: 'Single accordion section',
  icon: <FiSquare />,
  category: 'internal',
  component: AccordionItemBlock,
  canHaveChildren: true,
  allowedChildren: ['heading', 'text', 'image', 'button'],
  allowedParents: ['accordion'],
  isItemNode: true,
  defaultProps: {
    content: {
      title: 'Item',
    },
    style: { base: {} },
  },
  propsSchema: {
    content: {
      title: { type: 'text', label: 'Item Title' },
    },
  },
};

// =============================================================================
// REGISTRATION
// =============================================================================

let registered = false;

export function registerAllBlocks(): void {
  if (registered) return;
  
  // Layout
  blockRegistry.registerBlock(rootBlockDefinition);
  blockRegistry.registerBlock(sectionBlockDefinition);
  blockRegistry.registerBlock(columnBlockDefinition);
  
  // Typography
  blockRegistry.registerBlock(headingBlockDefinition);
  blockRegistry.registerBlock(textBlockDefinition);
  
  // Media
  blockRegistry.registerBlock(imageBlockDefinition);
  
  // Components
  blockRegistry.registerBlock(buttonBlockDefinition);
  
  // Advanced
  blockRegistry.registerBlock(tabsBlockDefinition);
  blockRegistry.registerBlock(tabItemBlockDefinition);
  blockRegistry.registerBlock(accordionBlockDefinition);
  blockRegistry.registerBlock(accordionItemBlockDefinition);
  
  registered = true;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[PageBuilder] Registered blocks:', blockRegistry.getAllBlocks().map(b => b.type));
  }
}

export default registerAllBlocks;
