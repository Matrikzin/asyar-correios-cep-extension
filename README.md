# 📮 Correios & CEP para Asyar

Extensão para consulta rápida de endereços por CEP e rastreamento de encomendas dos Correios do Brasil diretamente pelo Asyar launcher.

## ✨ Recursos

- ⚡ **Busca Instantânea de CEP:** Consulta integrada com múltiplos provedores com fallback automático (**BrasilAPI**, **ViaCEP** e **OpenCEP**).
- 📋 **Cópia em 1 Clique:** Copie o endereço completo formatado ou apenas o número do CEP.
- 🗺️ **Integração com Google Maps:** Abra a localização exata do endereço diretamente no Google Maps.
- 📦 **Rastreamento de Encomendas:** Salve suas encomendas com um apelido e acompanhe cada uma no site oficial dos Correios com 1 clique (padrão S10: 2 letras + 9 dígitos + 2 letras).
- 🕒 **Histórico Local:** Seus últimos CEPs consultados e encomendas ficam salvos com segurança no seu computador.
- 🎨 **Design Nativo & Glassmorphic:** Interface moderna, com suporte a tema escuro, contrastes refinados e microanimações.

## 🚀 Como Usar

Abra o Asyar e execute um dos comandos:

- **Buscar CEP:** Digite `Buscar CEP` ou o próprio número do CEP (ex: `70040-010` ou `01310-100`).
- **Rastrear Encomenda:** Digite `Rastrear Encomenda` e insira seu código de rastreio (ex: `AA123456789BR`).

## 📦 Sobre o Rastreamento

O rastreio abre direto no portal oficial dos Correios — não é preciso cadastro, chave de API nem login. A extensão guarda no seu computador a lista de encomendas (código e apelido) para você consultar de novo com um clique.

*Até a versão 1.1.0 o rastreio era exibido dentro da extensão via API do LinkeTrack, que foi descontinuada. Encomendas salvas nessas versões continuam na lista.*

## 🌐 Endpoints Externos & Privacidade (Network Egress)

Em conformidade com as diretrizes de privacidade do Asyar, todas as conexões externas realizadas pela extensão são públicas e não exigem credenciais:

- **BrasilAPI:** `https://brasilapi.com.br/api/cep/v2/` (Consulta pública primária de CEP).
- **ViaCEP:** `https://viacep.com.br/ws/` (Fallback público secundário de CEP).
- **OpenCEP:** `https://opencep.com/v1/` (Fallback público terciário de CEP).
- **Correios Brasil:** `https://rastreamento.correios.com.br` (Abertura direta da página oficial no navegador padrão).

## 🛡️ Permissões Utilizadas

- `network`: Acesso para consulta das APIs de CEP.
- `clipboard:write`: Copiar endereços e códigos para a área de transferência.
- `storage:read` & `storage:write`: Armazenamento local do histórico de CEPs e da lista de encomendas.

## 📄 Licença

Este projeto é distribuído sob a licença [MIT](LICENSE).

---
Desenvolvido por **Matrikzin** para a comunidade Asyar.
