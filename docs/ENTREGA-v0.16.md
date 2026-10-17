# RPG Mesa 0.16 — Estado da entrega

A versão **0.16.0-gurps-4e-beta** é um APK Android de teste e uma base de código para desenvolvimento. O projeto **não** implementa todos os livros do acervo de maneira completa.

## Correções da etapa anterior
- Tema Base e suas cores livres: módulo `rpg15_theme_fix.js`, incluindo contraste no d20 e elementos de interface.
- Telas de apresentação e listas de referências removidas da interface principal. A consulta técnica permanece no código, onde é útil.
- Acesso à campanha concentrado em Mestragem; a central do d20 não oferece a ferramenta redundante de rede.
- Biblioteca visual com pesquisa, favoritos, detalhes de sistemas e metadados do acervo, sem incluir os PDFs comerciais.

## Nova base GURPS 4ª Edição (beta)
- Motor de regras próprio, separado de Ordem Paranormal (`rpg16_gurps_engine.js`).
- Atributos ST, DX, IQ, HT; características secundárias; pontos; testes 3d6; dados de dano e registro de perícias.
- Abas Atributos, Perícias, Vantagens e Desvantagens, Combate, Equipamento, Magia / Poderes e História.
- Suporte inicial de integração com o modo de campanha e ficha do jogador.
- Fontes de referência do Drive: módulo básico, Lite, fichas e suplementos de GURPS 4e. Documentos originais permanecem no Drive do usuário; nenhum PDF está dentro do APK.
- **Pendente:** validar cada regra de suplementos, conferir exceções, aprimorar automatismos e executar testes completos em Android físico / LAN.

## Entrega
- `app-debug.apk`: build Android gerado no GitHub Actions, assinado para desenvolvimento.
- `RPG-Mesa-v0.16-Codigo-Fonte.zip`: arquivo de código-fonte com Java Android, HTML, CSS, JavaScript, catálogos, testes e serviços opcionais.
- `tests/gurps4.test.cjs`: testes automatizados do motor GURPS.
- Os artefatos de CI não transportam dados pessoais das campanhas nem livros em PDF.

## Cuidados
Antes de substituir um APK instalado, faça backup das campanhas e personagens. Se a assinatura mudar, o Android pode exigir a remoção da instalação anterior, que pode apagar dados.
O serviço LAN deve ser usado somente em uma rede local confiável; não exponha a porta ao público.
