import { el } from '../../ui/dom.js';
import { toast } from '../../ui/feedback.js';

const NAME_KEY = 'kach-couple-review-name';

function storedName() {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

function rememberName(name) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* optional convenience only */
  }
}

function statusLabel(copy, status) {
  return copy.status[status] || copy.status.open;
}

function commentComposer({ copy, itemKey, itemTitle, nameInput, onSubmit, onClose }) {
  const body = el('textarea', {
    rows: '3',
    maxlength: '2000',
    placeholder: itemKey ? copy.commentPlaceholder : copy.changePlaceholder,
    'aria-label': copy.commentPlaceholder,
  });
  const kind = el('select', { 'aria-label': copy.commentType }, [
    el('option', { value: 'comment', text: copy.comment }),
    el('option', { value: 'change_request', text: copy.requestChange }),
  ]);
  if (!itemKey) kind.value = 'change_request';
  const submit = el('button', { type: 'button', class: 'btn-primary', text: copy.send });
  const close = el('button', { type: 'button', class: 'btn-ghost', text: copy.cancel });
  const composer = el('div', { class: 'couple-comment-composer' }, [
    el('p', { text: itemTitle || copy.generalFeedback }),
    body,
    el('div', { class: 'couple-comment-actions' }, [kind, close, submit]),
  ]);
  close.addEventListener('click', onClose);
  submit.addEventListener('click', async () => {
    const authorName = nameInput.value.trim();
    const commentBody = body.value.trim();
    if (!authorName) {
      nameInput.focus();
      toast(copy.nameRequired, { type: 'error' });
      return;
    }
    if (!commentBody) {
      body.focus();
      return;
    }
    submit.disabled = true;
    rememberName(authorName);
    try {
      await onSubmit({
        action: 'comment',
        authorName,
        body: commentBody,
        kind: kind.value,
        itemKey,
      });
      toast(copy.sent, { type: 'success' });
    } catch {
      submit.disabled = false;
      toast(copy.failed, { type: 'error' });
    }
  });
  queueMicrotask(() => body.focus());
  return composer;
}

export function mountCoupleReview(out, locale, review, onSubmit) {
  const copy = locale.review;
  const nameInput = el('input', {
    type: 'text',
    maxlength: '120',
    value: storedName(),
    placeholder: copy.namePlaceholder,
    'aria-label': copy.yourName,
  });
  const itemTitles = new Map();
  out.querySelectorAll('.item[data-item-key]').forEach((item) => {
    const itemKey = item.dataset.itemKey;
    const title = item.querySelector('.title')?.textContent || itemKey;
    itemTitles.set(itemKey, title);
    const comments = review.comments.filter((comment) => comment.itemKey === itemKey);
    const button = el('button', {
      type: 'button',
      class: 'couple-item-comment',
      text: comments.length ? `${copy.comment} · ${comments.length}` : copy.comment,
      'aria-label': `${copy.comment}: ${title}`,
    });
    button.addEventListener('click', () => {
      out.querySelector('.couple-comment-composer')?.remove();
      const composer = commentComposer({
        copy,
        itemKey,
        itemTitle: title,
        nameInput,
        onSubmit,
        onClose: () => composer.remove(),
      });
      item.appendChild(composer);
    });
    item.appendChild(button);
  });

  const comments = el('div', { class: 'couple-review-comments' });
  review.comments.forEach((comment) => {
    comments.appendChild(
      el('article', { class: comment.status === 'resolved' ? 'is-resolved' : '' }, [
        el('div', {}, [
          el('strong', { text: comment.authorName }),
          el('span', {
            text: comment.itemKey
              ? itemTitles.get(comment.itemKey) || copy.timelineItem
              : copy.generalFeedback,
          }),
        ]),
        el('p', { text: comment.body }),
      ]),
    );
  });

  const approve = el('button', {
    type: 'button',
    class: 'btn-primary',
    text: review.status === 'approved' ? copy.approved : copy.approve,
    ...(review.status === 'approved' ? { disabled: '' } : {}),
  });
  const request = el('button', { type: 'button', class: 'btn-ghost', text: copy.requestChange });
  const panel = el('section', { class: `couple-review-panel is-${review.status}` }, [
    el('div', { class: 'couple-review-heading' }, [
      el('div', {}, [
        el('p', { class: 'couple-review-kicker', text: copy.kicker }),
        el('h2', { text: copy.title }),
        el('p', { text: copy.intro }),
      ]),
      el('span', { class: 'couple-review-status', text: statusLabel(copy, review.status) }),
    ]),
    el('label', { class: 'couple-review-name' }, [el('span', { text: copy.yourName }), nameInput]),
    el('div', { class: 'couple-review-actions' }, [request, approve]),
    review.comments.length ? el('h3', { text: copy.conversation }) : null,
    comments,
  ]);

  approve.addEventListener('click', async () => {
    const authorName = nameInput.value.trim();
    if (!authorName) {
      nameInput.focus();
      toast(copy.nameRequired, { type: 'error' });
      return;
    }
    approve.disabled = true;
    rememberName(authorName);
    try {
      await onSubmit({ action: 'decision', status: 'approved', authorName });
      toast(copy.approvedToast, { type: 'success' });
    } catch {
      approve.disabled = false;
      toast(copy.failed, { type: 'error' });
    }
  });
  request.addEventListener('click', () => {
    panel.querySelector('.couple-comment-composer')?.remove();
    const composer = commentComposer({
      copy,
      itemKey: null,
      itemTitle: copy.generalFeedback,
      nameInput,
      onSubmit,
      onClose: () => composer.remove(),
    });
    panel.insertBefore(composer, comments);
  });
  out.appendChild(panel);
}
