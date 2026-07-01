import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { firebaseService } from '../firebaseService';
import type { UserProfile } from '../firebaseService';

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const APP_URL     = window.location.origin;

const NotificationSender: React.FC = () => {
  const [recipients, setRecipients]       = useState<UserProfile[]>([]);
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [subject, setSubject]             = useState('Mise à jour du planning');
  const [message, setMessage]             = useState('');
  const [sending, setSending]             = useState(false);
  const [results, setResults]             = useState<{ name: string; ok: boolean }[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);

  useEffect(() => {
    emailjs.init(PUBLIC_KEY);
    fetchRecipients();
  }, []);

  const fetchRecipients = async () => {
    setLoadingRecipients(true);
    try {
      const data = await firebaseService.getUsers();
      const sorted = data.sort((a, b) => a.role === 'admin' ? -1 : b.role === 'admin' ? 1 : 0);
      setRecipients(sorted);
      setSelected(new Set(sorted.filter(r => r.role === 'employee').map(r => r.id)));
    } catch (err) {
      console.error('Erreur chargement destinataires:', err);
    }
    setLoadingRecipients(false);
  };

  const toggleRecipient = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectAll   = () => setSelected(new Set(recipients.map(r => r.id)));
  const deselectAll = () => setSelected(new Set());

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.size === 0) { alert('Sélectionnez au moins un destinataire.'); return; }
    if (!message.trim())     { alert('Rédigez un message avant d\'envoyer.'); return; }

    setSending(true);
    setResults([]);

    const targets = recipients.filter(r => selected.has(r.id));
    const newResults: { name: string; ok: boolean }[] = [];

    for (const r of targets) {
      try {
        await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
          to_email: r.email,
          to_name:  r.name,
          subject,
          message:  message.trim(),
          app_url:  APP_URL,
        });
        newResults.push({ name: r.name, ok: true });
      } catch {
        newResults.push({ name: r.name, ok: false });
      }
      await new Promise(res => setTimeout(res, 200));
    }

    setResults(newResults);
    setSending(false);
    if (newResults.every(r => r.ok)) setMessage('');
  };

  const sent    = results.filter(r => r.ok).length;
  const failed  = results.filter(r => !r.ok).length;

  return (
    <div className="p-4 bg-white shadow-md rounded-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-msm-navy mb-1">Notifier les salariés</h2>
      <p className="text-gray-500 text-sm mb-6">Envoyez un email à votre équipe pour les informer d'une mise à jour du planning.</p>

      {loadingRecipients ? (
        <p className="text-center text-gray-400 py-8">Chargement des destinataires...</p>
      ) : recipients.length === 0 ? (
        <div className="bg-orange-50 border border-orange-200 rounded p-4 text-orange-800 text-sm">
          Aucun destinataire trouvé. Assurez-vous que des utilisateurs sont enregistrés dans Gestion des accès.
        </div>
      ) : (
        <form onSubmit={handleSend} className="space-y-5">

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-semibold text-gray-700">Destinataires</label>
              <div className="space-x-3 text-sm">
                <button type="button" onClick={selectAll}   className="text-msm-navy hover:underline">Tous</button>
                <button type="button" onClick={deselectAll} className="text-gray-500 hover:underline">Aucun</button>
              </div>
            </div>
            <div className="border rounded-lg divide-y">
              {recipients.map(r => (
                <label key={r.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleRecipient(r.id)}
                    className="rounded"
                  />
                  <span className="flex-1 font-medium">{r.name}</span>
                  <span className="text-xs text-gray-400">{r.email}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.role === 'admin' ? 'bg-red-100 text-msm-red' : 'bg-msm-navy-light text-msm-navy'}`}>
                    {r.role === 'admin' ? 'Direction' : 'Employé'}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{selected.size} destinataire{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}</p>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Objet</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Message</label>
            <textarea
              rows={5}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Ex : Le planning du mois de juillet a été mis à jour. Merci de le consulter et de signaler tout problème."
              className="w-full p-2 border rounded resize-none"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Le lien vers l'application sera ajouté automatiquement en bas de l'email.</p>
          </div>

          {results.length > 0 && (
            <div className={`p-4 rounded-lg border ${failed === 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
              <p className="font-semibold mb-2">
                {failed === 0
                  ? `✅ ${sent} email${sent > 1 ? 's' : ''} envoyé${sent > 1 ? 's' : ''} avec succès`
                  : `⚠️ ${sent} envoyé${sent > 1 ? 's' : ''}, ${failed} échec${failed > 1 ? 's' : ''}`}
              </p>
              {failed > 0 && (
                <ul className="text-sm text-red-700 list-disc list-inside">
                  {results.filter(r => !r.ok).map(r => <li key={r.name}>{r.name}</li>)}
                </ul>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={sending || selected.size === 0}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all ${sending || selected.size === 0 ? 'bg-gray-300' : 'bg-msm-navy hover:bg-msm-navy-dark'}`}
          >
            {sending ? `Envoi en cours... (${results.length}/${selected.size})` : `Envoyer à ${selected.size} personne${selected.size > 1 ? 's' : ''}`}
          </button>
        </form>
      )}
    </div>
  );
};

export default NotificationSender;
