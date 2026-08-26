/** A porta da área abre na primeira aba: o funil dos imóveis. */
import { redirect } from 'next/navigation';

export default function LocacaoIndex() {
  redirect('/dashboard/locacao/imoveis');
}
