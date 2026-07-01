import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { firebaseService } from '../firebaseService';
import { useAuth } from '../hooks/useAuth';

type RequestType = 'ct' | 'recup' | 'overtime' | 'modif_horaire' | 'conge_parental' | 'conge_familial' | 'conge_sans_solde' | 'raison_familiale' | 'enfant_malade' | 'autre';

const LeaveRequestForm: React.FC = () => {
  const { user, profileName, loading: authLoading } = useAuth();
  const [type, setType] = useState<RequestType>('ct');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  if (authLoading) return <div className="text-center p-10">Chargement...</div>;

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto bg-orange-50 p-8 rounded-lg border border-orange-200 text-center">
        <h2 className="text-xl font-bold text-orange-800 mb-4">Connexion requise</h2>
        <p className="text-orange-700 mb-6">
          Vous devez être connecté avec votre compte salarié pour soumettre une demande officielle.
        </p>
        <p className="text-sm text-orange-600">
          Veuillez vous rendre dans l'onglet "Connexion" pour vous identifier.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sigCanvas.current?.isEmpty()) {
      alert('Veuillez signer le document avant d\'envoyer.');
      return;
    }

    setIsSubmitting(true);
    try {
      const signatureData = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');

      await firebaseService.saveLeaveRequest(
        { type, start_date: startDate, end_date: endDate, reason, signature_data: signatureData || '' },
        user.email!,
        profileName || user.email!,
      );

      alert('Votre demande a été enregistrée !');
      setStartDate('');
      setEndDate('');
      setReason('');
      clearSignature();
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      alert('Erreur lors de l\'envoi de la demande. Vérifiez votre connexion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOfficialText = () => {
    switch (type) {
      case 'ct': return "Demande de Congé Trimestriel (CT). Ce document permet de valider officiellement votre repos trimestriel.";
      case 'recup': return "Demande de récupération d'heures. Veuillez préciser le nombre d'heures ou la période à récupérer.";
      case 'overtime': return "Déclaration d'heures supplémentaires. Veuillez préciser le motif et le nombre d'heures effectuées.";
      case 'modif_horaire': return "Signalement d'une modification horaire. Ce document atteste du changement d'horaire convenu.";
      case 'conge_parental': return "Demande de congé parental. Ce document atteste de votre demande d'absence liée à la parentalité.";
      case 'conge_familial': return "Demande de congé familial. Ce document atteste de votre demande d'absence pour motif familial.";
      case 'conge_sans_solde': return "Demande de congé sans solde. Ce document formalise votre demande d'absence non rémunérée.";
      case 'raison_familiale': return "Absence pour raison familiale. Ce document atteste de votre absence pour un événement familial.";
      case 'enfant_malade': return "Congé pour enfant malade. Ce document atteste de votre absence pour s'occuper d'un enfant malade.";
      case 'autre': return "Autre type de demande ou signalement.";
      default: return "";
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md border border-gray-200">
      <div className="flex justify-between items-center mb-6 border-b pb-2">
        <h2 className="text-2xl font-bold text-msm-navy">Fiche de Demande / Signalement</h2>
        <span className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-500 italic">Document numérique</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Type de document</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RequestType)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-msm-navy focus:ring-msm-sky p-2 border"
          >
            <option value="ct">Congé Trimestriel (CT)</option>
            <option value="recup">Récupération</option>
            <option value="overtime">Heures Supplémentaires</option>
            <option value="modif_horaire">Modification Horaire</option>
            <option value="conge_parental">Congé Parental</option>
            <option value="conge_familial">Congé Familial</option>
            <option value="conge_sans_solde">Congé Sans Solde</option>
            <option value="raison_familiale">Raison Familiale</option>
            <option value="enfant_malade">Congé Enfant Malade</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        <div className="bg-msm-navy-light p-4 rounded-md text-sm italic text-msm-navy border-l-4 border-msm-sky">
          {getOfficialText()}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Du (inclus)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Au (inclus)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Commentaire / Détails</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            placeholder="Ex: Détails des heures supplémentaires ou motif de la demande..."
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 font-bold">Signature du salarié</label>
          <div className="border-2 border-dashed border-gray-300 rounded-md bg-gray-50">
            <SignatureCanvas
              ref={sigCanvas}
              penColor='black'
              canvasProps={{width: 500, height: 150, className: 'sigCanvas w-full'}}
            />
          </div>
          <button
            type="button"
            onClick={clearSignature}
            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            Effacer et recommencer la signature
          </button>
        </div>

        <div className="pt-4 border-t">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full ${isSubmitting ? 'bg-gray-400' : 'bg-msm-navy hover:bg-msm-navy-dark'} text-white font-bold py-4 px-4 rounded-md transition-all shadow-lg active:scale-95`}
          >
            {isSubmitting ? 'Envoi en cours...' : 'Signer et envoyer à la cheffe'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeaveRequestForm;
