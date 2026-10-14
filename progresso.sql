-- Cole no SQL Editor do Supabase e clique em RUN.
-- Cria a tabela que guarda o progresso das fases do guia.
CREATE TABLE IF NOT EXISTS progresso (
  fase           text PRIMARY KEY,
  concluida      boolean NOT NULL DEFAULT false,
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE progresso ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "guia le progresso" ON progresso;
DROP POLICY IF EXISTS "guia grava progresso" ON progresso;
DROP POLICY IF EXISTS "guia atualiza progresso" ON progresso;
CREATE POLICY "guia le progresso"       ON progresso FOR SELECT TO anon USING (true);
CREATE POLICY "guia grava progresso"    ON progresso FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "guia atualiza progresso" ON progresso FOR UPDATE TO anon USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE ON progresso TO anon;
