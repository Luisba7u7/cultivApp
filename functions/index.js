

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const functions = require('firebase-functions')
const admin = require('firebase-admin')
const express = require('express');
const { getAuth } = require("firebase-admin/auth");


const app = express()

admin.initializeApp({
  credential: admin.credential.cert('./permissions.json'),
  databaseURL: "https://cultivapp-c0747-default-rtdb.firebaseio.com"
})

const db = admin.firestore()

/*                           inicio de sesion                                */
// Endpoint GET para verificar si un correo electrónico está registrado en la autenticación de Firebase
app.get('/api/check-email', async (req, res) => {
  try {
      const { email } = req.body; // Obtener el correo electrónico del cuerpo de la solicitud
      if (!email) {
          return res.sendStatus(500);
      }

      await admin.auth().getUserByEmail(email);
      res.sendStatus(200); // El correo electrónico existe en la autenticación de Firebase
  } catch (error) {
      if (error.code === 'auth/user-not-found') {
          res.sendStatus(400); // El correo electrónico no existe en la autenticación de Firebase
      } else {
          console.error(error);
          res.sendStatus(500); // Error al verificar el correo electrónico
      }
  }
});

// Endpoint GET para obtener el UID de un usuario si existe el correo electrónico en la autenticación de Firebase
app.get('/api/get-uid', async (req, res) => {
  try {
      const { email } = req.body; // Obtener el correo electrónico del cuerpo de la solicitud
      if (!email) {
          return res.status(400).json({ error: 'Debes proporcionar un correo electrónico en el cuerpo de la solicitud.' });
      }

      const userRecord = await admin.auth().getUserByEmail(email);
      res.status(200).json({ uid: userRecord.uid }); // El correo electrónico existe en la autenticación de Firebase
  } catch (error) {
      if (error.code === 'auth/user-not-found') {
          res.status(400).json({ error: 'El correo electrónico no está registrado.' }); // El correo electrónico no existe en la autenticación de Firebase
      } else {
          console.error(error);
          res.status(500).json({ error: 'Error al verificar el correo electrónico.' }); // Error al verificar el correo electrónico
      }
  }
});






/*                           TABLA USER_FARMER                               */
//GET 
//Consulta los datos de un usuario
app.get('/api/:uid/user_farmer', async (req, res) => {
    try {
        const { uid } = req.params; // Obtener el UID de los parámetros de la URL
  
        // Obtener todos los documentos de la colección "user_farmer" asociada al UID
        const snapshot = await db.collection(uid).doc('user_farmer').get();
  
        if (!snapshot.exists) {
            console.log('No se encontraron documentos.');
            res.status(404).send('No se encontraron documentos.');
            return;
        }
  
        // Obtener los datos de los documentos y enviarlos como respuesta
        const data = snapshot.data();
        console.log('Documentos encontrados:', data);
        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener los documentos:', error);
        res.status(500).send('Error al obtener los documentos.');
    }
});


//POST
//Crea a un nuevo usuario
app.post('/api/:uid/user_farmer', async (req, res) => {
  try {
      const { uid } = req.params;
      const { name, email, password, municipality, img } = req.body;

      let imageUrl = 'https://res.cloudinary.com/dj7wbmfii/image/upload/v1714458596/new_user.png';

      await db.collection(uid).doc('user_farmer').set({
          name: name,
          email: email,
          password: password,
          municipality: municipality,
          img: imageUrl
      });

      res.status(201).send('Documento creado exitosamente.');
  } catch (error) {
      console.error(error);
      res.status(500).send('Error al crear el documento.');
  }
}); 

//PUT

app.put('/api/:uid/user_farmer/img', async (req, res) => {
  try {
    const { uid } = req.params;
    const { img } = req.body;

    await db.collection(uid).doc('user_farmer').update({
      img: img
    });

    res.status(200).send('Imagen actualizada exitosamente.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al actualizar la imagen.');
  }
});




/*                           TABLA HUERTOS                                 */

//GET
const fetch = require('node-fetch');

const apiKey = 'PK.ADAB844E13FE216AFEA11E4DA294717E'; 
//Obtener la direccion mediante la latitud y longitud 
app.get('/api/direccion', async (req, res) => {
  try {
      const { latitud, longitud } = req.body;
      if (!latitud || !longitud) {
          return res.status(400).json({ error: 'Se requiere latitud y longitud en el cuerpo de la solicitud.' });
      }

      const response = await fetch(`https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${latitud}&lon=${longitud}&format=json&`);
      const data = await response.json();

      if (data.error) {
          return res.status(404).json({ error: 'No se encontró ninguna dirección para las coordenadas proporcionadas.' });
      }

      const address = data.display_name;
      res.json({ direccion: address });
  } catch (error) {
      console.error('Error al obtener la dirección:', error);
      res.status(500).json({ error: 'Error al obtener la dirección.' });
  }
});


