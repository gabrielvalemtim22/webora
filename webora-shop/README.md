# Webora Shop + Admin

Projeto de loja e painel administrativo em duas publicações Vercel, com o mesmo banco Supabase. Visual baseado nas referências enviadas, incluindo logo original, banner e categorias. Catálogo começa vazio; nenhum faturamento é simulado.

## Estado desta entrega

Código implementado e testes locais de lógica Pix e autorização. Banco separado não criado porque `get_cost` do Supabase está indisponível nesta conexão. Contas Gabriel e Ademar NÃO foram provisionadas. Não usar para vendas reais antes de conectar o Supabase, executar o schema e criar os acessos. Domínio Yampi, catálogo Yampi e validação real de pagamentos ainda dependem da conta do proprietário.

## Ativação

1. Criar `webora-shop` no Supabase, na organização escolhida por Gabriel.
2. Executar `database/schema.sql` no SQL Editor do projeto vazio.
3. Configurar na Vercel, somente no ambiente de servidor: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Nunca colocar service role no navegador ou Git.
4. Executar `npm ci --ignore-scripts` e `node --env-file=.env scripts/setup-users.mjs` em ambiente seguro. O script cria senhas aleatórias para `gabriel` e `ademar`; guarda-as em `credentials.json`, arquivo privado ignorado pelo Git. Não publicar esse arquivo.
5. Loja: `APP_MODE=shop`, `SHOP_URL=https://webora-shop.vercel.app`. Admin: `APP_MODE=admin`, mesmo Supabase, `SHOP_URL` da loja. Publicar novamente os dois projetos.
6. Entrar como Gabriel; confirmar chave e nome Pix em Configurações, cadastrar produtos e inserir domínio e tokens de compra da Yampi.
7. Testar compra Pix, comprovante, conferência, atualização de entrega, chat, upload de vídeo e negação de edição de produtos para Ademar.

## Permissões

Gabriel pode editar catálogo, mídia, estoque, preço, banners, pagamentos, pedidos, chat e equipe. Ademar vê apenas seus próprios clientes, pedidos e solicitações. Ele não altera produtos, configurações, status de pagamento ou permissões. A desativação dele é verificada no servidor em cada ação, inclusive com sessão já aberta. Não há cadastro público da equipe.

Todas as tabelas têm RLS e nenhum acesso direto de `anon`/`authenticated`. A API valida sessão com Supabase Auth e perfil ativo antes de utilizar a credencial exclusiva do servidor. Comprovantes ficam em bucket privado; apenas Gabriel obtém URLs temporárias. Pedidos de clientes exigem token aleatório de 256 bits, com hash no banco. Links ficam salvos no dispositivo do cliente; não compartilhar esses links.

## Pagamentos e estoque

Pix BR Code com valor exato, CNPJ `63371209000181`, identificador do pedido e CRC-16. Nome padrão `WEBORA` precisa ser confirmado contra o titular real no banco. Pix é estático: não existe confirmação bancária automática. Comprovante coloca o pedido em análise; só Gabriel confirma o pagamento após conferir o recebimento.

Yampi: Configurações recebe o domínio de checkout `*.yampi.com.br`; cada produto recebe token de compra após `/r/`. A API constrói `/r/TOKEN:quantidade,TOKEN:quantidade`. O catálogo e preços devem estar cadastrados corretamente também na Yampi. Não há sincronização de catálogo, webhook de aprovação, garantia de débito ou acesso à conta Yampi nesta entrega. Sem essas credenciais e testes, não anunciar confirmação automática. Fonte: https://help.yampi.com.br/pt-BR/articles/6067074-como-gerar-um-link-de-compra-para-varios-produtos

Estoque é reservado numa transação do Postgres com bloqueio das linhas. Pedidos pendentes podem ser cancelados por Gabriel para devolver o estoque. Ainda não há expiração automática; revisar e cancelar reservas abandonadas. O tráfego público precisa de limitação de requisições antes da abertura comercial para evitar reservas abusivas.

Frete gratuito apenas para SP; outros estados ficam bloqueados. Cashback e cupons não são simulados ou creditados: exigem regras financeiras reais antes de ativar. O efeito de profundidade do banner usa CSS, não é um modelo 3D exportável.

## Duas publicações

Mesmo código e banco; projetos Vercel separados com `APP_MODE=shop` e `APP_MODE=admin`. Root Directory: `webora-shop` quando estiver na branch do repositório Webora. Framework: Other; Output Directory: `public`; Install Command: `npm ci --ignore-scripts`.

## Desenvolvimento

`npm ci --ignore-scripts`, `npm test`, `npm start`. O preview sem credenciais mostra a loja em preparação e bloqueia compras e login. Sessões são cookies HttpOnly, Secure e SameSite Strict; acesso autenticado exige HTTPS. O servidor local é para inspeção visual, não para login de produção.
