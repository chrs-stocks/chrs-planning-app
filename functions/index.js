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

// Rappel quotidien des rendez-vous de résidents et des tâches récurrentes du jour,
// envoyé à tous les appareils ayant activé les notifications ("🔔 Activer les
// rappels" dans l'appli).
exports.dailyAppointmentReminder = onSchedule(
  { schedule: '0 7 * * *', timeZone: 'Europe/Paris' },
  async () => {
    const db = getFirestore();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const [appointmentsSnap, tasksSnap, tokensSnap] = await Promise.all([
      db.collection('appointments').where('date', '==', today).get(),
      db.collection('tasks').get(),
      db.collection('pushTokens').get(),
    ]);

    const appointments = appointmentsSnap.docs
      .map(d => d.data())
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
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
  }
);
