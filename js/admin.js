import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, doc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
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

// Verificar si el usuario está autenticado solo una vez
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
    } else {
        escucharSolicitudes(); // Se ejecuta una vez al iniciar sesión
    }
});

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
            
            // Formatear la fecha de creación con hora
            const createdDateFormatted = createdDate ? 
                createdDate.toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3/$1/$2') : 'No disponible';

            // Formatear fechas de inicio y fin
            const startDateFormatted = startDate ? 
                startDate.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }) : 'No disponible';

            const endDateFormatted = endDate ? 
                endDate.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }) : 'No disponible';

            fila.innerHTML = `
                <td>${createdDateFormatted}</td>
                <td>${data.nombre} ${data.apellidos}</td>
                <td>${startDateFormatted}</td>
                <td>${endDateFormatted}</td>
                <td>${data.diasHabiles}</td>
                <td>${data.diasDisponibles || 'No definido'}</td>
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

// Delegación de eventos para evitar duplicaciones
document.addEventListener("click", async (event) => {
    if (event.target.classList.contains("enviar-btn")) {
        const id = event.target.dataset.id;
        const fila = document.querySelector(`tr[data-id="${id}"]`);
        const nuevoEstado = fila.querySelector(".estatus-select").value;

        try {
            await updateDoc(doc(db, "vacationRequests", id), { 
                status: nuevoEstado,
                updatedAt: new Date() // Agregar fecha de actualización
            });

            alert(`Estado de la solicitud actualizado a: ${nuevoEstado}`);
        } catch (error) {
            console.error("Error al actualizar el estado:", error);
            alert("Error al actualizar el estado. Inténtalo nuevamente.");
        }
    }
});