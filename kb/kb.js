const STORAGE_KEY = 'muongozo_manuals_v1';

const fileInput = document.getElementById('pdf-input');
const statusNode = document.getElementById('status');
const searchNode = document.getElementById('search');
const resultsNode = document.getElementById('results');
const manualsNode = document.getElementById('manual-list');
const clearNode = document.getElementById('clear');

const getManuals = async () => {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
};

const setManuals = async (manuals) => {
  await chrome.storage.local.set({ [STORAGE_KEY]: manuals });
};

const extractPdfText = async (file) => {
  const buffer = await file.arrayBuffer();
  const loadingTask = globalThis.pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const pages = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    pages.push(pageText);
  }

  return pages.join('\n');
};

const renderManualList = async () => {
  const manuals = await getManuals();
  manualsNode.innerHTML = manuals.map((m) => `<li><strong>${m.name}</strong> (${m.pages} pages)</li>`).join('');
};

const searchManuals = async (query) => {
  const manuals = await getManuals();
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    resultsNode.innerHTML = '';
    return;
  }

  const matches = manuals
    .map((manual) => {
      const index = manual.text.toLowerCase().indexOf(normalized);
      if (index === -1) return null;
      const start = Math.max(0, index - 120);
      const end = Math.min(manual.text.length, index + normalized.length + 120);
      return { manual: manual.name, snippet: manual.text.slice(start, end).replace(/\s+/g, ' ') };
    })
    .filter(Boolean);

  resultsNode.innerHTML = matches.length
    ? matches.map((m) => `<article><h3>${m.manual}</h3><p>${m.snippet}</p></article>`).join('')
    : '<p>No results found.</p>';
};

fileInput.addEventListener('change', async (event) => {
  const files = [...event.target.files];
  if (!files.length) return;

  statusNode.textContent = `Processing ${files.length} file(s)...`;
  const manuals = await getManuals();

  for (const file of files) {
    const text = await extractPdfText(file);
    manuals.push({
      name: file.name,
      text,
      pages: (text.match(/\n/g) || []).length + 1,
      uploadedAt: new Date().toISOString()
    });
  }

  await setManuals(manuals);
  statusNode.textContent = `Stored ${files.length} manual(s).`;
  await renderManualList();
});

searchNode.addEventListener('input', (e) => searchManuals(e.target.value));

clearNode.addEventListener('click', async () => {
  await setManuals([]);
  statusNode.textContent = 'Knowledge base cleared.';
  resultsNode.innerHTML = '';
  await renderManualList();
});

renderManualList();
