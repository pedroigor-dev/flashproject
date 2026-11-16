# Flash Experience

Frontend conceito independente para apresentação, construído com Next.js 16 (App Router), React 19 e TypeScript. Não é um produto oficial da Flash.

## Rodar

Requer Node.js 20.9 ou superior.

```powershell
cd C:\source\flashproject
npm install
npm run dev -- --port 3200
```

Abra http://127.0.0.1:3200. Para produção: `npm run build` e `npm run start -- --port 3200`. Verificação de tipos: `npm run typecheck`.

## Experiência

- `/`: pré-loading inspirado na entrada do projeto Cérebro, hero editorial e cartão CSS 3D com frente e verso. O giro desacelera e termina com a frente visível. Mensagens orbitam o cartão, com botão para pausar a animação.
- `/chat`: interface de conversa, sugestões, histórico local, exclusão de conversas, copiar resposta e menu móvel.
- Flashinho: flamingo SVG com geometria pixel art, animações de olhos, corpo e pé. Sem assets externos necessários.
- Fonte Manrope servida localmente. Layout responsivo, navegação por teclado e preferência de movimento reduzido.

## Estado da IA

O chat usa respostas reais via backend NestJS em `C:\source\flashbackend`, com Groq e o modelo `openai/gpt-oss-120b`. A base de referência contém informações públicas da Flash; não há consulta a contas de colaboradores nem pesquisa web em tempo real. O histórico fica no localStorage deste navegador, e até 20 mensagens são encaminhadas como contexto ao provedor configurado.

As chaves ficam exclusivamente no `.env` do backend, ignorado pelo Git. A interface informa o envio das mensagens ao provedor de IA e mostra erros reais, sem respostas demonstrativas como fallback.

## Pesquisa de stack — 16/11/2026

Fontes primárias, vagas publicadas pela própria Flash:

- https://jobs.lever.co/flashapp/8ec8070d-d843-4452-a2e7-3b1290ff9f0d — menciona explicitamente Node.js, TypeScript, ReactJS, NestJS, MongoDB e bancos relacionais em “Domínio da nossa Stack”. Cloud e CI/CD aparecem como familiaridade desejável, sem confirmar fornecedor exclusivo.
- https://jobs.lever.co/flashapp/ba441087-16fa-453a-9e17-48426474f5a6 — NodeJS, TypeScript, ReactJS, arquitetura de serviços, Clean Architecture, Event Driven Architecture e DDD.
- https://jobs.lever.co/flashapp/bb973d4d-b066-4d28-a04d-e97685ab7896 — cita NestJS, Kafka, MongoDB e Grafana como diferenciais para uma vaga específica; não comprova adoção universal em todas as equipes.

Next.js é uma escolha solicitada para este projeto, não uma tecnologia confirmada da Flash pelas fontes consultadas. CSS 3D, SVG e Lucide são escolhas visuais deste frontend.

## Fontes de produto

- https://flashapp.com.br/
- https://flashapp.com.br/gestao-de-beneficios
- https://faq.flashapp.com.br/kb/guide/pt-BR/onde-aceita-e-como-usar-o-meu-cartao-flash-e5yQA7tfeC/Steps/4198095

O cartão é uma interpretação visual criada em CSS. O mascote e a experiência são criações deste projeto conceito. Regras dos benefícios devem ser verificadas nas fontes oficiais.

## Backend de IA integrado

1. Em `C:\source\flashbackend`, execute `npm run dev` (porta 4000).
2. Em `C:\source\flashproject`, execute `npm run dev -- --port 3200`.
3. Abra http://localhost:3200/chat. A porta 3000 está sendo usada por outro projeto local.

`FLASH_BACKEND_URL` (variável apenas do servidor Next.js) pode alterar o endereço padrão `http://127.0.0.1:4000`. O backend permite selecionar Groq ou Hugging Face por configuração; a opção ativa é Groq. Consulte o README do backend para variáveis e limites.
