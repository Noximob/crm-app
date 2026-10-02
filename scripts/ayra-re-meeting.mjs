/**
 * Gera a "Re-meeting" do Ayra a partir da Apresentação V4.
 *
 *   node scripts/ayra-re-meeting.mjs
 *
 * A Re-meeting é a V4 reduzida, com os slides em outra ordem e renumerada a
 * partir do 01. Fora a numeração, nenhum slide é alterado. Ela fica DENTRO da
 * pasta da V4 (public/ayra/apresentacao-v4/re-meeting.html) pra usar as mesmas
 * fotos, vídeos e fontes sem duplicar nada. Mexeu na V4 → rodar de novo.
 *
 * A ordem usa o número que aparece no rodapé do slide na V4 ("19 / 55"), que é
 * como o gestor chama as páginas. A capa não tem número, então o slide de
 * rodapé N é o (N+1)º do arquivo.
 *
 * A numeração mora em dois lugares, e só esses dois mudam: o rodapé
 * (<div class="num">19<small>/ 55</small>) e o número do título ("19 — Resumo").
 * Os slides de lazer só têm o rodapé; o último (cronograma) só tem o título.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PASTA = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'ayra', 'apresentacao-v4');
const ORIGEM = join(PASTA, 'index.html');
const DESTINO = join(PASTA, 're-meeting.html');

// Pedido de 02/10/2026: começa na 19, depois da 20 vêm a 16 e a 17, depois a
// 21, depois 12, 13 e 14, e segue da 22 até o fim.
const ULTIMA = 55;
const ORDEM = [19, 20, 16, 17, 21, 12, 13, 14];
for (let p = 22; p <= ULTIMA; p++) ORDEM.push(p);

const html = readFileSync(ORIGEM, 'utf8');
const MARCA = '<section class="slide ';
const inicio = html.indexOf(MARCA);
const fim = html.lastIndexOf('</section>') + '</section>'.length;
if (inicio < 0 || fim < inicio) throw new Error('Não achei os slides no index.html da V4.');

// Cada slide vai do seu "<section" até o "<section" seguinte — o que estiver
// entre um e outro (quebra de linha) viaja junto com o slide de cima.
const slides = html.slice(inicio, fim).split(/(?=<section class="slide )/);
const cabeca = html.slice(0, inicio);
const cauda = html.slice(fim);
const quebra = html.includes('\r\n') ? '\r\n' : '\n';

if (slides.length !== ULTIMA + 1) {
  throw new Error(`A V4 tem ${slides.length} slides; o script espera ${ULTIMA + 1} (capa + ${ULTIMA}). Conferir a ordem antes de gerar.`);
}

// Confere que o slide escolhido é mesmo o de rodapé N — se a V4 mudar de
// numeração, para aqui em vez de gerar fora de ordem.
const rodape = (s) => (s.match(/class="num">(\d+)<small>/) || [])[1];
const sobrancelha = (s) => (s.match(/>(\d+) — /) || [])[1];
const dois = (n) => String(n).padStart(2, '0');
const escolhidos = ORDEM.map((p, k) => {
  const s = slides[p];
  const n = Number(rodape(s) ?? sobrancelha(s));
  if (n !== p) throw new Error(`O slide ${p + 1} do arquivo mostra o número ${n}, não ${p}.`);

  // Renumera: o rodapé e o título passam a mostrar a posição na Re-meeting.
  const novo = dois(k + 1);
  let trocas = 0;
  const r = s
    .replace(new RegExp(`class="num">${dois(p)}<small>/ ${ULTIMA}</small>`), () => {
      trocas++;
      return `class="num">${novo}<small>/ ${ORDEM.length}</small>`;
    })
    .replace(new RegExp(`>${dois(p)} — `), () => {
      trocas++;
      return `>${novo} — `;
    });
  if (!trocas) throw new Error(`O slide de número ${p} não tem rodapé nem título numerado pra trocar.`);
  return r.replace(/\s+$/, '');
});

const saida = cabeca + escolhidos.join(quebra) + cauda;
writeFileSync(DESTINO, saida, 'utf8');
console.log(`Re-meeting: ${escolhidos.length} slides (${ORDEM.join(', ')}) → ${DESTINO}`);
