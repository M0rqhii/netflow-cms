/**
 * Publish Validation (Backend)
 *
 * Uses shared validation from @repo/schemas.
 * This is the single source of truth — both frontend and backend
 * now use the same validation rules.
 */

export {
  validatePublishContent as validatePageBuilderContent,
  type PublishValidationError,
  type PublishValidationResult,
} from '@repo/schemas';
