import { el } from '../../ui/dom.js';

export function buildPhotographerReview({ locale, review, milestones, onResolve, onReset }) {
  const copy = locale.review;
  const labels = new Map((milestones?.rows || []).map((row) => [row.key, row.title]));
  const open = review.comments.filter((comment) => comment.status !== 'resolved').length;
  const list = el('div', { class: 'photographer-review-list' });
  review.comments.forEach((comment) => {
    const toggle = el('button', {
      type: 'button',
      class: 'btn-ghost',
      text: comment.status === 'resolved' ? copy.reopen : copy.resolve,
    });
    toggle.addEventListener('click', () =>
      onResolve(comment.id, comment.status === 'resolved' ? 'open' : 'resolved'),
    );
    list.appendChild(
      el('article', { class: comment.status === 'resolved' ? 'is-resolved' : '' }, [
        el('div', { class: 'photographer-review-meta' }, [
          el('span', { text: comment.kind === 'change_request' ? copy.requestChange : copy.comment }),
          el('span', {
            text: comment.itemKey ? labels.get(comment.itemKey) || copy.timelineItem : copy.generalFeedback,
          }),
        ]),
        el('blockquote', { text: comment.body }),
        el('footer', {}, [el('span', { text: comment.authorName }), toggle]),
      ]),
    );
  });
  const reset = el('button', { type: 'button', class: 'btn-ghost', text: copy.resetReview });
  reset.addEventListener('click', onReset);
  return el('section', { class: 'photographer-review' }, [
    el('div', { class: 'photographer-review-heading' }, [
      el('div', {}, [
        el('p', { class: 'journey-studio-kicker', text: copy.photographerKicker }),
        el('h3', { text: copy.photographerTitle }),
        el('p', {
          text: review.comments.length ? copy.openFeedback(open, review.comments.length) : copy.noFeedback,
        }),
      ]),
      el('div', {}, [
        el('span', { class: `couple-review-status is-${review.status}`, text: copy.status[review.status] }),
        review.status !== 'open' ? reset : null,
      ]),
    ]),
    list,
  ]);
}
