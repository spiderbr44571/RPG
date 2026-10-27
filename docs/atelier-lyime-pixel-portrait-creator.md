# Ateliê v0.86 — Pixel Portrait Creator do lyime (uso externo)

Pacote escolhido pelo usuário: [Pixel Portrait Creator](https://lyime.itch.io/pixel-portrait-creator), desenvolvido por lyime.

## Arquivo original inspecionado
O usuário forneceu PixelPortraitCreator.zip, contendo apenas um executável do Windows e um arquivo .pck do Godot. Não é um projeto Godot pronto para exportação Android.

O autor oferece uma demonstração web, porém informa que **a versão online não exporta**. A versão Windows permite importar/exportar/salvar retratos. Fonte: https://lyime.itch.io/pixel-portrait-creator

## Integração compatível com o APK Android
1. O botão Ateliê abre uma tela de integração com a ferramenta **original**, não um editor refeito pelo Mastermind.
2. "Abrir versão online" usa navegador externo no endereço fixo do autor. Esta versão permite personalização, mas não exporta PNG.
3. "Obter versão completa (PC)" abre a página de download do autor. No Linux, pode-se experimentar executar o software Windows com Wine, sem garantia de compatibilidade.
4. O usuário exporta uma imagem PNG no PC, envia ao telefone ou escolhe uma captura de tela do criador online.
5. O Mastermind importa PNG/JPG/WebP localmente pelo seletor nativo do Android, com arraste e zoom para recorte quadrado.
6. Um token circular 256×256 é gerado localmente; ambas as imagens são salvas na ficha selecionada, só após confirmação.
7. Exportação PNG pelo Android Storage Access Framework existente.
8. Os retratos e tokens já salvos anteriormente são preservados; nenhum arquivo do criador original é distribuído.

## Licença e segurança
O autor permite usar as imagens em projetos não comerciais pela licença gratuita com atribuição, mas proíbe redistribuir o software e as assets. Mesmo se o usuário mantiver seu projeto privado, evitamos empacotar software e sprites de terceiros.

A implementação usa um **link HTTPS fixo** para o domínio do autor e Intent.ACTION_VIEW. Nenhuma página externa recebe acesso às bridges nativas, a dados de ficha ou armazenamento do Mastermind. O processamento da imagem importada ocorre apenas no aparelho, sem upload.

## Limitação
Não há edição das camadas internas do lyime no aplicativo Android: a personalização é feita no programa oficial; o Mastermind importa/recorta o resultado. A versão web não exporta, então no Android a alternativa é fazer captura de tela.
