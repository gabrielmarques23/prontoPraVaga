window.PPV = window.PPV || {};
window.PPV.renderer = (function () {
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function text(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function list(values) {
    return Array.isArray(values) ? values.map(text).filter(Boolean) : [];
  }

  function addSection(parent, title, content) {
    if (!content || (Array.isArray(content) && !content.length)) return;
    const section = element('section', 'cv-section');
    section.appendChild(element('h2', '', title));
    if (Array.isArray(content)) {
      const ul = element('ul');
      content.forEach(function (item) { ul.appendChild(element('li', '', item)); });
      section.appendChild(ul);
    } else {
      section.appendChild(element('p', '', content));
    }
    parent.appendChild(section);
  }

  function render(cv) {
    const output = document.getElementById('curriculoOutput');
    output.replaceChildren();
    output.className = 'cv-sheet';
    output.style.setProperty('--escala', '1');
    output.setAttribute('aria-label', 'Currículo gerado');

    const header = element('header', 'cv-header');
    header.appendChild(element('h1', '', text(cv.nome) || 'Currículo'));
    const contact = [text(cv.telefone), text(cv.cidade)].filter(Boolean).join(' • ');
    if (contact) header.appendChild(element('p', 'cv-contact', contact));
    output.appendChild(header);

    addSection(output, 'Objetivo profissional', text(cv.objetivo));
    addSection(output, 'Perfil profissional', text(cv.resumo));

    if (Array.isArray(cv.experiencias) && cv.experiencias.length) {
      const section = element('section', 'cv-section');
      section.appendChild(element('h2', '', 'Experiência profissional'));
      cv.experiencias.slice(0, 3).forEach(function (experience) {
        const item = element('article', 'cv-experience');
        const heading = [text(experience.cargo), text(experience.empresa)].filter(Boolean).join(' — ');
        if (heading) item.appendChild(element('h3', '', heading));
        if (text(experience.periodo)) item.appendChild(element('p', 'cv-period', text(experience.periodo)));
        const activities = list(experience.atividades);
        if (activities.length) {
          const ul = element('ul');
          activities.forEach(function (activity) { ul.appendChild(element('li', '', activity)); });
          item.appendChild(ul);
        }
        section.appendChild(item);
      });
      output.appendChild(section);
    }

    addSection(output, 'Habilidades e competências', list(cv.habilidades).slice(0, 8));
    addSection(output, 'Formação', text(cv.formacao));
    addSection(output, 'Cursos', list(cv.cursos));
    addSection(output, 'Diferenciais', list(cv.diferenciais));
    output.classList.remove('hidden');
    requestAnimationFrame(fit);
    return output;
  }

  function fit() {
    const sheet = document.getElementById('curriculoOutput');
    if (!sheet || sheet.classList.contains('hidden')) return true;
    const status = document.getElementById('statusPagina');
    let scale = 1;
    sheet.style.setProperty('--escala', String(scale));
    for (let i = 0; i < 9 && sheet.scrollHeight > sheet.clientHeight + 1; i += 1) {
      scale = Math.max(0.84, scale - 0.02);
      sheet.style.setProperty('--escala', String(scale));
      if (scale <= 0.84) break;
    }
    const fits = sheet.scrollHeight <= sheet.clientHeight + 1;
    if (status) {
      status.textContent = fits ? '✓ O currículo cabe em uma página A4.' : '⚠ O currículo ainda excede uma página. Reduza o conteúdo antes de imprimir.';
      status.className = fits ? 'text-sm text-green-800' : 'text-sm text-amber-800';
    }
    return fits;
  }

  function asPlainText() {
    const output = document.getElementById('curriculoOutput');
    return output.innerText || output.textContent || '';
  }

  return { render, fit, asPlainText };
})();
