const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

// Reproduit ici la logique de src/utils/taskUtils.ts (isTaskDueToday) : on ne peut
// pas importer le code client (TypeScript, dépend de date-fns) depuis la fonction,
// donc la règle "due aujourd'hui" par fréquence est dupliquée en JS simple.
const isTaskDueToday = (task, today) => {
  if (!task.active) return false;
  switch (task.frequency) {
    case 'quotidienne':
      return true;
    case 'hebdomadaire': {
      const weekdays = task.weekdays && task.weekdays.length > 0
        ? task.weekdays
        : (task.weekday !== undefined ? [task.weekday] : [1]);
      return weekdays.includes(today.getDay());
    }
    case 'mensuelle':
      return today.getDate() === (task.dayOfMonth ?? 1);
    case 'annuelle':
      return today.getMonth() + 1 === (task.annualMonth ?? 1) && today.getDate() === (task.annualDay ?? 1);
    default:
      return false;
  }
};

// Envoie le rappel du jour (rendez-vous + tâches dues) à tous les appareils
// inscrits. `onlyFromTime` (ex: '14:00') limite les rendez-vous affichés à ceux
// qui n'ont pas encore eu lieu, pour le rappel de l'après-midi.
const sendDailyDigest = async ({ onlyFromTime } = {}) => {
  const db = getFirestore();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const [appointmentsSnap, tasksSnap, tokensSnap] = await Promise.all([
    db.collection('appointments').where('date', '==', today).get(),
    db.collection('tasks').get(),
    db.collection('pushTokens').get(),
  ]);

  let appointments = appointmentsSnap.docs.map(d => d.data());
  if (onlyFromTime) {
    appointments = appointments.filter(a => !a.time || a.time >= onlyFromTime);
  }
  appointments.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

  const dueTasks = tasksSnap.docs
    .map(d => d.data())
    .filter(task => isTaskDueToday(task, now))
    .sort((a, b) => a.name.localeCompare(b.name));

  if ((appointments.length === 0 && dueTasks.length === 0) || tokensSnap.empty) return;

  const titleParts = [];
  if (appointments.length > 0) titleParts.push(`${appointments.length} rendez-vous`);
  if (dueTasks.length > 0) titleParts.push(`${dueTasks.length} tâche${dueTasks.length > 1 ? 's' : ''}`);
  const title = `${titleParts.join(' et ')} aujourd'hui`;

  const bodyLines = [];
  if (appointments.length > 0) {
    bodyLines.push('📅 Rendez-vous :');
    appointments.forEach(a => bodyLines.push(`${a.time ? a.time + ' - ' : ''}${a.residentName} (${a.object})`));
  }
  if (dueTasks.length > 0) {
    if (bodyLines.length > 0) bodyLines.push('');
    bodyLines.push('✅ Tâches :');
    dueTasks.forEach(t => bodyLines.push(t.name));
  }
  const body = bodyLines.join('\n');
  const tokens = tokensSnap.docs.map(d => d.id);

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: { url: '/' },
  });

  // Un appareil désinstallé/désautorisé laisse un token qui échoue définitivement :
  // on le retire pour ne pas le retenter chaque jour.
  const staleTokens = response.responses
    .map((r, i) => (!r.success && r.error?.code === 'messaging/registration-token-not-registered' ? tokens[i] : null))
    .filter(Boolean);
  await Promise.all(staleTokens.map(t => db.collection('pushTokens').doc(t).delete()));
};

// Rappel du matin : tous les rendez-vous et tâches du jour.
exports.dailyAppointmentReminder = onSchedule(
  { schedule: '0 7 * * *', timeZone: 'Europe/Paris' },
  () => sendDailyDigest()
);

// Rappel de l'après-midi (équipe relève) : uniquement les rendez-vous restants
// (14h et après, ou sans heure précisée) + les tâches du jour, pour éviter de
// re-signaler des rendez-vous déjà passés le matin.
exports.afternoonAppointmentReminder = onSchedule(
  { schedule: '0 14 * * *', timeZone: 'Europe/Paris' },
  () => sendDailyDigest({ onlyFromTime: '14:00' })
);
