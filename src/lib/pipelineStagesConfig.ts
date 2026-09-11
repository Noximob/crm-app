/**
 * As etapas do circuito, pro contexto do pipeline.
 *
 * Antes este arquivo carregava uma camada de "categorias de relatório"
 * (Topo de Funil, Qualificado, Reunião agendada…) e "grupos compactos" pra
 * TV. Ninguém mais lia nada disso — a camada que o gestor enxerga hoje são
 * as 6 FASES de src/lib/funilVendas.ts. Aqui fica só a lista de casas do
 * circuito, que continua sendo a fonte das etapas gravadas no lead.
 */
import { ETAPAS_CIRCUITO } from '@/lib/circuito';

/** As casas do circuito, na ordem — o que se grava em `lead.etapa`. */
export const DEFAULT_PIPELINE_STAGES: readonly string[] = ETAPAS_CIRCUITO;
