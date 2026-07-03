import type { FunilConfig } from './types';

/**
 * Conteúdo padrão do funil de Ligação Ativa (Nox Imóveis).
 * Fiel ao mapa mental original (funil-nox). Serve de semente/fallback:
 * quando a imobiliária ainda não editou nada, é isto que aparece.
 */
export const FUNIL_DEFAULT: FunilConfig = {
  produtos: [
    { key: 'orla_da_barra', label: 'Orla da Barra' },
    { key: 'barra_view', label: 'Barra View' },
    { key: 'viverde', label: 'Viverde' },
    { key: 'nao_sei', label: 'Não sei' },
  ],
  objetivos: [
    { key: 'moradia', label: 'Moradia' },
    { key: 'veraneio', label: 'Veraneio' },
    { key: 'investimento', label: 'Investimento' },
    { key: 'nao_sei', label: 'Não sei' },
  ],
  startNode: 'call1',
  nodes: [
    // ETAPA 01
    {
      id: 'call1',
      eyebrow: 'Etapa 01',
      titulo: 'Primeira ação obrigatória',
      descricao: 'Como o lead veio por formulário de propaganda, a primeira ação deve ser ligar diretamente para o cliente. A ligação serve para entender rapidamente o contexto, confirmar o interesse e tentar agendar um meeting.',
      pergunta: 'O que aconteceu?',
      choices: [
        { label: 'Cliente atendeu', icon: '📞', target: 'call1_answered' },
        { label: 'Cliente não atendeu', icon: '☎️', target: 'call1_no_answer' },
      ],
    },
    {
      id: 'call1_answered',
      eyebrow: 'Etapa 01',
      titulo: 'Cliente atendeu',
      descricao: 'Objetivo da ligação: fazer uma conversa breve, entender o perfil do cliente e conduzir para um meeting. Use o script abaixo como roteiro.',
      mensagem: 'Oi, [Nome], tudo bem? Aqui é [Seu nome], da Nox Imóveis.\n\nRecebi seu contato pelo anúncio do [Produto] aqui no Litoral e te liguei rapidinho só pra entender melhor o que você está buscando.\n\nAntes de te mandar qualquer coisa por WhatsApp, queria entender se esse imóvel seria mais para moradia, veraneio ou investimento?',
      pergunta: 'Depois que o cliente respondeu, qual o caminho?',
      choices: [
        { label: 'Busca moradia', icon: '🏡', desc: 'Cliente quer um imóvel para morar', target: 'qual_moradia' },
        { label: 'Busca veraneio', icon: '🏖️', desc: 'Imóvel de praia, com ou sem renda', target: 'qual_veraneio' },
        { label: 'Busca investimento', icon: '📈', desc: 'Valorização ou rentabilidade', target: 'qual_investimento' },
        { label: 'Cliente não sabe ainda', icon: '🤔', desc: 'Ajudar a se encontrar, sem pressionar', target: 'qual_naosei' },
        { label: 'Cliente perguntou outra coisa', icon: '💬', desc: 'Desviou da pergunta inicial', target: 'qual_outra' },
      ],
    },
    {
      id: 'call1_no_answer',
      eyebrow: 'Etapa 01',
      titulo: 'Cliente não atendeu',
      descricao: 'Depois da primeira ligação sem resposta, envie uma mensagem explicando o motivo do contato e avisando que tentará ligar novamente em outro horário.',
      mensagem: 'Bom dia, [Nome]! Tudo bem? Aqui é [Seu nome], da Nox Imóveis.\n\nRecebi seu contato pelo anúncio do [Produto] e tentei te ligar agora há pouco pra entender melhor o que você está buscando.\n\nComo não conseguimos conversar, vou tentar te ligar novamente às [Horário], que talvez você esteja mais tranquilo.',
      choices: [{ label: 'Registrar 2ª tentativa de ligação', icon: '➡️', target: 'call2' }],
    },

    // ETAPA 02 — QUALIFICAÇÃO
    {
      id: 'qual_moradia',
      eyebrow: 'Qualificação',
      titulo: 'Cliente busca moradia',
      mensagem: 'Perfeito! E você pensa em algo pronto pra morar logo ou considera também um imóvel na planta? Isso me ajuda a entender melhor teu momento e separar algo que faça mais sentido pra você. 🏡',
      pergunta: 'Qual o subperfil dele?',
      choices: [
        { label: 'Pronto pra morar', icon: '🔑', desc: 'Imóvel pronto ou com entrega próxima', target: 'mor_pronto' },
        { label: 'Na planta', icon: '📐', desc: 'Aceita imóvel em construção', target: 'mor_planta' },
      ],
    },
    {
      id: 'mor_pronto',
      eyebrow: 'Mensagem',
      titulo: 'Moradia · Pronto pra morar',
      audio: true,
      infoNote: 'Esta mensagem é o próprio áudio — basta gravar lendo o texto abaixo de forma natural e enviar. Depois é só aguardar a resposta do cliente.',
      mensagem: '[Nome], nossa imobiliária trabalha com boas opções prontas ou com entrega próxima aqui na região. Como você busca algo para uso pessoal e, nesse caso, localização, prazo de entrega, estrutura e perfil do imóvel fazem toda a diferença... Acho que por uma ligação rápida consigo entender melhor o que você procura e já te mostrar opções mais alinhadas. Qual seria um bom horário pra conversarmos?',
      choices: [{ label: 'Aguardar resposta · convite para meeting', icon: '➡️', target: 'meeting' }],
    },
    {
      id: 'mor_planta',
      eyebrow: 'Mensagem',
      titulo: 'Moradia · Na planta',
      audio: true,
      infoNote: 'Esta mensagem é o próprio áudio — basta gravar lendo o texto abaixo de forma natural e enviar. Depois é só aguardar a resposta do cliente.',
      mensagem: '[Nome], nossa imobiliária é especialista em imóveis na planta aqui na região e temos algumas boas opções que você pode gostar. Como você busca para uso pessoal, detalhes como localização, prazo de entrega, estrutura e fluxo de pagamento fazem bastante diferença... Acho que por uma ligação rápida consigo entender melhor teu cenário e já te mostrar opções mais alinhadas. Qual seria um bom horário pra conversarmos?',
      choices: [{ label: 'Aguardar resposta · convite para meeting', icon: '➡️', target: 'meeting' }],
    },
    {
      id: 'qual_veraneio',
      eyebrow: 'Qualificação',
      titulo: 'Cliente busca veraneio',
      mensagem: 'Perfeito! E nesse caso, a ideia é só curtir com a família ou também pensa em gerar uma renda com locação por temporada quando não estiver usando? Isso ajuda bastante a entender qual perfil de imóvel te atende melhor. 🏖️',
      pergunta: 'Qual o subperfil dele?',
      choices: [
        { label: 'Uso próprio', icon: '🌴', desc: 'Só pra curtir com a família', target: 'ver_uso' },
        { label: 'Com renda', icon: '💰', desc: 'Quer gerar renda em temporada', target: 'ver_renda' },
      ],
    },
    {
      id: 'ver_uso',
      eyebrow: 'Mensagem',
      titulo: 'Veraneio · Uso próprio',
      mensagem: 'Ótimo, [Nome]! Temos opções em localizações com estrutura completa, lazer estilo resort e fácil acesso à praia. Tenho uma sugestão que parece bem próxima do que estamos conversando. Posso te mandar um áudio rapidinho?',
      choices: [{ label: 'Cliente autorizou · enviar áudio', icon: '➡️', target: 'audio_structure' }],
    },
    {
      id: 'ver_renda',
      eyebrow: 'Mensagem',
      titulo: 'Veraneio · Com renda',
      mensagem: 'Ótimo, [Nome]! Temos opções que unem veraneio, boa localização e possibilidade de renda com locação por temporada. Em alguns casos, ainda contam com apoio de gestoras de aluguel, que cuidam da operação e facilitam muito esse processo. Tenho uma sugestão que pode encaixar bem no que você busca. Posso te mandar um áudio rapidinho?',
      choices: [{ label: 'Cliente autorizou · enviar áudio', icon: '➡️', target: 'audio_structure' }],
    },
    {
      id: 'qual_investimento',
      eyebrow: 'Qualificação',
      titulo: 'Cliente busca investimento',
      mensagem: 'Show, [Nome]! E dentro desse objetivo, você busca algo mais voltado para valorização futura, pensando em revenda depois, ou prefere algo com foco em retorno mensal através de locação? Isso me ajuda a entender melhor tua estratégia e te mostrar o tipo de investimento que realmente faz sentido pra você. 📈',
      pergunta: 'Qual o subperfil dele?',
      choices: [
        { label: 'Valorização', icon: '📊', desc: 'Pensando em revenda futura', target: 'inv_valor' },
        { label: 'Rentabilidade', icon: '🏨', desc: 'Retorno mensal via locação', target: 'inv_locacao' },
      ],
    },
    {
      id: 'inv_valor',
      eyebrow: 'Mensagem',
      titulo: 'Investimento · Valorização',
      mensagem: 'Legal, [Nome]! Temos empreendimentos em regiões em expansão, com obras públicas, crescimento urbano e um bom potencial de valorização até a entrega. Tem uma opção que vem chamando atenção de quem investe pensando em ganho patrimonial. Posso te mandar um áudio rapidinho explicando?',
      choices: [{ label: 'Cliente autorizou · enviar áudio', icon: '➡️', target: 'audio_structure' }],
    },
    {
      id: 'inv_locacao',
      eyebrow: 'Mensagem',
      titulo: 'Investimento · Rentabilidade',
      mensagem: 'Excelente, [Nome]! Temos empreendimentos em localizações estratégicas para locação por temporada, alguns inclusive com apoio de gestoras como Housi e Seazone, que ajudam a profissionalizar a operação e potencializar a rentabilidade. Tem uma opção que pode fazer bastante sentido para quem busca gerar renda com imóvel. Posso te mandar um áudio rapidinho explicando?',
      choices: [{ label: 'Cliente autorizou · enviar áudio', icon: '➡️', target: 'audio_structure' }],
    },
    {
      id: 'qual_naosei',
      eyebrow: 'Qualificação',
      titulo: 'Cliente não sabe ainda',
      descricao: 'Ajude o cliente a se encontrar. Não pressione. Explique que existem caminhos diferentes dependendo do objetivo.',
      mensagem: 'Sem problema, [Nome]. Só pra eu entender melhor e não te mandar nada fora do que procura: hoje você está olhando mais por curiosidade, pensando em morar, usar no verão ou investir?',
      pergunta: 'Cliente respondeu. Qual caminho?',
      choices: [
        { label: 'Busca moradia', icon: '🏡', target: 'qual_moradia' },
        { label: 'Busca veraneio', icon: '🏖️', target: 'qual_veraneio' },
        { label: 'Busca investimento', icon: '📈', target: 'qual_investimento' },
      ],
    },
    {
      id: 'qual_outra',
      eyebrow: 'Qualificação',
      titulo: 'Cliente perguntou outra coisa',
      descricao: 'Responda a dúvida do cliente de forma simples, sem despejar material demais, e depois confirme se aquele perfil de imóvel faz sentido para ele.',
      mensagem: 'Claro, [Nome]! Te explico sim. [Responder aqui a pergunta do cliente de forma direta.]\nPelo que você viu no anúncio, esse tipo de imóvel tem a ver com o que você está procurando?',
      infoNote: 'Depois de responder, volte e identifique o perfil real do cliente clicando em uma das opções acima.',
      pergunta: 'Cliente respondeu. Qual o perfil?',
      choices: [
        { label: 'Busca moradia', icon: '🏡', target: 'qual_moradia' },
        { label: 'Busca veraneio', icon: '🏖️', target: 'qual_veraneio' },
        { label: 'Busca investimento', icon: '📈', target: 'qual_investimento' },
      ],
    },

    // ETAPA 03 — ÁUDIO
    {
      id: 'audio_structure',
      eyebrow: 'Áudio',
      titulo: 'Estrutura do áudio',
      descricao: 'Use este roteiro como guia mental. O áudio não precisa parecer decorado, mas precisa conectar o produto ao que o cliente falou. Duração ideal: 40 a 50 segundos.',
      checklist: [
        'Saudação com apresentação e autoridade',
        'Chamada direta ao perfil do cliente',
        'Destaque do cenário de oportunidade / valorização / lazer / moradia',
        'Gatilho principal do produto',
        'Fechamento estratégico consultivo',
      ],
      choices: [{ label: 'Áudio enviado · ver reações', icon: '➡️', target: 'audio_response' }],
    },
    {
      id: 'audio_response',
      eyebrow: 'Pós-áudio',
      titulo: 'Reação do cliente',
      pergunta: 'Qual foi a reação?',
      choices: [
        { label: 'Demonstrou interesse', icon: '😊', desc: 'Convidar para meeting', target: 'post_audio_interesse' },
        { label: 'Veio com dúvidas', icon: '❓', desc: 'Explicar melhor por meeting', target: 'post_audio_duvidas' },
        { label: 'Só quer pelo WhatsApp', icon: '💬', desc: 'Manter o fluxo ativo', target: 'post_audio_whats' },
      ],
    },
    {
      id: 'post_audio_interesse',
      eyebrow: 'Pós-áudio',
      titulo: 'Cliente demonstrou interesse',
      mensagem: 'Imaginei que seria algo próximo do que você me falou! 😊\nAcho que vale agendarmos um meeting rápido pra eu te explicar melhor sobre essa opção, entender teu cenário com mais calma e ver contigo se realmente faz sentido. Qual seria um bom horário pra você?',
      choices: [{ label: 'Tratar resposta do meeting', icon: '➡️', target: 'meeting' }],
    },
    {
      id: 'post_audio_duvidas',
      eyebrow: 'Pós-áudio',
      titulo: 'Cliente com dúvidas',
      mensagem: 'Boa pergunta! Acho que por meeting consigo te explicar melhor sobre o produto e tirar essa dúvida com mais clareza, sem ficar te mandando um monte de informação solta por aqui. Qual seria um bom horário pra agendarmos?',
      choices: [{ label: 'Tratar resposta do meeting', icon: '➡️', target: 'meeting' }],
    },
    {
      id: 'post_audio_whats',
      eyebrow: 'Pós-áudio',
      titulo: 'Cliente · Só WhatsApp',
      descricao: 'Responder à dúvida e finalizar com uma nova pergunta leve, mantendo o fluxo ativo.',
      mensagem: 'Sem problemas! Vamos conversando por aqui. Se em algum momento achar melhor, podemos agendar um meeting pra eu te explicar melhor sobre a opção e deixar o investimento mais claro.',
    },

    // ETAPA 04 — MEETING
    {
      id: 'meeting',
      eyebrow: 'Convite',
      titulo: 'Conduzindo para o meeting',
      descricao: 'Depois da breve qualificação, o objetivo é agendar um meeting.',
      mensagem: 'Acho que vale agendarmos um meeting rápido pra eu te explicar melhor sobre essa opção, entender teu cenário com mais calma e ver contigo se realmente faz sentido. Qual seria um bom horário pra você?',
      pergunta: 'Como o cliente reagiu?',
      choices: [
        { label: 'Aceitou agendar', icon: '✅', desc: 'Confirmar dia e horário', target: 'meeting_accepted' },
        { label: 'Prefere WhatsApp', icon: '💬', desc: 'Quer seguir só por aqui', target: 'meeting_whats' },
        { label: 'Ficou em dúvida', icon: '❓', desc: 'Não bateu o martelo ainda', target: 'meeting_doubt' },
        { label: 'Não tem interesse agora', icon: '🌙', desc: 'Encerrar com leveza', target: 'meeting_no' },
      ],
    },
    {
      id: 'meeting_accepted',
      eyebrow: 'Confirmação',
      titulo: 'Cliente aceitou agendar',
      mensagem: 'Perfeito, [Nome]. Então combinamos nosso meeting para [dia] às [Horário].\nVou te chamar por aqui e te mostro com calma a opção que faz mais sentido dentro do que conversamos.',
      infoNote: 'Próximo passo: após o meeting, seguir para envio de materiais.',
      choices: [{ label: 'Meeting realizado · enviar materiais', icon: '➡️', target: 'materials' }],
    },
    {
      id: 'meeting_whats',
      eyebrow: 'Cliente · WhatsApp',
      titulo: 'Quer seguir só por WhatsApp',
      descricao: 'Responder à dúvida e finalizar com uma nova pergunta leve, mantendo o fluxo ativo.',
      mensagem: 'Sem problemas! Vamos conversando por aqui. Se em algum momento achar melhor, podemos agendar um meeting pra eu te explicar melhor sobre a opção e deixar o investimento mais claro.',
    },
    {
      id: 'meeting_doubt',
      eyebrow: 'Cliente · Dúvida',
      titulo: 'Cliente ficou em dúvida',
      descricao: 'Não pressione. Tente entender o motivo da dúvida antes de propor o próximo passo.',
      mensagem: 'Claro, [Nome]. Só pra eu entender melhor: tua dúvida é mais sobre o produto em si, localização, valor, fluxo de pagamento ou momento de compra?',
    },
    {
      id: 'meeting_no',
      eyebrow: 'Cliente · Sem interesse',
      titulo: 'Cliente não tem interesse agora',
      mensagem: 'Sem problemas, [Nome]. Vou deixar você mais à vontade por aqui. Se em algum momento quiser avaliar alguma opção aqui no Litoral, fico por aqui pra te ajudar.',
    },

    // ETAPA 05 — FOLLOW-UP
    {
      id: 'call2',
      eyebrow: 'Etapa 02',
      titulo: 'Segunda tentativa',
      descricao: 'Tente ligar novamente no horário informado ao cliente. Depois selecione o resultado.',
      pergunta: 'O que aconteceu?',
      choices: [
        { label: 'Cliente atendeu', icon: '📞', desc: 'Mesmo script da ligação 1', target: 'call1_answered' },
        { label: 'Cliente não atendeu', icon: '☎️', desc: 'Enviar follow-up 2', target: 'call2_no_answer' },
      ],
    },
    {
      id: 'call2_no_answer',
      eyebrow: 'Etapa 02',
      titulo: 'Cliente não atendeu',
      descricao: 'Follow-up 2 — após segunda ligação.',
      mensagem: '[Nome], tentei falar contigo novamente agora há pouco. 😊\n\nVi que teu contato veio pelo anúncio do [Produto] e queria entender melhor se você estava olhando mais para moradia, veraneio ou investimento, pra não te mandar nada fora do que procura.\n\nSe fizer sentido, me responde por aqui que eu te direciono melhor.',
      pergunta: 'O cliente respondeu?',
      choices: [
        { label: 'Cliente respondeu', icon: '💬', desc: 'Identificar caminho', target: 'hub_replied' },
        { label: 'Cliente não respondeu', icon: '🌙', desc: 'Avançar para follow-up 3', target: 'fup3' },
      ],
    },
    {
      id: 'fup3',
      eyebrow: 'Etapa 03',
      titulo: 'Follow-up 3',
      descricao: 'Use esta mensagem se o cliente não atendeu as duas ligações e também não respondeu a mensagem anterior. Aqui a ideia é puxar assunto com base no anúncio específico.',
      mensagensPorProduto: {
        orla_da_barra: 'Oi, [Nome]! Passando só pra te explicar rapidinho: o Orla da Barra é uma opção frente mar em Barra Velha, pensada para quem busca localização forte, vista mar e potencial de valorização.\n\nPelo que você viu no anúncio, algo nesse estilo tem a ver com o que você está procurando?',
        barra_view: 'Oi, [Nome]! Passando só pra te explicar rapidinho: o Barra View é uma opção aqui em Barra Velha que pode fazer sentido para quem busca uma oportunidade bem localizada no Litoral.\n\nPelo que você viu no anúncio, algo nesse estilo tem a ver com o que você está procurando?',
        viverde: 'Oi, [Nome]! Passando só pra te explicar rapidinho: o Viverde é uma opção com proposta de qualidade de vida, lazer e contato com a região do Litoral.\n\nPelo que você viu no anúncio, algo nesse estilo tem a ver com o que você está procurando?',
        nao_sei: 'Oi, [Nome]! Passando só pra entender melhor teu momento. Como você demonstrou interesse em imóveis aqui no Litoral, queria saber se busca algo mais para moradia, veraneio ou investimento.\n\nAssim consigo te mostrar algo mais próximo do que você procura.',
      },
      pergunta: 'O cliente respondeu?',
      choices: [
        { label: 'Cliente respondeu', icon: '💬', desc: 'Identificar caminho', target: 'hub_replied' },
        { label: 'Cliente não respondeu', icon: '🌙', desc: 'Última tentativa', target: 'call3' },
      ],
    },
    {
      id: 'call3',
      eyebrow: 'Etapa 04',
      titulo: 'Última tentativa',
      descricao: 'Faça mais uma tentativa de ligação. Se não atender, envie a mensagem de encerramento leve, deixando o atendimento em aberto.',
      pergunta: 'O que aconteceu?',
      choices: [
        { label: 'Cliente atendeu', icon: '📞', desc: 'Script da ligação', target: 'call1_answered' },
        { label: 'Cliente não atendeu', icon: '☎️', desc: 'Encerramento gentil', target: 'call3_no_answer' },
      ],
    },
    {
      id: 'call3_no_answer',
      eyebrow: 'Encerramento',
      titulo: 'Cliente não atendeu na última tentativa',
      mensagem: '[Nome], tentei te chamar algumas vezes porque recebi teu interesse no anúncio do [Produto].\n\nVou deixar você mais à vontade por aqui. Se em algum momento quiser avaliar alguma opção, fico por aqui pra te ajudar.',
      infoNote: 'Próximo passo: encerrar a tentativa ativa, mas manter o atendimento em aberto. O cliente pode responder no futuro.',
    },

    // ETAPA 06 — MATERIAIS
    {
      id: 'materials',
      eyebrow: 'Etapa 05',
      titulo: 'Pós-ligação / Pós-meeting',
      descricao: 'Logo após o meeting, envie o pacote completo de materiais. Marque cada item conforme for enviando.',
      checklist: [
        'Booking completo',
        'Localização (mapa ou link)',
        'Vídeo da maquete',
        'Vídeo do decorado',
        'Fluxo de pagamento (se foi conversado no meeting)',
        '🎙 Áudio de 30 a 40 segundos com os principais pontos que chamaram atenção do cliente',
      ],
      mensagem: 'Se tiver qualquer dúvida ao analisar, estou por aqui pra te ajudar! 😊',
    },

    // ETAPA 07 — HUB
    {
      id: 'hub_replied',
      eyebrow: 'Cliente respondeu',
      titulo: 'Identificar caminho',
      descricao: 'Escolha o tipo de resposta. Você será levado direto ao trecho certo do funil.',
      choices: [
        { label: 'Respondeu sobre moradia', icon: '🏡', desc: 'Imóvel pra morar', target: 'qual_moradia' },
        { label: 'Respondeu sobre veraneio', icon: '🏖️', desc: 'Imóvel de praia', target: 'qual_veraneio' },
        { label: 'Respondeu sobre investimento', icon: '📈', desc: 'Valorização ou renda', target: 'qual_investimento' },
        { label: 'Perguntou preço / localização / detalhes', icon: '💬', desc: 'Respondeu com pergunta', target: 'qual_outra' },
        { label: 'Quer seguir só pelo WhatsApp', icon: '✉️', desc: 'Sem meeting por enquanto', target: 'post_audio_whats' },
        { label: 'Demonstrou interesse', icon: '😊', desc: 'Convidar para meeting', target: 'post_audio_interesse' },
        { label: 'Está com dúvidas', icon: '❓', desc: 'Levar para meeting', target: 'post_audio_duvidas' },
        { label: 'Parou de responder depois de interagir', icon: '🌙', desc: 'Retomada personalizada', target: 'hub_parou' },
      ],
    },
    {
      id: 'hub_parou',
      eyebrow: 'Retomada',
      titulo: 'Cliente parou de responder',
      descricao: 'Use quando o cliente chegou a responder, mas parou no meio da conversa antes de avançar. Antes de enviar, releia a conversa e substitua [assunto que o cliente comentou] por algo real que ele falou — isso deixa a retomada mais humana e evita parecer mensagem automática.',
      mensagem: 'Oi, [Nome]! Tudo bem?\nPassando só pra retomar nossa conversa por aqui. Como estávamos falando sobre [assunto que o cliente comentou], queria entender melhor esse ponto antes de te apresentar alguma opção.\nMe conta um pouco melhor o que você tem em mente, que eu consigo separar algo mais próximo do que você procura.',
    },
  ],
};