//Te dice con numero cuantos huertos tiene un usuario
app.get('/api/:uid/num_huertos', async (req, res) => {
    const { uid } = req.params;
  
    try {
      // Obtener la colección de huertos del usuario
      const huertosCollection = db.collection(uid);
  
      // Consultar solo los documentos que contienen "huerto" en su ID
      const snapshot = await huertosCollection.where('__name__', '>=', 'huerto_')
                                                .where('__name__', '<', 'huertp')
                                                .get();
  
      const huertos = [];
      snapshot.forEach(doc => {
        huertos.push(doc.data());
      });
  
      const num_objects = huertos.length; // Obtener el número de objetos en el arreglo
  
      // Construir el objeto de respuesta
      const responseObj = {
        num_huertos: num_objects
      };
  
      res.status(200).json(responseObj);
    } catch (error) {
      console.error('Error obteniendo huertos:', error);
      res.status(500).send('Ocurrió un error al obtener los huertos');
    }
  });
  
  //Muestra todos los huertos de un usuario
  app.get('/api/:uid/huertos', async (req, res) => {
    const { uid } = req.params;
  
    try {
      // Obtener la colección de huertos del usuario
      const huertosCollection = db.collection(uid);
  
      // Consultar solo los documentos que contienen "huerto" en su ID
      const snapshot = await huertosCollection.where('__name__', '>=', 'huerto_')
                                                .where('__name__', '<', 'huertp')
                                                .get();
  
      const huertos = [];
      snapshot.forEach(doc => {
        huertos.push(doc.data());
      });
  
      res.status(200).json(huertos);
    } catch (error) {
      console.error('Error obteniendo huertos:', error);
      res.status(500).send('Ocurrió un error al obtener los huertos');
    }
  });
  
  //Muestra solo el huerto del idhuerto 
  // Muestra un huerto específico de un usuario
app.get('/api/:uid/huertos/:huertoId', async (req, res) => {
  const { uid, huertoId } = req.params;

  try {
    // Obtener la referencia al huerto específico
    const huertoRef = db.collection(uid).doc(huertoId);

    // Obtener los datos del huerto
    const doc = await huertoRef.get();

    if (!doc.exists) {
      return res.status(404).send('Huerto no encontrado');
    }

    res.status(200).json(doc.data());
  } catch (error) {
    console.error('Error obteniendo huerto:', error);
    res.status(500).send('Ocurrió un error al obtener el huerto');
  }
});

//POST
//Registra un huerto a un usuario
app.post('/api/:uid/huertos', async (req, res) => {
  const { uid } = req.params;
  const { name_huerto, area_huerto, num_lotes, ubicacion } = req.body;

  try {
    // Obtener la colección de huertos del usuario
    const huertosCollection = db.collection(uid);

    // Consultar solo los documentos que contienen "huerto" en su ID
    const snapshot = await huertosCollection.where('__name__', '>=', 'huerto_')
                                              .where('__name__', '<', 'huertp')
                                              .get();

    // Contar el número de huertos existentes
    let numHuertos = 0;
    snapshot.forEach(doc => {
      numHuertos++;
    });

    // Generar el ID del nuevo huerto
    const idHuerto = `huerto_${numHuertos + 1}`;

    // Referencia al documento del huerto en la base de datos
    const huertoRef = huertosCollection.doc(idHuerto);

    // Guardar los datos del huerto en la base de datos
    await huertoRef.set({
      name_huerto,
      area_huerto,
      num_lotes,
      ubicacion
    });

    res.status(201).send('Huerto creado correctamente');
  } catch (error) {
    console.error('Error creando huerto:', error);
    res.status(500).send('Ocurrió un error al crear el huerto');
  }
});

//PUT

//Edita datos del huerto
app.put('/api/:uid/huertos/:huertosid', async (req, res) => {
  const { uid, huertosid } = req.params;
  const { name_huerto, area_huerto, num_lotes, ubicacion } = req.body;

  try {
    // Obtener la colección de huertos del usuario
    const huertosCollection = db.collection(uid);

    // Referencia al documento del huerto en la base de datos
    const huertoRef = huertosCollection.doc(huertosid);

    // Verificar si el huerto existe
    const doc = await huertoRef.get();
    if (!doc.exists) {
      return res.status(404).send('El huerto especificado no existe');
    }

    // Actualizar los campos del huerto
    await huertoRef.update({
      name_huerto,
      area_huerto,
      num_lotes,
      ubicacion
    });

    res.status(200).send('Huerto actualizado correctamente');
  } catch (error) {
    console.error('Error actualizando huerto:', error);
    res.status(500).send('Ocurrió un error al actualizar el huerto');
  }
});

