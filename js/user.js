import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, Timestamp, doc, getDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// Definir logout en el objeto window para hacerlo global
window.logout = function () {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        alert("Error al cerrar sesión: " + error.message);
    });
};

// Verificar si el usuario está autenticado
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        await cargarHistorialSolicitudes(user.uid);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const vacationForm = document.getElementById('vacation-form');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const submitButton = document.getElementById('submit-button');

    if (!vacationForm || !startDateInput || !endDateInput || !submitButton) {
        console.error('No se encontraron todos los elementos del formulario');
        return;
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    startDateInput.min = todayStr;
    endDateInput.min = todayStr;

    startDateInput.addEventListener('change', () => {
        endDateInput.min = startDateInput.value;
        if (new Date(endDateInput.value) < new Date(startDateInput.value)) {
            endDateInput.value = startDateInput.value;
        }
    });

    const calcularDiasHabiles = (inicio, fin) => {
        let dias = 0;
        let actual = new Date(inicio);
        const finFecha = new Date(fin);

        while (actual <= finFecha) {
            const diaSemana = actual.getDay();
            if (diaSemana !== 0 && diaSemana !== 6) {
                dias++;
            }
            actual.setDate(actual.getDate() + 1);
        }
        return dias;
    };

    const saveVacationRequest = async (startDate, endDate, diasHabiles) => {
        try {
            const user = auth.currentUser;

            if (!user) {
                throw new Error('Debes iniciar sesión para solicitar vacaciones');
            }

            // **Obtener nombre y apellido desde Firestore**
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                throw new Error('No se encontraron datos del usuario en Firestore.');
            }

            const userData = userSnap.data();
            const nombre = userData.nombre || "No especificado";
            const apellidos = userData.apellidos || "No especificado";

            const vacationRequest = {
                userId: user.uid,
                userEmail: user.email,
                nombre: nombre,
                apellidos: apellidos,
                startDate: Timestamp.fromDate(new Date(startDate)),
                endDate: Timestamp.fromDate(new Date(endDate)),
                diasHabiles: diasHabiles,
                status: 'Pendiente',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'vacationRequests'), vacationRequest);

            return {
                success: true,
                requestId: docRef.id,
                message: 'Solicitud de vacaciones enviada exitosamente'
            };
        } catch (error) {
            console.error('Error al guardar la solicitud:', error);
            return {
                success: false,
                error: error.message,
                message: 'Error al enviar la solicitud de vacaciones'
            };
        }
    };

    vacationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        submitButton.disabled = true;
        submitButton.innerHTML = 'Procesando...';

        try {
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;

            if (!startDate || !endDate) {
                throw new Error('Por favor selecciona ambas fechas');
            }

            const fechaInicio = new Date(startDate);
            const fechaFin = new Date(endDate);

            if (fechaFin < fechaInicio) {
                throw new Error('La fecha de finalización debe ser posterior a la fecha de inicio');
            }

            const diasHabiles = calcularDiasHabiles(fechaInicio, fechaFin);

            const result = await saveVacationRequest(startDate, endDate, diasHabiles);

            if (result.success) {
                alert(result.message);
                vacationForm.reset();
                await cargarHistorialSolicitudes(auth.currentUser.uid); // Recargar historial
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            alert(error.message);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Solicitar';
        }
    });
});

async function cargarHistorialSolicitudes(userId) {
    try {
        const historialTable = document.getElementById('historial-table-body');

        if (!historialTable) {
            console.error('No se encontró la tabla de historial en el HTML.');
            return;
        }

        historialTable.innerHTML = ''; // Limpiar tabla antes de cargar datos

        const q = query(collection(db, 'vacationRequests'), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            historialTable.innerHTML = '<tr><td colspan="4">No hay solicitudes registradas</td></tr>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const row = document.createElement('tr');

            // Definir clase Bootstrap según el estado
            let statusClass;
            switch (data.status.toLowerCase()) {
                case 'aprobado':
                    statusClass = 'text-success'; // Verde
                    break;
                case 'pendiente':
                    statusClass = 'text-warning'; // Amarillo
                    break;
                case 'rechazado':
                    statusClass = 'text-danger'; // Rojo
                    break;
                default:
                    statusClass = 'text-secondary'; // Gris (Para estados desconocidos)
            }

            row.innerHTML = `
                <td>${data.startDate.toDate().toLocaleDateString()}</td>
                <td>${data.endDate.toDate().toLocaleDateString()}</td>
                <td>${data.diasHabiles}</td>
                <td><span class="badge ${statusClass} p-2">${data.status}</span></td>
            `;

            historialTable.appendChild(row);
        });

    } catch (error) {
        console.error("Error al obtener historial de solicitudes:", error);
    }
}

async function mostrarNombreEnTarjeta(userId) {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            const nombreCompleto = `${userData.nombre} ${userData.apellidos}`;

            // Insertar nombre en la tarjeta
            document.getElementById("nombreUsuario").textContent = nombreCompleto;
        } else {
            console.log("No se encontró el usuario en Firestore");
        }
    } catch (error) {
        console.error("Error al obtener los datos del usuario:", error);
    }
}

// Verificar autenticación del usuario y llamar a las funciones necesarias
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        await cargarHistorialSolicitudes(user.uid);
        await mostrarNombreEnTarjeta(user.uid); // Ahora sí está correctamente llamada
    }
});

