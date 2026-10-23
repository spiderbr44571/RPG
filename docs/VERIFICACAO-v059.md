# Mastermind v0.59 — poderes de classe e navegação

Base: Mastermind v0.58. O ícone temporário aprovado pelo usuário é mantido como referência visual; nenhuma nova arte foi criada nesta mudança.

## Interface

- Removido o botão `#v56-quick-powers` no cabeçalho da ficha, bem como o segundo atalho `#v56-go-powers` na lista legada. **Um único caminho de aquisição:** Ficha → aba `Poderes / Transcender`.
- O painel antigo de habilidades é de consulta/ativação de habilidades existentes, sem permitir conceder novos poderes por checkbox.
- A aba recompõe os poderes disponíveis sempre que é aberta ou quando a classe muda; nenhum registro de personagem foi apagado.

## Catálogo Ordem Paranormal RPG, livro básico 1.3

- Combatente: 17 escolhas individuais + Treinamento em Perícia = **18**.
- Especialista: 13 escolhas individuais + Treinamento em Perícia = **14**.
- Ocultista: 14 escolhas individuais + Treinamento em Perícia = **15**.
- Transcender está em uma categoria separada e compartilha o mesmo orçamento de progressão por NEX.
- Nomes e pré-requisitos pontuais ficam em `mastermind55_powers.json`; a ficha Android utiliza `mastermind59_class_catalog.js`, gerado a partir dos mesmos dados. Fichas LAN consultam a API existente `/powers-catalog.json`.
- A ficha valida requisitos de NEX/atributos, treinamentos registrados e dependência de poderes; o servidor bloqueia classe errada, NEX/atributos insuficientes e poder anterior ausente, mantendo aprovação manual do mestre nos requisitos de treinamento e efeitos que não estejam estruturados.
- **Treinamento em Perícia é repetível**: cada seleção ocupa uma escolha de progressão, mas o nome não é duplicado em `powers`. Os detalhes da escolha das perícias ainda precisam ser confirmados com o livro/mestre, e não são aplicados automaticamente.
- Poderes individuais são cadastráveis e exibidos, não significa automação de seus efeitos; não serão inventados.

## Verificação

O novo teste `tests/mastermind_v59.test.cjs` confere catálogos completos, eliminação dos botões, regras de classe/NEX, repetição e sincronismo com dados. Testes Playwright verificam a aba real em diferentes classes; testes HTTP do servidor Java verificam a rejeição de poderes de outra classe e o registro de escolhas repetíveis. O teste Android abre a aba real na WebView; a publicação do APK depende de todo o workflow (E2E, compilação, emulador e assinatura).

## Instalação

O applicationId e arquivos de armazenamento permanecem iguais. A compilação `debug` no GitHub Actions é assinada por chave variável do ambiente; atualizações sobre APKs antigos podem falhar por incompatibilidade de assinatura. **Não desinstalar nem apagar os dados para contornar uma falha de instalação.**
