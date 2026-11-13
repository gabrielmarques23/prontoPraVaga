window.PPV = window.PPV || {};
window.PPV.repeater = (function () {
  const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const MIN_YEAR = 1950;
  const CURRENT_YEAR = new Date().getFullYear();

  function fillMonths(select) {
    if (!select || select.dataset.ready === 'true') return;
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Mês';
    select.appendChild(placeholder);
    MONTHS.forEach(function (name, index) {
      const option = document.createElement('option');
      option.value = String(index + 1).padStart(2, '0');
      option.textContent = name;
      select.appendChild(option);
    });
    select.dataset.ready = 'true';
  }

  function field(item, name) {
    return item.querySelector('[data-field="' + name + '"]');
  }

  function value(item, name) {
    const input = field(item, name);
    if (!input) return '';
    return input.type === 'checkbox' ? input.checked : input.value.trim();
  }

  function setValue(item, name, val) {
    const input = field(item, name);
    if (!input) return;
    if (input.type === 'checkbox') {
      input.checked = Boolean(val);
    } else {
      input.value = typeof val === 'string' ? val : '';
    }
  }

  function readItem(item) {
    return {
      cargo: value(item, 'cargo'),
      empresa: value(item, 'empresa'),
      nome: value(item, 'nome'),
      inicioMes: value(item, 'inicioMes'),
      inicioAno: value(item, 'inicioAno'),
      fimMes: value(item, 'fimMes'),
      fimAno: value(item, 'fimAno'),
      emAndamento: value(item, 'emAndamento'),
      atividades: value(item, 'atividades')
    };
  }

  function isBlank(row) {
    return !row.cargo && !row.empresa && !row.nome && !row.atividades &&
      !row.inicioMes && !row.inicioAno && !row.fimMes && !row.fimAno && !row.emAndamento;
  }

  function formatDate(month, year) {
    const safeYear = String(year || '').trim();
    const safeMonth = String(month || '').trim();
    if (!safeYear) return '';
    return safeMonth ? safeMonth + '/' + safeYear : safeYear;
  }

  function formatPeriodo(item, ongoingLabel) {
    const row = item || {};
    const start = formatDate(row.inicioMes, row.inicioAno);
    const end = formatDate(row.fimMes, row.fimAno);
    if (row.emAndamento) return start ? start + ' – ' + ongoingLabel : ongoingLabel;
    if (start && end) return start + ' – ' + end;
    return start || end;
  }

  function yearError(year, fieldName, who) {
    if (!/^\d{4}$/.test(year)) {
      return { field: fieldName, message: 'Informe o ano ' + who + ' com 4 dígitos (ex.: 2020).' };
    }
    const number = Number(year);
    if (number < MIN_YEAR || number > CURRENT_YEAR) {
      return { field: fieldName, message: 'Informe um ano ' + who + ' entre ' + MIN_YEAR + ' e ' + CURRENT_YEAR + '.' };
    }
    return null;
  }

  function validateRow(item, label, position, article) {
    const row = readItem(item);
    const who = article + ' ' + label + ' ' + position;

    if (row.inicioMes && !row.inicioAno) {
      return { field: 'inicioAno', message: 'Informe o ano de início ' + who + '.' };
    }
    if (row.inicioAno) {
      const error = yearError(row.inicioAno, 'inicioAno', 'de início ' + who);
      if (error) return error;
    }

    const hasStart = Boolean(row.inicioMes || row.inicioAno);
    const hasEnd = Boolean(row.fimMes || row.fimAno);
    if (!row.emAndamento) {
      if (row.fimMes && !row.fimAno) {
        return { field: 'fimAno', message: 'Informe o ano de fim ' + who + '.' };
      }
      if (row.fimAno) {
        const error = yearError(row.fimAno, 'fimAno', 'de fim ' + who);
        if (error) return error;
      }
      if (hasEnd && !hasStart) {
        return { field: 'inicioAno', message: 'Informe o início antes do fim ' + who + '.' };
      }
      if (hasStart && hasEnd) {
        const start = Number(row.inicioAno) * 100 + (row.inicioMes ? Number(row.inicioMes) : 0);
        const end = Number(row.fimAno) * 100 + (row.fimMes ? Number(row.fimMes) : 12);
        if (end < start) {
          return { field: 'fimAno', message: 'O fim ' + who + ' não pode ser anterior ao início.' };
        }
      }
    }

    return null;
  }

  function create(options) {
    const root = options.root;
    const template = document.getElementById(options.templateId);
    if (!root || !template) throw new Error('Repetidor sem raiz ou template.');
    const items = root.querySelector('[data-items]');
    const addButton = root.querySelector('[data-action="add"]');
    const max = options.max || 3;
    const min = options.min || 1;
    const label = options.label || 'Item';
    const article = options.article || 'do';
    const onChange = typeof options.onChange === 'function' ? options.onChange : function () {};

    function itemNodes() {
      return Array.from(items.querySelectorAll('.repeater-item'));
    }

    function syncOngoing(item) {
      const ongoing = field(item, 'emAndamento');
      const endMonth = field(item, 'fimMes');
      const endYear = field(item, 'fimAno');
      if (!ongoing || !endMonth || !endYear) return;
      endMonth.disabled = ongoing.checked;
      endYear.disabled = ongoing.checked;
      if (ongoing.checked) {
        endMonth.value = '';
        endYear.value = '';
        endMonth.removeAttribute('aria-invalid');
        endYear.removeAttribute('aria-invalid');
      }
    }

    function updateControls() {
      const nodes = itemNodes();
      if (addButton) addButton.disabled = nodes.length >= max;
      nodes.forEach(function (item, index) {
        const legend = item.querySelector('.repeater-legend');
        if (legend) legend.textContent = label + ' ' + (index + 1);
        const remove = item.querySelector('[data-action="remove"]');
        if (remove) {
          remove.hidden = nodes.length <= min;
          remove.setAttribute('aria-label', 'Remover ' + label.toLowerCase() + ' ' + (index + 1));
        }
      });
    }

    function applyRow(item, data) {
      ['cargo', 'empresa', 'nome', 'inicioMes', 'inicioAno', 'fimMes', 'fimAno', 'atividades', 'emAndamento']
        .forEach(function (key) {
          if (Object.prototype.hasOwnProperty.call(data, key)) setValue(item, key, data[key]);
        });
    }

    function addRow(data) {
      if (itemNodes().length >= max) return null;
      const item = template.content.firstElementChild.cloneNode(true);
      item.querySelectorAll('select.date-month').forEach(fillMonths);
      if (data) applyRow(item, data);
      items.appendChild(item);
      syncOngoing(item);
      updateControls();
      return item;
    }

    function setData(list) {
      items.replaceChildren();
      const rows = Array.isArray(list) ? list.slice(0, max) : [];
      if (rows.length) rows.forEach(function (row) { addRow(row); });
      else addRow();
      updateControls();
    }

    function getData(opts) {
      const rows = itemNodes().map(readItem);
      return opts && opts.skipEmpty ? rows.filter(function (row) { return !isBlank(row); }) : rows;
    }

    function markInvalid(item, error) {
      if (!error) return { ok: true };
      const input = field(item, error.field);
      if (input) {
        input.setAttribute('aria-invalid', 'true');
        input.focus();
      }
      return { ok: false, message: error.message, element: input };
    }

    function validate() {
      const nodes = itemNodes();
      for (let index = 0; index < nodes.length; index += 1) {
        const row = readItem(nodes[index]);
        if (isBlank(row)) continue;
        const error = validateRow(nodes[index], label, index + 1, article);
        if (error) return markInvalid(nodes[index], error);
      }
      return { ok: true };
    }

    function reset() {
      items.replaceChildren();
      addRow();
      updateControls();
    }

    root.addEventListener('click', function (event) {
      const action = event.target.closest('[data-action]');
      if (!action || !root.contains(action)) return;
      if (action.dataset.action === 'add') {
        const item = addRow();
        if (item) {
          const first = item.querySelector('input, select, textarea');
          if (first) first.focus();
        }
      } else if (action.dataset.action === 'remove') {
        const item = action.closest('.repeater-item');
        if (item && itemNodes().length > min) {
          item.remove();
          updateControls();
          onChange();
        }
      }
    });

    root.addEventListener('input', function (event) {
      const input = event.target.closest('[data-field]');
      if (input) input.removeAttribute('aria-invalid');
      onChange();
    });

    root.addEventListener('change', function (event) {
      const target = event.target;
      if (target.matches('[data-field="emAndamento"]')) {
        const item = target.closest('.repeater-item');
        if (item) syncOngoing(item);
      }
      if (target.matches('[data-field]')) target.removeAttribute('aria-invalid');
      onChange();
    });

    reset();
    return { root: root, add: addRow, setData: setData, getData: getData, reset: reset, validate: validate };
  }

  return { create: create, formatPeriodo: formatPeriodo };
})();