//DELETE

//ELIMINAR UN HUERTO
app.delete('/api/:uid/huertos/:huertosid', async (req, res) => {
  const { uid, huertosid } = req.params;

  try {
    // Obtener la referencia al huerto específico
    const huertoRef = db.collection(uid).doc(huertosid);

    // Verificar si el huerto existe
    const doc = await huertoRef.get();
    if (!doc.exists) {
      return res.status(404).send('Huerto no encontrado');
    }

    // Eliminar el huerto
    await huertoRef.delete();

    res.status(200).send('Huerto eliminado correctamente');
  } catch (error) {
    console.error('Error al eliminar el huerto:', error);
    res.status(500).send('Ocurrió un error al eliminar el huerto');
  }
});

/////// TABLA CULTIVO ////////////////////////////////////
// Ruta GET para consultar un cultivo por su ID
app.get('/api/:uid/cultivos/:idcultivo', async (req, res) => {
  const { uid, idcultivo } = req.params;

  try {
      // Obtener la colección de cultivos del usuario
      const cultivosCollection = db.collection(uid);

      // Referencia al documento del cultivo por su ID
      const cultivoRef = cultivosCollection.doc(idcultivo);

      // Obtener los datos del cultivo
      const cultivoDoc = await cultivoRef.get();

      // Verificar si el cultivo existe
      if (!cultivoDoc.exists) {
          return res.status(404).json({ error: 'Cultivo no encontrado' });
      }

      // Obtener los datos del cultivo
      const cultivoData = cultivoDoc.data();

      // Enviar los datos del cultivo como respuesta
      res.status(200).json(cultivoData);
  } catch (error) {
      console.error('Error al consultar el cultivo:', error);
      res.status(500).json({ error: 'Ocurrió un error al consultar el cultivo' });
  }
});

//GET
// Ruta GET para obtener los cultivos de un huerto específico
app.get('/api/:uid/huerto_cultivos/:idHuerto', async (req, res) => {
  const { uid, idHuerto } = req.params;

  try {
      // Obtener la colección de cultivos del usuario
      const cultivosCollection = db.collection(uid);

      // Consultar los cultivos que tienen el idHuerto especificado
      const snapshot = await cultivosCollection.where('idHuerto', '==', idHuerto).get();

      // Verificar si hay cultivos para el idHuerto especificado
      if (snapshot.empty) {
          res.status(404).json({ error: 'No se encontraron cultivos para el huerto especificado' });
          return;
      }

      const cultivos = [];
      snapshot.forEach(doc => {
          // Agregar los datos completos del cultivo al arreglo
          cultivos.push(doc.data());
      });

      res.status(200).json(cultivos);
  } catch (error) {
      console.error('Error obteniendo cultivos:', error);
      res.status(500).send('Ocurrió un error al obtener los cultivos');
  }
});

// Ruta GET para obtener el número de cultivos de un huerto específico
app.get('/api/:uid/num_huerto_cultivos/:idHuerto', async (req, res) => {
  const { uid, idHuerto } = req.params;

  try {
      // Obtener la colección de cultivos del usuario
      const cultivosCollection = db.collection(uid);

      // Consultar los cultivos que tienen el idHuerto especificado
      const snapshot = await cultivosCollection.where('idHuerto', '==', idHuerto).get();

      // Verificar si hay cultivos para el idHuerto especificado
      if (snapshot.empty) {
          res.status(404).json({ error: 'No se encontraron cultivos para el huerto especificado' });
          return;
      }

      // Obtener el número de cultivos
      const numeroCultivos = snapshot.size;

      res.status(200).json({ numeroCultivos });
  } catch (error) {
      console.error('Error obteniendo número de cultivos:', error);
      res.status(500).send('Ocurrió un error al obtener el número de cultivos');
  }
});






