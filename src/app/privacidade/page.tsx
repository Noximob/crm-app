import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade — Nox Imóveis',
  description: 'Como a Nox Imóveis coleta, usa e protege os dados das pessoas que entram em contato pelos nossos anúncios e formulários.',
  robots: 'index, follow',
};

const ATUALIZADO_EM = '22 de julho de 2026';
const EMAIL_CONTATO = 'imoveisnox@gmail.com';

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg sm:text-xl font-bold text-white mb-2.5">{titulo}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-white/75">{children}</div>
    </section>
  );
}

export default function PoliticaPrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#0d0b12] text-white">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-12 sm:py-16">
        {/* Cabeçalho */}
        <div className="border-b border-white/10 pb-6">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#FF7A97]">Nox Imóveis</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold">Política de Privacidade</h1>
          <p className="mt-3 text-[13px] text-white/50">Última atualização: {ATUALIZADO_EM}</p>
        </div>

        <div className="mt-6 text-[15px] leading-relaxed text-white/75">
          <p>
            Esta Política de Privacidade explica como a <b className="text-white">Nox Imóveis</b> (&quot;Nox&quot;, &quot;nós&quot;)
            coleta, usa, compartilha e protege os dados pessoais das pessoas que demonstram interesse nos nossos
            imóveis — principalmente por meio de <b className="text-white">formulários de anúncios no Facebook e no
            Instagram</b>, do nosso site e de contatos diretos. Ao enviar seus dados por esses canais, você concorda com
            as práticas descritas aqui.
          </p>
        </div>

        <Secao titulo="1. Quem é o responsável pelos dados">
          <p>
            A responsável (controladora) pelo tratamento dos seus dados é a <b className="text-white">Nox Imóveis</b>,
            imobiliária atuante no litoral de Santa Catarina (Penha, Piçarras, Barra Velha e região). Para qualquer
            assunto relacionado à privacidade, o contato é <a className="text-[#7DD3FC] underline" href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>.
          </p>
        </Secao>

        <Secao titulo="2. Quais dados coletamos">
          <p>Coletamos apenas os dados necessários para atender você sobre imóveis:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><b className="text-white">Dados de contato:</b> nome, telefone/WhatsApp e, quando informado, e-mail.</li>
            <li><b className="text-white">Respostas do formulário:</b> as informações que você preenche no anúncio (por exemplo, tipo de imóvel, região, faixa de valor, finalidade e prazo de compra).</li>
            <li><b className="text-white">Origem do contato:</b> de qual campanha ou anúncio você veio, para direcionar melhor o atendimento.</li>
          </ul>
          <p>Não coletamos dados sensíveis nem dados de crianças e adolescentes de forma intencional.</p>
        </Secao>

        <Secao titulo="3. Como coletamos">
          <p>
            Os dados são fornecidos <b className="text-white">por você</b> quando: preenche um formulário de anúncio no
            Facebook ou Instagram (Meta); preenche um formulário no nosso site; ou entra em contato conosco por telefone,
            WhatsApp ou outro canal. No caso dos formulários de anúncio, a Meta nos repassa as respostas que você enviou.
          </p>
        </Secao>

        <Secao titulo="4. Para que usamos seus dados">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Entrar em contato para atendê-lo(a) e entender o que você procura;</li>
            <li>Apresentar imóveis e oportunidades compatíveis com o seu interesse;</li>
            <li>Dar sequência à negociação (visitas, propostas, documentação);</li>
            <li>Melhorar nosso atendimento e a comunicação dos nossos anúncios.</li>
          </ul>
        </Secao>

        <Secao titulo="5. Base legal (LGPD)">
          <p>
            O tratamento dos seus dados se apoia no <b className="text-white">consentimento</b> que você fornece ao enviar
            o formulário e no <b className="text-white">legítimo interesse</b> da Nox em atender um contato que demonstrou
            interesse nos nossos imóveis, sempre nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </p>
        </Secao>

        <Secao titulo="6. Com quem compartilhamos">
          <p>Seus dados são tratados com confidencialidade e compartilhados apenas com:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><b className="text-white">Corretores e equipe da Nox Imóveis</b>, para realizar o atendimento;</li>
            <li><b className="text-white">Fornecedores de tecnologia</b> que operam nossos sistemas como processadores de dados — por exemplo, a Meta Platforms (origem do formulário) e o Google Firebase / Google Cloud (armazenamento seguro do nosso CRM).</li>
          </ul>
          <p><b className="text-white">Não vendemos</b> seus dados e não os compartilhamos para publicidade de terceiros.</p>
        </Secao>

        <Secao titulo="7. Armazenamento e segurança">
          <p>
            Seus dados ficam armazenados em ambiente seguro (infraestrutura do Google Firebase / Google Cloud), com
            acesso restrito à equipe autorizada da Nox. Adotamos medidas técnicas e organizacionais para proteger seus
            dados contra acesso não autorizado, perda ou uso indevido.
          </p>
        </Secao>

        <Secao titulo="8. Por quanto tempo guardamos">
          <p>
            Mantemos seus dados pelo tempo necessário para o atendimento e para cumprir eventuais obrigações legais.
            Quando não houver mais necessidade nem obrigação de retenção, os dados são eliminados ou anonimizados. Você
            pode pedir a exclusão a qualquer momento (ver item 9).
          </p>
        </Secao>

        <Secao titulo="9. Seus direitos">
          <p>Nos termos da LGPD, você pode a qualquer momento solicitar:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Confirmação de que tratamos seus dados e acesso a eles;</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>Exclusão ou anonimização dos seus dados;</li>
            <li>Revogação do consentimento e oposição ao tratamento;</li>
            <li>Informação sobre com quem compartilhamos seus dados.</li>
          </ul>
          <p>
            Para exercer qualquer desses direitos, basta enviar um e-mail para <a className="text-[#7DD3FC] underline" href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>.
            Também é possível pedir para parar de receber contatos a qualquer momento.
          </p>
        </Secao>

        <Secao titulo="10. Alterações nesta política">
          <p>
            Podemos atualizar esta Política periodicamente. Quando isso acontecer, alteramos a data de &quot;última
            atualização&quot; no topo desta página. Recomendamos revisá-la de tempos em tempos.
          </p>
        </Secao>

        <Secao titulo="11. Contato">
          <p>
            Dúvidas sobre esta Política ou sobre seus dados? Fale com a gente pelo e-mail{' '}
            <a className="text-[#7DD3FC] underline" href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>.
          </p>
        </Secao>

        <p className="mt-12 border-t border-white/10 pt-6 text-[12px] text-white/40">
          © 2026 Nox Imóveis. Todos os direitos reservados.
        </p>
      </div>
    </main>
  );
}
