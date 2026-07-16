import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { Flame, Mail, Lock, User, Loader2 } from 'lucide-react';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [motivation, setMotivation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/');
      }
    } else {
      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, motivation);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 via-primary-50/30 to-secondary-50/30 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <Logo size={56} />
          <p className="mt-4 text-center text-sm text-neutral-500">
            Plateforme de gestion pour la protection animale
          </p>
        </div>

        <div className="card p-8 shadow-lg">
          <div className="mb-6 flex rounded-lg bg-neutral-100 p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                mode === 'login' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                mode === 'register' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
              }`}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="label">Nom complet</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Jean Dupont"
                      className="input pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Motivation</label>
                  <textarea
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    required
                    placeholder="Pourquoi souhaitez-vous rejoindre l'association ?"
                    className="input min-h-[80px] resize-y"
                    rows={3}
                  />
                </div>
              </>
            )}

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="vous@association.fr"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="input pl-10"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : mode === 'login' ? (
                'Se connecter'
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-2 rounded-lg bg-primary-50 px-4 py-3 text-xs text-primary-700">
            <Flame size={16} className="shrink-0" />
            <p>
              Un animal = un dossier unique = une seule saisie = un suivi complet.
              Toutes les données sont interconnectées.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