// Ruta GET para obtener los números de lote provenientes de un huerto específico
app.get('/api/:uid/cultivos/num-lotes/:idHuerto', async (req, res) => {
  const { uid, idHuerto } = req.params;

  try {
    // Obtener la colección de cultivos del usuario
    const cultivosCollection = db.collection(uid);
    // Obtener la colección de huertos del usuario
    const huertosCollection = db.collection(uid);
    
    // Consultar los cultivos que tienen el idHuerto especificado
    const snapshot = await cultivosCollection.where('idHuerto', '==', idHuerto).get();

    // Obtener el documento del huerto especificado
    const huertoDoc = await huertosCollection.doc(idHuerto).get();

    // Verificar si hay cultivos para el idHuerto especificado
    if (snapshot.empty) {
      res.status(404).json({ error: 'No se encontraron cultivos para el huerto especificado' });
      return;
    }

    // Obtener el valor de num_lotes del huerto
    const numLotes = huertoDoc.data().num_lotes;

    // Crear una lista del 1 al num_lotes
    const listaNumLotesHuerto = Array.from({ length: numLotes }, (_, i) => (i + 1).toString());

    const numLotesProvenientes = new Set();
    snapshot.forEach(doc => {
      // Agregar el valor de num_lote_proveniente al conjunto
      numLotesProvenientes.add(doc.data().num_lote_proveniente);
    });

    // Convertir el conjunto a un arreglo
    const listaNumLotesCultivo = Array.from(numLotesProvenientes);

    const numerosNoRepetidos = listaNumLotesHuerto.filter(num => !listaNumLotesCultivo.includes(num));


    res.status(200).json(listaNumLotesCultivo);
  } catch (error) {
    console.error('Error obteniendo números de lote provenientes:', error);
    res.status(500).send('Ocurrió un error al obtener los números de lote provenientes');
  }
});

//POST 

// Ruta POST para crear un cultivo y especificar de qué huerto proviene
app.post('/api/:uid/cultivos', async (req, res) => {
  const { uid } = req.params;
  const { idHuerto, name_cultivo, num_parcelas, edad_cultivo, fecha_fertilizacion, name_fertilizante, cantidad, fecha_floracion, num_lote_proveniente } = req.body;

  try {
    // Obtener la colección de cultivos del usuario
    const cultivosCollection = db.collection(uid);

    // Consultar solo los documentos que contienen "cultivo" en su ID
    const snapshot = await cultivosCollection.where('__name__', '>=', 'cultivo_')
                                             .where('__name__', '<', 'cultivo`')
                                             .get();

    // Contar el número de cultivos existentes
    let numCultivos = 0;
    snapshot.forEach(doc => {
      numCultivos++;
    });

    // Generar el ID del nuevo cultivo
    const idCultivo = `cultivo_${numCultivos + 1}`;

    // Referencia al documento del cultivo en la base de datos
    const cultivoRef = cultivosCollection.doc(idCultivo);

    // Guardar los datos del cultivo en la base de datos
    await cultivoRef.set({
      nameCultivo: idCultivo,
      idHuerto,
      name_cultivo,
      num_parcelas,
      edad_cultivo,
      fecha_fertilizacion,
      name_fertilizante,
      cantidad,
      fecha_floracion,
      num_lote_proveniente
    });

    res.status(201).send('Cultivo creado correctamente');
  } catch (error) {
    console.error('Error creando cultivo:', error);
    res.status(500).send('Ocurrió un error al crear el cultivo');
  }
});

//PUT

//EDITA UN CULTIVO 
// Ruta PUT para editar un cultivo por su ID
app.put('/api/:uid/cultivos/:idcultivo', async (req, res) => {
  const { uid, idcultivo } = req.params;
  const newData = req.body;

  try {
      // Obtener la colección de cultivos del usuario
      const cultivosCollection = db.collection(uid);

      // Referencia al documento del cultivo por su ID
      const cultivoRef = cultivosCollection.doc(idcultivo);

      // Verificar si el cultivo existe
      const cultivoDoc = await cultivoRef.get();
      if (!cultivoDoc.exists) {
          return res.status(404).json({ error: 'Cultivo no encontrado' });
      }

      // Actualizar los datos del cultivo
      await cultivoRef.update(newData);

      // Obtener los datos actualizados del cultivo
      const updatedCultivoDoc = await cultivoRef.get();
      const updatedCultivoData = updatedCultivoDoc.data();

      // Enviar los datos actualizados del cultivo como respuesta
      res.status(200).json("OK");
  } catch (error) {
      console.error('Error al editar el cultivo:', error);
      res.status(500).json({ error: 'Ocurrió un error al editar el cultivo' });
  }
});

