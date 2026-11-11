-- Table pour les documents GED
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID REFERENCES animals(id) ON DELETE CASCADE,
  famille_accueil_id UUID REFERENCES famille_accueils(id) ON DELETE CASCADE,
  signalement_id UUID REFERENCES signalements(id) ON DELETE CASCADE,
  justice_case_id UUID REFERENCES justice_cases(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  description TEXT,
  type_document TEXT NOT NULL CHECK (type_document IN (
    'icad', 'contrat', 'facture', 'ordonnance', 'jugement', 
    'certificat', 'photo', 'video', 'autre'
  )),
  fichier_url TEXT NOT NULL,
  fichier_nom TEXT NOT NULL,
  fichier_taille INTEGER,
  fichier_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_documents_animal_id ON documents(animal_id);
CREATE INDEX IF NOT EXISTS idx_documents_famille_accueil_id ON documents(famille_accueil_id);
CREATE INDEX IF NOT EXISTS idx_documents_signalement_id ON documents(signalement_id);
CREATE INDEX IF NOT EXISTS idx_documents_justice_case_id ON documents(justice_case_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type_document);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- RLS (Row Level Security)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Politique pour les utilisateurs authentifiés
CREATE POLICY "Users can view all documents" ON documents
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own documents" ON documents
  FOR DELETE USING (auth.uid() = uploaded_by);
