# Pronto pra Vaga

Gerador de currículo em uma página, usando o Gemini API diretamente no navegador. O projeto não usa build nem dependências JavaScript locais.

## Como usar

1. Abra `index.html` em um navegador. O Tailwind da interface é carregado por CDN; a geração depende de conexão com a internet. Para melhor funcionamento do clipboard e da impressão, prefira servir a pasta com um servidor local (por exemplo, `npx serve .`).
2. Crie uma chave em [Google AI Studio](https://aistudio.google.com/api-keys) e cole-a no campo indicado. Use **Testar chave** para confirmar o acesso antes de gerar.
3. Preencha seus dados e selecione **Gerar Currículo Perfeito**.
4. Confira o aviso de ajuste A4. Se o texto exceder uma página, o app reduz a escala e, se ainda não couber, imprime em mais de uma página; para um currículo de uma página, reduza o texto e gere novamente.
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

O currículo é renderizado como texto (não como HTML gerado pela IA) e usa uma folha A4. O app reduz a escala até um limite legível e avisa quando o conteúdo ainda excede a área imprimível. Nesse caso, a impressão passa a usar mais de uma página em vez de cortar o texto. O resultado pode variar entre navegadores e configurações de impressão; confira a prévia antes de salvar em PDF.

## Modelos e tempo de resposta

O app usa por padrão um modelo Flash-Lite, mais rápido para estruturar texto. Se o modelo escolhido falhar, demorar mais de 30 segundos ou estourar a cota, o app tenta automaticamente os modelos alternativos (até 60 segundos no total). O modelo usado e o tempo de geração aparecem abaixo dos botões de ação. A geração também tem um teto de tokens para evitar esperas longas.
