# 📮 Correios & CEP para Asyar

Extensão para consulta rápida de endereços por CEP e rastreamento de encomendas dos Correios do Brasil diretamente pelo Asyar launcher.

## ✨ Recursos

- ⚡ **Busca Instantânea de CEP:** Consulta integrada com múltiplos provedores com fallback automático (**BrasilAPI**, **ViaCEP** e **OpenCEP**).
- 📋 **Cópia em 1 Clique:** Copie o endereço completo formatado ou apenas o número do CEP.
- 🗺️ **Integração com Google Maps:** Abra a localização exata do endereço diretamente no Google Maps.
- 📦 **Rastreamento de Encomendas:** Acompanhe o histórico e status de pacotes oficiais dos Correios (padrão S10: 2 letras + 9 dígitos + BR).
- 🕒 **Histórico Local:** Seus últimos CEPs consultados e encomendas ficam salvos com segurança no seu computador.
- 🎨 **Design Nativo & Glassmorphic:** Interface moderna, com suporte a tema escuro, contrastes refinados e microanimações.

## 🚀 Como Usar

Abra o Asyar e execute um dos comandos:

- **Buscar CEP:** Digite `Buscar CEP` ou o próprio número do CEP (ex: `70040-010` ou `01310-100`).
- **Rastrear Encomenda:** Digite `Rastrear Encomenda` e insira seu código de rastreio (ex: `AA123456789BR`).

## ⚙️ Configuração de Rastreamento (Preferências)

Para rastrear encomendas diretamente pela interface do launcher:
1. Obtenha um usuário e token gratuitos em [linketrack.com](https://linketrack.com).
2. Abra as preferências da extensão no Asyar (**Settings → Extensions → Correios & CEP**).
3. Preencha os campos **Usuário LinkeTrack** e **Token LinkeTrack**.

*Nota: Se preferir não cadastrar uma chave da API, a extensão permite abrir o código de rastreio diretamente no portal oficial dos Correios com apenas 1 clique.*

## 🌐 Endpoints Externos & Privacidade (Network Egress)

Em conformidade com as diretrizes de privacidade do Asyar, todas as conexões externas realizadas pela extensão são públicas ou autenticadas via credenciais próprias do usuário:

- **BrasilAPI:** `https://brasilapi.com.br/api/cep/v2/` (Consulta pública primária de CEP).
- **ViaCEP:** `https://viacep.com.br/ws/` (Fallback público secundário de CEP).
- **OpenCEP:** `https://opencep.com/v1/` (Fallback público terciário de CEP).
- **LinkeTrack:** `https://api.linketrack.com/track/json` (Consulta de rastreamento acionada apenas quando o usuário configura suas credenciais nas preferências).
- **Correios Brasil:** `https://rastreamento.correios.com.br` (Abertura direta da página oficial no navegador padrão).

## 🛡️ Permissões Utilizadas

- `network`: Acesso para consulta de APIs de CEP e rastreamento.
- `clipboard:write`: Copiar endereços e códigos para a área de transferência.
- `storage:read` & `storage:write`: Armazenamento local seguro do histórico de buscas recentes.

## 📄 Licença

Este projeto é distribuído sob a licença [MIT](LICENSE).

---
Desenvolvido por **Matrikzin** para a comunidade Asyar.
