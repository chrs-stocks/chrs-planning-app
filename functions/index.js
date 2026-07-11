const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

// Rappel quotidien des rendez-vous de résidents du jour, envoyé à tous les
// appareils ayant activé les notifications ("🔔 Activer les rappels" dans l'appli).
exports.dailyAppointmentReminder = onSchedule(
  { schedule: '0 7 * * *', timeZone: 'Europe/Paris' },
  async () => {
    const db = getFirestore();
    const today = new Date().toISOString().slice(0, 10);

    const [appointmentsSnap, tokensSnap] = await Promise.all([
      db.collection('appointments').where('date', '==', today).get(),
      db.collection('pushTokens').get(),
    ]);

    if (appointmentsSnap.empty || tokensSnap.empty) return;

    const appointments = appointmentsSnap.docs
      .map(d => d.data())
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

    const title = `${appointments.length} rendez-vous aujourd'hui`;
    const body = appointments
      .map(a => `${a.time ? a.time + ' - ' : ''}${a.residentName} (${a.object})`)
      .join('\n');
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
