document.getElementById('formCurriculo').addEventListener('submit', async function(e) {
  e.preventDefault();

  const apiKey = document.getElementById('apiKey').value.trim();
  const nome = document.getElementById('nome').value.trim();
  const telefone = document.getElementById('telefone').value.trim();
  const endereco = document.getElementById('endereco').value.trim();
  const objetivo = document.getElementById('objetivo').value.trim();
  const habilidades = document.getElementById('habilidades').value.trim();
  const experiencias = document.getElementById('experiencias').value.trim();
  const formacao = document.getElementById('formacao').value.trim();
  // NOVO: Captura os diferenciais informados pelo usuário
  const diferenciais = document.getElementById('diferenciais').value.trim();

  const btnGerar = document.getElementById('btnGerar');
  const curriculoOutput = document.getElementById('curriculoOutput');
  const acoesArea = document.getElementById('acoesArea');

  btnGerar.disabled = true;
  btnGerar.textContent = 'Gerando currículo perfeito com IA...';

  const promptSistema = `
Você é um assistente especialista em criação de currículos focados em trabalhos práticos, operacionais e versatilidade profissional. 

REGRAS OBRIGATÓRIAS:
1. TAMANHO ÚNICO (1 PÁGINA): O currículo gerado DEVE caber inteiramente em uma única página impressa. Seja extremamente conciso.
2. SELEÇÃO DE EXPERIÊNCIAS: Limite a seção de experiências a no máximo 3 ou 4 itens. Mantenha as descrições curtas e diretas.
3. FOCO NO DIFERENCIAL PRÁTICO: Valorize a experiência prática, a versatilidade, a disposição para o trabalho, facilidade de aprendizado e habilidades manuais/operacionais.
4. TOM DE VOZ: Empático, profissional, encorajador e direto ao ponto.
5. FORMATO DE ENTREGA: Retorne APENAS o conteúdo estruturado em HTML simples (tags como <h1>, <h2>, <p>, <ul>, <li>, <strong>) pronto para ser inserido na página, SEM blocos de código markdown (como \`\`\`html) e SEM textos extras antes ou depois.

ESTRUTURA OBRIGATÓRIA DO CURRÍCULO:
- Cabeçalho (Nome completo em destaque, Endereço e Telefone com DDD).
- Objetivo: Cargo ou áreas pretendidas (máximo de 2 linhas).
- Perfil Profissional / Resumo: Um parágrafo curto (2 a 3 linhas) resumindo força de trabalho e versatilidade.
- Experiência Profissional: Lista enxuta (nome da empresa/função e resumo do que fazia).
- Principais Habilidades e Competências: Tópicos rápidos destacando o que sabe fazer na prática.
- Formação / Ensino: Nível de escolaridade de forma honesta e direta.
- Diferenciais: Use estritamente os diferenciais informados pelo usuário abaixo, transformando-os em pontos fortes claros (como pontualidade, disciplina e facilidade com normas de segurança).

DADOS DO USUÁRIO:
- Nome: ${nome}
- Telefone: ${telefone}
- Endereço: ${endereco}
- Objetivo: ${objetivo}
- Habilidades Práticas: ${habilidades}
- Experiências: ${experiencias}
- Formação: ${formacao}
- Diferenciais informados pelo usuário: ${diferenciais}
`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptSistema }] }]
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    let textoGerado = data.candidates[0].content.parts[0].text;
    textoGerado = textoGerado.replace(/```html/g, '').replace(/```/g, '').trim();

    curriculoOutput.innerHTML = textoGerado;
    curriculoOutput.classList.remove('hidden');
    acoesArea.classList.remove('hidden');

    curriculoOutput.scrollIntoView({ behavior: 'smooth' });

  } catch (error) {
    alert('Erro ao gerar currículo: ' + error.message);
  } finally {
    btnGerar.disabled = false;
    btnGerar.textContent = 'Gerar Currículo Perfeito';
  }
});