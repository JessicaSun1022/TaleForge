const editor = document.getElementById('editor');
const wc = document.getElementById('wc');
const cc = document.getElementById('cc');
const treeRoot = document.getElementById('tree-root');
const pathBarCurrent = document.querySelector('#path-bar .current');
const tabStrip = document.getElementById('tab-strip');
const newTabBtn = tabStrip.querySelector('.tab-new');

let currentDocName = (
  document.querySelector('#tab-strip .tab.active .tab-title')?.textContent ||
  'Chapter 2'
).trim();

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function storageKey(name) {
  return 'tf:doc:' + slugify(name);
}

/* ---------- Word/char counts ---------- */
function updateCounts() {
  const text = editor.innerText || '';
  const words = (text.trim().match(/\S+/g) || []).length;
  const chars = text.replace(/\s/g, '').length;
  wc.textContent = 'Words: ' + words;
  cc.textContent = 'Chars: ' + chars;
}

/* ---------- Load/Save (preserve formatting) ---------- */
function loadDoc(name) {
  const key = storageKey(name);
  const saved = localStorage.getItem(key);
  if (saved != null) {
    editor.innerHTML = saved;
  } else {
    editor.innerHTML = `<h1>${name}</h1><p>Start writing here…</p>`;
  }
  currentDocName = name;
  pathBarCurrent.textContent = name;

  const activeTabTitle = document.querySelector('#tab-strip .tab.active .tab-title');
  if (activeTabTitle) activeTabTitle.textContent = name;

  updateCounts();
}
function saveDoc() {
  localStorage.setItem(storageKey(currentDocName), editor.innerHTML);
}

editor.addEventListener('input', () => {
  updateCounts();
  saveDoc();
});

/* ---------- Toolbar actions ---------- */
function exec(cmd) {
  document.execCommand(cmd, false, null);
  editor.focus();
  updateCounts();
  saveDoc();
}

document.querySelectorAll('.tool[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => exec(btn.dataset.cmd));
});

document.getElementById('btn-undo')?.addEventListener('click', () => exec('undo'));
document.getElementById('btn-redo')?.addEventListener('click', () => exec('redo'));

/* Download plaintext */
document.getElementById('btn-download')?.addEventListener('click', () => {
  const blob = new Blob([editor.innerText], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (currentDocName || 'document') + '.txt';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.addEventListener('keydown', (e) => {
  if (!e.ctrlKey && !e.metaKey) return;
  const k = e.key.toLowerCase();
  if (k === 'b') { e.preventDefault(); exec('bold'); }
  if (k === 'i') { e.preventDefault(); exec('italic'); }
  if (k === 'u') { e.preventDefault(); exec('underline'); }
});

/* ---------- File tree interactions ---------- */
treeRoot.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;

  // Toggle folder
  if (li.classList.contains('folder') && !e.target.closest('li.file')) {
    li.classList.toggle('open'); 
    return;
  }

  // Open file
  if (li.classList.contains('file')) {
    treeRoot.querySelectorAll('.file').forEach(f => f.classList.remove('active'));
    li.classList.add('active');

    const name = li.textContent.trim();
    const tab = findTabByTitle(name) || createTab(name);
    activateTab(tab);
    loadDoc(name);
  }
});

function findTabByTitle(name) {
  const tabs = tabStrip.querySelectorAll('.tab');
  for (const t of tabs) {
    const title = t.querySelector('.tab-title')?.textContent?.trim();
    if (title === name) return t;
  }
  return null;
}

/* ---------- Tabs ---------- */
function clearActiveTabs() {
  tabStrip.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
}
function activateTab(tabEl) {
  clearActiveTabs();
  tabEl.classList.add('active');
  const name = tabEl.querySelector('.tab-title').textContent.trim();
  currentDocName = name;
  pathBarCurrent.textContent = name;
}
function createTab(name) {
  const tab = document.createElement('button');
  tab.className = 'tab active';
  tab.innerHTML = `
    <span class="tab-title">${name}</span>
    <span class="tab-close" aria-label="Close">×</span>
  `;
  tabStrip.insertBefore(tab, newTabBtn);
  return tab;
}

tabStrip.addEventListener('click', (e) => {
  const closeBtn = e.target.closest('.tab-close');
  const tab = e.target.closest('.tab');

  if (closeBtn && tab) {
    const isActive = tab.classList.contains('active');

    let sibling = tab.previousElementSibling;
    while (sibling && !sibling.classList.contains('tab')) sibling = sibling.previousElementSibling;
    if (!sibling) {
      sibling = tab.nextElementSibling;
      while (sibling && !sibling.classList.contains('tab')) sibling = sibling.nextElementSibling;
    }

    tab.remove();

    if (isActive && sibling) {
      activateTab(sibling);
      const name = sibling.querySelector('.tab-title').textContent.trim();
      loadDoc(name);
    }
    return;
  }

  if (tab && !closeBtn) {
    activateTab(tab);
    const name = tab.querySelector('.tab-title').textContent.trim();
    loadDoc(name);
  }
});

/* New tab button -> create "Untitled N" */
newTabBtn.addEventListener('click', () => {
  let i = 1, name;
  do { name = `Untitled ${i++}`; } while (findTabByTitle(name));

  const tab = createTab(name);
  activateTab(tab);
  loadDoc(name);

  const writingFolder = Array.from(treeRoot.querySelectorAll('li.folder'))
    .find(f => /^writing/i.test(f.firstChild?.textContent || f.textContent));
  if (writingFolder) {
    let inner = writingFolder.querySelector('ul');
    if (!inner) { inner = document.createElement('ul'); writingFolder.appendChild(inner); }
    const li = document.createElement('li');
    li.className = 'file';
    li.textContent = name;
    inner.appendChild(li);
  }
});

/* ---------- Init ---------- */
function init() {
  const activeFile = treeRoot.querySelector('.file.active') || treeRoot.querySelector('.file');
  if (activeFile) {
    const name = activeFile.textContent.trim();
    const tab = findTabByTitle(name) || createTab(name);
    activateTab(tab);
    loadDoc(name);
  } else {
    loadDoc(currentDocName);
  }
  updateCounts();
}
init();

window.addEventListener('beforeunload', saveDoc);