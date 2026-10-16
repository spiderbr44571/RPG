# Projeto RPG Mesa — protótipo Android 0.7

Plataforma de RPG de mesa modular com interface offline para Android. O nome é provisório.

## Esta versão
- **Biblioteca:** sistema Ordem Paranormal RPG 1.3, com importação do PDF particular pelo seletor Android (Storage Access Framework).
- **Bestiário:** grimório de capa animada, virada de folha, 48 criaturas indexadas, registros personalizados, edição de estatísticas, poderes, notas, tokens locais e inserção no canvas.
- **Livro original:** botão no grimório para renderizar localmente a página correspondente do PDF fornecido pelo usuário; o aplicativo não distribui o PDF.
- **Fichas:** várias fichas por sistema; rituais conhecidos por personagem e alertas de progressão sem bloqueio.
- **Equipamentos:** catálogo estruturado pelas tabelas 3.3, 3.6, 3.8 e 3.10 do livro v1.3; itens paranormais em categoria separada.
- **Interface:** painel com número de livros pessoais, sistemas, fichas e criaturas; tema escuro/claro, roda de cores HSV, fontes e efeitos visuais; atalho de configurações mobile.
- **Sem servidor:** a LAN é opcional e não é necessária para fichas, grimório, biblioteca ou canvas.

## Limitações importantes
- O APK é experimental. A compilação automatizada **não equivale a teste em dispositivo real**.
- Ações de criaturas especiais, condições, resistências e alguns efeitos continuam consultivos: consultar página do livro e confirmar com o mestre.
- O leitor integrado de páginas precisa que o usuário tenha importado sua própria cópia do PDF; a edição/indexação se refere especificamente à v1.3.
- Os resumos do bestiário são originais e concisos, **não transcrições literais** do livro. O botão de página original exibe o livro privado importado localmente.
- As alterações no bestiário são locais ao aparelho. Para sincronizá-las entre jogadores, é necessário implementar persistência compartilhada autenticada.
- O conteúdo de Ordem Paranormal é uma integração **não oficial**, sem vínculo com autores ou editoras. Nenhum livro comercial ou arte do livro é disponibilizado pelo repositório.

## Compilar
Acesse [GitHub Actions](https://github.com/spiderbr44571/RPG/actions/workflows/android-debug.yml) e baixe o artefato `rpg-mesa-debug-apk` da execução mais recente concluída com sucesso.

A compilação utiliza Java 17, Android Gradle Plugin 8.7.3, Gradle 8.10.2 e API 35.
