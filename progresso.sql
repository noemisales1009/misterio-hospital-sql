-- Cole no SQL Editor do Supabase e clique em RUN.
-- Cria (ou atualiza) a tabela de progresso, com login por usuário.

-- Progresso do jogo, com login (cada pessoa vê e altera só o próprio progresso)
-- Fica fora do DROP lá de cima: rodar o banco de novo NÃO apaga o progresso.
-- Se existir a versão antiga (sem login, sem user_id), ela é recriada.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'progresso')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_schema = 'public' AND table_name = 'progresso'
                       AND column_name = 'user_id')
  THEN
    DROP TABLE public.progresso;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS progresso (
  user_id        uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  fase           text NOT NULL,
  concluida      boolean NOT NULL DEFAULT false,
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, fase)
);
ALTER TABLE progresso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guia le progresso" ON progresso;
DROP POLICY IF EXISTS "guia grava progresso" ON progresso;
DROP POLICY IF EXISTS "guia atualiza progresso" ON progresso;
DROP POLICY IF EXISTS "le o proprio progresso" ON progresso;
DROP POLICY IF EXISTS "grava o proprio progresso" ON progresso;
DROP POLICY IF EXISTS "atualiza o proprio progresso" ON progresso;

CREATE POLICY "le o proprio progresso" ON progresso
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "grava o proprio progresso" ON progresso
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "atualiza o proprio progresso" ON progresso
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON progresso FROM anon;
GRANT SELECT, INSERT, UPDATE ON progresso TO authenticated;
