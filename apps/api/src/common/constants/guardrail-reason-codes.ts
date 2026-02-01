/**
 * Guardrail Reason Codes
 * 
 * Machine-readable reason codes for guardrail violations.
 * Used in error responses to allow frontend to handle specific cases.
 */
export enum GuardrailReasonCode {
  // Page publish guardrails
  EMPTY_CONTENT = 'empty_content',
  MISSING_TITLE = 'missing_title',
  MISSING_SLUG = 'missing_slug',
  INVALID_SLUG = 'invalid_slug',
  NO_DRAFT_PAGES = 'no_draft_pages',
  ALREADY_PUBLISHED = 'already_published',
  
  // Marketing publish guardrails
  MISSING_CONTENT = 'missing_content',
  EMPTY_DRAFT = 'empty_draft',
  INCOMPLETE_CONTENT = 'incomplete_content',
  NO_CHANNELS_SELECTED = 'no_channels_selected',
  MISSING_CONNECTIONS = 'missing_connections',
  DRAFT_NOT_READY = 'draft_not_ready',
  NO_PUBLISHED_PAGES = 'no_published_pages',
  
  // Page builder guardrails
  NO_PAGE_ID = 'no_page_id',
  MODULE_DISABLED = 'module_disabled',
  MISSING_ALT = 'missing_alt',
  
  // SEO warnings (not errors, but warnings)
  MISSING_SEO_META = 'missing_seo_meta',
}

/**
 * Human-readable messages for guardrail reason codes
 */
export const GuardrailMessages: Record<GuardrailReasonCode, string> = {
  [GuardrailReasonCode.EMPTY_CONTENT]: 'Cannot publish page without content. Add at least one section or block before publishing.',
  [GuardrailReasonCode.MISSING_TITLE]: 'Page title is required. Add a title to your page before publishing.',
  [GuardrailReasonCode.MISSING_SLUG]: 'Page slug is required. Add a slug to your page before publishing.',
  [GuardrailReasonCode.INVALID_SLUG]: 'Invalid slug format. Slug can only contain lowercase letters, numbers, and hyphens.',
  [GuardrailReasonCode.NO_DRAFT_PAGES]: 'No draft pages to publish. Create or edit pages in draft environment first.',
  [GuardrailReasonCode.ALREADY_PUBLISHED]: 'Page is already published with the same content. No changes detected.',
  
  [GuardrailReasonCode.MISSING_CONTENT]: 'Cannot publish without content. Provide either draftId or content object.',
  [GuardrailReasonCode.EMPTY_DRAFT]: 'Draft has no content. Edit the draft and add content before publishing.',
  [GuardrailReasonCode.INCOMPLETE_CONTENT]: 'Missing content for selected channels. Add content for all selected channels.',
  [GuardrailReasonCode.NO_CHANNELS_SELECTED]: 'At least one channel must be selected. Select at least one channel to publish to.',
  [GuardrailReasonCode.MISSING_CONNECTIONS]: 'Social media accounts not connected. Connect accounts before publishing.',
  [GuardrailReasonCode.DRAFT_NOT_READY]: 'Draft is not ready for publishing. Mark it as ready before publishing.',
  [GuardrailReasonCode.NO_PUBLISHED_PAGES]: 'No published pages available. Publish at least one page before creating marketing content.',
  
  [GuardrailReasonCode.NO_PAGE_ID]: 'No page selected. Select a page to edit, or create a new one.',
  [GuardrailReasonCode.MODULE_DISABLED]: 'Publish blocked because required modules are disabled. Enable required modules before publishing.',
  [GuardrailReasonCode.MISSING_ALT]: 'Image blocks require alt text before publishing.',
  
  [GuardrailReasonCode.MISSING_SEO_META]: 'SEO metadata is missing. Adding meta title and description will improve SEO.',
};





