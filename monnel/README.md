# Monnel — site mobile

Site estático em português do Brasil, em HTML, CSS e JavaScript puro. Identidade laranja `#FF6A00`, preto e branco, com a logo e o mascote fornecidos pelo proprietário.

## Abrir

Abra `index.html` em um navegador ou publique o conteúdo de `` em uma hospedagem estática. Não requer instalação, compilação ou dependências externas. Todos os caminhos são relativos; funciona também em uma subpasta como `/monnel/`.

## O que está incluído

- Layout adaptado a celular, tablet e computador.
- Menu móvel, escolha entre seis redes e quatro serviços.
- Seguidores brasileiros/mundiais no Instagram.
- Seleção de quantidade, resumo e validação do perfil/link.
- Pagamento por link da InfinitePay, correspondente ao valor do pacote.
- WhatsApp comercial **(11) 95930-4102**, com o pedido preenchido.
- Copiar resumo, dúvidas expansíveis e navegação por teclado.
- Sem bibliotecas, fontes remotas, rastreadores ou formulário de senha.

## Preços confirmados

A referência anexada em 27/09/2026 define estes pacotes de seguidores brasileiros no Instagram:

| Quantidade | Valor | Checkout InfinitePay |
| --- | --- | --- |
| 100 | R$ 5,90 | https://checkout.infinitepay.io/red_bite/HnhkdKNzhj |
| 500 | R$ 19,90 | https://checkout.infinitepay.io/red_bite/9Gx3E2dpHn |
| 1.000 | R$ 29,90 | https://checkout.infinitepay.io/red_bite/HzntziC9yn |
| 5.000 | R$ 119,90 | https://checkout.infinitepay.io/red_bite/XoVhpGJ1JU |

Os **39 links** enviados pelo proprietário estão registrados em `config.js`, em `checkoutByPrice`, indexados pelo valor em centavos. O código seleciona automaticamente o link exato para o preço do pacote. Um valor sem vínculo confirmado a serviço e quantidade não é atribuído automaticamente a um produto: os demais serviços permitem pedir um orçamento no WhatsApp.

## Editar preços

Em `config.js`, `prices` organiza as tabelas por `rede:serviço:origem`. As redes são `instagram`, `tiktok`, `youtube`, `facebook`, `x` e `kwai`; os serviços são `followers`, `likes`, `views` e `comments`.

Use `brazil` ou `world` para seguidores do Instagram e `all` para os demais. Os valores são inteiros em centavos. Exemplo de chave: `instagram:followers:world`. Para novos tamanhos de pacote, ajuste também `quantities` em `app.js`.

`checkoutLinks` permite sobrescrever um link por pacote específico, usando `rede:serviço:origem:quantidade`. Sem uma sobrescrita, o link vem de `checkoutByPrice`.

## Funcionamento do pagamento

O site abre o checkout externo informado pelo proprietário em uma nova aba. Ele não cobra por conta própria, não armazena cartões e não confirma pagamentos automaticamente. O cliente deve enviar o resumo e o comprovante ao WhatsApp da Monnel para associar o pagamento ao perfil. O proprietário confirma disponibilidade, pagamento, prazo e condições do serviço.

Não existe banco de dados, fila automática de pedidos, webhook nem integração com fornecedor nesta versão. O resumo é mantido apenas enquanto a página está aberta. Não há armazenamento do perfil no navegador.

## Arquivos

- `index.html`: estrutura e conteúdo.
- `styles.css`: estilos responsivos.
- `app.js`: seleção, validação e montagem do pedido.
- `config.js`: telefone, tabelas e links de pagamento.
- `assets/`: logo e mascote otimizados em WebP.

O site também oferece ferramentas WebMCP opcionais para ler e configurar a seleção, apenas em navegadores compatíveis. Elas não enviam pedidos nem efetuam pagamentos.
