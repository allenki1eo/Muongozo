(() => {
  const workflows = window.MUONGOZO_WORKFLOWS || [];
  if (!workflows.length) return;

  const pickWorkflow = () => workflows.find((wf) =>
    (wf.match?.urlIncludes || []).some((token) => location.href.toLowerCase().includes(token))
  );

  const workflow = pickWorkflow();
  if (!workflow) return;

  const root = document.createElement('aside');
  root.id = 'muongozo-panel';
  root.innerHTML = `
    <header>
      <strong>Muongozo</strong>
      <span>${workflow.name}</span>
    </header>
    <div id="muongozo-step"></div>
    <footer>
      <button id="muongozo-prev">Back</button>
      <button id="muongozo-next">Next</button>
    </footer>
  `;
  document.body.appendChild(root);

  let current = 0;
  let activeHighlight;

  const clearHighlight = () => {
    if (activeHighlight) activeHighlight.classList.remove('muongozo-highlight');
    activeHighlight = null;
  };

  const render = () => {
    const step = workflow.steps[current];
    const stepNode = root.querySelector('#muongozo-step');
    stepNode.textContent = `${current + 1}/${workflow.steps.length}: ${step.text}`;

    clearHighlight();
    const el = step.selector ? document.querySelector(step.selector) : null;
    if (el) {
      activeHighlight = el;
      el.classList.add('muongozo-highlight');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  root.querySelector('#muongozo-prev').addEventListener('click', () => {
    current = Math.max(0, current - 1);
    render();
  });

  root.querySelector('#muongozo-next').addEventListener('click', () => {
    current = Math.min(workflow.steps.length - 1, current + 1);
    render();
  });

  render();
})();
