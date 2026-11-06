window.PPV = window.PPV || {};
window.PPV.renderer = (function () {
  const MIN_SCALE = 0.9;
  const SCALE_STEP = 0.02;

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
    document.documentElement.classList.add('cv-ready');

    const header = element('header', 'cv-header');
    header.appendChild(element('h1', '', text(cv.nome) || 'Currículo'));
    const contact = [text(cv.telefone), text(cv.email), text(cv.cidade)].filter(Boolean).join(' • ');
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
    addSection(output, 'Cursos e certificações', list(cv.cursos).slice(0, 5));
    addSection(output, 'Diferenciais', list(cv.diferenciais).slice(0, 5));
    output.classList.remove('hidden');
    requestAnimationFrame(fit);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fit).catch(function () { /* fonte do sistema */ });
    }
    return output;
  }

  function fit() {
    const sheet = document.getElementById('curriculoOutput');
    if (!sheet || sheet.classList.contains('hidden')) return true;
    const status = document.getElementById('statusPagina');
    let scale = 1;
    sheet.style.setProperty('--escala', String(scale));
    let fits = sheet.scrollHeight <= sheet.clientHeight + 1;
    for (let i = 0; i < 10 && !fits; i += 1) {
      if (scale <= MIN_SCALE) break;
      scale = Math.max(MIN_SCALE, scale - SCALE_STEP);
      sheet.style.setProperty('--escala', String(scale));
      fits = sheet.scrollHeight <= sheet.clientHeight + 1;
    }
    fits = sheet.scrollHeight <= sheet.clientHeight + 1;
    sheet.classList.toggle('cv-overflow', !fits);
    document.documentElement.classList.toggle('cv-overflow', !fits);
    if (status) {
      if (fits && scale < 1) {
        status.textContent = '✓ O currículo cabe em uma página A4 (ajustado para ' + Math.round(scale * 100) + '%).';
        status.className = 'text-sm text-green-800';
      } else if (fits) {
        status.textContent = '✓ O currículo cabe em uma página A4.';
        status.className = 'text-sm text-green-800';
      } else {
        status.textContent = '⚠ O currículo ainda excede uma página. Ele será impresso em mais de uma página para não cortar o conteúdo — reduza o texto para caber em uma.';
        status.className = 'text-sm text-amber-800';
      }
    }
    return fits;
  }

  function clear() {
    const output = document.getElementById('curriculoOutput');
    if (!output) return;
    output.replaceChildren();
    output.className = 'hidden';
    output.style.removeProperty('--escala');
    output.removeAttribute('aria-label');
    document.documentElement.classList.remove('cv-ready', 'cv-overflow');
    const status = document.getElementById('statusPagina');
    if (status) {
      status.textContent = '';
      status.className = 'text-sm';
    }
  }

  function asPlainText() {
    const output = document.getElementById('curriculoOutput');
    return output.innerText || output.textContent || '';
  }

  return { render, fit, clear, asPlainText };
})();
