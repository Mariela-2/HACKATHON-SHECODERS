import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { 
    getAuth, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    getFirestore, collection, getDocs, updateDoc, doc 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// Definir logout en el objeto window para hacerlo global
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
        await cargarSolicitudes(); // Cargar solicitudes solo si el usuario está autenticado
    }
});

// Función para cargar solicitudes
async function cargarSolicitudes() {
    const solicitudesBody = document.getElementById("solicitudes-body");
    solicitudesBody.innerHTML = ""; // Limpiar contenido previo

    const querySnapshot = await getDocs(collection(db, "vacationRequests"));

    querySnapshot.forEach((documento) => {
        const data = documento.data();
        const id = documento.id; // ID del documento en Firestore

        let startDate = data.startDate && data.startDate.toDate ? data.startDate.toDate() : null;
        let endDate = data.endDate && data.endDate.toDate ? data.endDate.toDate() : null;

        const startDateFormatted = startDate ? startDate.toLocaleDateString("es-PE") : "Fecha inválida";
        const endDateFormatted = endDate ? endDate.toLocaleDateString("es-PE") : "Fecha inválida";

        // Crear la fila de la tabla
        const fila = document.createElement("tr");
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

    // Agregar eventos a los botones "Actualizar"
    document.querySelectorAll(".enviar-btn").forEach((boton) => {
        boton.addEventListener("click", async (event) => {
            const id = event.target.dataset.id;
            const fila = event.target.closest("tr");
            const nuevoEstado = fila.querySelector(".estatus-select").value;

            try {
                await updateDoc(doc(db, "vacationRequests", id), { status: nuevoEstado });
                alert(`Estado de la solicitud actualizado a: ${nuevoEstado}`);
            } catch (error) {
                console.error("Error al actualizar el estado:", error);
                alert("Error al actualizar el estado. Inténtalo nuevamente.");
            }
        });
    });
}

// Verificar si el usuario está autenticado
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
    } else {
        await cargarSolicitudes();
    }
});

// Definir logout en el objeto window para hacerlo global
window.logout = function () {
    signOut(auth).then(() => {
        window.location.href = 'auth.html';
    }).catch((error) => {
        alert("Error al cerrar sesión: " + error.message);
    });
};
