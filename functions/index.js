const functions = require('firebase-functions');
const admin     = require('firebase-admin');
admin.initializeApp({
  databaseURL: 'https://gastosweb-e7356-default-rtdb.firebaseio.com/'
});

const PATH = 'orcamento365_9b8e04c5';

exports.syncTx = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Só POST permitido');
  const tx = req.body;
  if (!tx || !tx.id) return res.status(400).send('Payload inválido');

  const dbRef = admin.database().ref(`${PATH}/tx/${tx.id}`);
  try {
    const snap   = await dbRef.once('value');
    const server = snap.val();
    if (!server || server.modifiedAt <= tx.modifiedAt) {
      await dbRef.set(tx);
      return res.status(200).send('saved');
    } else {
      return res.status(409).send({ conflict: true, server });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).send('Erro interno');
  }
});