//DELETE
// Ruta DELETE para eliminar un cultivo
app.delete('/api/:uid/cultivos/:idcultivo', async (req, res) => {
  const { uid, idcultivo } = req.params;

  try {
    // Obtener la colección de cultivos del usuario
    const cultivosCollection = db.collection(uid);

    // Verificar si el cultivo existe
    const cultivoRef = cultivosCollection.doc(idcultivo);
    const cultivoDoc = await cultivoRef.get();

    if (!cultivoDoc.exists) {
      return res.status(404).send('Cultivo no encontrado');
    }

    // Eliminar el cultivo
    await cultivoRef.delete();

    // Respuesta exitosa
    res.status(200).send('Cultivo eliminado correctamente');
  } catch (error) {
    console.error('Error al eliminar el cultivo:', error);
    res.status(500).send('Error al eliminar el cultivo');
  }
});

//TABLA TRABAJOS
//GET
// Ruta GET para obtener todos los trabajos del usuario
app.get('/api/:uid/trabajos', async (req, res) => {
  const { uid } = req.params;

  try {
    // Obtener la colección de trabajos del usuario
    const trabajosCollection = db.collection(uid);

    // Consultar todos los documentos que contienen "trabajo" en su ID
    const snapshot = await trabajosCollection.where('__name__', '>=', 'trabajo_')
                                              .where('__name__', '<', 'trabajp')
                                              .get();

    const trabajos = [];
    snapshot.forEach(doc => {
      // Agregar los datos del trabajo al arreglo
      trabajos.push(doc.data());
    });

    res.status(200).json(trabajos);
  } catch (error) {
    console.error('Error obteniendo trabajos:', error);
    res.status(500).send('Ocurrió un error al obtener los trabajos');
  }
});

// Ruta GET para obtener el número de trabajos del usuario
app.get('/api/:uid/trabajos/num-trabajos', async (req, res) => {
  const { uid } = req.params;

  try {
    // Obtener la colección de trabajos del usuario
    const trabajosCollection = db.collection(uid);

    // Consultar todos los documentos que contienen "trabajo" en su ID
    const snapshot = await trabajosCollection.where('__name__', '>=', 'trabajo_')
                                              .where('__name__', '<', 'trabajp')
                                              .get();

    const numTrabajos = snapshot.size; // Obtener el número de trabajos

    res.status(200).json({ numTrabajos });
  } catch (error) {
    console.error('Error obteniendo el número de trabajos:', error);
    res.status(500).send('Ocurrió un error al obtener el número de trabajos');
  }
});

//POST
// Ruta POST para crear un trabajo
app.post('/api/:uid/trabajos', async (req, res) => {
  const { uid } = req.params;
  const { idTrabajo,trabajo_realizar, fecha_trabajo } = req.body;
  const estado = 'pendiente';

  try {
    // Obtener la colección de trabajos del usuario
    const trabajosCollection = db.collection(uid);

    // Consultar solo los documentos que contienen "trabajo" en su ID
    const snapshot = await trabajosCollection.where('__name__', '>=', 'trabajo_')
                                              .where('__name__', '<', 'trabajp')
                                              .get();

    // Contar el número de trabajos existentes
    let numTrabajos = 0;
    snapshot.forEach(doc => {
      numTrabajos++;
    });

    // Generar el ID del nuevo trabajo
    const idTrabajo = `trabajo_${numTrabajos + 1}`;

    // Referencia al documento del trabajo en la base de datos
    const trabajoRef = trabajosCollection.doc(idTrabajo);

    // Guardar los datos del trabajo en la base de datos
    await trabajoRef.set({
      idTrabajo:idTrabajo,
      trabajo_realizar,
      fecha_trabajo,
      estado
    });

    res.status(201).send('Trabajo creado correctamente');
  } catch (error) {
    console.error('Error creando trabajo:', error);
    res.status(500).send('Ocurrió un error al crear el trabajo');
  }
});

//PUT
// Ruta PUT para editar el estado de un trabajo
app.put('/api/:uid/trabajos/:idTrabajo', async (req, res) => {
  const { uid, idTrabajo } = req.params;
  const { estado } = req.body;

  try {
    // Obtener la referencia al documento del trabajo en la base de datos
    const trabajoRef = db.collection(uid).doc(idTrabajo);

    // Verificar si el trabajo existe
    const trabajoDoc = await trabajoRef.get();
    if (!trabajoDoc.exists) {
      return res.status(404).send('El trabajo especificado no existe');
    }

    // Actualizar el estado del trabajo
    await trabajoRef.update({ estado });

    res.status(200).send('Estado del trabajo actualizado correctamente');
  } catch (error) {
    console.error('Error actualizando estado del trabajo:', error);
    res.status(500).send('Ocurrió un error al actualizar el estado del trabajo');
  }
});






  
exports.app = functions.https.onRequest(app);
