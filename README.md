# Pronto pra Vaga

Gerador de currículo em uma página, usando o Gemini API diretamente no navegador. O projeto não usa build nem dependências JavaScript locais.

## Como usar

1. Abra `index.html` em um navegador. A interface não usa dependências externas; a geração depende de conexão com a internet. Para melhor funcionamento do clipboard e da impressão, prefira servir a pasta com um servidor local (por exemplo, `npx serve .`).
2. Crie uma chave em [Google AI Studio](https://aistudio.google.com/api-keys) e cole-a no campo indicado. Use **Testar chave** para confirmar o acesso antes de gerar.
3. Preencha seus dados. Use **+ Adicionar experiência** e **+ Adicionar curso** para incluir quantos itens precisar. As datas são opcionais e aceitam mês e ano ou somente o ano; marque **Em andamento** quando não houver data de fim.
4. Selecione **Gerar Currículo Perfeito**.
5. Confira o aviso de ajuste A4. Quando sobra espaço, o app amplia o espaçamento entre as seções para preencher melhor a folha. Se o texto exceder uma página, ele reduz a escala e, se ainda não couber, imprime em mais de uma página; para um currículo de uma página, reduza o texto e gere novamente.
6. Use **Imprimir / Salvar em PDF** ou **Copiar como texto**.

## Estrutura

- `index.html`: formulário e interface.
- `js/`: configuração, prompt/schema, cliente Gemini, renderer, persistência e eventos. São scripts clássicos carregados na ordem indicada no HTML para manter o uso sem build.
- `js/repeater.js`: linhas dinâmicas de experiências e cursos, formatação de períodos e validação das datas.
- `js/app.js`: inicialização da aplicação.
- `css/`: estilos globais da interface (`global.css`), componentes (`app.css`), do currículo (`curriculum.css`) e de impressão (`print.css`).

## Chave e privacidade

A chave é enviada diretamente do navegador ao Google pelo header `x-goog-api-key`, nunca como parâmetro da URL. Por padrão, fica em `sessionStorage` e é removida ao encerrar a sessão do navegador. Ao marcar **Lembrar neste dispositivo**, ela será guardada em `localStorage` acessível ao JavaScript desta origem; use essa opção somente em dispositivo pessoal. O botão **Limpar dados salvos** remove chave e formulário guardados localmente.

Os dados profissionais preenchidos também são salvos automaticamente no `localStorage` deste navegador para recuperação após atualizar a página. O formato atual guarda listas de experiências e cursos com suas datas; dados no formato antigo são migrados automaticamente na primeira abertura, preservando o texto já salvo. A geração envia esses dados ao serviço Gemini. Consulte as políticas de privacidade e retenção do Google antes de enviar informações pessoais; não inclua dados que não deseja compartilhar com o provedor.

## Limite de impressão

O currículo é renderizado como texto (não como HTML gerado pela IA) e usa uma folha A4. Quando o conteúdo é curto, o app amplia automaticamente o espaçamento entre seções e itens para aproveitar a altura da folha, com um limite para não ficar artificial. Quando o conteúdo é longo, ele reduz a escala até um limite legível e avisa se ainda excede a área imprimível. Nesse caso, a impressão passa a usar mais de uma página em vez de cortar o texto. O resultado pode variar entre navegadores e configurações de impressão; confira a prévia antes de salvar em PDF.

## Modelos e tempo de resposta

O app usa por padrão um modelo Flash-Lite, mais rápido para estruturar texto. Se o modelo escolhido falhar, demorar mais de 30 segundos ou estourar a cota, o app tenta automaticamente os modelos alternativos (até 60 segundos no total). O modelo usado e o tempo de geração aparecem abaixo dos botões de ação. A geração também tem um teto de tokens para evitar esperas longas.
