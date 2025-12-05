'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { TextInput } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { submitContentForReview, reviewContent, getContentReviewHistory, createContentComment, getContentComments, updateContentComment, deleteContentComment } from '@/lib/api';
import type { ContentEntry } from '@/lib/api';

interface ContentWorkflowProps {
  tenantId: string;
  contentTypeSlug: string;
  entry: ContentEntry;
  canEdit: boolean;
  canReview: boolean;
  onUpdate: () => void;
}

export function ContentWorkflow({ tenantId, contentTypeSlug, entry, canEdit, canReview, onUpdate }: ContentWorkflowProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [reviewHistory, setReviewHistory] = useState<any[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'changes_requested'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();

  const loadComments = async () => {
    try {
      const data = await getContentComments(tenantId, contentTypeSlug, entry.id, true);
      setComments(data);
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to load comments' });
    }
  };

  const loadReviewHistory = async () => {
    try {
      const data = await getContentReviewHistory(tenantId, contentTypeSlug, entry.id);
      setReviewHistory(data);
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to load review history' });
    }
  };

  const handleSubmitForReview = async () => {
    if (!confirm('Submit this entry for review?')) return;
    setSubmitting(true);
    try {
      await submitContentForReview(tenantId, contentTypeSlug, entry.id);
      push({ tone: 'success', message: 'Entry submitted for review' });
      onUpdate();
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to submit for review' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async () => {
    setSubmitting(true);
    try {
      await reviewContent(tenantId, contentTypeSlug, entry.id, reviewStatus, reviewComment || undefined);
      push({ tone: 'success', message: `Entry ${reviewStatus}` });
      setShowReviewModal(false);
      setReviewComment('');
      onUpdate();
      loadReviewHistory();
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to review entry' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await createContentComment(tenantId, contentTypeSlug, entry.id, newComment);
      push({ tone: 'success', message: 'Comment added' });
      setNewComment('');
      loadComments();
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to add comment' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveComment = async (commentId: string, resolved: boolean) => {
    try {
      await updateContentComment(tenantId, contentTypeSlug, entry.id, commentId, { resolved });
      loadComments();
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to update comment' });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await deleteContentComment(tenantId, contentTypeSlug, entry.id, commentId);
      push({ tone: 'success', message: 'Comment deleted' });
      loadComments();
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to delete comment' });
    }
  };

  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [showComments, entry.id]);

  useEffect(() => {
    if (entry.status === 'review' || reviewHistory.length > 0) {
      loadReviewHistory();
    }
  }, [entry.id, entry.status]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {canEdit && entry.status === 'draft' && (
        <Button variant="outline" onClick={handleSubmitForReview} disabled={submitting}>
          Submit for Review
        </Button>
      )}
      
      {canReview && entry.status === 'review' && (
        <Button variant="primary" onClick={() => setShowReviewModal(true)}>
          Review
        </Button>
      )}

      {canEdit && (
        <Button variant="outline" onClick={() => { setShowComments(!showComments); if (!showComments) loadComments(); }}>
          {showComments ? 'Hide' : 'Show'} Comments ({comments.filter(c => !c.resolved).length})
        </Button>
      )}

      {reviewHistory.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Review History ({reviewHistory.length})</summary>
          <div className="mt-2 space-y-2 text-xs">
            {reviewHistory.map((review) => (
              <div key={review.id} className="border-l-2 pl-2">
                <div className="font-medium">{review.status}</div>
                {review.comment && <div className="text-muted">{review.comment}</div>}
                <div className="text-muted">{new Date(review.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </details>
      )}

      {showComments && (
        <div className="w-full mt-4 border-t pt-4">
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className={`p-3 rounded ${comment.resolved ? 'bg-gray-50' : 'bg-blue-50'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm">{comment.content}</div>
                    <div className="text-xs text-muted mt-1">{new Date(comment.createdAt).toLocaleString()}</div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs btn btn-outline"
                        onClick={() => handleResolveComment(comment.id, !comment.resolved)}
                      >
                        {comment.resolved ? 'Unresolve' : 'Resolve'}
                      </button>
                      <button
                        className="text-xs btn btn-outline"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <textarea
                className="flex-1 border rounded p-2 text-sm"
                rows={2}
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <Button variant="primary" onClick={handleAddComment} disabled={submitting || !newComment.trim()}>
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal open={showReviewModal} onClose={() => setShowReviewModal(false)} title="Review Content">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              className="border rounded w-full p-2"
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as any)}
            >
              <option value="approved">Approve</option>
              <option value="rejected">Reject</option>
              <option value="changes_requested">Request Changes</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Comment (optional)</label>
            <textarea
              className="border rounded w-full p-2"
              rows={4}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Add a review comment..."
            />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowReviewModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleReview} disabled={submitting}>
              {submitting ? 'Reviewing...' : 'Submit Review'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

