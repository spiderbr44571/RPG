# Auditoria inicial do acervo RPG — 17/10/2026

Catálogo: **39 sistemas**, **209 documentos** indexados por metadados do Google Drive.

## Escopo realmente verificado

- Foram lidos os textos acessíveis de **GURPS 4ª Edição Lite**, **GURPS 4ª Edição Ultra-Lite** e **Basic Roleplaying — ORC Content Document**, sem copiar seu conteúdo para este repositório.
- GURPS: confirmação dos quatro atributos-base ST, DX, IQ, HT; valores iniciais 10; custos por atributo; testes de 3d6; progressão, defesa e equipamento dependem de regras específicas. O app já tem motor GURPS 4e beta, mas não implementa todas as exceções.
- BRP ORC: confirmação de testes percentuais (d100), habilidades expressas em porcentagens e classificação de resultado. Ainda **não** foi implementado motor BRP no aplicativo.
- Ordem Paranormal: código e dados locais do módulo 1.3 estão presentes; os suplementos 'Sobrevivendo ao Horror' e 'Suplemento da Comunidade' **não** foram lidos/validados nesta etapa. Nenhuma regra adicional foi ativada automaticamente.
- 39 sistemas foram inventariados **apenas pelos nomes e caminhos**. Não considerar o inventário um exame integral dos PDFs.

## Matriz de implementação

| Sistema | Arquivos | Estado no aplicativo | Próximo trabalho |
|---|---:|---|---|
| Ordem Paranormal | 9 | Parcial: engine, ficha, PDF local | Revisar expansões; evitar conflitos com 1.3 |
| D&D | 9 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Tormenta 20 | 1 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Cyberpunk RED | 2 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Chamado de Ctchulhu | 7 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Alien RPG | 4 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| FATE | 3 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| GURPS | 40 | Beta: engine e ficha 4e | Validar suplementos e exceções |
| A Perfect Rock | 2 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Assimilação | 1 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Basic Roleplaying | 1 | Fonte ORC inspecionada; sem ficha | Implementar d100 e ficha percentual |
| Blade Runners | 13 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Blades In The Dark | 5 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Bubblegumshoe | 2 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Candela Obscura | 1 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| City Of Mist | 7 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Coisinha Verde | 3 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Condenados Ao Poder | 3 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Cortex Prime | 23 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Cypher System | 1 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Delta Green | 9 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Diário do Caçador | 2 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Eletric State | 5 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Fabula Ultima | 16 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Fallout RPG | 1 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Fiasco | 1 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Gatos Espaciais | 1 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Kids On Bikes | 8 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Kult | 5 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| M&M | 1 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Melted Lands | 2 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Mutant - Ano zero | 4 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Paranoia | 1 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Runeterra | 0 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| S.T.A.L.K.E.R | 3 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Sacramento | 1 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Savage Worlds | 3 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| Triangle Agency | 1 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |
| World Of Darkness | 8 | Somente catálogo | Identificar edição → validar regras → criar ficha → testar |

## Padrão para cadastrar novas regras

Cada pacote de sistema deve ter `systemId`, `edition`, `sourceBookId`, página, tipo (atributo, perícia, equipamento, criatura, habilidade, condição, progressão), regras base e modificadores de suplementos separados. **Não ativar regras de suplementos por inferência do título**. Uma regra só migra de `pendente` para `validada` após confronto do texto, testes e vínculo explícito à edição.

## PDF de ficha como formato de transporte

- `rpg17_sheet_pdf.js` produz PDF legível e inclui um anexo estruturado `ficha-rpg.json` usando `rpg-sheet-pdf-v1`. O PDF reimportado cria personagem novo (não sobrescreve a ficha existente).
- Ordem Paranormal leva atributos, perícias, recursos, poderes, rituais e inventário de cada ficha no JSON anexado.
- GURPS 4e leva atributos, perícias, vantagens, desvantagens, equipamento, magias, história e recursos do JSON de origem.
- PDF comum vindo de fora **não** é automaticamente convertível para ficha editável; isso exige mapeamento de campos e revisão manual. A importação bidirecional refere-se a PDFs exportados pelo próprio app.
- Testes de ida e volta em `tests/sheet_pdf.test.cjs`. Nenhum PDF comercial é distribuído no APK.
