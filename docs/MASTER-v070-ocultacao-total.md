# Mastermind v0.70 — ocultação total de névoa e escuridão

## Alterações sobre a v0.69
- **Névoa atmosférica:** cobertura contínua progressiva, com alpha 1 em densidade 100%. Nuvens suaves seguem animadas sobre a camada, sem revelar o cenário.
- **Escuridão global:** em 100% o Canvas2D fica totalmente opaco; luzes não recortam áreas nem expõem tokens nessa condição.
- **Bloqueio de salas:** salas ocultas em Névoa ou Escuridão mantêm fundos opacos e recebem animação 2.5D restrita à área; o bloqueio do servidor das versões anteriores é preservado.
- **Mestre:** visualização atenuada apenas nos extremos de 100%, permitindo manipular tokens/mapas. O jogador vê o bloqueio integral.
- **Servidor LAN:** quando `atmosphere.enabled=true` e `fogDensity >= .999` ou `ambient >= .999`, nenhum campo de visão é concedido; não são enviados tokens, desenho de células, fontes de luz ou imagem de fundo completa. O histórico explorado do jogador é preservado no armazenamento, mas não é enviado durante o blackout.
- **Compatibilidade:** mapas anteriores mantêm a atmosfera desligada; o campo de visão normal, portas e paredes continuam ativos nos outros níveis.

## Testes
- `node tests/mastermind_v69.test.cjs`
- `node tests/mastermind_v70.test.cjs`
- `gradle :app:assembleDebug`
- `python3 tests/verify_apk.py app/build/outputs/apk/debug/app-debug.apk`

**Limite técnico:** a atmosfera é um efeito 2.5D de Canvas2D e gradientes CSS, não neblina volumétrica 3D com ray marching. O bloqueio de visibilidade de dados é autoritativo no servidor LAN. Versões APK compiladas com chaves de debug diferentes podem não atualizar instalações anteriores sem backup/restauração.
