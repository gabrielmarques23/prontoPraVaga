window.PPV = window.PPV || {};
window.PPV.renderer = (function () {
  const MIN_SCALE = 0.9;
  const SCALE_STEP = 0.02;
  // Espaçamento extra máximo (em px) aplicado entre seções quando sobra folha.
  const MAX_RESPIRO = 40;
  // Margem de segurança para o espaçamento não estourar na impressão (296,8 mm).
  const RESPIRO_SAFETY = 3;

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
    output.style.setProperty('--respiro', '0px');
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

  function fits(sheet, slackPx) {
    const available = sheet.getBoundingClientRect().height;
    const previousHeight = sheet.style.height;
    // Com a altura fixa da folha, scrollHeight nunca fica menor que a folha.
    // Medir com altura automática revela o espaço realmente ocupado.
    sheet.style.height = 'auto';
    const used = sheet.getBoundingClientRect().height;
    sheet.style.height = previousHeight;
    return used <= available - (slackPx || 0) + 0.5;
  }

  function setScale(sheet, scale) {
    sheet.style.setProperty('--escala', String(scale));
  }

  function setRespiro(sheet, px) {
    sheet.style.setProperty('--respiro', px + 'px');
  }

  function fit() {
    const sheet = document.getElementById('curriculoOutput');
    if (!sheet || sheet.classList.contains('hidden')) return true;
    const status = document.getElementById('statusPagina');

    let scale = 1;
    let respiro = 0;
    setScale(sheet, scale);
    setRespiro(sheet, respiro);

    if (fits(sheet)) {
      // Currículo curto: procura o maior espaçamento que ainda caiba na folha,
      // para o conteúdo não ficar espremido no topo com a metade de baixo vazia.
      let low = 0;
      let high = MAX_RESPIRO;
      while (low <= high) {
        const mid = Math.round((low + high) / 2);
        setRespiro(sheet, mid);
        if (fits(sheet, RESPIRO_SAFETY)) {
          respiro = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      setRespiro(sheet, respiro);
    } else {
      // Currículo longo: mantém o espaçamento base e reduz a fonte até caber.
      while (scale > MIN_SCALE && !fits(sheet)) {
        scale = Math.max(MIN_SCALE, scale - SCALE_STEP);
        setScale(sheet, scale);
      }
    }

    const ok = fits(sheet);
    sheet.classList.toggle('cv-overflow', !ok);
    document.documentElement.classList.toggle('cv-overflow', !ok);
    if (status) {
      if (ok && scale < 1) {
        status.textContent = '✓ O currículo cabe em uma página A4 (ajustado para ' + Math.round(scale * 100) + '%).';
        status.className = 'text-sm text-green-800';
      } else if (ok && respiro > 0) {
        status.textContent = '✓ O currículo cabe em uma página A4, com o espaçamento ampliado para preencher melhor a folha.';
        status.className = 'text-sm text-green-800';
      } else if (ok) {
        status.textContent = '✓ O currículo cabe em uma página A4.';
        status.className = 'text-sm text-green-800';
      } else {
        status.textContent = '⚠ O currículo ainda excede uma página. Ele será impresso em mais de uma página para não cortar o conteúdo — reduza o texto para caber em uma.';
        status.className = 'text-sm text-amber-800';
      }
    }
    return ok;
  }

  function clear() {
    const output = document.getElementById('curriculoOutput');
    if (!output) return;
    output.replaceChildren();
    output.className = 'hidden';
    output.style.removeProperty('--escala');
    output.style.removeProperty('--respiro');
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
