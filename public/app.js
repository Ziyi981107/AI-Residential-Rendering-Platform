const form = document.querySelector('#render-form');
const generateButton = document.querySelector('#generate');
const active = document.querySelector('#active');
const historyList = document.querySelector('#history-list');
let activeTaskId = null;
let pollTimer = null;

for (const input of document.querySelectorAll('input[type=file]')) input.addEventListener('change', () => {
  const preview = input.closest('.dropzone').querySelector('.preview');
  const file = input.files[0];
  if (file) preview.src = URL.createObjectURL(file);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  generateButton.disabled = true;
  generateButton.textContent = 'Creating task…';
  try {
    const response = await fetch('/api/render-tasks', { method: 'POST', body: new FormData(form) });
    const task = await response.json();
    if (!response.ok) throw new Error(task.error?.message ?? 'Could not create task.');
    activeTaskId = task.id;
    renderActive(task);
    await refreshHistory();
    beginPolling();
  } catch (error) { renderMessage(error.message, true); }
  finally { generateButton.disabled = false; generateButton.innerHTML = 'Generate render <span>↗</span>'; }
});

document.querySelector('#refresh').addEventListener('click', refreshHistory);

async function refreshHistory() {
  const response = await fetch('/api/render-tasks');
  const payload = await response.json();
  historyList.innerHTML = payload.tasks.length ? payload.tasks.map(task => `<article class="history-item" data-id="${task.id}"><div><div class="history-title">Residential render</div><div class="history-meta">${new Date(task.created_at).toLocaleString()}</div></div><div class="history-meta">${friendlyStatus(task.status)}</div>${task.outputs.length ? `<img class="history-thumb" src="${task.outputs[0].url}" alt="Render thumbnail" />` : '<div></div>'}</article>`).join('') : '<p class="empty">No renders yet. Your next study will appear here.</p>';
  for (const item of historyList.querySelectorAll('.history-item')) item.addEventListener('click', () => loadTask(item.dataset.id));
}

async function loadTask(id) { const response = await fetch(`/api/render-tasks/${id}`); const task = await response.json(); activeTaskId = task.id; renderActive(task); if (task.status === 'CREATED' || task.status === 'VALIDATING' || task.status === 'GENERATING') beginPolling(); }

function beginPolling() { clearInterval(pollTimer); pollTimer = setInterval(async () => { if (!activeTaskId) return; const response = await fetch(`/api/render-tasks/${activeTaskId}`); const task = await response.json(); renderActive(task); if (['SUCCEEDED', 'FAILED'].includes(task.status)) { clearInterval(pollTimer); refreshHistory(); } }, 1800); }

function renderActive(task) {
  active.classList.remove('hidden');
  const running = ['CREATED', 'VALIDATING', 'GENERATING'].includes(task.status);
  const failed = task.status === 'FAILED';
  active.innerHTML = `<div class="task-status"><span class="dot ${failed ? 'failure' : ''}"></span><span>${running ? 'Rendering in progress — this can take a little while.' : failed ? `Generation failed: ${escapeHtml(task.error?.message ?? 'Please try again.')}` : 'Render ready'}</span></div>${task.outputs.length ? `<div class="result"><img src="${task.outputs[0].url}" alt="Generated residential render" /><div class="card-actions"><a href="${task.outputs[0].url}?download=1">Download image ↓</a><button type="button" id="regenerate">Regenerate ↻</button></div></div>` : failed ? '<div class="card-actions"><button type="button" id="regenerate">Try again ↻</button></div>' : ''}`;
  document.querySelector('#regenerate')?.addEventListener('click', regenerate);
}

async function regenerate() { const button = document.querySelector('#regenerate'); button.disabled = true; button.textContent = 'Creating new attempt…'; const response = await fetch(`/api/render-tasks/${activeTaskId}/regenerate`, { method: 'POST' }); const task = await response.json(); if (response.ok) { activeTaskId = task.id; renderActive(task); beginPolling(); refreshHistory(); } else renderMessage(task.error?.message ?? 'Could not regenerate.', true); }
function renderMessage(message) { active.classList.remove('hidden'); active.innerHTML = `<div class="task-status"><span class="dot failure"></span><span>${escapeHtml(message)}</span></div>`; }
function friendlyStatus(status) { return ({ CREATED: 'Queued', VALIDATING: 'Validating', GENERATING: 'Generating', SUCCEEDED: 'Success', FAILED: 'Failed' })[status] ?? status; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }

refreshHistory().catch(() => {});
