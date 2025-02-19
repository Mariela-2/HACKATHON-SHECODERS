import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { 
    getAuth, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    getFirestore, collection, doc, updateDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
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

// Escuchar cambios en Firestore en tiempo real sin duplicar filas
function escucharSolicitudes() {
    const solicitudesBody = document.getElementById("solicitudes-body");

    onSnapshot(collection(db, "vacationRequests"), (snapshot) => {
        solicitudesBody.innerHTML = ""; // Limpiar contenido antes de actualizar

        snapshot.forEach((documento) => {
            const data = documento.data();
            const id = documento.id;

            // Validar fechas
            let startDate = data.startDate && data.startDate.toDate ? data.startDate.toDate() : null;
            let endDate = data.endDate && data.endDate.toDate ? data.endDate.toDate() : null;

            const startDateFormatted = startDate ? startDate.toLocaleDateString("es-PE") : "Fecha inválida";
            const endDateFormatted = endDate ? endDate.toLocaleDateString("es-PE") : "Fecha inválida";

            // Crear la fila de la tabla
            const fila = document.createElement("tr");
            fila.setAttribute("data-id", id);
            fila.innerHTML = `
                <td>${data.nombre} ${data.apellidos}</td>
                <td>${startDateFormatted}</td>
                <td>${endDateFormatted}</td>
                <td>${data.diasHabiles}</td>
                <td>${data.diasDisponibles}</td>
                <td>
                    <select class="form-select estatus-select" data-id="${id}">
                        <option value="pendiente" ${data.status === "pendiente" ? "selected" : ""}>Pendiente</option>
                        <option value="aprobado" ${data.status === "aprobado" ? "selected" : ""}>Aprobado</option>
                        <option value="rechazado" ${data.status === "rechazado" ? "selected" : ""}>Rechazado</option>
                    </select>
                </td>
                <td>
                    <button class="btn btn-success btn-sm enviar-btn" data-id="${id}">Actualizar</button>
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
            await updateDoc(doc(db, "vacationRequests", id), { status: nuevoEstado });

            alert(`Estado de la solicitud actualizado a: ${nuevoEstado}`);
        } catch (error) {
            console.error("Error al actualizar el estado:", error);
            alert("Error al actualizar el estado. Inténtalo nuevamente.");
        }
    }
});
