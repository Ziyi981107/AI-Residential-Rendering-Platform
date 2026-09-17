const form = document.querySelector('#render-form');
const generateButton = document.querySelector('#generate');
const active = document.querySelector('#active');
const historyList = document.querySelector('#history-list');
let activeTaskId = null;
let pollTimer = null;

const ERROR_MESSAGES = Object.freeze({
  MISSING_STRUCTURE_IMAGE: '请先上传结构参考图。',
  MISSING_STYLE_IMAGE: '请先上传风格参考图。',
  UNSUPPORTED_IMAGE: '图片格式不受支持，请上传 PNG、JPEG、WebP 或 GIF 图片。',
  IMAGE_TOO_LARGE: '图片过大，请更换较小的图片。',
  INSTRUCTION_TOO_LONG: '补充要求过长，请控制在 4,000 个字符以内。',
  PROVIDER_NOT_CONFIGURED: '图像生成服务尚未配置，请联系演示负责人。',
  PROVIDER_TIMEOUT: '生成服务响应超时，请稍后重试。',
  PROVIDER_NETWORK_ERROR: '暂时无法连接生成服务，请稍后重试。',
  PROVIDER_RATE_LIMIT: '当前生成服务较繁忙，请稍后重试。',
  PROVIDER_4XX: '生成服务暂时无法处理请求，请稍后重试。',
  PROVIDER_5XX: '生成服务暂时不可用，请稍后重试。',
  PROVIDER_MALFORMED_RESPONSE: '生成服务返回了无效结果，请稍后重试。',
  PROVIDER_EMPTY_OUTPUT: '生成服务没有返回图片，请稍后重试。',
  PROVIDER_OUTPUT_DOWNLOAD_FAILED: '生成结果暂时无法获取，请稍后重试。',
  DEMO_IMAGE_NOT_FOUND: '演示图片暂不可用，请联系演示负责人。',
  DEMO_IMAGE_READ_FAILED: '演示图片暂不可用，请联系演示负责人。',
  DEMO_IMAGE_EMPTY: '演示图片暂不可用，请联系演示负责人。',
  TASK_NOT_FOUND: '未找到该生成记录，请刷新后重试。',
  ASSET_NOT_FOUND: '结果图片暂不可用，请稍后重试。',
  ASSET_FORBIDDEN: '结果图片暂不可用，请稍后重试。',
  REQUEST_TOO_LARGE: '上传内容过大，请更换较小的图片。'
});

async function loadProviderMode() {
  const response = await fetch('/api/health');
  if (!response.ok) return;
  const health = await response.json();
  if (health.demo_mode) document.querySelector('#provider-mode').classList.remove('hidden');
}

for (const input of document.querySelectorAll('input[type=file]')) input.addEventListener('change', () => {
  const preview = input.closest('.dropzone').querySelector('.preview');
  const file = input.files[0];
  if (file) preview.src = URL.createObjectURL(file);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  generateButton.disabled = true;
  generateButton.textContent = '正在创建任务……';
  try {
    if (!form.elements.structure_image.files[0]) return renderMessage('请先上传结构参考图。');
    if (!form.elements.style_image.files[0]) return renderMessage('请先上传风格参考图。');
    const response = await fetch('/api/render-tasks', { method: 'POST', body: new FormData(form) });
    const task = await response.json();
    if (!response.ok) return renderMessage(friendlyError(task.error));
    activeTaskId = task.id;
    renderActive(task);
    await refreshHistory();
    beginPolling();
  } catch (error) { renderMessage(friendlyError(error)); }
  finally { generateButton.disabled = false; generateButton.innerHTML = '开始生成 <span>↗</span>'; }
});

document.querySelector('#refresh').addEventListener('click', refreshHistory);

async function refreshHistory() {
  const response = await fetch('/api/render-tasks');
  const payload = await response.json();
  historyList.innerHTML = payload.tasks.length ? payload.tasks.map(task => `<article class="history-item" data-id="${task.id}"><div><div class="history-title">住宅效果图</div><div class="history-meta">${new Date(task.created_at).toLocaleString('zh-CN')}</div></div><div class="history-meta">${friendlyStatus(task.status)}</div>${task.outputs.length ? `<img class="history-thumb" src="${task.outputs[0].url}" alt="生成结果缩略图" />` : '<div></div>'}</article>`).join('') : '<p class="empty">暂无生成记录</p>';
  for (const item of historyList.querySelectorAll('.history-item')) item.addEventListener('click', () => loadTask(item.dataset.id));
}

async function loadTask(id) { const response = await fetch(`/api/render-tasks/${id}`); const task = await response.json(); activeTaskId = task.id; renderActive(task); if (task.status === 'CREATED' || task.status === 'VALIDATING' || task.status === 'GENERATING') beginPolling(); }

function beginPolling() { clearInterval(pollTimer); pollTimer = setInterval(async () => { if (!activeTaskId) return; const response = await fetch(`/api/render-tasks/${activeTaskId}`); const task = await response.json(); renderActive(task); if (['SUCCEEDED', 'FAILED'].includes(task.status)) { clearInterval(pollTimer); refreshHistory(); } }, 1800); }

function renderActive(task) {
  active.classList.remove('hidden');
  const running = ['CREATED', 'VALIDATING', 'GENERATING'].includes(task.status);
  const failed = task.status === 'FAILED';
  active.innerHTML = `<div class="task-status"><span class="dot ${failed ? 'failure' : ''}"></span><span>${running ? '正在生成效果图，请稍候……' : failed ? `生成失败：${escapeHtml(friendlyError(task.error))}` : '生成完成'}</span></div>${task.outputs.length ? `<div class="result"><h3>生成结果</h3><img src="${task.outputs[0].url}" alt="生成的住宅效果图" /><div class="card-actions"><a id="download-result" href="${task.outputs[0].url}?download=1">下载图片 ↓</a><button type="button" id="regenerate">重新生成 ↻</button></div></div>` : failed ? '<div class="card-actions"><button type="button" id="regenerate">重新生成 ↻</button></div>' : ''}`;
  document.querySelector('#regenerate')?.addEventListener('click', regenerate);
}

async function regenerate() {
  const button = document.querySelector('#regenerate');
  button.disabled = true;
  button.textContent = '正在创建新任务……';
  try {
    const response = await fetch(`/api/render-tasks/${activeTaskId}/regenerate`, { method: 'POST' });
    const task = await response.json();
    if (!response.ok) return renderMessage(friendlyError(task.error));
    activeTaskId = task.id;
    renderActive(task);
    beginPolling();
    refreshHistory();
  } catch (error) { renderMessage(friendlyError(error)); }
}
function renderMessage(message) { active.classList.remove('hidden'); active.innerHTML = `<div class="task-status"><span class="dot failure"></span><span>${escapeHtml(message)}</span></div>`; }
function friendlyStatus(status) { return ({ CREATED: '已创建', VALIDATING: '正在检查输入', GENERATING: '正在生成', SUCCEEDED: '生成完成', FAILED: '生成失败' })[status] ?? '处理中'; }
function friendlyError(error) { return ERROR_MESSAGES[error?.code] ?? '操作失败，请稍后重试。'; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }

loadProviderMode().catch(() => {});
refreshHistory().catch(() => {});
