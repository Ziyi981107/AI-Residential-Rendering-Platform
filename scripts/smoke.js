const baseUrl = process.env.SMOKE_URL ?? `http://localhost:${process.env.PORT ?? '3000'}`;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const form = new FormData();
form.append('structure_image', new Blob([png], { type: 'image/png' }), 'structure.png');
form.append('style_image', new Blob([png], { type: 'image/png' }), 'style.png');
form.append('user_instruction', 'Smoke test');
const create = await fetch(`${baseUrl}/api/render-tasks`, { method: 'POST', body: form });
const task = await create.json();
if (!create.ok) throw new Error(JSON.stringify(task));
console.log(`Created ${task.id} (${task.status})`);
for (;;) {
  await new Promise(resolve => setTimeout(resolve, 500));
  const response = await fetch(`${baseUrl}/api/render-tasks/${task.id}`);
  const current = await response.json();
  console.log(`${current.id}: ${current.status}`);
  if (current.status === 'SUCCEEDED') { console.log(`Output: ${baseUrl}${current.outputs[0].url}`); break; }
  if (current.status === 'FAILED') { console.error(current.error); process.exitCode = 1; break; }
}
