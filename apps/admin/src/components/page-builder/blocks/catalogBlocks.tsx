﻿﻿import React from 'react';
import {
  FiLayout,
  FiType,
  FiImage,
  FiList,
  FiGrid,
  FiAlertTriangle,
  FiTag,
  FiCheckSquare,
  FiBarChart2,
  FiZap,
} from 'react-icons/fi';

import type { BlockCategory, BlockDefinition, BlockPropsSchema } from '@/lib/page-builder/types';
import { GenericContainerBlock } from './generic/GenericContainerBlock';
import { GenericTextBlock } from './generic/GenericTextBlock';
import { GenericMediaBlock } from './generic/GenericMediaBlock';
import { GenericListBlock } from './generic/GenericListBlock';
import { GenericFormFieldBlock } from './generic/GenericFormFieldBlock';
import { GenericAlertBlock } from './generic/GenericAlertBlock';
import { GenericBadgeBlock } from './generic/GenericBadgeBlock';
import { GenericProgressBlock } from './generic/GenericProgressBlock';
import { ButtonBlock } from './components/ButtonBlock';

export type CatalogItem = {
  type: string;
  title: string;
  description?: string;
  category: BlockCategory;
  component: 'container' | 'text' | 'media' | 'list' | 'form' | 'alert' | 'badge' | 'progress' | 'button';
  canHaveChildren?: boolean;
  defaultContent?: Record<string, unknown>;
  defaultStyle?: Record<string, unknown>;
  moduleKey?: string;
  tags?: string[];
  keywords?: string[];
  isItemNode?: boolean;
  isCanvasOnly?: boolean;
};

const CONTAINER_SCHEMA: BlockPropsSchema = {
  content: {
    tag: {
      type: 'select',
      label: 'Tag',
      options: [
        { value: 'div', label: 'div' },
        { value: 'section', label: 'section' },
        { value: 'header', label: 'header' },
        { value: 'nav', label: 'nav' },
        { value: 'main', label: 'main' },
        { value: 'footer', label: 'footer' },
        { value: 'aside', label: 'aside' },
        { value: 'article', label: 'article' },
      ],
    },
    display: {
      type: 'select',
      label: 'Display',
      options: [
        { value: 'block', label: 'Block' },
        { value: 'flex', label: 'Flex' },
        { value: 'grid', label: 'Grid' },
      ],
    },
    gap: { type: 'text', label: 'Gap' },
    alignItems: {
      type: 'select',
      label: 'Align',
      options: [
        { value: 'stretch', label: 'Stretch' },
        { value: 'flex-start', label: 'Start' },
        { value: 'center', label: 'Center' },
        { value: 'flex-end', label: 'End' },
      ],
    },
    justifyContent: {
      type: 'select',
      label: 'Justify',
      options: [
        { value: 'flex-start', label: 'Start' },
        { value: 'center', label: 'Center' },
        { value: 'space-between', label: 'Space Between' },
        { value: 'space-around', label: 'Space Around' },
        { value: 'space-evenly', label: 'Space Evenly' },
        { value: 'flex-end', label: 'End' },
      ],
    },
    flexDirection: {
      type: 'select',
      label: 'Direction',
      options: [
        { value: 'row', label: 'Row' },
        { value: 'column', label: 'Column' },
      ],
    },
    flexWrap: {
      type: 'select',
      label: 'Wrap',
      options: [
        { value: 'nowrap', label: 'No wrap' },
        { value: 'wrap', label: 'Wrap' },
      ],
    },
    gridTemplateColumns: { type: 'text', label: 'Grid Columns' },
    position: {
      type: 'select',
      label: 'Position',
      options: [
        { value: 'relative', label: 'Relative' },
        { value: 'absolute', label: 'Absolute' },
        { value: 'sticky', label: 'Sticky' },
      ],
    },
    overflow: {
      type: 'select',
      label: 'Overflow',
      options: [
        { value: 'visible', label: 'Visible' },
        { value: 'hidden', label: 'Hidden' },
        { value: 'auto', label: 'Auto' },
        { value: 'scroll', label: 'Scroll' },
      ],
    },
  },
  style: {
    padding: { type: 'spacing', label: 'Padding' },
    margin: { type: 'spacing', label: 'Margin' },
    backgroundColor: { type: 'color', label: 'Background' },
    color: { type: 'color', label: 'Text color' },
    borderRadius: { type: 'text', label: 'Radius' },
    width: { type: 'text', label: 'Width' },
    maxWidth: { type: 'text', label: 'Max width' },
    minHeight: { type: 'text', label: 'Min height' },
  },
};

