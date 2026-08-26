/**
 * O setor de locação SAIU da Área do administrador e virou área própria em
 * /dashboard/locacao — este redirect segura links e favoritos antigos.
 */
import { redirect } from 'next/navigation';

export default function LocacaoMudou() {
  redirect('/dashboard/locacao/imoveis');
}
