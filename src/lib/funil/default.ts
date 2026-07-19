import type { FunilConfig } from './types';

/**
 * Roteiro ÚNICO de LIGAÇÃO ATIVA (Nox Imóveis) — papel de PRÉ-VENDAS / SDR.
 *
 * Contexto: o corretor trabalha a LISTA FRIA do excelzão (importada pelo admin,
 * ex.: "Feirão Barra Velha"). O objetivo da ligação é gerar interesse e MARCAR
 * UM GOOGLE MEET — quem fechou meet vira lead ("✅ Incluir no CRM" ali do lado)
 * e o circuito assume dali.
 *
 * Variáveis: [Nome] = contato selecionado · [Seu nome] = corretor ·
 * [Lista] = nome da lista (de onde veio o contato) · [dia], [Horário] = fala livre.
 * Semente/fallback — o admin pode editar tudo depois.
 */
export const FUNIL_DEFAULT: FunilConfig = {
  produtos: [],
  objetivos: [],
  startNode: 'abertura',
  nodes: [
    {
      id: 'abertura',
      eyebrow: 'Início da ligação',
      titulo: 'Abertura — o cliente atendeu',
      descricao: 'Os primeiros 10 segundos decidem a ligação. Sorria (dá pra ouvir no telefone 😊), diga quem é, DE ONDE veio o contato e peça permissão. Leve e confiante.',
      mensagem: 'Oi, [Nome], tudo bem? Aqui é [Seu nome], da Nox Imóveis. Seu contato chegou até mim pelo [Lista], e te liguei rapidinho pra entender se você ainda tem interesse em imóveis aqui no Litoral — e já te ajudar a achar algo que faça sentido. Consegue falar uns minutinhos agora?',
      infoNote: 'Não atendeu? Anota nas anotações aqui do lado ("não atendeu, tentar à tarde") e segue pro próximo da lista — volume é o jogo da lista fria.',
      pergunta: 'Como o cliente reagiu?',
      choices: [
        { label: 'Topou conversar', icon: '👍', desc: 'Seguir para a sondagem', target: 'sondagem' },
        { label: 'Está sem tempo agora', icon: '⏰', desc: 'Combinar um retorno', target: 'agendar_retorno' },
        { label: 'Não lembra / desconfiou', icon: '🤨', desc: 'Gerar confiança primeiro', target: 'contexto' },
        { label: 'Não tem interesse', icon: '🙅', desc: 'Encerrar com leveza', target: 'encerrar_leve' },
      ],
    },
    {
      id: 'contexto',
      eyebrow: 'Confiança',
      titulo: 'Cliente não lembra ou desconfiou',
      descricao: 'Relembre DE ONDE veio o contato com naturalidade e deixe claro que a ligação é pra ajudar, não pra empurrar. Confiança primeiro.',
      mensagem: 'Sem problema, [Nome]! Seu contato veio do [Lista] — e eu te liguei justamente pra não ficar te mandando informação à toa: prefiro entender primeiro o que faz sentido pra você. Prometo ser rápido: consigo te fazer só umas perguntinhas?',
      pergunta: 'E agora?',
      choices: [
        { label: 'Agora topou', icon: '👍', target: 'sondagem' },
        { label: 'Segue sem tempo', icon: '⏰', target: 'agendar_retorno' },
        { label: 'Não quer mesmo', icon: '🙅', target: 'encerrar_leve' },
      ],
    },
    {
      id: 'agendar_retorno',
      eyebrow: 'Retorno',
      titulo: 'Cliente sem tempo agora',
      descricao: 'Não insista. Pergunte um horário ESPECÍFICO e ligue pontualmente — pontualidade passa profissionalismo.',
      mensagem: 'Tranquilo, [Nome]! Qual o melhor horário pra eu te ligar de volta — mais pro fim da tarde ou amanhã de manhã? Prometo ser rápido e objetivo.',
      infoNote: 'Anota o horário combinado nas ANOTAÇÕES aqui do lado (ex.: "ligar qui 17h") e deixa o contato na lista "Pra ligar". Na hora certa, é só recomeçar do início.',
      choices: [
        { label: 'Combinei o retorno — próximo da lista', icon: '📝', target: 'abertura' },
      ],
    },
    {
      id: 'sondagem',
      eyebrow: 'Sondagem',
      titulo: 'Entenda o cliente antes de oferecer',
      descricao: 'Quem pergunta conduz. Faça perguntas abertas e ESCUTE — só direcione depois de entender. Vá marcando a QUALIFICAÇÃO aqui do lado enquanto ele responde (finalidade, região, valor…).',
      mensagem: '• O que te fez procurar um imóvel aqui no Litoral?\n• Seria mais pra morar, curtir no verão ou investir?\n• Você já conhece a região? Já chegou a ver algum imóvel por aqui?\n• Tem um prazo em mente ou está começando a pesquisar?',
      pergunta: 'Qual perfil apareceu?',
      choices: [
        { label: 'Quer morar', icon: '🏡', target: 'perfil_moradia' },
        { label: 'Quer veraneio / praia', icon: '🏖️', target: 'perfil_veraneio' },
        { label: 'Quer investir', icon: '📈', target: 'perfil_investimento' },
        { label: 'Ainda está pesquisando', icon: '🤔', desc: 'Ajudar a clarear o objetivo', target: 'perfil_indeciso' },
      ],
    },
    {
      id: 'perfil_moradia',
      eyebrow: 'Perfil · Moradia',
      titulo: 'Cliente quer morar',
      descricao: 'Conecte com o momento de vida dele. Gere curiosidade — quem mostra tudo é o especialista no Meet.',
      mensagem: 'Que bom, [Nome]! A gente tem boas opções pra morar aqui na região, tanto prontas quanto na planta com condições facilitadas. O melhor jeito de te mostrar é numa conversa rápida por Google Meet: nosso especialista te apresenta na tela a localização, as plantas e as condições, e você já sente se é a sua cara — sem sair de casa.',
      choices: [
        { label: 'Puxar pro Meet', icon: '🎯', target: 'fechar_meet' },
      ],
    },
    {
      id: 'perfil_veraneio',
      eyebrow: 'Perfil · Veraneio',
      titulo: 'Cliente quer veraneio',
      descricao: 'Venda a experiência: praia, lazer, família. E, se fizer sentido, a renda de temporada como bônus.',
      mensagem: 'Perfeito, [Nome]! Temos opções com estrutura de lazer estilo resort e fácil acesso à praia — e, se quiser, algumas ainda geram renda de temporada quando você não estiver usando. Numa conversa rápida por Google Meet a gente te mostra tudo na tela e você vê qual combina mais com você.',
      choices: [
        { label: 'Puxar pro Meet', icon: '🎯', target: 'fechar_meet' },
      ],
    },
    {
      id: 'perfil_investimento',
      eyebrow: 'Perfil · Investimento',
      titulo: 'Cliente quer investir',
      descricao: 'Fale a língua dele: números, valorização e rentabilidade. Quem abre os números é o especialista no Meet.',
      mensagem: 'Ótimo, [Nome]! A gente trabalha com empreendimentos em regiões em crescimento, com bom potencial de valorização, e também opções voltadas pra renda com locação. Numa conversa rápida por Google Meet nosso especialista te mostra os números na tela e você vê qual estratégia rende mais pra você.',
      choices: [
        { label: 'Puxar pro Meet', icon: '🎯', target: 'fechar_meet' },
      ],
    },
    {
      id: 'perfil_indeciso',
      eyebrow: 'Perfil · Indeciso',
      titulo: 'Cliente ainda está pesquisando',
      descricao: 'Não pressione. Ajude a clarear o objetivo com uma pergunta simples e direcione.',
      mensagem: 'Sem problema, [Nome]! Deixa eu te ajudar a pensar: hoje você imagina esse imóvel mais pra morar, pra curtir no verão com a família, ou como um investimento que rende? Assim eu já te mostro o caminho certo.',
      pergunta: 'Com a resposta, qual o perfil?',
      choices: [
        { label: 'Morar', icon: '🏡', target: 'perfil_moradia' },
        { label: 'Veraneio', icon: '🏖️', target: 'perfil_veraneio' },
        { label: 'Investir', icon: '📈', target: 'perfil_investimento' },
      ],
    },
    {
      id: 'fechar_meet',
      eyebrow: 'Fechamento',
      titulo: 'Marque o Google Meet',
      descricao: 'O objetivo da ligação é ESTE: marcar um Google Meet rápido (20-30 min) com o nosso especialista. Não pergunte "se" — pergunte "quando". Ofereça dois horários.',
      mensagem: 'Olha, [Nome], pra não te tomar tempo agora e te mostrar tudo direitinho, o ideal é a gente marcar um Google Meet rápido, uns 20 minutinhos: nosso especialista te apresenta as opções na tela e tira todas as dúvidas — você participa de onde estiver. Consigo encaixar [dia] ou [dia]: o que fica melhor pra você, de manhã ou à tarde?',
      pergunta: 'Como o cliente reagiu?',
      choices: [
        { label: 'Topou e marcou! 🎉', icon: '✅', desc: 'Virar lead no CRM', target: 'meet_confirmado' },
        { label: 'Levantou uma objeção', icon: '🤔', desc: 'Contornar e voltar a fechar', target: 'objecoes' },
        { label: 'Prefere WhatsApp', icon: '💬', target: 'obj_whats' },
        { label: 'Não quer agora', icon: '🌙', desc: 'Encerrar com leveza', target: 'encerrar_leve' },
      ],
    },
    {
      id: 'objecoes',
      eyebrow: 'Objeções',
      titulo: 'Contorne a objeção e volte a marcar o Meet',
      descricao: 'Objeção é sinal de interesse. Acolha, responda com segurança e conduza de volta pro Google Meet — sempre com duas opções de horário.',
      pergunta: 'Qual objeção apareceu?',
      choices: [
        { label: '"Tô só pesquisando"', icon: '🔎', target: 'obj_pesquisando' },
        { label: '"Achei caro / fora do orçamento"', icon: '💸', target: 'obj_preco' },
        { label: '"Vou pensar / falar com alguém"', icon: '🤝', target: 'obj_pensar' },
        { label: '"Me manda por WhatsApp"', icon: '💬', target: 'obj_whats' },
        { label: '"Não conheço bem a região"', icon: '📍', target: 'obj_regiao' },
      ],
    },
    {
      id: 'obj_pesquisando',
      eyebrow: 'Objeção',
      titulo: '"Tô só pesquisando"',
      mensagem: 'Perfeito, [Nome], pesquisar é o certo mesmo! E é justamente por isso que vale um Google Meet rápido — nosso especialista te mostra tudo na tela e você compara de verdade, sem compromisso nenhum. Prefere [dia] ou [dia]?',
      choices: [{ label: 'Voltar a marcar o Meet', icon: '↩️', target: 'fechar_meet' }],
    },
    {
      id: 'obj_preco',
      eyebrow: 'Objeção',
      titulo: '"Achei caro / fora do orçamento"',
      mensagem: 'Entendo, [Nome]. E é bem por isso que vale a conversa: a gente tem opções e condições diferentes, e muita coisa que parece fora do orçamento tem um fluxo de pagamento que cabe. Num Google Meet rápido o especialista te mostra as possibilidades na tela — você prefere [dia] ou [dia]?',
      choices: [{ label: 'Voltar a marcar o Meet', icon: '↩️', target: 'fechar_meet' }],
    },
    {
      id: 'obj_pensar',
      eyebrow: 'Objeção',
      titulo: '"Vou pensar / falar com esposo(a)"',
      mensagem: 'Claro, [Nome], decisão de imóvel é a dois mesmo! E o bom do Google Meet é isso: dá pra vocês dois participarem juntos, de casa, verem tudo na tela e tirarem as dúvidas na hora. Fica melhor [dia] ou [dia]?',
      choices: [{ label: 'Voltar a marcar o Meet', icon: '↩️', target: 'fechar_meet' }],
    },
    {
      id: 'obj_whats',
      eyebrow: 'Objeção',
      titulo: '"Me manda por WhatsApp"',
      descricao: 'Aceite mandar algo, mas puxe pro Meet — e se insistir, combine o Meet com dia e hora.',
      mensagem: 'Mando sim, [Nome]! Mas te adianto: por WhatsApp vai só um pedacinho. Num Google Meet rápido nosso especialista te mostra tudo na tela e você já sai com as dúvidas resolvidas — bem mais prático. Que tal a gente já deixar marcado? Prefere [dia] ou [dia]?',
      infoNote: 'Se insistir só no WhatsApp: usa o botão 💬 aqui do lado, manda um resumo e combina o Meet com dia e hora. Nunca deixa em aberto.',
      choices: [{ label: 'Voltar a marcar o Meet', icon: '↩️', target: 'fechar_meet' }],
    },
    {
      id: 'obj_regiao',
      eyebrow: 'Objeção',
      titulo: '"Não conheço bem a região"',
      mensagem: 'Esse é o melhor motivo pra gente conversar, [Nome]! Num Google Meet rápido eu te mostro a região no mapa, os acessos e a estrutura em volta na tela — e de quebra já te apresento o imóvel. Fica bom [dia] ou [dia]?',
      choices: [{ label: 'Voltar a marcar o Meet', icon: '↩️', target: 'fechar_meet' }],
    },
    {
      id: 'meet_confirmado',
      eyebrow: 'Meet marcado 🎉',
      titulo: 'Fechou! Agora vira lead no CRM',
      descricao: 'Seu papel na lista fria termina aqui — agora esse contato é LEAD. Clica em "✅ Incluir no CRM" aqui do lado: as anotações e a qualificação sobem junto, e o circuito já abre pra você agendar o meet com data e hora.',
      mensagem: 'Combinado, [Nome]! Então nosso Google Meet fica pra [dia] às [Horário]. Vou te mandar o link por aqui, é só clicar na hora — não precisa instalar nada. Qualquer imprevisto, me avisa. Até lá! 😊',
      checklist: [
        'Confirmar dia e horário com o cliente',
        'Anotar o combinado nas anotações (dia, hora, o que ele busca)',
        '✅ Incluir no CRM — o circuito abre pra agendar o meet certinho',
        'Mandar o link do Google Meet no WhatsApp',
        'Confirmar com o cliente 1 dia antes (lembrete rápido)',
      ],
    },
    {
      id: 'encerrar_leve',
      eyebrow: 'Encerramento',
      titulo: 'Cliente não quer — encerre com leveza',
      descricao: 'Um "não agora" vira "sim" lá na frente. Encerre bem e registre o destino na lista: sem interesse de verdade → 🗑 Descartar; "quem sabe depois" → anota e deixa na lista.',
      mensagem: 'Sem problemas, [Nome]! Fico à disposição. Se em algum momento você quiser dar uma olhada nas oportunidades aqui do Litoral, é só me chamar que eu te ajudo com o maior prazer. Um abraço!',
      infoNote: 'Número errado, "não liga mais" ou sem perfil → 🗑 Descartar aqui do lado. Educado mas frio ("agora não") → anota o motivo e deixa na lista pra uma nova tentativa em outra campanha.',
      choices: [
        { label: 'Encerrado — próximo da lista', icon: '⏭️', target: 'abertura' },
      ],
    },
  ],
};
