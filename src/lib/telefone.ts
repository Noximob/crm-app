/**
 * Telefone — fonte única de formatação e do link de WhatsApp.
 *
 * Cuidado que motivou este módulo: os leads que vêm do Meta chegam com o DDI
 * já na frente ("5547988641066"), enquanto os digitados no CRM normalmente vêm
 * sem ("47988641066"). Montar o link com `wa.me/55${digitos}` direto duplicava
 * o 55 nos leads de anúncio e abria uma conversa com número inválido.
 */

/** Só os dígitos. */
export const somenteDigitos = (v: unknown): string => String(v ?? '').replace(/\D/g, '');

/**
 * Número no formato internacional pro wa.me (com DDI, sem "+").
 * Acrescenta o 55 só quando ele ainda não está lá.
 */
export function numeroWhatsApp(telefone: unknown): string {
  const d = somenteDigitos(telefone);
  if (!d) return '';
  // 12-13 dígitos começando com 55 = já tem DDI (55 + DDD + 8/9 dígitos)
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return d;
  return `55${d}`;
}

/** Link pronto do WhatsApp — string vazia quando não há número utilizável. */
export function linkWhatsApp(telefone: unknown): string {
  const n = numeroWhatsApp(telefone);
  return n.length >= 12 ? `https://wa.me/${n}` : '';
}

/** Link de ligação (tel:) — mantém o número como está discado. */
export function linkTelefone(telefone: unknown): string {
  const d = somenteDigitos(telefone);
  return d ? `tel:${d}` : '';
}

/**
 * Exibição amigável: (47) 98864-1066. Ignora o DDI quando presente,
 * porque o corretor lê o número como ele disca.
 */
export function formatarTelefone(telefone: unknown): string {
  let d = somenteDigitos(telefone);
  if (!d) return '';
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  const corte = d.length > 10 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, corte)}-${d.slice(corte)}`;
}
