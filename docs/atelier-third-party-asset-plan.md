# Mastermind — Novo Ateliê (assets de terceiros)

## Pacote-base escolhido: Swappable Portraits

**Decisão:** lofi_kier — [Swappable Portraits (64x64 - Layers)](https://lofi-kier.itch.io/swappable-portraits), não o pack `Swappable Chibi Portraits`.

- **Autor:** lofi_kier
- **Resolução original declarada:** 64 × 64 pixels
- **Pacote divulgado:** mais de 160 itens, 10 presets femininos e 10 masculinos
- **Grupos divulgados:** Accessory, Hair, Clothes, Eyes, Face, Shade, Body, Background
- **Formato de entrega anunciado:** `Swappable Portraits.zip` (pago; US$ 10 na verificação em 2026-10-27)
- **IA generativa nas imagens:** autor declara que não utilizou
- **Estado:** selecionado para o projeto, integração dos arquivos pendente

Fonte oficial e termos publicados: https://lofi-kier.itch.io/swappable-portraits

### Licença e limite de distribuição

A página diz que o artista permite usar as assets em projetos comerciais e não comerciais, editar e acrescentar peças, mas **proíbe redistribuir e revender**. Isso não prova autorização para distribuir um aplicativo que contém os PNGs individuais e permite exportar retratos/tokens montados.

**Antes de distribuir sprites no APK público ou no repositório público, obter confirmação por escrito do artista.** Pedir autorização específica para:
1. Empacotar as camadas do ZIP dentro de APK Android distribuído gratuitamente ou comercialmente.
2. Deixar usuários trocar camadas, recolorir e exportar a imagem final como retrato/token para RPG.
3. Distribuir ou não os arquivos individuais de sprites, incluindo risco de extração do APK.
4. Atribuição, eventual licença adicional e uso de derivados do pack.

Contato publicado pelo criador: lofi.kier@gmail.com (https://lofi-kier.itch.io/).

**Alternativa técnica se o autor não permitir embutir:** implementar importação de ZIP local adquirido pelo próprio usuário, não compartilhar camadas; consultar também se a exportação pelo editor é permitida. Não presumir permissão para compartilhamento só pela importação privada.

### Próxima implementação (após receber o arquivo autorizado)

1. Usuário fornece o ZIP original licenciado. Não incluir materiais pagos no repositório público antes de validar a autorização.
2. Inspecionar nomes/dimensões/alpha das PNGs, atlas ou arquivos de projeto. **A divisão real em sprites e a ordem de desenho só podem ser determinadas a partir do ZIP.**
3. Criar um índice de assets por tipo: `body`, `shade`, `face`, `eyes`, `hair`, `clothes`, `accessory`, `background`. Manter nomes originais e metadados; não assumir que `eyes` contém sobrancelhas ou `face` divide boca/nariz.
4. Renderizar os sprites em origem comum, usando `image-rendering: pixelated` e canvas 64 × 64 com nearest-neighbor. Para miniaturas/tokens, usar escalas inteiras e centro fixo.
5. Acrescentar controle independente de cores **somente onde os PNGs/máscaras permitirem**: reindexação por cor do material com proteção dos contornos e sombreados; não pintar regiões aleatórias.
6. Testar encaixe para combinações de corpo, face, olhos, cabelo e roupas. Itens incompatíveis recebem matriz de compatibilidade; nunca ajustar deslocamentos por tentativa e erro.
7. Preservar sistema de personagens, imagens, tokens e exportação existentes no Mastermind v0.84. Não restaurar renderizadores, geradores ou interfaces antigos.
8. Registrar créditos/licença e adicionar verificações para impedir inclusão acidental de arquivos não autorizados em releases.

### Escopo de UX

A experiência nova se baseará **somente** nos recursos realmente disponíveis no pacote. Não prometer individualmente nariz, boca, sobrancelha ou orelhas antes de examinar as camadas. Se for necessário complementar a coleção, encomendar assets no **mesmo molde de 64 × 64** e com autorização do autor.

**A v0.84 permanece sem Ateliê** até receber o ZIP e resolver a autorização. Este documento apenas registra a escolha e o plano.

## Proibições para o projeto

- Não gerar assets de personagem com IA.
- Não reaproveitar sprites antigas das versões 0.76–0.83.
- Não recortar retratos completos em peças falsas.
- Não baixar ou copiar pack comercial sem licença.
- Não republicar assets individuais em repositório público.
