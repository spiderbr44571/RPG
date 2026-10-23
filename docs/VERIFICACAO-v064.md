# Mastermind 0.64 — nova mesa ao vivo

Implementada diretamente no código de produção `rpg31_master_table.js` e `rpg31_live.css` (servidos pela mesa LAN como `table-master.js` e `table-master.css`).

- Barra superior alinhada à esquerda, com ícones SVG de porta vermelha para Sair, caixas de iniciativa para + Turno, mapa dobrado para Editar mapa, café para Iniciar interlúdio/Retomar combate e cantos de tela para Enquadrar.
- Estado da iniciativa/rodada compacto, controle de zoom e recolhimento de painel.
- Painel do mestre com 7 seções recolhíveis: Rolagens, Iniciativa / sessão, Solicitações, Ritmo, Jogadores e efeitos, Movimento por sistema e Alvo selecionado.
- Rolagens públicas/privadas, solicitações, movimento, efeitos, iniciativas e ações de servidor preservadas.
- Painel lateral reduzido a 190–222 px em telas horizontais. Ao ocultá-lo, toda a largura é ocupada pelo mapa; no celular em retrato, o painel funciona como sobreposição.
- Estado das seções, campos editáveis e posição de scroll preservados ao receber novas revisões da sessão.
- No interlúdio, o comando de turno não altera a rodada. Todos os demais comandos mantêm suas rotas existentes.
- Testes de execução Node: `tests/mastermind_v64.test.cjs`. Compilação Android do mesmo pacote `dev.rpgmesa.demo` com versionCode 64.

Sem alteração das fichas, índices, autenticação, permissões ou dados já existentes na v0.63.
