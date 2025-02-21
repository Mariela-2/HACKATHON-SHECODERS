import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// Función para cerrar sesión
window.logout = function () {
    signOut(auth).then(() => {
        window.location.href = 'auth.html';
    }).catch((error) => {
        alert("Error al cerrar sesión: " + error.message);
    });
};

// Verificar si el usuario está autenticado
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
    } else {
        console.log("Usuario autenticado:", user.uid);
        await mostrarNombreEnTarjeta(user.uid);
        escucharSolicitudes();
    }
});

// Función para mostrar el nombre del usuario en la tarjeta
async function mostrarNombreEnTarjeta(userId) {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            console.log("Datos del usuario:", userSnap.data()); // Depuración
            const userData = userSnap.data();
            const nombreCompleto = `${userData.nombre} ${userData.apellidos}`;
            const nombreUsuarioElem = document.getElementById("nombreUsuario");

            if (nombreUsuarioElem) {
                nombreUsuarioElem.textContent = nombreCompleto;
            } else {
                console.error("Elemento #nombreUsuario no encontrado en el HTML");
            }
        } else {
            console.log("No se encontró el usuario en Firestore");
        }
    } catch (error) {
        console.error("Error al obtener los datos del usuario:", error);
    }
}

// Escuchar cambios en Firestore en tiempo real
function escucharSolicitudes() {
    const solicitudesBody = document.getElementById("solicitudes-body");

    onSnapshot(collection(db, "vacationRequests"), (snapshot) => {
        solicitudesBody.innerHTML = "";

        // Convertir snapshot a array y ordenar por fecha de creación (más reciente primero)
        const solicitudes = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        solicitudes.forEach((data) => {
            const startDate = data.startDate?.toDate();
            const endDate = data.endDate?.toDate();
            const createdDate = data.createdAt?.toDate();

            const fila = document.createElement("tr");
            fila.setAttribute("data-id", data.id);

            const createdDateFormatted = createdDate
                ? createdDate.toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3/$1/$2')
                : 'No disponible';

            const startDateFormatted = startDate
                ? startDate.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                })
                : 'No disponible';

            const endDateFormatted = endDate
                ? endDate.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                })
                : 'No disponible';

            fila.innerHTML = `
                <td>${createdDateFormatted}</td>
                <td>${data.nombre} ${data.apellidos}</td>
                <td>${startDateFormatted}</td>
                <td>${endDateFormatted}</td>
                <td>${data.diasHabiles}</td>
                <td>${data.diasDisponibles || '0'}</td>
                <td>
                    <select class="form-select estatus-select" data-id="${data.id}">
                        <option value="pendiente" ${data.status === "pendiente" ? "selected" : ""}>Pendiente</option>
                        <option value="aprobado" ${data.status === "aprobado" ? "selected" : ""}>Aprobado</option>
                        <option value="rechazado" ${data.status === "rechazado" ? "selected" : ""}>Rechazado</option>
                    </select>
                </td>
                <td>
                    <button class="btn btn-success btn-sm enviar-btn" data-id="${data.id}">Actualizar</button>
                </td>
            `;

            solicitudesBody.appendChild(fila);
        });
    });
}

document.addEventListener("click", async (event) => {
    if (event.target.classList.contains("enviar-btn")) {
        const id = event.target.dataset.id;
        const fila = document.querySelector(`tr[data-id="${id}"]`);
        let nuevoEstado = fila.querySelector(".estatus-select").value.toUpperCase(); // Convertir a mayúsculas

        try {
            // Obtener la solicitud de Firestore
            const solicitudRef = doc(db, "vacationRequests", id);
            const solicitudSnap = await getDoc(solicitudRef);

            if (!solicitudSnap.exists()) {
                alert("La solicitud no existe.");
                return;
            }

            const solicitudData = solicitudSnap.data();
            const userId = solicitudData.userId;
            const diasHabiles = solicitudData.diasHabiles ?? 0; // Evitar undefined

            // Actualizar el estado de la solicitud
            await updateDoc(solicitudRef, { 
                status: nuevoEstado,
                updatedAt: new Date()
            });

            // Si la solicitud es aprobada, restar días disponibles del usuario
            if (nuevoEstado === "APROBADO") {
                const userRef = doc(db, "users", userId);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const diasDisponiblesActuales = userData.diasDisponibles ?? 0;
                    const nuevosDiasDisponibles = Math.max(0, diasDisponiblesActuales - diasHabiles); // Evitar valores negativos

                    // Actualizar los días disponibles del usuario
                    await updateDoc(userRef, { diasDisponibles: nuevosDiasDisponibles });

                    alert(`Estado actualizado a "APROBADO". Ahora el usuario tiene ${nuevosDiasDisponibles} días disponibles.`);
                } else {
                    alert("No se encontró el usuario en la base de datos.");
                }
            } else {
                alert(`Estado de la solicitud actualizado a: ${nuevoEstado}`);
            }

        } catch (error) {
            console.error("Error al actualizar el estado:", error);
            alert("Error al actualizar el estado. Inténtalo nuevamente.");
        }
    }
});

