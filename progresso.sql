-- Cole no SQL Editor do Supabase e clique em RUN.
-- Cria (ou atualiza) as tabelas de progresso, perfil e anotações, com login por usuário.

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

-- Perfil do jogador (nome e avatar do Caderno do detetive), um por conta
CREATE TABLE IF NOT EXISTS perfil (
  user_id        uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome           text CHECK (char_length(nome) <= 40),
  avatar         text CHECK (char_length(avatar) <= 16),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE perfil ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "le o proprio perfil" ON perfil;
DROP POLICY IF EXISTS "grava o proprio perfil" ON perfil;
DROP POLICY IF EXISTS "atualiza o proprio perfil" ON perfil;
CREATE POLICY "le o proprio perfil" ON perfil
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "grava o proprio perfil" ON perfil
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "atualiza o proprio perfil" ON perfil
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
REVOKE ALL ON perfil FROM anon;
GRANT SELECT, INSERT, UPDATE ON perfil TO authenticated;
-- Foto do jogador (JPEG reduzido, em texto). Ficam só na linha da própria conta.
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS foto text;
ALTER TABLE perfil DROP CONSTRAINT IF EXISTS perfil_foto_tamanho;
ALTER TABLE perfil ADD CONSTRAINT perfil_foto_tamanho CHECK (foto IS NULL OR char_length(foto) <= 150000);

-- Anotações do diário de missões, uma por fase
CREATE TABLE IF NOT EXISTS anotacao (
  user_id        uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  fase           text NOT NULL CHECK (char_length(fase) <= 40),
  texto          text NOT NULL DEFAULT '' CHECK (char_length(texto) <= 4000),
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, fase)
);
ALTER TABLE anotacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "le as proprias anotacoes" ON anotacao;
DROP POLICY IF EXISTS "grava as proprias anotacoes" ON anotacao;
DROP POLICY IF EXISTS "atualiza as proprias anotacoes" ON anotacao;
CREATE POLICY "le as proprias anotacoes" ON anotacao
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "grava as proprias anotacoes" ON anotacao
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "atualiza as proprias anotacoes" ON anotacao
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
REVOKE ALL ON anotacao FROM anon;
GRANT SELECT, INSERT, UPDATE ON anotacao TO authenticated;
-- Imagem opcional na anotação (JPEG reduzido, em texto)
ALTER TABLE anotacao ADD COLUMN IF NOT EXISTS imagem text;
ALTER TABLE anotacao DROP CONSTRAINT IF EXISTS anotacao_imagem_tamanho;
ALTER TABLE anotacao ADD CONSTRAINT anotacao_imagem_tamanho CHECK (imagem IS NULL OR char_length(imagem) <= 300000);

