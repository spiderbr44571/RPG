# Mastermind — Ateliê v0.85 com assets de terceiros

## Pacote definitivo escolhido pelo usuário

**Free – Character Creation Asset Pack**, por **nemo (nonemo)**.

- **Página oficial:** https://nonemo.itch.io/character-creation-asset-pack
- **Distribuição:** gratuita, valor opcional ("Name your own price")
- **Licença declarada:** Creative Commons Zero 1.0 Universal (CC0)
- **Arte:** 2D modular, **classificada pelo autor como Vector** — não rotular como pixel art nativa sem inspecionar os arquivos.
- **IA generativa:** segundo a ficha oficial, não foi utilizada.
- **Conteúdo divulgado:** 45 estilos de cabelo; 15 estilos de olhos; 3 tons de pele; óculos; 28 roupas; variações faciais mostradas no guia.
- **Arquivo disponibilizado:** "Modular Characters Asset Pack - nonemo", aproximadamente 797 kB (formato e hierarquia internos ainda não verificados).
- **Estado:** escolhido; aguardando obtenção/inspeção do pacote original para implementação e testes do APK.

As informações vêm da descrição/licença pública do artista, verificadas em 2026-10-27. Não inferir compatibilidade de todos os componentes além do que o pacote real demonstrar.

### Decisão de direção artística

A v0.84 removeu o ateliê gerado anteriormente, e esse código **não será reutilizado**. A nova solução deve trabalhar somente com os arquivos originais produzidos pelo artista, sem completar com artes geradas por IA. Como o pack é classificado como **Vector**, não forçar efeito pixelado por redimensionamento com nearest-neighbor: o resultado deve preservar o desenho original. Se o conteúdo interno for PNG raster, escolher filtragem a partir das dimensões reais e da aparência. A decisão anterior por pixel art fica substituída pelo pack escolhido, salvo uma orientação futura do usuário.

### Licenciamento

A página identifica a licença como CC0 1.0: permite copiar, modificar e redistribuir o conteúdo, inclusive em aplicativo comercial, sem atribuição legal obrigatória. Apesar disso, registrar **"Assets de personagens: nemo / nonemo"** nos créditos é boa prática. Distribuir exclusivamente os arquivos que pertencem ao pacote, não incorporar conteúdo externo encontrado em imagens de demonstração.

### Passos da implementação

1. Obter o download oficial (sem aquisição paga obrigatória), verificar nomes, estrutura, formato, dimensão, transparência e disponibilidade das camadas. O arquivo completo ainda não foi fornecido nesta conversa.
2. Criar manifesto gerado dos arquivos concretos, com tamanho, SHA-256, categoria, compatibilidade, âncoras e ordem de desenho. Não supor que nariz, boca ou sobrancelha são itens independentes se vierem integrados a "face".
3. Novo renderizador em camadas reais, sem formas vetoriais programáticas substituindo ilustrações. Se forem SVG, manter suporte a SVG seguro ou converter para PNG durante a build, preservando resolução.
4. Editor responsivo para Android: prévia, categorias e miniaturas com as peças reais, seletor de cabelo, olhos, tom de pele, roupa, óculos e quaisquer categorias extras verificadas.
5. Suporte a recoloração apenas quando as máscaras/vetores originais permitirem mudanças sem destruir sombreados.
6. Salvar configuração estruturada por personagem; gerar retrato e token, inclusive imagem PNG. Manter compatibilidade das fichas da v0.84 e não modificar imagens salvas anteriormente.
7. Testes: compilação, disponibilidade das imagens no APK, ausência de imagens em branco, composição de amostras, persistência, exportação, Android WebView e desempenho.
8. Distribuir versão testável v0.85 apenas após renderizar as camadas reais; não voltar a mostrar placeholders fabricados por código ou retratos falsamente "modulares".

### Fora do escopo até inspeção

- Garantia de visual pixel art: fonte oficial marca **Vector**.
- Itens independentes de nariz, boca, sobrancelhas ou orelhas; verificar a separação real.
- Um pacote com várias centenas de peças fora das quantidades divulgadas na página.
- Integração de outros packs com rigs diferentes.
- Nova build/APK sem os arquivos originais funcionando.

### Histórico de decisão

- Swappable Portraits (pago) foi descartado após o usuário escolher o pacote gratuito do nemo.
- Os arquivos de IA do antigo ateliê continuam excluídos da branch da v0.84.

## Inspeção do ZIP original enviado (2026-10-27)

- Licença CC0 confirmada dentro de `license.md`.
- Exatamente **180 assets distintas**, em PNG 1x, PNG 2x e SVG (540 arquivos de arte no ZIP).
- Android usa os PNG 2x originais, sem adicionar artes de IA.
- Rostos e cabelos usam tela compartilhada de **290×286 pixels**, e braços, pernas e roupa são desenhados nas âncoras originais.
- Catálogo: 3 tons de pele, 2 tipos de cabeça, 15 expressões, 10 olhos, 6 bocas, 5 cabelos frontais × 9 cores, 3 traseiros × 9 cores, 3 barbas × 9 cores, 2 estilos de roupa × 7 cores, mangas e cores, calças e quatro óculos.
- Atlas integrado ao JavaScript de maneira offline (data:image/png) para evitar `file://` bloqueado em Android WebView.
- Salvamento do retrato/token no sistema de fichas, exportação PNG via seletor nativo Android.
- Versão `v0.85.0-mastermind-nonemo` no mesmo ID do aplicativo, sem remover fichas anteriores.
