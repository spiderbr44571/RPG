# Auditoria e verificação v0.58

Base auditada: main `01b73d7a3961b8bcfe2b2b578d4707897dbc0b88` (v0.57).

## Fluxos reais

- `demo-offline.html`: scripts embutidos criam OP13 e MastermindCharacters; rpg14_sheet_tabs cria `[data-r14-panel="advancement"]`; mastermind56_local_powers monta depois. Botão `#v56-quick-powers` e aba visíveis em 412×915. Persistência validada após recarregar e ao criar outro personagem.
- `lan_player.html`: `/powers-ui.js` vem antes do boot; `#v55-original-powers` monta a ficha autorizada. Sincronização periódica agora atualiza escolhas, orçamento e pedidos após decisão do mestre, sem recarregar.
- `lan_scene.html`: câmera → alcance → jogador → experiência → shell → poderes; inicializadores nessa ordem. `#sheet-modal`, `#sheet-tabs`, `#sheet-data`, roda e painel de ações testados no HTML servido pelo servidor Java real.
- Bug reproduzido antes da correção: visitar Poderes, voltar a Atributos e sincronizar sobrescrevia Atributos. O componente agora desmonta ao sair e não recria controles sem alteração dos dados.
- Preferências compartilhadas entre ficha e mesa; eventos de storage atualizam outra aba. Sem alterações nas chaves de armazenamento ou migrações destrutivas.

## Servidor

Testes executam o próprio `LocalCampaignServer.java` com NanoHTTPD e JSON reais. Adaptadores JVM substituem somente armazenamento Android e Base64; gráficos Android não são simulados como sucesso.

Cobertura: aprovação exclusivamente pelo mestre, rejeição sem concessão, orçamento NEX, Surto antes/depois de Morte 2, SAN, PE debitado apenas na aprovação, consumo único, limite por cena, cena nova no mesmo mapa, turno inteiro explícito, expiração de bônus, atraso, passar e pedidos antigos mesmo após o token voltar à vez. Ações antigas sem carimbo de turno são recusadas e podem ser reenviadas.

Gravação do banco agora substitui o arquivo atomicamente após sincronizar o novo arquivo; não apaga o banco anterior se a substituição falhar. Registros de progressão desconhecidos são preservados na ficha local.

## Validação

`npm ci && npm test`: nove testes de integração em Chromium, incluindo jogador e mestre em páginas distintas aprovando Surto pelos botões reais. Testes antigos: 37 passam e cinco falham também na base v0.57 (`ai_resilience`, `ai_response_quality`, `cloud_free`, `rules_chat_regression`, `universal_ai_chat`). Não foram removidos ou marcados como aprovados.

CI adiciona instalação do APK em emulador Android 29 e teste da WebView real: boot, botão visível, 22 cartões, aprendizagem, NEX e persistência após reload. Publicação do APK depende desse teste e da comparação byte a byte de todos os assets com o checkout. O resultado final da execução deve ser consultado no GitHub Actions; esta descrição não afirma antecipadamente que passou.

## Limites explícitos

O catálogo existente não contém todos os pré-requisitos, afinidades, escolhas repetíveis ou efeitos de poderes de classe/paranormais. A validação automática de pré-requisitos permanece específica de Surto Temporal (Morte 2); demais escolhas dependem do mestre. Afinidade de Surto e integração individual de todos os poderes NÃO estão implementadas. Listas de classe são sugestões. Não se deve apresentar esta versão como implementação integral das regras.

O teste Android cobre a ficha offline no emulador; LAN é testada com o servidor Java real em JVM e navegadores. Não houve sessão entre dois celulares físicos. Os cinco testes antigos de IA continuam pendentes.

O workflow existente assina com chave debug gerada pelo runner. A compatibilidade de atualização com APKs antigos não é garantida sem a chave original. Não desinstalar nem limpar dados para contornar erro de assinatura. Uma distribuição atualizável exige manter a chave de assinatura original, que não está no repositório.