const TEXT_SCHEMA: BlockPropsSchema = {
  content: {
    text: { type: 'text', label: 'Text' },
    html: { type: 'rich-text', label: 'HTML' },
    tag: {
      type: 'select',
      label: 'Tag',
      options: [
        { value: 'p', label: 'Paragraph' },
        { value: 'span', label: 'Span' },
        { value: 'blockquote', label: 'Blockquote' },
        { value: 'pre', label: 'Pre' },
        { value: 'code', label: 'Code' },
        { value: 'h2', label: 'H2' },
      ],
    },
  },
  style: {
    color: { type: 'color', label: 'Color' },
    fontSize: { type: 'text', label: 'Font size' },
    fontWeight: { type: 'text', label: 'Weight' },
    textAlign: {
      type: 'select',
      label: 'Align',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
        { value: 'justify', label: 'Justify' },
      ],
    },
    lineHeight: { type: 'text', label: 'Line height' },
    padding: { type: 'spacing', label: 'Padding' },
    margin: { type: 'spacing', label: 'Margin' },
  },
};

const MEDIA_SCHEMA: BlockPropsSchema = {
  content: {
    src: { type: 'text', label: 'Source URL' },
    alt: { type: 'text', label: 'Alt text' },
    kind: {
      type: 'select',
      label: 'Kind',
      options: [
        { value: 'image', label: 'Image' },
        { value: 'video', label: 'Video' },
        { value: 'audio', label: 'Audio' },
        { value: 'embed', label: 'Embed' },
        { value: 'iframe', label: 'iFrame' },
      ],
    },
  },
  style: {
    width: { type: 'text', label: 'Width' },
    maxWidth: { type: 'text', label: 'Max width' },
    borderRadius: { type: 'text', label: 'Radius' },
    padding: { type: 'spacing', label: 'Padding' },
    margin: { type: 'spacing', label: 'Margin' },
  },
};

const LIST_SCHEMA: BlockPropsSchema = {
  content: {
    items: { type: 'text', label: 'Items (comma separated)' },
    ordered: { type: 'boolean', label: 'Ordered list' },
  },
  style: {
    color: { type: 'color', label: 'Color' },
    padding: { type: 'spacing', label: 'Padding' },
    margin: { type: 'spacing', label: 'Margin' },
  },
};

const FORM_SCHEMA: BlockPropsSchema = {
  content: {
    label: { type: 'text', label: 'Label' },
    fieldType: { type: 'text', label: 'Field type' },
    placeholder: { type: 'text', label: 'Placeholder' },
    options: { type: 'text', label: 'Options (comma separated)' },
  },
};

const ALERT_SCHEMA: BlockPropsSchema = {
  content: {
    title: { type: 'text', label: 'Title' },
    message: { type: 'text', label: 'Message' },
  },
  style: {
    padding: { type: 'spacing', label: 'Padding' },
    backgroundColor: { type: 'color', label: 'Background' },
    color: { type: 'color', label: 'Text color' },
    borderRadius: { type: 'text', label: 'Radius' },
  },
};

const BADGE_SCHEMA: BlockPropsSchema = {
  content: {
    text: { type: 'text', label: 'Text' },
  },
  style: {
    backgroundColor: { type: 'color', label: 'Background' },
    color: { type: 'color', label: 'Text color' },
    borderRadius: { type: 'text', label: 'Radius' },
    padding: { type: 'spacing', label: 'Padding' },
  },
};

const PROGRESS_SCHEMA: BlockPropsSchema = {
  content: {
    value: { type: 'number', label: 'Value' },
    label: { type: 'text', label: 'Label' },
  },
};

const BUTTON_SCHEMA: BlockPropsSchema = {
  content: {
    text: { type: 'text', label: 'Button text' },
    url: { type: 'link', label: 'URL' },
    target: {
      type: 'select',
      label: 'Open in',
      options: [
        { value: '_self', label: 'Same tab' },
        { value: '_blank', label: 'New tab' },
      ],
    },
  },
  style: {
    backgroundColor: { type: 'color', label: 'Background' },
    color: { type: 'color', label: 'Text color' },
    padding: { type: 'spacing', label: 'Padding' },
    borderRadius: { type: 'text', label: 'Radius' },
    fontSize: { type: 'text', label: 'Font size' },
  },
};

