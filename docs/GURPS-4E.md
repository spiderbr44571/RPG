# GURPS 4ª edição — módulo próprio (v0.16)

## Referências verificadas no acervo privado
- **GURPS 4ª Edição – Lite.pdf**: `Livros/GURPS/Livros de Regras`. Testes de habilidade (p. 2), atributos e custo de pontos (pp. 4–5), secundárias (p. 6), perícias (pp. 12–17), equipamentos/carga (pp. 18–21), combate/defesas (pp. 24–29).
- **GURPS 4ª Edição – Módulo Básico Edição de Luxo.pdf**: edição reunida Personagens + Campanhas; relevante para perícias Muito Difíceis, vantagens, limitações, tipos de dano e opções avançadas.
- **Planilha Personagem Editavel v2.12 GURPS 4ed.pdf**: campos e agrupamentos visuais de ficha, inventário, parry/block/dodge, atributos, idiomas e distribuição de pontos.
- Acervo de suplementos **Magia, Powers, Artes Marciais, Ultra-Tech, High-Tech, Fantasy, Horror, Bio-Tech etc.**: **ainda não importados como regras ativas**. Devem ser analisados individualmente antes da ativação.

Os PDFs continuam no armazenamento autorizado do usuário. Nenhuma reprodução do conteúdo integral é incorporada ao repositório/APK.

## Estrutura implementada
- Ficha GURPS 4ª edição vinculada ao sistema `gurps`, e não à ficha de Ordem Paranormal.
- Salvar várias fichas offline em `localStorage`; seleção, duplicação, exclusão com confirmação e exportação/importação JSON.
- Retrato personalizado reduzido antes da persistência; campo de campanha, jogador, conceito, história, idade, aparência e nível tecnológico.
- Atributos primários ST, DX, IQ e HT; pontos por atributo (ST/HT: ±10/nível, DX/IQ: ±20/nível).
- PV=ST, PF=HT, Vontade=IQ, Percepção=IQ, Velocidade=(DX+HT)/4, Deslocamento=parte inteira de Velocidade; modificadores secundários editáveis com seus custos básicos.
- Base de Carga em **kg** `ST²/10`, penalidade de nível de carga e esquiva reduzida; peso de objetos e armas.
- Vantagens, desvantagens, peculiaridades, familiaridades, línguas, técnicas, magias e itens com custos editáveis, auditados pelo orçamento geral.
- Perícias personalizadas com atributo associado, dificuldade (F/M/D/MD), pontos investidos, NH calculado e testes 3d6.
- Resultados 3d6 com soma individual, NH-alvo, margem, sucesso/falha e critérios de resultados decisivos.
- Esquiva considerando nível de carga; Aparar e Bloqueio a partir de um NH informado; modificadores situacionais; armas com dano derivado de GdP/GeB segundo a tabela básica até ST 20; rolagens de dano próprias.
- Inventário com peso, quantidade, custo, equipamento e RD de consulta, sem assumir aplicação completa das regras de localização de armaduras.

## Importante: não implementado / ainda não verificado
- **Não é a implementação integral dos livros de GURPS.** É um primeiro módulo funcional.
- Catálogo completo das centenas de perícias e técnicas, seus pré-requisitos, padrões e especializações; vantagens modificadas e regras de construção detalhadas.
- Magias e seus pré-requisitos, duração, manutenção, custo progressivo, escolas e listas completas por suplemento.
- Pormenores de combate: distância/velocidade, ataque rápido, munição, dispersão, local de acerto, resistência e multiplicadores por tipo de lesão, efeitos de ferimentos, recuperação e múltiplas proteções localizadas.
- Magia/Powers/Psicônicos e tecnologia de suplementos exigem módulos próprios.
- **Integração LAN inicial implementada:** mestre adiciona personagem GURPS do acervo local, edita pela ficha visual GURPS e atribui ao jogador. O navegador mostra a ficha GURPS, PV/PF editáveis, testes 3d6, cena, rodada e canvas pessoal.
- **Limitações LAN:** a ficha do navegador é de consulta com rolagens e recursos, e não um editor completo de vantagens, perícias e equipamento; alterações estruturais continuam com o mestre. A transmissão de resultados 3d6 ainda é calculada no cliente; validação autoritativa do servidor está planejada.
- Ajustes de custo opcional/NT/ambientação devem ser conferidos pelo mestre antes de usar.
- O módulo não apresenta descrições integrais de livros protegidos por direitos autorais.

## Próximas etapas
1. **Aprimorar integração LAN**: permissões configuráveis por campanha, rolagem 3d6 auditada pelo servidor e feedback de estado em tempo real.
2. Catalogar atributos derivados, perícias, vantagens e desvantagens completas do Módulo Básico com fonte verificável por edição/página.
3. Adicionar combate avançado e dano, resistências localizadas e condições.
4. Magia e demais suplementos sob seleção de regras pelo mestre.
5. Testes presenciais com dois Androids e regressão a cada sistema.

## Roteiro de teste manual
1. Biblioteca → GURPS → editor de personagem. Crie ficha e altere ST/DX/IQ/HT.
2. Confira pontos restantes e características derivadas.
3. Crie perícia DX/Média com 2 pontos e role 3d6.
4. Adicione arma e role ataque e dano. Observe que não são a mesma rolagem.
5. Adicione itens com peso; confira penalidade por carga e esquiva.
6. Registre vantagens/desvantagens, edite a história e exporte a ficha.
7. Reabra o app e confira os dados persistidos.
8. Na Mestragem, adicione a ficha GURPS, atribua a um jogador via convite e confira PV/PF, 3d6, cenas e rodadas no navegador.
