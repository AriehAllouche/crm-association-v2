import { useState } from 'react';
import { Upload, FileText, Trash2, FolderOpen, CheckCircle, XCircle } from 'lucide-react';
import { googleDriveService } from '../lib/googleDrive';

export function GoogleDriveTest() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [folderId, setFolderId] = useState('16LluXdeBC-haExoEMcT-ZHqLdovMZR6_'); // Votre dossier PHÉNIX
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setUploadedFile(null);
      setTestResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setTestResult(null);

    try {
      const result = await googleDriveService.uploadFile(file, folderId, 'test-animal');
      setUploadedFile(result);
      setTestResult({ success: true, message: 'Upload réussi !' });
    } catch (err: any) {
      setError(err.message);
      setTestResult({ success: false, message: `Erreur: ${err.message}` });
    } finally {
      setUploading(false);
    }
  };

  const handleListFiles = async () => {
    try {
      const files = await googleDriveService.listFiles(folderId);
      setTestResult({ 
        success: true, 
        message: `${files.length} fichiers trouvés dans le dossier` 
      });
      console.log('Fichiers:', files);
    } catch (err: any) {
      setError(err.message);
      setTestResult({ success: false, message: `Erreur: ${err.message}` });
    }
  };

  const handleDelete = async () => {
    if (!uploadedFile) return;

    try {
      await googleDriveService.deleteFile(uploadedFile.id);
      setUploadedFile(null);
      setTestResult({ success: true, message: 'Fichier supprimé avec succès' });
    } catch (err: any) {
      setError(err.message);
      setTestResult({ success: false, message: `Erreur: ${err.message}` });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-neutral-900">Test Google Drive Integration</h2>
      
      {/* Configuration */}
      <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Folder ID (Dossier PHÉNIX)
        </label>
        <input
          type="text"
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Sélectionner un fichier pour tester
        </label>
        <div className="flex items-center gap-3">
          <input
            type="file"
            onChange={handleFileChange}
            className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={18} />
            {uploading ? 'Upload...' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleListFiles}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200"
        >
          <FolderOpen size={18} />
          Lister fichiers
        </button>
        {uploadedFile && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-error-100 text-error-700 rounded-lg hover:bg-error-200"
          >
            <Trash2 size={18} />
            Supprimer
          </button>
        )}
      </div>

      {/* Résultat */}
      {testResult && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          testResult.success ? 'bg-success-50 text-success-700' : 'bg-error-50 text-error-700'
        }`}>
          {testResult.success ? (
            <CheckCircle size={20} />
          ) : (
            <XCircle size={20} />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="mb-6 p-4 bg-error-50 text-error-700 rounded-lg">
          <strong>Erreur:</strong> {error}
        </div>
      )}

      {/* Fichier uploadé */}
      {uploadedFile && (
        <div className="p-4 bg-success-50 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-success-600" size={20} />
            <span className="font-semibold text-success-700">Fichier uploadé avec succès !</span>
          </div>
          <div className="space-y-1 text-sm text-neutral-600">
            <p><strong>Nom:</strong> {uploadedFile.name}</p>
            <p><strong>ID:</strong> {uploadedFile.id}</p>
            <p><strong>Type:</strong> {uploadedFile.mimeType}</p>
            <p><strong>Taille:</strong> {uploadedFile.size} bytes</p>
            <div className="mt-2">
              <a
                href={uploadedFile.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline flex items-center gap-1"
              >
                <FileText size={14} />
                Voir sur Google Drive
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-primary-50 rounded-lg text-sm text-primary-700">
        <p><strong>Note:</strong> Ce composant teste l'intégration Google Drive via Supabase Edge Functions.</p>
        <p className="mt-1">Les fichiers sont uploadés dans votre dossier PHÉNIX sur Google Drive.</p>
      </div>
    </div>
  );
}