const componentMap = {
  container: GenericContainerBlock,
  text: GenericTextBlock,
  media: GenericMediaBlock,
  list: GenericListBlock,
  form: GenericFormFieldBlock,
  alert: GenericAlertBlock,
  badge: GenericBadgeBlock,
  progress: GenericProgressBlock,
  button: ButtonBlock,
};

const schemaMap: Record<CatalogItem['component'], BlockPropsSchema | undefined> = {
  container: CONTAINER_SCHEMA,
  text: TEXT_SCHEMA,
  media: MEDIA_SCHEMA,
  list: LIST_SCHEMA,
  form: FORM_SCHEMA,
  alert: ALERT_SCHEMA,
  badge: BADGE_SCHEMA,
  progress: PROGRESS_SCHEMA,
  button: BUTTON_SCHEMA,
};

const iconMap: Record<CatalogItem['component'], React.ReactNode> = {
  container: <FiLayout />,
  text: <FiType />,
  media: <FiImage />,
  list: <FiList />,
  form: <FiCheckSquare />,
  alert: <FiAlertTriangle />,
  badge: <FiTag />,
  progress: <FiBarChart2 />,
  button: <FiZap />,
};
const layoutItems: CatalogItem[] = [
  { type: 'container', title: 'Container', category: 'layout', component: 'container' },
  { type: 'grid', title: 'Grid', category: 'layout', component: 'container', defaultContent: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' } },
  { type: 'columns', title: 'Columns (Preset)', category: 'layout', component: 'container', defaultContent: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' } },
  { type: 'flex-row', title: 'Flex Row', category: 'layout', component: 'container', defaultContent: { display: 'flex', flexDirection: 'row', gap: '16px' } },
  { type: 'flex-column', title: 'Flex Column', category: 'layout', component: 'container', defaultContent: { display: 'flex', flexDirection: 'column', gap: '16px' } },
  { type: 'stack', title: 'Stack', category: 'layout', component: 'container', defaultContent: { display: 'flex', flexDirection: 'column', gap: '12px' } },
  { type: 'wrap', title: 'Wrap', category: 'layout', component: 'container', defaultContent: { display: 'flex', flexWrap: 'wrap', gap: '12px' } },
  { type: 'card', title: 'Card', category: 'layout', component: 'container', defaultStyle: { backgroundColor: '#0f172a', color: '#e2e8f0', borderRadius: '16px', padding: '24px' } },
  { type: 'card-grid', title: 'Card Grid', category: 'layout', component: 'container', defaultContent: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' } },
  { type: 'split-layout', title: 'Split Layout', category: 'layout', component: 'container', defaultContent: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' } },
  { type: 'sticky-container', title: 'Sticky Container', category: 'layout', component: 'container', defaultContent: { position: 'sticky' }, defaultStyle: { top: '0px' } },
  { type: 'absolute-layer', title: 'Absolute Layer', category: 'layout', component: 'container', defaultContent: { position: 'absolute' }, defaultStyle: { top: '0px', left: '0px' } },
  { type: 'spacer', title: 'Spacer', category: 'layout', component: 'container', canHaveChildren: false, defaultStyle: { minHeight: '24px' } },
  { type: 'divider', title: 'Divider', category: 'layout', component: 'container', canHaveChildren: false, defaultStyle: { minHeight: '1px', backgroundColor: '#1f2a3a' } },
  { type: 'shape-divider', title: 'Shape Divider', category: 'layout', component: 'container', canHaveChildren: false, defaultStyle: { minHeight: '48px', backgroundColor: '#1f2a3a' } },
  { type: 'background-layer', title: 'Background Layer', category: 'layout', component: 'container', defaultStyle: { backgroundColor: '#0b1220' } },
  { type: 'overlay', title: 'Overlay', category: 'layout', component: 'container', canHaveChildren: false, defaultStyle: { backgroundColor: 'rgba(15, 23, 42, 0.6)' } },
  { type: 'anchor', title: 'Anchor', category: 'layout', component: 'text', defaultContent: { tag: 'a', text: 'Anchor' } },
  { type: 'scroll-container', title: 'Scroll Container', category: 'layout', component: 'container', defaultContent: { overflow: 'auto' }, defaultStyle: { maxWidth: '100%' } },
  { type: 'marquee-container', title: 'Marquee Container', category: 'layout', component: 'container', defaultContent: { display: 'flex', gap: '24px', overflow: 'hidden' } },
];

const typographyItems: CatalogItem[] = [
  { type: 'rich-text', title: 'RichText', category: 'typography', component: 'text', defaultContent: { html: '<p>Rich text content...</p>' } },
  { type: 'lead-paragraph', title: 'Lead Paragraph', category: 'typography', component: 'text', defaultContent: { text: 'Lead paragraph for emphasis.', tag: 'p' }, defaultStyle: { fontSize: '18px' } },
  { type: 'caption', title: 'Caption', category: 'typography', component: 'text', defaultContent: { text: 'Caption text', tag: 'span' }, defaultStyle: { fontSize: '12px', color: '#94a3b8' } },
  { type: 'quote', title: 'Quote', category: 'typography', component: 'text', defaultContent: { text: 'Quote text', tag: 'blockquote' } },
  { type: 'list', title: 'List', category: 'typography', component: 'list', defaultContent: { items: ['Item 1', 'Item 2', 'Item 3'] } },
  { type: 'definition-list', title: 'Definition List', category: 'typography', component: 'text', defaultContent: { html: '<dl><dt>Term</dt><dd>Definition</dd></dl>' } },
  { type: 'code-block', title: 'Code Block', category: 'typography', component: 'text', defaultContent: { text: 'const greeting = "Hello";', tag: 'pre' } },
  { type: 'inline-code', title: 'Inline Code', category: 'typography', component: 'text', defaultContent: { text: 'inline-code', tag: 'code' } },
  { type: 'kpi-text', title: 'KPI / Stat Text', category: 'typography', component: 'text', defaultContent: { text: '92% Uptime', tag: 'h2' } },
  { type: 'markdown', title: 'Markdown', category: 'typography', component: 'text', defaultContent: { text: '# Markdown content', tag: 'pre' } },
];

const mediaItems: CatalogItem[] = [
  { type: 'image-with-caption', title: 'Image with Caption', category: 'media', component: 'container', defaultContent: { tag: 'figure' } },
  { type: 'gallery-grid', title: 'Gallery Grid', category: 'media', component: 'container', defaultContent: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' } },
  { type: 'masonry-gallery', title: 'Masonry Gallery', category: 'media', component: 'container', defaultContent: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' } },
  { type: 'carousel-images', title: 'Carousel (Images)', category: 'media', component: 'container', defaultContent: { display: 'flex', flexWrap: 'nowrap', gap: '16px', overflow: 'auto' } },
  { type: 'carousel-content', title: 'Carousel (Content)', category: 'media', component: 'container', defaultContent: { display: 'flex', flexWrap: 'nowrap', gap: '16px', overflow: 'auto' } },
  { type: 'lightbox-viewer', title: 'Lightbox Viewer', category: 'media', component: 'media', defaultContent: { kind: 'image' } },
  { type: 'video-embed', title: 'Video Embed', category: 'media', component: 'media', defaultContent: { kind: 'video' } },
  { type: 'video-file', title: 'Video File', category: 'media', component: 'media', defaultContent: { kind: 'video' } },
  { type: 'background-video', title: 'Background Video', category: 'media', component: 'media', defaultContent: { kind: 'video' } },
  { type: 'audio-player', title: 'Audio Player', category: 'media', component: 'media', defaultContent: { kind: 'audio' } },
  { type: 'icon', title: 'Icon', category: 'media', component: 'text', defaultContent: { text: '?', tag: 'span' } },
  { type: 'icon-list', title: 'Icon List', category: 'media', component: 'list', defaultContent: { items: ['? Feature', '? Benefit'] } },
  { type: 'lottie-animation', title: 'Lottie Animation', category: 'media', component: 'media', defaultContent: { kind: 'embed' } },
  { type: 'svg', title: 'SVG', category: 'media', component: 'media', defaultContent: { kind: 'image' } },
  { type: 'before-after-slider', title: 'Before/After Slider', category: 'media', component: 'container', defaultContent: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
  { type: 'map-snapshot', title: 'Map Snapshot Image', category: 'media', component: 'media', defaultContent: { kind: 'image' } },
];


const navItems: CatalogItem[] = [
  { type: 'header', title: 'Header', category: 'components', component: 'container', defaultContent: { tag: 'header', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
  { type: 'navbar', title: 'Navbar', category: 'components', component: 'container', defaultContent: { tag: 'nav', display: 'flex', gap: '16px', alignItems: 'center' } },
  { type: 'mobile-menu-drawer', title: 'Mobile Menu Drawer', category: 'components', component: 'container' },
  { type: 'mega-menu', title: 'Mega Menu', category: 'components', component: 'container', defaultContent: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' } },
  { type: 'footer', title: 'Footer', category: 'components', component: 'container', defaultContent: { tag: 'footer' } },
  { type: 'sidebar-nav', title: 'Sidebar Nav', category: 'components', component: 'container' },
  { type: 'breadcrumbs', title: 'Breadcrumbs', category: 'components', component: 'list', defaultContent: { items: ['Home', 'Section', 'Page'] } },
  { type: 'pagination', title: 'Pagination', category: 'components', component: 'list', defaultContent: { items: ['1', '2', '3'] } },
  { type: 'step-navigator', title: 'Step Navigator', category: 'components', component: 'container', defaultContent: { display: 'flex', gap: '12px' } },
  { type: 'toc', title: 'Table of Contents', category: 'components', component: 'list', defaultContent: { items: ['Intro', 'Features', 'FAQ'] } },
  { type: 'back-to-top', title: 'Back to Top', category: 'components', component: 'button', defaultContent: { text: 'Back to top', url: '#' } },
];
const marketingItems: CatalogItem[] = [
  { type: 'hero', title: 'Hero', category: 'components', component: 'container', defaultContent: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' } },
  { type: 'feature-grid', title: 'Feature Grid', category: 'components', component: 'container', defaultContent: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' } },
  { type: 'feature-list', title: 'Feature List', category: 'components', component: 'list', defaultContent: { items: ['Feature A', 'Feature B', 'Feature C'] } },
  { type: 'callout', title: 'Callout / Highlight', category: 'components', component: 'alert', defaultContent: { title: 'Callout', message: 'Highlight important message here.' } },
  { type: 'stats-strip', title: 'Stats Strip', category: 'components', component: 'container', defaultContent: { display: 'flex', gap: '24px', justifyContent: 'space-between' } },
  { type: 'testimonial-card', title: 'Testimonial Card', category: 'components', component: 'container', defaultStyle: { backgroundColor: '#0f172a', color: '#e2e8f0', borderRadius: '12px', padding: '20px' } },
  { type: 'testimonials-slider', title: 'Testimonials Slider', category: 'components', component: 'container', defaultContent: { display: 'flex', gap: '16px', overflow: 'auto' } },
  { type: 'logo-cloud', title: 'Logo Cloud', category: 'components', component: 'container', defaultContent: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' } },
  { type: 'pricing-table', title: 'Pricing Table', category: 'components', component: 'container', defaultContent: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' } },
  { type: 'pricing-card', title: 'Pricing Card', category: 'components', component: 'container', defaultStyle: { backgroundColor: '#0f172a', color: '#e2e8f0', borderRadius: '16px', padding: '24px' }, moduleKey: 'payments' },
  { type: 'faq-section', title: 'FAQ Section', category: 'components', component: 'container' },
  { type: 'timeline', title: 'Timeline', category: 'components', component: 'container' },
  { type: 'team-grid', title: 'Team Grid', category: 'components', component: 'container', defaultContent: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' } },
  { type: 'comparison-table', title: 'Comparison Table', category: 'components', component: 'container' },
  { type: 'badge', title: 'Badge / Tag', category: 'components', component: 'badge' },
  { type: 'alert', title: 'Alert / Notice', category: 'components', component: 'alert' },
  { type: 'banner-top', title: 'Banner (Top)', category: 'components', component: 'container' },
  { type: 'cookie-notice', title: 'Cookie Notice', category: 'components', component: 'container', moduleKey: 'consent-security' },
  { type: 'modal', title: 'Modal', category: 'components', component: 'container' },
  { type: 'popover', title: 'Popover / Tooltip', category: 'components', component: 'container' },
  { type: 'progress-bar', title: 'Progress Bar', category: 'components', component: 'progress', defaultContent: { value: 65, label: '65%' } },
  { type: 'skeleton-placeholder', title: 'Skeleton Placeholder', category: 'components', component: 'container', canHaveChildren: false, defaultStyle: { minHeight: '120px', backgroundColor: '#1f2a3a' } },
];


const formItems: CatalogItem[] = [
  { type: 'form', title: 'Form', category: 'components', component: 'container' },
  { type: 'input', title: 'Input', category: 'components', component: 'form', defaultContent: { fieldType: 'text', label: 'Input', placeholder: 'Type...' } },
  { type: 'textarea', title: 'Textarea', category: 'components', component: 'form', defaultContent: { fieldType: 'textarea', label: 'Textarea', placeholder: 'Write...' } },
  { type: 'select', title: 'Select', category: 'components', component: 'form', defaultContent: { fieldType: 'select', label: 'Select', options: ['Option 1', 'Option 2'] } },
  { type: 'radio-group', title: 'Radio Group', category: 'components', component: 'form', defaultContent: { fieldType: 'radio-group', label: 'Options', options: ['Option 1', 'Option 2'] } },
  { type: 'checkbox', title: 'Checkbox', category: 'components', component: 'form', defaultContent: { fieldType: 'checkbox', label: 'Checkbox' } },
  { type: 'switch', title: 'Switch', category: 'components', component: 'form', defaultContent: { fieldType: 'checkbox', label: 'Switch' } },
  { type: 'date-picker', title: 'Date Picker', category: 'components', component: 'form', defaultContent: { fieldType: 'date', label: 'Date' } },
  { type: 'phone-input', title: 'Phone Input', category: 'components', component: 'form', defaultContent: { fieldType: 'phone', label: 'Phone' } },
  { type: 'file-upload', title: 'File Upload', category: 'components', component: 'form', defaultContent: { fieldType: 'file', label: 'Upload' }, moduleKey: 'forms-pro' },
  { type: 'slider-input', title: 'Slider Input', category: 'components', component: 'form', defaultContent: { fieldType: 'range', label: 'Slider' } },
  { type: 'rating', title: 'Rating', category: 'components', component: 'form', defaultContent: { fieldType: 'rating', label: 'Rating' } },
  { type: 'consent', title: 'Consent (RODO)', category: 'components', component: 'form', defaultContent: { fieldType: 'checkbox', label: 'I agree to terms' } },
  { type: 'captcha', title: 'Captcha', category: 'components', component: 'form', moduleKey: 'consent-security', defaultContent: { fieldType: 'text', label: 'Captcha' } },
  { type: 'submit-button', title: 'Submit Button', category: 'components', component: 'button', defaultContent: { text: 'Submit', url: '#' } },
  { type: 'form-success-message', title: 'Form Success Message', category: 'components', component: 'text', defaultContent: { text: 'Thanks! We received your submission.' } },
  { type: 'form-error-message', title: 'Form Error Message', category: 'components', component: 'text', defaultContent: { text: 'Something went wrong.' } },
  { type: 'newsletter-signup', title: 'Newsletter Signup', category: 'components', component: 'container' },
  { type: 'multi-step-form', title: 'Multi-step Form', category: 'components', component: 'container', moduleKey: 'forms-pro' },
  { type: 'form-summary', title: 'Form Summary / Review', category: 'components', component: 'container' },
];

const dataItems: CatalogItem[] = [
  { type: 'collection-list', title: 'Collection List', category: 'components', component: 'container' },
  { type: 'collection-grid', title: 'Collection Grid', category: 'components', component: 'container', defaultContent: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' } },
  { type: 'collection-table', title: 'Collection Table', category: 'components', component: 'container' },
  { type: 'collection-item-template', title: 'Collection Item Template', category: 'components', component: 'container', isItemNode: true },
  { type: 'dynamic-field', title: 'Dynamic Field', category: 'components', component: 'text', defaultContent: { text: '{field}' } },
  { type: 'rich-field', title: 'Rich Field', category: 'components', component: 'text', defaultContent: { html: '<p>{richField}</p>' } },
  { type: 'image-field', title: 'Image Field', category: 'components', component: 'media', defaultContent: { kind: 'image' } },
  { type: 'repeater', title: 'Repeater', category: 'components', component: 'container' },
  { type: 'condition', title: 'Condition (If/Else)', category: 'components', component: 'container' },
  { type: 'visibility-rules', title: 'Visibility Rules', category: 'components', component: 'container' },
  { type: 'search-bar', title: 'Search Bar', category: 'components', component: 'form', defaultContent: { fieldType: 'text', label: 'Search', placeholder: 'Search...' } },
  { type: 'filter-bar', title: 'Filter Bar', category: 'components', component: 'container' },
  { type: 'sort-dropdown', title: 'Sort Dropdown', category: 'components', component: 'form', defaultContent: { fieldType: 'select', label: 'Sort', options: ['Newest', 'Oldest'] } },
  { type: 'collection-empty-state', title: 'Empty State (Collection)', category: 'components', component: 'container' },
  { type: 'load-more', title: 'Load More / Infinite Scroll', category: 'components', component: 'button', defaultContent: { text: 'Load more', url: '#' } },
];


const commerceItems: CatalogItem[] = [
  { type: 'product-grid', title: 'Product Grid', category: 'components', component: 'container', moduleKey: 'shop', defaultContent: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' } },
  { type: 'product-card', title: 'Product Card', category: 'components', component: 'container', moduleKey: 'shop' },
  { type: 'product-gallery', title: 'Product Gallery', category: 'components', component: 'container', moduleKey: 'shop', defaultContent: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' } },
  { type: 'price', title: 'Price', category: 'components', component: 'text', defaultContent: { text: '$99' }, moduleKey: 'shop' },
  { type: 'add-to-cart-button', title: 'Add to Cart Button', category: 'components', component: 'button', moduleKey: 'shop', defaultContent: { text: 'Add to cart', url: '#' } },
  { type: 'cart-icon', title: 'Cart Icon', category: 'components', component: 'badge', moduleKey: 'shop', defaultContent: { text: 'Cart' } },
  { type: 'mini-cart-drawer', title: 'Mini Cart Drawer', category: 'components', component: 'container', moduleKey: 'shop' },
  { type: 'checkout-embed', title: 'Checkout Embed (Stripe)', category: 'components', component: 'media', moduleKey: 'payments', defaultContent: { kind: 'embed' } },
  { type: 'order-summary', title: 'Order Summary', category: 'components', component: 'container', moduleKey: 'shop' },
  { type: 'coupon-field', title: 'Coupon Field', category: 'components', component: 'form', moduleKey: 'shop', defaultContent: { fieldType: 'text', label: 'Coupon' } },
  { type: 'stock-badge', title: 'Stock Badge', category: 'components', component: 'badge', moduleKey: 'shop', defaultContent: { text: 'In stock' } },
];


const integrationItems: CatalogItem[] = [
  { type: 'html-embed', title: 'HTML Embed', category: 'components', component: 'media', defaultContent: { kind: 'embed' }, moduleKey: 'embeds-media' },
  { type: 'iframe-embed', title: 'iFrame Embed', category: 'components', component: 'media', defaultContent: { kind: 'iframe' }, moduleKey: 'embeds-media' },
  { type: 'script-embed', title: 'Script Embed (Gated)', category: 'components', component: 'text', moduleKey: 'tag-manager', defaultContent: { text: '<script></script>', tag: 'code' } },
  { type: 'google-map', title: 'Google Maps / OSM Map', category: 'components', component: 'media', moduleKey: 'maps', defaultContent: { kind: 'embed' } },
  { type: 'calendly-embed', title: 'Calendly Embed', category: 'components', component: 'media', moduleKey: 'embeds-media', defaultContent: { kind: 'embed' } },
  { type: 'chat-widget-embed', title: 'Chat Widget Embed', category: 'components', component: 'media', moduleKey: 'embeds-media', defaultContent: { kind: 'embed' } },
  { type: 'youtube-playlist', title: 'YouTube Playlist', category: 'components', component: 'media', moduleKey: 'embeds-media', defaultContent: { kind: 'embed' } },
  { type: 'spotify-embed', title: 'Spotify Embed', category: 'components', component: 'media', moduleKey: 'embeds-media', defaultContent: { kind: 'embed' } },
  { type: 'social-post-embed', title: 'Social Post Embed', category: 'components', component: 'media', moduleKey: 'embeds-media', defaultContent: { kind: 'embed' } },
  { type: 'analytics-pixel', title: 'Analytics Pixel (Gated)', category: 'components', component: 'container', moduleKey: 'analytics' },
  { type: 'tag-manager-slot', title: 'Tag Manager Slot (Gated)', category: 'components', component: 'container', moduleKey: 'tag-manager' },
];


const utilityItems: CatalogItem[] = [
  { type: 'html-anchor-link', title: 'HTML Anchor Link', category: 'components', component: 'text', defaultContent: { text: 'Anchor link', tag: 'a' } },
  { type: 'custom-css', title: 'Custom CSS (Gated)', category: 'components', component: 'text', moduleKey: 'forms-pro', defaultContent: { text: '.class { }', tag: 'code' } },
  { type: 'custom-class-presets', title: 'Custom Class Presets', category: 'components', component: 'container' },
  { type: 'aria-wrapper', title: 'ARIA Wrapper', category: 'components', component: 'container' },
  { type: 'seo-block', title: 'SEO Block (Page)', category: 'components', component: 'container' },
  { type: 'opengraph-preview', title: 'OpenGraph Preview', category: 'components', component: 'container' },
  { type: 'error-boundary-placeholder', title: 'Error Boundary Placeholder', category: 'components', component: 'alert', defaultContent: { title: 'Error boundary', message: 'This block failed to render.' } },
  { type: 'debug-outline-toggle', title: 'Debug Outline Toggle', category: 'components', component: 'button', defaultContent: { text: 'Toggle outlines', url: '#' } },
  { type: 'comment-annotation', title: 'Comment / Annotation', category: 'components', component: 'text', defaultContent: { text: 'Comment...', tag: 'p' } },
];


const moduleItems: CatalogItem[] = [
  { type: 'payment-button', title: 'Payment Button', category: 'components', component: 'button', moduleKey: 'payments', defaultContent: { text: 'Pay now', url: '#' } },
  { type: 'consent-preferences', title: 'Consent Preferences', category: 'components', component: 'container', moduleKey: 'consent-security' },
  { type: 'captcha-field', title: 'Captcha Field', category: 'components', component: 'form', moduleKey: 'consent-security', defaultContent: { fieldType: 'text', label: 'Captcha' } },
  { type: 'accessibility-widget', title: 'Accessibility Widget', category: 'components', component: 'container', moduleKey: 'accessibility-widget' },
  { type: 'skip-to-content', title: 'Skip To Content', category: 'components', component: 'text', moduleKey: 'accessibility-widget', defaultContent: { text: 'Skip to content', tag: 'a' } },
  { type: 'event-tracker', title: 'Event Tracker', category: 'components', component: 'container', moduleKey: 'analytics' },
  { type: 'meta-pixel', title: 'Meta Pixel', category: 'components', component: 'container', moduleKey: 'meta-pixel' },
  { type: 'location-card', title: 'Location Card', category: 'components', component: 'container', moduleKey: 'maps' },
  { type: 'directions-button', title: 'Directions Button', category: 'components', component: 'button', moduleKey: 'maps', defaultContent: { text: 'Directions', url: '#' } },
  { type: 'blog-list', title: 'Blog List', category: 'components', component: 'container', moduleKey: 'blog-content' },
  { type: 'blog-post', title: 'Blog Post', category: 'components', component: 'container', moduleKey: 'blog-content' },
  { type: 'category-chips', title: 'Category Chips', category: 'components', component: 'list', moduleKey: 'blog-content', defaultContent: { items: ['News', 'Tips', 'Guides'] } },
];

const ALL_ITEMS: CatalogItem[] = [
  ...layoutItems,
  ...typographyItems,
  ...mediaItems,
  ...navItems,
  ...marketingItems,
  ...formItems,
  ...dataItems,
  ...commerceItems,
  ...integrationItems,
  ...utilityItems,
  ...moduleItems,
];

function buildDefinition(item: CatalogItem): BlockDefinition {
  const component = componentMap[item.component];
  const schema = schemaMap[item.component];
  const icon = iconMap[item.component] ?? <FiGrid />;
  const defaultContent = item.defaultContent ?? {};
  const defaultStyle = item.defaultStyle ?? {};

  return {
    type: item.type,
    title: item.title,
    description: item.description,
    icon,
    category: item.category,
    component,
    canHaveChildren: item.canHaveChildren ?? item.component === 'container',
    defaultProps: {
      content: {
        ...(item.component === 'container' ? { tag: 'div' } : {}),
        ...defaultContent,
      },
      style: {
        base: {
          ...defaultStyle,
        },
      },
    },
    moduleKey: item.moduleKey,
    tags: item.tags,
    keywords: item.keywords,
    isItemNode: item.isItemNode,
    isCanvasOnly: item.isCanvasOnly,
    propsSchema: schema,
  };
}

export const catalogBlockDefinitions: BlockDefinition[] = ALL_ITEMS.map(buildDefinition);

export default catalogBlockDefinitions;









