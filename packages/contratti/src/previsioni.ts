import { z } from 'zod';

const amountCentsSchema = z.number().int().min(0);

export const budgetDefaultSchema = z.object({
  categoriaId: z.string(),
  amountCents: amountCentsSchema,
});
export type BudgetDefaultDto = z.infer<typeof budgetDefaultSchema>;

export const impostaBudgetDefaultSchema = z.object({
  amountCents: amountCentsSchema,
});
export type ImpostaBudgetDefaultInput = z.infer<
  typeof impostaBudgetDefaultSchema
>;

export const budgetOverrideSchema = z.object({
  cicloId: z.string(),
  categoriaId: z.string(),
  amountCents: amountCentsSchema,
});
export type BudgetOverrideDto = z.infer<typeof budgetOverrideSchema>;

export const impostaBudgetOverrideSchema = z.object({
  amountCents: amountCentsSchema,
});
export type ImpostaBudgetOverrideInput = z.infer<
  typeof impostaBudgetOverrideSchema
>;

export const voceBudgetEffettivoSchema = z.object({
  categoriaId: z.string(),
  amountCents: z.number().int(),
  override: z.boolean(),
});
export type VoceBudgetEffettivo = z.infer<typeof voceBudgetEffettivoSchema>;

export const elencoBudgetDefaultsRispostaSchema = z.object({
  ok: z.literal(true),
  budgetDefaults: z.array(budgetDefaultSchema),
});
export type ElencoBudgetDefaultsRisposta = z.infer<
  typeof elencoBudgetDefaultsRispostaSchema
>;

export const budgetDefaultRispostaSchema = z.object({
  ok: z.literal(true),
  budgetDefault: budgetDefaultSchema,
});
export type BudgetDefaultRisposta = z.infer<typeof budgetDefaultRispostaSchema>;

export const budgetOverrideRispostaSchema = z.object({
  ok: z.literal(true),
  budgetOverride: budgetOverrideSchema,
});
export type BudgetOverrideRisposta = z.infer<
  typeof budgetOverrideRispostaSchema
>;

export const budgetEffettivoRispostaSchema = z.object({
  ok: z.literal(true),
  budget: z.array(voceBudgetEffettivoSchema),
});
export type BudgetEffettivoRisposta = z.infer<
  typeof budgetEffettivoRispostaSchema
>;
