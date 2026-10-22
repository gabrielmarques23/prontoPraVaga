# Pronto pra Vaga

Gerador de currículo em uma página, usando o Gemini API diretamente no navegador. O projeto não usa build nem dependências JavaScript locais.

## Como usar

1. Abra `index.html` em um navegador. O Tailwind da interface é carregado por CDN; a geração depende de conexão com a internet.
2. Crie uma chave em [Google AI Studio](https://aistudio.google.com/api-keys) e cole-a no campo indicado.
3. Preencha seus dados e selecione **Gerar Currículo Perfeito**.
4. Confira o aviso de ajuste A4. Se exceder uma página, reduza o texto e gere novamente.
5. Use **Imprimir / Salvar em PDF** ou **Copiar como texto**.

## Estrutura

- `index.html`: formulário e interface.
- `js/`: configuração, prompt/schema, cliente Gemini, renderer, persistência e eventos. São scripts clássicos carregados na ordem indicada no HTML para manter o uso sem build.
- `js/app.js`: inicialização da aplicação.
- `css/`: estilos da interface (`app.css`), do currículo (`curriculum.css`) e de impressão (`print.css`).

## Chave e privacidade

A chave é enviada diretamente do navegador ao Google pelo header `x-goog-api-key`, nunca como parâmetro da URL. Por padrão, fica em `sessionStorage` e é removida ao encerrar a sessão do navegador. Ao marcar **Lembrar neste dispositivo**, ela será guardada em `localStorage` acessível ao JavaScript desta origem; use essa opção somente em dispositivo pessoal. O botão **Limpar dados salvos** remove chave e formulário guardados localmente.

Os dados profissionais preenchidos também são salvos automaticamente no `localStorage` deste navegador para recuperação após atualizar a página. A geração envia esses dados ao serviço Gemini. Consulte as políticas de privacidade e retenção do Google antes de enviar informações pessoais; não inclua dados que não deseja compartilhar com o provedor.

## Limite de impressão

O currículo é renderizado como texto (não como HTML gerado pela IA) e usa uma folha A4. O app tenta reduzir a escala até um limite legível e avisa quando o conteúdo ainda excede a área imprimível. O resultado pode variar entre navegadores e configurações de impressão; confira a prévia antes de salvar em PDF.
